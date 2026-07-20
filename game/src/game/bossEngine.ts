import {
  getBossDefinition,
  getBossPhase,
  getScheduledBossIntent,
  type BossDefinition,
  type BossIntentEffect,
} from "../domain/bosses";
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
import {
  absorbMoraleDamage,
  refreshTaskStatus,
  requirementProgress,
  taskShippingPreview,
} from "./rules";

export interface BossLaunchPreview {
  ready: boolean;
  taskIds: readonly string[];
  unverifiedWork: number;
  defects: number;
  blocked: number;
  moraleLoss: number;
  finalMorale: number;
  outcome: "clean" | "known-issues" | "technically-shipped" | "burned-out";
}

export interface BossIntentPreview {
  id: string;
  label: string;
  summary: string;
  quote: string;
  sourceTaskId: string;
  stunned: boolean;
  moraleLoss: number;
}

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

function matchingRequirements(
  cycle: CycleState,
  discipline: Discipline | undefined,
  effectKind: "scope" | "work" | "regression",
): RequirementLocation[] {
  return cycle.tasks.flatMap((task, taskIndex) =>
    task.status === "shipped"
      ? []
      : task.requirements.flatMap((requirement, requirementIndex) =>
          (!discipline || requirement.discipline === discipline) &&
          (effectKind === "scope"
            ? true
            : effectKind === "regression"
              ? requirementProgress(requirement) > 0
              : remainingWork(requirement) > 0)
            ? [{ taskIndex, requirementIndex, task, requirement }]
            : [],
        ),
  );
}

