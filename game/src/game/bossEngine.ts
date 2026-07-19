import { getBossDefinition, getBossPhase, type BossDefinition } from "../domain/bosses";
import type {
  BossEffect,
  BossEffectTarget,
  BossEncounterState,
  BossPhase,
  CycleState,
  Discipline,
  RequirementState,
  RunState,
  TaskDefinition,
  TaskState,
} from "../domain/models";
import { refreshTaskStatus, requirementProgress } from "./rules";

interface EffectResolution {
  effectId: string;
  phase: BossPhase;
  label: string;
}

interface RequirementLocation {
  taskIndex: number;
  requirementIndex: number;
  task: TaskState;
  requirement: RequirementState;
}

function createTaskState(task: TaskDefinition, day: number): TaskState {
  return {
    taskId: task.id,
    name: task.name,
    role: task.role,
    status: "open",
    stunned: false,
    spawnedDay: day,
    requirements: task.requirements.map((requirement) => ({
      ...requirement,
      verified: 0,
      unverified: 0,
      scriptPower: 0,
      scriptBlock: 0,
    })),
  };
}

function remainingWork(requirement: RequirementState): number {
  return Math.max(0, requirement.target - requirementProgress(requirement));
}

function matchingRequirements(cycle: CycleState, discipline?: Discipline): RequirementLocation[] {
  return cycle.tasks.flatMap((task, taskIndex) =>
    task.status === "shipped"
      ? []
      : task.requirements.flatMap((requirement, requirementIndex) =>
          (!discipline || requirement.discipline === discipline) && remainingWork(requirement) > 0
            ? [{ taskIndex, requirementIndex, task, requirement }]
            : [],
        ),
  );
}

function resolveTargets(cycle: CycleState, target: BossEffectTarget): RequirementLocation[] {
  if (target.kind === "task") {
    return matchingRequirements(cycle, target.discipline).filter(
      (location) => location.task.taskId === target.taskId,
    );
  }

  const candidates = matchingRequirements(cycle, target.discipline);
  if (target.kind === "all-open-tasks") return candidates;
  if (candidates.length === 0) return [];

  const ordered = [...candidates].sort((left, right) => {
    if (target.order === "most-progress") {
      return requirementProgress(right.requirement) - requirementProgress(left.requirement);
    }
    const direction = target.order === "most-remaining" ? -1 : 1;
    return direction * (remainingWork(left.requirement) - remainingWork(right.requirement));
  });
  return [ordered[0]!];
}

function updateRequirements(
  cycle: CycleState,
  locations: readonly RequirementLocation[],
  update: (requirement: RequirementState) => RequirementState,
): CycleState {
  const locationKeys = new Set(
    locations.map((location) => `${location.taskIndex}:${location.requirementIndex}`),
  );
  return {
    ...cycle,
    tasks: cycle.tasks.map((task, taskIndex) =>
      refreshTaskStatus({
        ...task,
        requirements: task.requirements.map((requirement, requirementIndex) =>
          locationKeys.has(`${taskIndex}:${requirementIndex}`) ? update(requirement) : requirement,
        ),
      }),
    ),
  };
}

function effectLabel(effect: BossEffect, affected: number): string {
  switch (effect.kind) {
    case "spawn-task":
      return `${effect.requiredForLaunch ? "Required Task" : "Task"} · ${effect.task.name}`;
    case "scope":
      return `Scope +${effect.amount} · ${affected} ${affected === 1 ? "requirement" : "requirements"}`;
    case "work":
      return `${effect.workKind === "verified" ? "Verified" : "Unverified"} Work +${effect.amount}`;
    case "regression":
      return `Regression −${effect.amount}`;
    case "crunch":
      return `Crunch · −${effect.moraleLoss} Morale`;
  }
}

