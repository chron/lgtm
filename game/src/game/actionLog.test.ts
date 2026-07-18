import { describe, expect, it } from "vitest";
import { createGameActionLogEvent } from "./actionLog";
import { gameReducer, initialGameState } from "./gameReducer";

describe("game action log", () => {
  it("records a reducer transition with enough state to inspect the run", () => {
    const startAction = { type: "START_RUN", seed: 42 } as const;
    const started = gameReducer(initialGameState, startAction);
    const event = createGameActionLogEvent(startAction, initialGameState, started, {
      at: "2026-07-19T00:00:00.000Z",
      runId: "run-42",
      sessionId: "session-1",
      sequence: 1,
    });

    expect(event).toEqual({
      schemaVersion: 1,
      at: "2026-07-19T00:00:00.000Z",
      runId: "run-42",
      sessionId: "session-1",
      sequence: 1,
      type: "START_RUN",
      action: startAction,
      accepted: true,
      screenBefore: "title",
      screenAfter: "squad",
      state: started,
    });
  });
});
