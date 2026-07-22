import { getDeveloper } from "../domain/content";
import type { DeveloperId } from "../domain/models";
import type { GameActionLogEvent } from "../game/actionLog";
import { initialGameState } from "../game/gameReducer";
import {
  createPlaytestMetrics,
  hasPlayableCard,
  playtestScenarios,
  summarizePlaytestDeck,
  updatePlaytestMetrics,
  type PlaytestRunResult,
} from "./simulator";

function sameSquad(left: readonly DeveloperId[], right: readonly DeveloperId[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((developerId, index) => developerId === [...right].sort()[index])
  );
}

function scenarioForSquad(squad: readonly DeveloperId[]): { id: string; name: string } {
  const scenario = playtestScenarios.find((candidate) => sameSquad(candidate.squad, squad));
  if (scenario) return scenario;
  return {
    id: `custom-${[...squad].sort().join("-") || "no-squad"}`,
    name:
      squad.length > 0
        ? squad.map((developerId) => getDeveloper(developerId).name).join(" / ")
        : "No squad",
  };
}

function parseEvent(line: string, sourceId: string, lineNumber: number): GameActionLogEvent {
  try {
    const event = JSON.parse(line) as GameActionLogEvent;
    if (
      event.schemaVersion !== 1 ||
      typeof event.accepted !== "boolean" ||
      !event.action ||
      !event.state
    ) {
      throw new Error("unsupported event shape");
    }
    return event;
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`${sourceId}:${lineNumber}: ${message}`);
  }
}

export function summarizeHumanActionLog(sourceId: string, contents: string): PlaytestRunResult {
  const events = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseEvent(line, sourceId, index + 1));
  if (events.length === 0) throw new Error(`${sourceId}: action log is empty.`);

  const startEvent = events.find(
    (event) => event.accepted && event.action.type === "START_RUN" && event.state.run,
  );
  if (!startEvent) throw new Error(`${sourceId}: action log has no accepted START_RUN.`);

  const metrics = createPlaytestMetrics();
  let previousState = initialGameState;
  for (const event of events) {
    if (event.accepted) {
      if (
        event.action.type === "END_DAY" &&
        previousState.run?.cycle &&
        previousState.run.cycle.focus > 0 &&
        previousState.run.cycle.hand.length > 0 &&
        !hasPlayableCard(previousState)
      ) {
        metrics.deadHands += 1;
      }
      updatePlaytestMetrics(metrics, previousState, event.action, event.state);
    }
    previousState = event.state;
  }

  const lastRunEvent = [...events].reverse().find((event) => event.state.run);
  if (!lastRunEvent?.state.run) throw new Error(`${sourceId}: action log never started a run.`);
  const terminalEvent = [...events]
    .reverse()
    .find((event) => event.state.run && event.state.screen.name === "retro");
  const finalState = (terminalEvent ?? lastRunEvent).state;
  const run = finalState.run!;
  const scenario = scenarioForSquad(run.squad);
  const terminal = finalState.screen.name === "retro" ? finalState.screen : undefined;
  const startedAt = Date.parse(startEvent.at);
  const endedAt = Date.parse((terminalEvent ?? lastRunEvent).at);
  const taskShipEvents = run.history.filter((event) => event.kind === "task-shipped");
  metrics.tasksShipped = taskShipEvents.length;
  metrics.defects = taskShipEvents.reduce((sum, event) => sum + event.defects, 0);

  return {
    schemaVersion: 1,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    policy: "human",
    deckMode: "starter",
    sourceId,
    durationMs:
      Number.isFinite(startedAt) && Number.isFinite(endedAt) ? Math.max(0, endedAt - startedAt) : 0,
    seed: run.seed,
    squad: run.squad,
    bossId: run.selectedBossId,
    outcome: terminal ? terminal.outcome : "incomplete",
    cause: terminal?.cause ?? `incomplete-on-${finalState.screen.name}`,
    ...metrics,
    endingMorale: run.morale,
    endingTechDebt: run.techDebt,
    tools: run.tools,
    deckSize: run.deck.length,
    finalDeck: summarizePlaytestDeck(run.deck),
  };
}