function applyBossEffect(
  run: RunState,
  cycle: CycleState,
  effect: BossEffect,
): { run: RunState; cycle: CycleState; label: string } {
  if (effect.kind === "spawn-task") {
    if (cycle.tasks.some((task) => task.taskId === effect.task.id)) {
      return { run, cycle, label: `${effect.task.name} · Already on board` };
    }
    const requiredSpawnedTaskIds = effect.requiredForLaunch
      ? [...(cycle.boss?.requiredSpawnedTaskIds ?? []), effect.task.id]
      : (cycle.boss?.requiredSpawnedTaskIds ?? []);
    const nextCycle: CycleState = {
      ...cycle,
      boss: cycle.boss ? { ...cycle.boss, requiredSpawnedTaskIds } : undefined,
      tasks: [...cycle.tasks, createTaskState(effect.task, cycle.day)],
    };
    return { run: { ...run, cycle: nextCycle }, cycle: nextCycle, label: effectLabel(effect, 1) };
  }

  if (effect.kind === "crunch") {
    const blocked = Math.min(cycle.block, effect.moraleLoss);
    const nextCycle = { ...cycle, block: cycle.block - blocked };
    const nextRun = {
      ...run,
      morale: run.morale - (effect.moraleLoss - blocked),
      cycle: nextCycle,
    };
    return { run: nextRun, cycle: nextCycle, label: effectLabel(effect, 1) };
  }

  const targets = resolveTargets(cycle, effect.target);
  if (targets.length === 0) return { run, cycle, label: `${effectLabel(effect, 0)} · No target` };

  const nextCycle = updateRequirements(cycle, targets, (requirement) => {
    if (effect.kind === "scope") {
      return { ...requirement, target: requirement.target + effect.amount };
    }
    if (effect.kind === "work") {
      const amount = Math.min(effect.amount, remainingWork(requirement));
      return {
        ...requirement,
        verified: requirement.verified + (effect.workKind === "verified" ? amount : 0),
        unverified: requirement.unverified + (effect.workKind === "unverified" ? amount : 0),
      };
    }
    const unverifiedLoss = Math.min(requirement.unverified, effect.amount);
    const verifiedLoss = Math.min(requirement.verified, effect.amount - unverifiedLoss);
    return {
      ...requirement,
      unverified: requirement.unverified - unverifiedLoss,
      verified: requirement.verified - verifiedLoss,
    };
  });
  return {
    run: { ...run, cycle: nextCycle },
    cycle: nextCycle,
    label: effectLabel(effect, targets.length),
  };
}

export function createBossEncounter(boss: BossDefinition): BossEncounterState {
  const opening = getBossPhase(boss, "build");
  return queueBossEffects(
    {
      bossId: boss.id,
      phase: "build",
      effectQueue: [],
      requiredSpawnedTaskIds: [],
      nextEffectId: 1,
    },
    opening.onEnter,
  );
}

export function queueBossEffects(
  encounter: BossEncounterState,
  effects: readonly BossEffect[],
): BossEncounterState {
  return {
    ...encounter,
    effectQueue: [
      ...encounter.effectQueue,
      ...effects.map((effect, index) => ({
        id: `boss-effect-${encounter.nextEffectId + index}`,
        phase: encounter.phase,
        effect,
      })),
    ],
    nextEffectId: encounter.nextEffectId + effects.length,
  };
}

export function drainBossEffectQueue(
  run: RunState,
  cycle: CycleState,
): { run: RunState; cycle: CycleState; resolutions: EffectResolution[] } {
  let nextRun = run;
  let nextCycle = cycle;
  const resolutions: EffectResolution[] = [];
  for (const queued of cycle.boss?.effectQueue ?? []) {
    const applied = applyBossEffect(nextRun, nextCycle, queued.effect);
    nextRun = applied.run;
    nextCycle = applied.cycle;
    resolutions.push({ effectId: queued.id, phase: queued.phase, label: applied.label });
  }
  nextCycle = {
    ...nextCycle,
    boss: nextCycle.boss ? { ...nextCycle.boss, effectQueue: [] } : undefined,
  };
  nextRun = { ...nextRun, cycle: nextCycle };
  return { run: nextRun, cycle: nextCycle, resolutions };
}

function projectProgressRatio(cycle: CycleState, boss: BossDefinition): number {
  const projectTaskIds = new Set(
    boss.project.tasks.filter((task) => task.role !== "complication").map((task) => task.id),
  );
  let target = 0;
  let progress = 0;
  for (const task of cycle.tasks) {
    if (!projectTaskIds.has(task.taskId)) continue;
    for (const requirement of task.requirements) {
      target += requirement.target;
      progress += Math.min(requirement.target, requirementProgress(requirement));
    }
  }
  return target > 0 ? progress / target : 0;
}

