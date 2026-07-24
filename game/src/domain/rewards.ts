import {
  eligibleRewardCardIds,
  getCard,
  getCardForInstance,
  squadRewardCardIds,
  teamRewardCardIds,
} from "./content";
import type { DeveloperId, RunState } from "./models";
import { sampleOne } from "../game/random";

export type RewardArchetype =
  | "card-storm"
  | "automation"
  | "completion"
  | "block"
  | "debt"
  | "planned-burst";

const developerRewardArchetypes = {
  paul: ["debt"],
  odin: ["planned-burst"],
  irene: ["completion"],
  madi: ["automation"],
  seb: ["completion"],
  toby: ["block"],
  steph: ["automation"],
  elspeth: ["block"],
  kirsten: ["card-storm"],
  matt: ["completion"],
  nick: ["planned-burst"],
  levi: ["card-storm"],
} as const satisfies Readonly<Record<DeveloperId, readonly RewardArchetype[]>>;

export const sharedBridgeArchetypes: Readonly<
  Record<string, readonly [RewardArchetype, RewardArchetype]>
> = {
  "green-build": ["automation", "completion"],
  "quick-script": ["automation", "completion"],
  "health-check": ["automation", "block"],
  "rubber-duck-session": ["card-storm", "block"],
  "small-pr": ["completion", "card-storm"],
  "contingency-plan": ["block", "planned-burst"],
  "spring-cleaning": ["debt", "card-storm"],
  "second-pair-of-eyes": ["debt", "completion"],
  "buffer-time": ["block", "planned-burst"],
  "open-source-it": ["card-storm", "block"],
  "known-shortcut": ["debt", "completion"],
  "protected-time": ["block", "completion"],
  "declare-bankruptcy": ["debt", "card-storm"],
};

export function rewardArchetypesForSquad(
  squad: readonly DeveloperId[],
): ReadonlySet<RewardArchetype> {
  return new Set(squad.flatMap((developerId) => developerRewardArchetypes[developerId]));
}

export function weightedTeamRewardCardIds(squad: readonly DeveloperId[]): string[] {
  const relevantArchetypes = rewardArchetypesForSquad(squad);
  const relevantBridges = teamRewardCardIds.filter((cardId) =>
    sharedBridgeArchetypes[cardId]?.some((archetype) => relevantArchetypes.has(archetype)),
  );
  return [...teamRewardCardIds, ...relevantBridges];
}

function canUseScriptTrigger(run: RunState): boolean {
  return run.deck.some((instance) => {
    const card = getCardForInstance(instance);
    return (
      card.automation?.kind === "install" ||
      (run.squad.includes("madi") && card.tags.includes("ai-assisted"))
    );
  });
}

export function eligibleRewardCardIdsForRun(run: RunState): string[] {
  return eligibleRewardCardIds(run.squad).filter(
    (cardId) => cardId !== "run-it-now" || canUseScriptTrigger(run),
  );
}

export function createCardRewardOffer(run: RunState): {
  cardIds: string[];
  rngState: number;
} {
  let rngState = run.rngState;
  const eligibleCardIds = eligibleRewardCardIdsForRun(run);
  const eligibleCardIdSet = new Set(eligibleCardIds);
  const squadPool = squadRewardCardIds.filter((cardId) => {
    const ownerId = getCard(cardId).ownerId;
    return ownerId ? run.squad.includes(ownerId) && eligibleCardIdSet.has(cardId) : false;
  });
  const squadPick = sampleOne(squadPool, rngState);
  rngState = squadPick.rngState;

  const teamPool = weightedTeamRewardCardIds(run.squad).filter(
    (cardId) => cardId !== squadPick.item && eligibleCardIdSet.has(cardId),
  );
  const teamPick = sampleOne(teamPool, rngState);
  rngState = teamPick.rngState;

  const wildcardPool = eligibleCardIds.filter(
    (cardId) => cardId !== squadPick.item && cardId !== teamPick.item,
  );
  const wildcardPick = sampleOne(wildcardPool, rngState);
  rngState = wildcardPick.rngState;

  const choiceCount = Math.max(
    3,
    ...run.nextRewardModifiers.map((modifier) => modifier.choiceCount ?? 3),
  );
  const tagsAny = run.nextRewardModifiers.flatMap((modifier) => modifier.tagsAny ?? []);
  const disciplines = run.nextRewardModifiers.flatMap((modifier) => modifier.disciplines ?? []);
  const hasThemeFilter = tagsAny.length > 0 || disciplines.length > 0;
  const cardIds = hasThemeFilter ? [] : [squadPick.item, teamPick.item, wildcardPick.item];
  const eligiblePool = eligibleCardIds.filter((cardId) => {
    const card = getCard(cardId);
    return (
      (!hasThemeFilter ||
        tagsAny.some((tag) => card.tags.includes(tag)) ||
        (card.discipline ? disciplines.includes(card.discipline) : false)) &&
      !cardIds.includes(cardId)
    );
  });
  while (cardIds.length < choiceCount && eligiblePool.some((cardId) => !cardIds.includes(cardId))) {
    const pick = sampleOne(
      eligiblePool.filter((cardId) => !cardIds.includes(cardId)),
      rngState,
    );
    cardIds.push(pick.item);
    rngState = pick.rngState;
  }

  if (
    run.nextRewardModifiers.some((modifier) => modifier.guaranteedRarity === "rare") &&
    !cardIds.some((cardId) => getCard(cardId).rarity === "rare")
  ) {
    const rarePool = eligibleCardIds.filter(
      (cardId) => getCard(cardId).rarity === "rare" && !cardIds.includes(cardId),
    );
    if (rarePool.length > 0) {
      const pick = sampleOne(rarePool, rngState);
      cardIds[cardIds.length - 1] = pick.item;
      rngState = pick.rngState;
    }
  }

  return { cardIds, rngState };
}
