import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DeveloperId } from "../domain/models";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { TaskPanel } from "./TaskPanel";

function cycleFixture(squad: readonly DeveloperId[] = ["paul", "odin", "madi"]) {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return state.run;
}

describe("TaskPanel", () => {
  it("dims a cancelled Task and explains that its End Day effect has no effect", () => {
    const baseRun = cycleFixture();
    const task = { ...baseRun.cycle!.tasks[0]!, stunned: true };
    const run = { ...baseRun, cycle: { ...baseRun.cycle!, tasks: [task] } };
    const markup = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName={task.name ?? task.taskId}
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );

    expect(markup).toContain("task-panel is-stunned");
    expect(markup).toContain("Cancelled Today");
    expect(markup).toContain("will not happen today");
  });

  it("previews dirty shipping as Defects and Debt without ordinary Morale loss", () => {
    const baseRun = cycleFixture();
    const task = {
      ...baseRun.cycle!.tasks[0]!,
      status: "ready" as const,
      requirements: baseRun.cycle!.tasks[0]!.requirements.map((requirement) => ({
        ...requirement,
        unverified: requirement.target,
      })),
    };
    const run = { ...baseRun, cycle: { ...baseRun.cycle!, tasks: [task] } };
    const markup = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName={task.name ?? task.taskId}
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );

    expect(markup).toContain("5 Defects");
    expect(markup).toContain("+7 Tech Debt");
    expect(markup).toContain("Defects are recorded for this run");
    expect(markup).toContain("persists into later Cycles");
    expect(markup).not.toContain("Morale lost");
  });

  it("exposes requirement drop targets for Script tactics", () => {
    const run = cycleFixture(["seb", "toby", "steph"] as const);
    const task = run.cycle!.tasks[0]!;
    const requirement = task.requirements[0]!;

    const markup = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName={task.name ?? task.taskId}
        selectedCard={{ cardId: "one-click-setup", instanceId: "test-one-click-setup" }}
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );

    expect(markup).toContain(`data-card-target="${task.taskId}:${requirement.discipline}"`);
    expect(markup).toContain("is-targetable");
  });
});
