import { describe, expect, it } from "vitest";
import type { DeveloperId } from "../domain/models";
import { gameReducer, initialGameState } from "./gameReducer";
import type { GameState } from "./gameReducer";
import { getCardPresentation } from "./presentation";

function startCycle(squad: readonly DeveloperId[]): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN" });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  return gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
}

describe("getCardPresentation", () => {
  it("promotes a signature card plus its passive to a hero reaction", () => {
    const state = startCycle(["paul", "irene", "madi"]);
    const run = state.run;
    const instance = run?.cycle?.hand.find((card) => card.cardId === "agent-swarm");
    if (!run || !instance) throw new Error("Expected Agent Swarm in hand");

    const presentation = getCardPresentation(run, instance, {
      taskId: "status-composer",
      discipline: "backend",
    });

    expect(presentation).toMatchObject({
      cue: {
        developerId: "madi",
        level: "hero",
        title: "Agent Swarm",
      },
      triggeredPassiveIds: ["madi"],
    });
  });

  it("keeps an ordinary passive contribution compact", () => {
    const state = startCycle(["paul", "odin", "irene"]);
    const baseRun = state.run;
    if (!baseRun?.cycle) throw new Error("Expected an active Cycle");
    const run = {
      ...baseRun,
      cycle: {
        ...baseRun.cycle,
        tasks: baseRun.cycle.tasks.map((task) => ({
          ...task,
          requirements: task.requirements.map((requirement) => ({
            ...requirement,
            verified: requirement.discipline === "frontend" ? requirement.target - 3 : 0,
          })),
        })),
        hand: [...baseRun.cycle.hand, { cardId: "frontend-3", instanceId: "test-frontend-3" }],
      },
    };
    const instance = run?.cycle?.hand.find((card) => card.cardId === "frontend-3");
    if (!run || !instance) throw new Error("Expected Frontend in hand");

    const presentation = getCardPresentation(run, instance, {
      taskId: "status-composer",
      discipline: "frontend",
    });

    expect(presentation?.cue).toMatchObject({
      developerId: "irene",
      level: "micro",
      title: "Quietly Done",
    });
  });

  it("gives Paul's squad tactics compact reactions and his rare a hero moment", () => {
    const state = startCycle(["paul", "odin", "irene"]);
    const baseRun = state.run;
    if (!baseRun?.cycle) throw new Error("Expected an active Cycle");
    const run = {
      ...baseRun,
      cycle: {
        ...baseRun.cycle,
        hand: [
          ...baseRun.cycle.hand,
          { cardId: "full-stack", instanceId: "test-full-stack" },
          { cardId: "ebb-and-flow", instanceId: "test-ebb-and-flow" },
        ],
      },
    };

    const fullStack = run.cycle.hand.find((card) => card.instanceId === "test-full-stack");
    const ebbAndFlow = run.cycle.hand.find((card) => card.instanceId === "test-ebb-and-flow");
    if (!fullStack || !ebbAndFlow) throw new Error("Expected Paul's tactics in hand");

    expect(getCardPresentation(run, fullStack, { kind: "squad" })?.cue).toMatchObject({
      developerId: "paul",
      level: "micro",
      title: "Full Stack",
    });
    expect(getCardPresentation(run, ebbAndFlow, { kind: "squad" })?.cue).toMatchObject({
      developerId: "paul",
      level: "hero",
      title: "Ebb & Flow",
    });
  });

  it("gives Madi a rare hero moment while Generated agents keep the passive compact", () => {
    const state = startCycle(["madi", "odin", "paul"]);
    const baseRun = state.run;
    if (!baseRun?.cycle) throw new Error("Expected an active Cycle");
    const run = {
      ...baseRun,
      cycle: {
        ...baseRun.cycle,
        hand: [
          ...baseRun.cycle.hand,
          { cardId: "parallel-agents", instanceId: "test-parallel-agents" },
          { cardId: "sub-agent", instanceId: "test-sub-agent", generated: true },
        ],
      },
    };
    const parallelAgents = run.cycle.hand.find(
      (card) => card.instanceId === "test-parallel-agents",
    );
    const subAgent = run.cycle.hand.find((card) => card.instanceId === "test-sub-agent");
    if (!parallelAgents || !subAgent) throw new Error("Expected Madi cards in hand");

    expect(getCardPresentation(run, parallelAgents, { kind: "squad" })?.cue).toMatchObject({
      developerId: "madi",
      level: "hero",
      title: "Parallel Agents",
    });
    expect(
      getCardPresentation(run, subAgent, {
        taskId: "status-composer",
        discipline: "frontend",
      })?.cue,
    ).toMatchObject({
      developerId: "madi",
      level: "micro",
      title: "Custom Setup",
    });
  });

  it("gives Odin's Architecture Review a hero moment and shared Comments a passive cue", () => {
    const state = startCycle(["odin", "madi", "paul"]);
    const baseRun = state.run;
    if (!baseRun?.cycle) throw new Error("Expected an active Cycle");
    const run = {
      ...baseRun,
      cycle: {
        ...baseRun.cycle,
        hand: [
          ...baseRun.cycle.hand,
          { cardId: "architecture-review", instanceId: "test-architecture-review" },
          { cardId: "comment", instanceId: "test-comment", generated: true },
        ],
        tasks: baseRun.cycle.tasks.map((task) => ({
          ...task,
          requirements: task.requirements.map((requirement, index) => ({
            ...requirement,
            unverified: index === 0 ? 2 : 0,
          })),
        })),
      },
    };
    const architectureReview = run.cycle.hand.find(
      (card) => card.instanceId === "test-architecture-review",
    );
    const comment = run.cycle.hand.find((card) => card.instanceId === "test-comment");
    if (!architectureReview || !comment) throw new Error("Expected Odin cards in hand");

    expect(getCardPresentation(run, architectureReview, { kind: "squad" })?.cue).toMatchObject({
      developerId: "odin",
      level: "hero",
      title: "Architecture Review",
    });
    expect(getCardPresentation(run, comment, { taskId: "status-composer" })?.cue).toMatchObject({
      developerId: "odin",
      level: "micro",
      title: "I Have Concerns",
    });
  });
});
