import { describe, expect, it } from "vitest";
import { createGameActionLogEvent } from "../game/actionLog";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { summarizeHumanActionLog } from "./humanTelemetry";

describe("human playtest telemetry", () => {
  it("summarizes the same reducer action stream written by the browser logger", () => {
    const actions = [
      { type: "START_RUN", seed: 42 } as const,
      { type: "TOGGLE_DEVELOPER", developerId: "kirsten" } as const,
      { type: "TOGGLE_DEVELOPER", developerId: "nick" } as const,
      { type: "TOGGLE_DEVELOPER", developerId: "levi" } as const,
      { type: "CONFIRM_SQUAD" } as const,
      { type: "VISIT_NODE", nodeId: "cycle-1" } as const,
    ];
    let state = initialGameState;
    const events = actions.map((action, index) => {
      const before = state;
      state = gameReducer(state, action);
      return createGameActionLogEvent(action, before, state, {
        at: `2026-07-19T00:00:0${index}.000Z`,
        runId: "human-42",
        sessionId: "session-1",
        sequence: index + 1,
      });
    });

    const result = summarizeHumanActionLog(
      "run-human-42.jsonl",
      events.map((event) => JSON.stringify(event)).join("\n"),
    );

    expect(result).toMatchObject({
      scenarioId: "card-storm",
      policy: "human",
      deckMode: "starter",
      sourceId: "run-human-42.jsonl",
      seed: 42,
      squad: ["kirsten", "nick", "levi"],
      outcome: "incomplete",
      cause: "incomplete-on-cycle",
      encounters: 1,
      finalDeck: expect.any(Array),
    });
  });

  it("rejects malformed JSONL with a useful source line", () => {
    expect(() => summarizeHumanActionLog("bad.jsonl", "{nope}")).toThrow("bad.jsonl:1");
  });

  it("keeps the terminal run after returning to title and reports wall-clock duration", () => {
    const actions = [{ type: "START_RUN", seed: 42 } as const, { type: "RETURN_TITLE" } as const];
    let state = initialGameState;
    const events = actions.map((action, index) => {
      const before = state;
      state = gameReducer(state, action);
      return createGameActionLogEvent(action, before, state, {
        at: `2026-07-19T00:0${index}:00.000Z`,
        runId: "human-42",
        sessionId: "session-1",
        sequence: index + 1,
      });
    });

    expect(
      summarizeHumanActionLog(
        "returned-to-title.jsonl",
        events.map((event) => JSON.stringify(event)).join("\n"),
      ),
    ).toMatchObject({ seed: 42, durationMs: 0, cause: "incomplete-on-squad" });
  });

  it("rejects traces without a run start so directory reports can skip them", () => {
    const event = createGameActionLogEvent(
      { type: "RETURN_TITLE" },
      initialGameState,
      initialGameState,
      {
        at: "2026-07-19T00:00:00.000Z",
        runId: "no-run",
        sessionId: "session-1",
        sequence: 1,
      },
    );
    expect(() => summarizeHumanActionLog("no-run.jsonl", JSON.stringify(event))).toThrow(
      "no accepted START_RUN",
    );
  });
});
