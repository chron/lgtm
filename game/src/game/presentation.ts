import { getCard, getDeveloper } from "../domain/content";
import type { CardInstance, DeveloperId, RunState, TaskState } from "../domain/models";
import { isTaskReady, refreshTaskStatus, resolveCardTarget, verifyTask } from "./rules";
import type { CardTarget } from "./rules";

export interface CharacterCue {
  developerId: DeveloperId;
  detail: string;
  level: "hero" | "micro";
  title: string;
}

export interface CardPresentation {
  cue?: CharacterCue;
  triggeredPassiveIds: DeveloperId[];
}

export function getCardPresentation(
  run: RunState,
  instance: CardInstance,
  target: CardTarget,
): CardPresentation | undefined {
  const cycle = run.cycle;
  if (!cycle) return undefined;
  const resolution = resolveCardTarget(run, instance, target);
  if (!resolution.legal) return undefined;

  if (!resolution.taskId) {
    return { triggeredPassiveIds: resolution.triggeredPassiveIds };
  }

  const card = getCard(instance.cardId);
  const task = cycle.tasks.find((candidate) => candidate.taskId === resolution.taskId);
  if (!task) return undefined;
  const resolvedTask = applyResolution(task, resolution);
  const taskCompleted = !isTaskReady(task) && isTaskReady(resolvedTask);
  const ownPassiveCombo = Boolean(
    card.ownerId && resolution.triggeredPassiveIds.includes(card.ownerId),
  );
  const developerId =
    card.ownerId ??
    [...resolution.triggeredPassiveIds].reverse().find((id) => id !== "paul") ??
    resolution.triggeredPassiveIds[0];

  if (!developerId) {
    return { triggeredPassiveIds: resolution.triggeredPassiveIds };
  }

  const developer = getDeveloper(developerId);
  const ownsTriggeredPassive = resolution.triggeredPassiveIds.includes(developerId);
  const detail = [ownsTriggeredPassive ? developer.passiveName : undefined, resolution.label]
    .filter(Boolean)
    .join(" · ");

  return {
    triggeredPassiveIds: resolution.triggeredPassiveIds,
    cue: {
      developerId,
      detail,
      level: taskCompleted || ownPassiveCombo ? "hero" : "micro",
      title: taskCompleted ? "Task Done" : card.ownerId ? card.name : developer.passiveName,
    },
  };
}

function applyResolution(
  task: TaskState,
  resolution: Exclude<ReturnType<typeof resolveCardTarget>, { legal: false }>,
): TaskState {
  if (resolution.kind === "review") {
    return {
      ...verifyTask(task, resolution.amount),
      stunned: resolution.stun || task.stunned,
    };
  }

  if (resolution.kind === "tactic") {
    return { ...task, stunned: resolution.stun || task.stunned };
  }

  return refreshTaskStatus({
    ...task,
    requirements: task.requirements.map((requirement) =>
      requirement.discipline !== resolution.discipline
        ? requirement
        : {
            ...requirement,
            verified:
              requirement.verified +
              (resolution.workKind === "verified" ? resolution.amount : 0) +
              resolution.scriptRunAmount,
            unverified:
              requirement.unverified +
              (resolution.workKind === "unverified" ? resolution.amount : 0),
            scriptPower: requirement.scriptPower + resolution.scriptPowerAdded,
            scriptBlock: requirement.scriptBlock + resolution.scriptBlockAdded,
          },
    ),
  });
}