export function isBossLaunchReady(cycle: CycleState, boss: BossDefinition): boolean {
  const projectTaskIds = boss.project.tasks
    .filter((task) => task.role !== "complication")
    .map((task) => task.id);
  const projectsReady = projectTaskIds.every((taskId) => {
    const task = cycle.tasks.find((candidate) => candidate.taskId === taskId);
    return task?.status === "ready" || task?.status === "shipped";
  });
  const spawnedRequiredShipped = (cycle.boss?.requiredSpawnedTaskIds ?? []).every(
    (taskId) => cycle.tasks.find((task) => task.taskId === taskId)?.status === "shipped",
  );
  return projectsReady && spawnedRequiredShipped;
}

function triggerReached(cycle: CycleState, boss: BossDefinition): boolean {
  const phase = getBossPhase(boss, cycle.boss?.phase ?? "build");
  if (!phase.exitTrigger) return false;
  return phase.exitTrigger.kind === "project-progress"
    ? projectProgressRatio(cycle, boss) >= phase.exitTrigger.ratio
    : isBossLaunchReady(cycle, boss);
}

function nextPhase(phase: BossPhase): BossPhase | undefined {
  return phase === "build"
    ? "stakeholder-review"
    : phase === "stakeholder-review"
      ? "launch-window"
      : undefined;
}

export function reconcileBossEncounter(
  run: RunState,
  cycle: CycleState,
  boss: BossDefinition = getBossDefinition(cycle.boss?.bossId ?? run.selectedBossId),
): { run: RunState; cycle: CycleState } {
  if (!cycle.boss || cycle.boss.transitionNotice || !triggerReached(cycle, boss)) {
    return { run, cycle };
  }
  const to = nextPhase(cycle.boss.phase);
  if (!to) return { run, cycle };
  const from = cycle.boss.phase;
  const destination = getBossPhase(boss, to);
  const queuedCycle: CycleState = {
    ...cycle,
    boss: queueBossEffects({ ...cycle.boss, phase: to }, destination.onEnter),
  };
  const drained = drainBossEffectQueue({ ...run, cycle: queuedCycle }, queuedCycle);
  const nextCycle: CycleState = {
    ...drained.cycle,
    boss: drained.cycle.boss
      ? {
          ...drained.cycle.boss,
          transitionNotice: {
            from,
            to,
            title: destination.title,
            summary: destination.summary,
            resolvedEffects: drained.resolutions.map((resolution) => resolution.label),
          },
        }
      : undefined,
  };
  const effectHistory = drained.resolutions.map((resolution) => ({
    kind: "boss-effect-resolved" as const,
    bossId: boss.id,
    phase: resolution.phase,
    effectId: resolution.effectId,
    day: cycle.day,
    label: resolution.label,
  }));
  const nextRun: RunState = {
    ...drained.run,
    cycle: nextCycle,
    history: [
      ...drained.run.history,
      { kind: "boss-phase-changed", bossId: boss.id, from, to, day: cycle.day },
      ...effectHistory,
    ],
  };
  return { run: nextRun, cycle: nextCycle };
}

export function acknowledgeBossTransition(
  run: RunState,
  cycle: CycleState,
): { run: RunState; cycle: CycleState } {
  if (!cycle.boss?.transitionNotice) return { run, cycle };
  const clearedCycle: CycleState = {
    ...cycle,
    boss: { ...cycle.boss, transitionNotice: undefined },
  };
  return reconcileBossEncounter({ ...run, cycle: clearedCycle }, clearedCycle);
}

export function resolveOpeningBossEffects(
  run: RunState,
  cycle: CycleState,
): { run: RunState; cycle: CycleState } {
  const drained = drainBossEffectQueue(run, cycle);
  if (drained.resolutions.length === 0) return drained;
  const history = drained.resolutions.map((resolution) => ({
    kind: "boss-effect-resolved" as const,
    bossId: cycle.boss?.bossId ?? run.selectedBossId,
    phase: resolution.phase,
    effectId: resolution.effectId,
    day: cycle.day,
    label: resolution.label,
  }));
  return {
    run: { ...drained.run, history: [...drained.run.history, ...history] },
    cycle: drained.cycle,
  };
}

export function bossPhaseLabel(phase: BossPhase): string {
  return phase === "stakeholder-review"
    ? "Stakeholder Review"
    : phase === "launch-window"
      ? "Launch Window"
      : "Build";
}