function resolveTargets(
  cycle: CycleState,
  target: BossEffectTarget,
  effectKind: "scope" | "work" | "regression",
): RequirementLocation[] {
  if (target.kind === "task") {
    return matchingRequirements(cycle, target.discipline, effectKind).filter(
      (location) => location.task.taskId === target.taskId,
    );
  }

  const candidates = matchingRequirements(cycle, target.discipline, effectKind);
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

  const targets = resolveTargets(cycle, effect.target, effect.kind);
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

function materializeBossIntentEffects(
  cycle: CycleState,
  effects: readonly BossIntentEffect[],
): BossEffect[] {
  return effects.flatMap((effect): BossEffect[] => {
    if (effect.kind === "validation-scope") {
      const openValidationTaskIds = effect.taskIds.filter((taskId) => {
        const task = cycle.tasks.find((candidate) => candidate.taskId === taskId);
        return task && task.status !== "shipped";
      });
      return openValidationTaskIds.length > 0
        ? openValidationTaskIds.map((taskId) => ({
            kind: "scope" as const,
            target: { kind: "task" as const, taskId },
            amount: effect.amount,
          }))
        : [effect.fallback];
    }
    if (effect.kind === "validation-crunch") {
      const unfinished = effect.taskIds.filter((taskId) => {
        const task = cycle.tasks.find((candidate) => candidate.taskId === taskId);
        return task && task.status !== "shipped";
      }).length;
      return [{ kind: "crunch", moraleLoss: effect.base + effect.perOpenTask * unfinished }];
    }
    return [effect];
  });
}

export function getBossIntentPreview(
  run: RunState,
  cycle: CycleState,
  boss: BossDefinition = getBossDefinition(cycle.boss?.bossId ?? run.selectedBossId),
): BossIntentPreview | undefined {
  const intent = getScheduledBossIntent(run, cycle, boss);
  if (!intent) return undefined;
  const sourceTask = cycle.tasks.find((task) => task.taskId === intent.sourceTaskId);
  const effects = materializeBossIntentEffects(cycle, intent.effects);
  return {
    id: intent.id,
    label: intent.label,
    summary: intent.summary,
    quote: intent.quote,
    sourceTaskId: intent.sourceTaskId,
    stunned: sourceTask?.stunned ?? false,
    moraleLoss: effects.reduce(
      (total, effect) => total + (effect.kind === "crunch" ? effect.moraleLoss : 0),
      0,
    ),
  };
}

export function resolveBossDayIntent(
  run: RunState,
  cycle: CycleState,
  boss: BossDefinition = getBossDefinition(cycle.boss?.bossId ?? run.selectedBossId),
): { run: RunState; cycle: CycleState; resolutions: EffectResolution[] } {
  const intent = getScheduledBossIntent(run, cycle, boss);
  if (!intent || !cycle.boss) return { run, cycle, resolutions: [] };
  const sourceTask = cycle.tasks.find((task) => task.taskId === intent.sourceTaskId);
  if (sourceTask?.stunned) {
    const label = `Stunned · ${intent.label}`;
    const stunnedCycle = {
      ...cycle,
      resolvedIntents: [...cycle.resolvedIntents, label],
    };
    return {
      run: { ...run, cycle: stunnedCycle },
      cycle: stunnedCycle,
      resolutions: [],
    };
  }

  const effects = materializeBossIntentEffects(cycle, intent.effects);
  const queuedCycle = {
    ...cycle,
    boss: queueBossEffects(cycle.boss, effects),
  };
  const drained = drainBossEffectQueue({ ...run, cycle: queuedCycle }, queuedCycle);
  const labelledCycle = {
    ...drained.cycle,
    resolvedIntents: [...drained.cycle.resolvedIntents, intent.label],
  };
  const effectHistory = drained.resolutions.map((resolution) => ({
    kind: "boss-effect-resolved" as const,
    bossId: boss.id,
    phase: resolution.phase,
    effectId: resolution.effectId,
    day: cycle.day,
    label: `${intent.label} · ${resolution.label}`,
  }));
  const nextRun = {
    ...drained.run,
    cycle: labelledCycle,
    history: [...drained.run.history, ...effectHistory],
  };
  return { run: nextRun, cycle: labelledCycle, resolutions: drained.resolutions };
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

export function getBossLaunchPreview(
  run: RunState,
  cycle: CycleState,
  boss: BossDefinition = getBossDefinition(cycle.boss?.bossId ?? run.selectedBossId),
): BossLaunchPreview {
  const projectTaskIds = new Set(
    boss.project.tasks.filter((task) => task.role !== "complication").map((task) => task.id),
  );
  const pendingTasks = cycle.tasks.filter(
    (task) => projectTaskIds.has(task.taskId) && task.status === "ready",
  );
  const previews = pendingTasks.map(taskShippingPreview);
  const unverifiedWork = cycle.tasks
    .filter((task) => projectTaskIds.has(task.taskId))
    .reduce(
      (taskTotal, task) =>
        taskTotal +
        task.requirements.reduce(
          (requirementTotal, requirement) => requirementTotal + requirement.unverified,
          0,
        ),
      0,
    );
  const defects = cycle.defects + previews.reduce((total, preview) => total + preview.defects, 0);
  const shippingDamage = absorbMoraleDamage(
    cycle.block,
    previews.reduce((total, preview) => total + preview.defects, 0),
  );
  const finalMorale = run.morale - shippingDamage.moraleLoss;
  const outcome =
    defects >= 2
      ? "technically-shipped"
      : finalMorale <= 0
        ? "burned-out"
        : defects === 1
          ? "known-issues"
          : "clean";

  return {
    ready: cycle.boss?.phase === "launch-window" && isBossLaunchReady(cycle, boss),
    taskIds: pendingTasks.map((task) => task.taskId),
    unverifiedWork,
    defects,
    blocked: shippingDamage.blocked,
    moraleLoss: shippingDamage.moraleLoss,
    finalMorale,
    outcome,
  };
}

function triggerReached(
  cycle: CycleState,
  boss: BossDefinition,
  trigger: { kind: "project-progress"; ratio: number } | { kind: "launch-ready" },
): boolean {
  return trigger.kind === "project-progress"
    ? projectProgressRatio(cycle, boss) >= trigger.ratio
    : isBossLaunchReady(cycle, boss);
}

function reconcileBossMilestones(
  run: RunState,
  cycle: CycleState,
  boss: BossDefinition,
): { run: RunState; cycle: CycleState } {
  if (!cycle.boss) return { run, cycle };
  let nextRun = run;
  let nextCycle = cycle;
  const phase = getBossPhase(boss, cycle.boss.phase);
  for (const milestone of phase.milestones ?? []) {
    if (milestone.resolved(nextCycle) || !triggerReached(nextCycle, boss, milestone.trigger)) {
      continue;
    }
    const queuedCycle = {
      ...nextCycle,
      boss: queueBossEffects(nextCycle.boss!, milestone.effects),
    };
    const drained = drainBossEffectQueue({ ...nextRun, cycle: queuedCycle }, queuedCycle);
    const effectHistory = drained.resolutions.map((resolution) => ({
      kind: "boss-effect-resolved" as const,
      bossId: boss.id,
      phase: resolution.phase,
      effectId: resolution.effectId,
      day: cycle.day,
      label: `${phase.title} · ${resolution.label}`,
    }));
    nextCycle = drained.cycle;
    nextRun = {
      ...drained.run,
      cycle: nextCycle,
      history: [...drained.run.history, ...effectHistory],
    };
  }
  return { run: nextRun, cycle: nextCycle };
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
  if (!cycle.boss || cycle.boss.transitionNotice) {
    return { run, cycle };
  }
  const milestoneResult = reconcileBossMilestones(run, cycle, boss);
  run = milestoneResult.run;
  cycle = milestoneResult.cycle;
  const encounter = cycle.boss;
  if (!encounter) return { run, cycle };
  const phase = getBossPhase(boss, encounter.phase);
  if (!phase.exitTrigger || !triggerReached(cycle, boss, phase.exitTrigger)) {
    return { run, cycle };
  }
  const to = nextPhase(encounter.phase);
  if (!to) return { run, cycle };
  const from = encounter.phase;
  const destination = getBossPhase(boss, to);
  const queuedCycle: CycleState = {
    ...cycle,
    boss: queueBossEffects({ ...encounter, phase: to }, destination.onEnter),
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
