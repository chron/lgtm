import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RunState } from "../domain/models";
import { buildRetroBoard, retroFormats, selectRetroFormat } from "../domain/retro";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { RetroScreen } from "./RetroScreen";

function testRun(defects = 0, seed = 42): RunState {
  const started = gameReducer(initialGameState, { type: "START_RUN", seed });
  if (!started.run) throw new Error("Expected a run");
  return {
    ...started.run,
    squad: ["paul", "odin", "irene"],
    tools: ["merge-queue", "test-suite"],
    morale: 6,
    techDebt: 3,
    history: [
      ...started.run.history,
      {
        kind: "task-shipped",
        nodeId: "cycle-1",
        taskId: "status-composer",
        defects: 0,
        moraleLoss: 0,
        techDebtAdded: 0,
        focusGained: 0,
      },
      {
        kind: "task-shipped",
        nodeId: "final-release",
        taskId: "final-release",
        defects,
        moraleLoss: defects,
        techDebtAdded: defects > 1 ? 1 : 0,
        focusGained: 0,
      },
    ],
  };
}

describe("release Retro", () => {
  it("selects one coherent heading set deterministically", () => {
    for (const seed of [1, 42, 99, 0x5eed1234]) {
      const format = selectRetroFormat(seed);
      expect(selectRetroFormat(seed)).toEqual(format);
      expect(retroFormats).toContainEqual(format);
    }
  });

  it("distinguishes clean launches, Known Issues, and technical shipments", () => {
    expect(buildRetroBoard(testRun(0), "victory")).toMatchObject({
      result: "SHIPPED",
      resultDetail: "Clean launch · 0 Defects",
    });
    expect(buildRetroBoard(testRun(1), "victory")).toMatchObject({
      result: "SHIPPED*",
      resultDetail: "Victory · Known Issues",
    });
    expect(buildRetroBoard(testRun(3), "defeat", "technically-shipped")).toMatchObject({
      result: "TECHNICALLY SHIPPED",
      resultDetail: "3 Defects · Launch rejected",
    });
  });

  it("attributes deadline and Morale defeats plainly", () => {
    expect(buildRetroBoard(testRun(), "defeat", "morale").result).toBe("BURNED OUT");
    expect(buildRetroBoard(testRun(), "defeat", "final-release").result).toBe("MISSED LAUNCH");
  });

  it("turns real run history into semantic stickies and a boss note", () => {
    const board = buildRetroBoard(testRun(1), "victory");

    expect(board.columns.map((column) => column.kind)).toEqual(["good", "bad", "actions"]);
    expect(board.columns[0].stickies).toContain("2 Tasks shipped");
    expect(board.columns[1].stickies).toContain("3 Tech Debt came with us");
    expect(board.columns[2].stickies).toContain("Review AI output before launch");
    expect(board.bossNote).toBe("directionally significant");
  });

  it("renders the chosen format with stable accessible meanings", () => {
    const run = testRun(1);
    const board = buildRetroBoard(run, "victory");
    const markup = renderToStaticMarkup(
      <RetroScreen dispatch={() => undefined} outcome="victory" run={run} />,
    );

    expect(markup).toContain("SHIPPED*");
    expect(markup).toContain(`Good: ${board.columns[0].label}`);
    expect(markup).toContain(`Bad: ${board.columns[1].label}`);
    expect(markup).toContain(`Actions: ${board.columns[2].label}`);
    expect(markup).toContain("Tristan added");
    expect(markup).toContain("directionally significant");
  });
});
