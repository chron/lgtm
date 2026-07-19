import matejaDelighted from "../assets/bosses/mateja-delighted-v1.webp";
import matejaMaster from "../assets/bosses/mateja-master-v1.webp";
import matejaPitching from "../assets/bosses/mateja-pitching-v1.webp";
import tristanMaster from "../assets/bosses/tristan-master-v1.webp";
import tristanSatisfied from "../assets/bosses/tristan-satisfied-v1.webp";
import tristanThinking from "../assets/bosses/tristan-thinking-v1.webp";
import { getCycle } from "./content";
import type { BossEffect, BossPhase, CycleDefinition, CycleState } from "./models";

type BossPhaseTrigger = { kind: "project-progress"; ratio: number } | { kind: "launch-ready" };

export interface BossPhaseDefinition {
  id: BossPhase;
  title: string;
  summary: string;
  reactionArt: string;
  onEnter: readonly BossEffect[];
  exitTrigger?: BossPhaseTrigger;
}

export interface BossDefinition {
  id: string;
  stakeholder: string;
  title: string;
  projectTitle: string;
  warning: string;
  portrait: string;
  eligibility: (seed: number) => boolean;
  project: CycleDefinition;
  phases: readonly BossPhaseDefinition[];
  retroLines: {
    victory: string;
    knownIssues: string;
    defeat: string;
  };
}

const genericFinalProject = (id: string, name: string): CycleDefinition => ({
  id,
  name,
  maxDays: 9,
  tasks: [
    {
      id: "final-release",
      name,
      role: "primary",
      requirements: [
        { discipline: "frontend", target: 10 },
        { discipline: "backend", target: 10 },
        { discipline: "infra", target: 10 },
      ],
      intents: [
        { kind: "crunch", moraleLoss: 3 },
        { kind: "scope", discipline: "backend", amount: 5 },
        { kind: "crunch", moraleLoss: 4 },
        { kind: "scope", discipline: "infra", amount: 5 },
        { kind: "crunch", moraleLoss: 6 },
      ],
    },
  ],
});

function sharedPhases(
  idleArt: string,
  reviewArt: string,
  launchArt: string,
): readonly BossPhaseDefinition[] {
  return [
    {
      id: "build",
      title: "Build",
      summary: "The project is underway. The stakeholder is watching with great enthusiasm.",
      reactionArt: idleArt,
      onEnter: [],
      exitTrigger: { kind: "project-progress", ratio: 0.5 },
    },
    {
      id: "stakeholder-review",
      title: "Stakeholder Review",
      summary: "The review is in. Check the board before committing to the launch plan.",
      reactionArt: reviewArt,
      onEnter: [],
      exitTrigger: { kind: "launch-ready" },
    },
    {
      id: "launch-window",
      title: "Launch Window",
      summary: "Required Work is complete. Review the release quality and choose when to ship.",
      reactionArt: launchArt,
      onEnter: [],
    },
  ];
}

const alwaysEligible = () => true;

export const bossDefinitions: readonly BossDefinition[] = [
  {
    id: "mateja-weekend-pivot",
    stakeholder: "Mateja",
    title: "The Weekend Pivot",
    projectTitle: "Datum: Monday Launch",
    warning: "Expect rapid Scope and helpful Unverified Work.",
    portrait: matejaMaster,
    eligibility: alwaysEligible,
    project: genericFinalProject("mateja-weekend-pivot", "Datum: Monday Launch"),
    phases: sharedPhases(matejaMaster, matejaPitching, matejaDelighted),
    retroLines: {
      victory: "shipped before he invented a third product",
      knownIssues: "datum has entered its iterate-in-public era",
      defeat: "the demo was extremely compelling, technically",
    },
  },
  {
    id: "tristan-significance-test",
    stakeholder: "Tristan",
    title: "The Significance Test",
    projectTitle: "Prove the Fraud Model",
    warning: "Expect Validation Tasks and distributed pressure.",
    portrait: tristanMaster,
    eligibility: alwaysEligible,
    project: genericFinalProject("tristan-significance-test", "Prove the Fraud Model"),
    phases: sharedPhases(tristanMaster, tristanThinking, tristanSatisfied),
    retroLines: {
      victory: "sample size: acceptable",
      knownIssues: "directionally significant",
      defeat: "further research required",
    },
  },
] as const;

function seededIndex(seed: number, length: number): number {
  let value = (seed ^ 0xb055f19e) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) % length;
}

export function selectBossDefinition(
  seed: number,
  catalogue: readonly BossDefinition[] = bossDefinitions,
): BossDefinition {
  const eligible = catalogue.filter((boss) => boss.eligibility(seed));
  if (eligible.length === 0) throw new Error("No eligible Final Release boss definitions.");
  return eligible[seededIndex(seed, eligible.length)]!;
}

export function getBossDefinition(
  id: string,
  catalogue: readonly BossDefinition[] = bossDefinitions,
): BossDefinition {
  const boss = catalogue.find((candidate) => candidate.id === id);
  if (!boss) throw new Error(`Unknown boss: ${id}`);
  return boss;
}

export function getBossPhase(boss: BossDefinition, phase: BossPhase): BossPhaseDefinition {
  const definition = boss.phases.find((candidate) => candidate.id === phase);
  if (!definition) throw new Error(`Boss ${boss.id} does not define phase ${phase}.`);
  return definition;
}

export function getEncounterCycleDefinition(cycle: CycleState): CycleDefinition {
  return cycle.boss ? getBossDefinition(cycle.boss.bossId).project : getCycle(cycle.cycleId);
}
