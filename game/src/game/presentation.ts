import { getCardForInstance, getDeveloper } from "../domain/content";
import type { CardInstance, DeveloperId, RunState } from "../domain/models";
import {
  applyCardResolutionToTask,
  applyRosterBoardEffects,
  isTaskReady,
  resolveCardTarget,
} from "./rules";
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
  const card = getCardForInstance(instance);
  const baseTasks = cycle.tasks.map((task) =>
    resolution.kind === "review" ||
    resolution.verifiedWorkHits.some((hit) => hit.taskId === task.taskId)
      ? applyCardResolutionToTask(task, resolution)
      : task.taskId === resolution.taskId
        ? applyCardResolutionToTask(task, resolution)
        : task,
  );
  const rosterEffects = applyRosterBoardEffects(run, instance, resolution, baseTasks);
  const passiveIds = [
    ...new Set([...resolution.triggeredPassiveIds, ...rosterEffects.triggeredPassiveIds]),
  ];

  if (!resolution.taskId) {
    if (!card.ownerId) return { triggeredPassiveIds: passiveIds };
    return {
      triggeredPassiveIds: passiveIds,
      cue: {
        developerId: card.ownerId,
        detail: [resolution.label, ...rosterEffects.labels].filter(Boolean).join(" · "),
        level: card.rarity === "rare" ? "hero" : "micro",
        title: card.name,
      },
    };
  }

  const task = cycle.tasks.find((candidate) => candidate.taskId === resolution.taskId);
  if (!task) return undefined;
  const resolvedTask =
    rosterEffects.tasks.find((candidate) => candidate.taskId === task.taskId) ?? task;
  const taskCompleted = !isTaskReady(task) && isTaskReady(resolvedTask);
  const ownPassiveCombo = Boolean(card.ownerId && passiveIds.includes(card.ownerId));
  const developerId =
    card.ownerId ?? [...passiveIds].reverse().find((id) => id !== "paul") ?? passiveIds[0];

  if (!developerId) {
    return { triggeredPassiveIds: passiveIds };
  }

  const developer = getDeveloper(developerId);
  const ownsTriggeredPassive = passiveIds.includes(developerId);
  const detail = [
    ownsTriggeredPassive ? developer.passiveName : undefined,
    resolution.label,
    ...rosterEffects.labels,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    triggeredPassiveIds: passiveIds,
    cue: {
      developerId,
      detail,
      level: taskCompleted || ownPassiveCombo || card.rarity === "rare" ? "hero" : "micro",
      title: taskCompleted ? "Task Done" : card.ownerId ? card.name : developer.passiveName,
    },
  };
}
