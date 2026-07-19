import { getCycle } from "../domain/content";
import type { GameState } from "./gameReducer";

export function useTestCycle(state: GameState, cycleId: string): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  const definition = getCycle(cycleId);

  return {
    ...state,
    screen: { name: "cycle", nodeId: state.run.cycle.nodeId, cycleId },
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        cycleId,
        day: 1,
        tasks: definition.tasks
          .filter((task) => task.role !== "complication")
          .map((task) => ({
            taskId: task.id,
            name: task.name,
            role: task.role,
            status: "open" as const,
            stunned: false,
            spawnedDay: 1,
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              verified: 0,
              unverified: 0,
              scriptPower: 0,
              scriptBlock: 0,
            })),
          })),
      },
    },
  };
}
