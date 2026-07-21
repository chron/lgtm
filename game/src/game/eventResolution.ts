import {
  cards,
  developers,
  standardToolIds,
  getCard,
  getCardForInstance,
  getTool,
  mapEdges,
} from "../domain/content";
import {
  resolveEventRequirement,
  type EventCardFilter,
  type EventChoiceDefinition,
  type EventDeckSurgeryEffect,
  type EventEffect,
  type EventOutcomeChip,
} from "../domain/events";
import type {
  CardDefinition,
  CardInstance,
  EventMapModifier,
  RunState,
  ToolId,
} from "../domain/models";
import { sampleOne } from "./random";

interface EventSelectionOption {
  id: string;
  label: string;
  rules?: string;
  cardId?: string;
  toolId?: ToolId;
}

export interface EventPendingSelection {
  effectIndex: number;
  kind: "card" | "draft" | "tool" | "guest";
  prompt: string;
  options: readonly EventSelectionOption[];
}

export interface EventResolutionProgress {
  run: RunState;
  effectIndex: number;
  outcome: readonly string[];
  pending?: EventPendingSelection;
}

export interface ResolvedEventChoice {
  disabledReason?: string;
  outcome: readonly EventOutcomeChip[];
}

const techDebtCardThreshold = 3;

function signedAmount(amount: number): string {
  if (amount > 0) return `+${amount}`;
  if (amount < 0) return `−${Math.abs(amount)}`;
  return "0";
}

function cardRarity(card: CardDefinition): "normal" | "rare" {
  return card.rarity ?? "normal";
}

function matchesCardFilter(card: CardDefinition, run: RunState, filter: EventCardFilter): boolean {
  if (filter.anyOf && !filter.anyOf.some((candidate) => matchesCardFilter(card, run, candidate))) {
    return false;
  }
  if (filter.cardIds && !filter.cardIds.includes(card.id)) return false;
  if (filter.tagsAny && !filter.tagsAny.some((tag) => card.tags.includes(tag))) return false;
  if (filter.tagsAll && !filter.tagsAll.every((tag) => card.tags.includes(tag))) return false;
  if (filter.excludedTags?.some((tag) => card.tags.includes(tag))) return false;
  if (filter.disciplines && (!card.discipline || !filter.disciplines.includes(card.discipline))) {
    return false;
  }
  if (filter.rarities && !filter.rarities.includes(cardRarity(card))) return false;
  if (filter.owner === "squad" && (!card.ownerId || !run.squad.includes(card.ownerId)))
    return false;
  if (filter.owner === "non-squad" && (!card.ownerId || run.squad.includes(card.ownerId))) {
    return false;
  }
  if (
    filter.startersOnly &&
    !developers.some((developer) => developer.startingCardId === card.id)
  ) {
    return false;
  }
  return true;
}

function persistentCardOptions(run: RunState, filter: EventCardFilter): EventSelectionOption[] {
  return run.deck.flatMap((instance) => {
    const card = getCardForInstance(instance);
    return matchesCardFilter(card, run, filter)
      ? [{ id: instance.instanceId, label: card.name, rules: card.rules, cardId: card.id }]
      : [];
  });
}

function eligibleDraftCards(run: RunState, filter: EventCardFilter): CardDefinition[] {
  return cards.filter((card) => matchesCardFilter(card, run, filter));
}

function eligibleTools(run: RunState, effect: Extract<EventEffect, { kind: "tool-offer" }>) {
  const pool = effect.toolIds ?? standardToolIds;
  return pool.filter((toolId) => !run.tools.includes(toolId));
}

function guestCards(run: RunState, effect: Extract<EventEffect, { kind: "temporary-guest-card" }>) {
  const explicit = effect.cardIds ? new Set(effect.cardIds) : undefined;
  return developers
    .filter((developer) => !run.squad.includes(developer.id))
    .map((developer) => getCard(developer.startingCardId))
    .filter((card) => !explicit || explicit.has(card.id));
}

function effectDisabledReason(effect: EventEffect, run: RunState): string | undefined {
  switch (effect.kind) {
    case "deck-surgery":
      if (effect.operation === "add") return undefined;
      return persistentCardOptions(run, effect.filter).length > 0 ? undefined : "No eligible cards";
    case "filtered-draft":
      return eligibleDraftCards(run, effect.filter).length > 0 ? undefined : "No matching cards";
    case "tool-offer":
      return eligibleTools(run, effect).length > 0 ? undefined : "No Tools available";
    case "temporary-guest-card":
      return guestCards(run, effect).length > 0 ? undefined : "No guest available";
    default:
      return undefined;
  }
}

function previewLedger(
  effect: Extract<EventEffect, { kind: "ledger" }>,
  run: RunState,
): EventOutcomeChip {
  if (effect.resource === "morale") {
    const nextMorale = Math.max(0, Math.min(run.maxMorale, run.morale + effect.amount));
    const applied = nextMorale - run.morale;
    return {
      text:
        applied === 0
          ? effect.amount > 0
            ? "Morale Full"
            : "No Morale change"
          : `${signedAmount(applied)} Morale`,
      tone: applied >= 0 ? (applied === 0 ? "neutral" : "good") : "risk",
    };
  }
  const label =
    effect.resource === "credits"
      ? "Credits"
      : effect.resource === "max-morale"
        ? "Max Morale"
        : "Tech Debt";
  const applied =
    effect.resource === "tech-debt"
      ? Math.max(0, run.techDebt + effect.amount) - run.techDebt
      : effect.resource === "credits"
        ? effect.amount
        : Math.max(1, run.maxMorale + effect.amount) - run.maxMorale;
  return {
    text: `${signedAmount(applied)} ${label}`,
    tone:
      (effect.resource === "tech-debt" && applied > 0) ||
      (effect.resource === "credits" && applied < 0)
        ? "risk"
        : "good",
  };
}

function previewEffect(effect: EventEffect, run: RunState): readonly EventOutcomeChip[] {
  switch (effect.kind) {
    case "ledger":
      return [previewLedger(effect, run)];
    case "deck-surgery":
      return [
        {
          text:
            effect.operation === "add"
              ? `Add ${getCard(effect.cardId).name}`
              : effect.operation === "remove"
                ? "Remove 1 card"
                : effect.operation === "duplicate"
                  ? effect.filter.rarities?.length === 1 && effect.filter.rarities[0] === "normal"
                    ? "Duplicate 1 non-Rare"
                    : "Duplicate 1 card"
                  : "Transform 1 card",
          tone: "good",
        },
      ];
    case "filtered-draft":
      return [
        {
          text: `${effect.filter.label ?? "Card"} card choice · ${effect.count}`,
          tone: "good",
        },
      ];
    case "tool-offer": {
      const explicitTool =
        effect.count === 1 && effect.toolIds?.length === 1 ? getTool(effect.toolIds[0]) : undefined;
      return [
        {
          text: explicitTool ? `Gain ${explicitTool.name}` : `Tool choice · ${effect.count}`,
          tone: "good",
        },
      ];
    }
    case "next-cycle-modifier": {
      const modifier = effect.modifier;
      const text =
        modifier.kind === "opening-focus"
          ? `+${modifier.amount} opening Focus`
          : modifier.kind === "opening-draw"
            ? `+${modifier.amount} opening draw`
            : modifier.kind === "queued-status"
              ? `+${modifier.count} ${getCard(modifier.cardId).name} next Cycle`
              : modifier.kind === "intent-protection"
                ? modifier.intentKind === "interruption"
                  ? `Ignore ${modifier.count} Distraction`
                  : `Cancel next ${modifier.intentKind} End Day effect`
                : `Borrow ${getCard(modifier.cardId).name}`;
      return [{ text, tone: modifier.kind === "queued-status" ? "risk" : "good" }];
    }
    case "temporary-guest-card":
      return [{ text: "Borrow 1 Starter next Cycle", tone: "good" }];
    case "bounty-task": {
      const reward = effect.bounty.reward;
      const rewardText =
        reward.kind === "credits"
          ? `${reward.amount} Credits`
          : reward.kind === "tool-offer"
            ? "Tool choice"
            : reward.kind === "rare-card-offer"
              ? "Rare card choice"
              : `${reward.amount} Credits + Rare card choice`;
      return [
        { text: `Bounty: ${effect.bounty.name}`, tone: "risk" },
        { text: `Ships for ${rewardText}`, tone: "good" },
      ];
    }
    case "reward-modifier":
      return [
        {
          text: effect.modifier.guaranteedRarity
            ? "Rare next reward"
            : `${effect.modifier.choiceCount ?? 3} next reward choices`,
          tone: "good",
        },
      ];
    case "map-modifier":
      return [
        {
          text:
            effect.modifier.kind === "reveal-upcoming"
              ? `Reveal ${effect.modifier.count} nodes`
              : "Open a route",
          tone: "good",
        },
      ];
  }
}

export function resolveEventChoice(
  choice: EventChoiceDefinition,
  run: RunState,
): ResolvedEventChoice {
  const requirementReason = choice.requirements
    ?.map((requirement) => resolveEventRequirement(requirement, run))
    .find(Boolean);
  const effectReason = choice.effects
    .map((effect) => effectDisabledReason(effect, run))
    .find(Boolean);
  return {
    disabledReason: requirementReason ?? effectReason,
    outcome: choice.effects.flatMap((effect) => previewEffect(effect, run)),
  };
}

export function reconcileTechDebt(run: RunState, amount: number): RunState {
  const techDebt = Math.max(0, run.techDebt + amount);
  const debtGained = Math.max(0, techDebt - run.techDebt);
  const supportedCards = Math.floor(techDebt / techDebtCardThreshold);
  const debtCards = run.deck.filter((card) => card.cardId === "tech-debt");
  let deck = [...run.deck];
  let nextCardInstanceId = run.nextCardInstanceId;
  if (debtCards.length > supportedCards) {
    const removals = new Set(debtCards.slice(supportedCards).map((card) => card.instanceId));
    deck = deck.filter((card) => !removals.has(card.instanceId));
  }
  for (let index = debtCards.length; index < supportedCards; index += 1) {
    deck.push({ cardId: "tech-debt", instanceId: `card-${nextCardInstanceId}` });
    nextCardInstanceId += 1;
  }
  return {
    ...run,
    techDebt,
    peakTechDebt: Math.max(run.peakTechDebt, techDebt),
    credits: run.credits + (run.tools.includes("venture-debt") ? debtGained * 10 : 0),
    deck,
    nextCardInstanceId,
  };
}

function addPersistentCard(run: RunState, cardId: string, source?: CardInstance): RunState {
  const card: CardInstance = {
    cardId,
    dynamicDefinition: source?.dynamicDefinition,
    instanceId: `card-${run.nextCardInstanceId}`,
  };
  return {
    ...run,
    deck: [...run.deck, card],
    nextCardInstanceId: run.nextCardInstanceId + 1,
  };
}

function revealUpcomingNodes(run: RunState, count: number): EventMapModifier {
  const edges = [
    ...mapEdges,
    ...run.mapModifiers.flatMap((modifier) =>
      modifier.kind === "connection" ? [modifier.edge] : [],
    ),
  ];
  const revealed: string[] = [];
  const queue = run.currentNodeId ? [run.currentNodeId] : [];
  const visited = new Set(queue);
  while (queue.length > 0 && revealed.length < count) {
    const from = queue.shift();
    for (const edge of edges.filter((candidate) => candidate.fromNodeId === from)) {
      if (visited.has(edge.toNodeId)) continue;
      visited.add(edge.toNodeId);
      queue.push(edge.toNodeId);
      if (!run.completedNodeIds.includes(edge.toNodeId)) revealed.push(edge.toNodeId);
      if (revealed.length >= count) break;
    }
  }
  return { kind: "reveal", nodeIds: revealed };
}

function applyImmediateEffect(
  run: RunState,
  effect: Exclude<
    EventEffect,
    | Extract<EventEffect, { kind: "filtered-draft" }>
    | Extract<EventEffect, { kind: "tool-offer" }>
    | Extract<EventEffect, { kind: "temporary-guest-card" }>
  >,
): { run: RunState; outcome: string } {
  switch (effect.kind) {
    case "ledger": {
      const preview = previewLedger(effect, run).text;
      if (effect.resource === "tech-debt") {
        return { run: reconcileTechDebt(run, effect.amount), outcome: preview };
      }
      if (effect.resource === "credits") {
        return {
          run: { ...run, credits: Math.max(0, run.credits + effect.amount) },
          outcome: preview,
        };
      }
      if (effect.resource === "max-morale") {
        return {
          run: {
            ...run,
            maxMorale: Math.max(1, run.maxMorale + effect.amount),
            morale: Math.min(run.morale, Math.max(1, run.maxMorale + effect.amount)),
          },
          outcome: preview,
        };
      }
      return {
        run: { ...run, morale: Math.max(0, Math.min(run.maxMorale, run.morale + effect.amount)) },
        outcome: preview,
      };
    }
    case "deck-surgery":
      if (effect.operation !== "add") throw new Error("Deck selection must resolve before apply.");
      return {
        run: addPersistentCard(run, effect.cardId),
        outcome: `Added ${getCard(effect.cardId).name}`,
      };
    case "next-cycle-modifier":
      return {
        run: { ...run, nextCycleModifiers: [...run.nextCycleModifiers, effect.modifier] },
        outcome: previewEffect(effect, run)[0]?.text ?? "Queued next-Cycle effect",
      };
    case "bounty-task":
      return {
        run: { ...run, pendingBounties: [...run.pendingBounties, effect.bounty] },
        outcome: `Added Bounty: ${effect.bounty.name}`,
      };
    case "reward-modifier":
      return {
        run: { ...run, nextRewardModifiers: [...run.nextRewardModifiers, effect.modifier] },
        outcome: previewEffect(effect, run)[0]?.text ?? "Modified next reward",
      };
    case "map-modifier": {
      const modifier =
        effect.modifier.kind === "reveal-upcoming"
          ? revealUpcomingNodes(run, effect.modifier.count)
          : effect.modifier;
      return {
        run: { ...run, mapModifiers: [...run.mapModifiers, modifier] },
        outcome: previewEffect(effect, run)[0]?.text ?? "Changed roadmap",
      };
    }
  }
}

function sampleDefinitions<T>(
  items: readonly T[],
  count: number,
  rngState: number,
): { items: T[]; rngState: number } {
  const picks: T[] = [];
  let nextRngState = rngState;
  while (picks.length < Math.min(count, items.length)) {
    const candidates = items.filter((item) => !picks.includes(item));
    const pick = sampleOne(candidates, nextRngState);
    picks.push(pick.item);
    nextRngState = pick.rngState;
  }
  return { items: picks, rngState: nextRngState };
}

function createPendingSelection(
  run: RunState,
  effect: EventEffect,
  effectIndex: number,
): { run: RunState; pending?: EventPendingSelection } {
  if (effect.kind === "deck-surgery" && effect.operation !== "add") {
    return {
      run,
      pending: {
        effectIndex,
        kind: "card",
        prompt:
          effect.operation === "remove"
            ? "Remove a card"
            : effect.operation === "duplicate"
              ? "Duplicate a card"
              : "Transform a card",
        options: persistentCardOptions(run, effect.filter),
      },
    };
  }
  if (effect.kind === "filtered-draft") {
    const offer = sampleDefinitions(
      eligibleDraftCards(run, effect.filter),
      effect.count,
      run.rngState,
    );
    return {
      run: { ...run, rngState: offer.rngState },
      pending: {
        effectIndex,
        kind: "draft",
        prompt: "Choose a card",
        options: offer.items.map((card) => ({
          id: card.id,
          label: card.name,
          rules: card.rules,
          cardId: card.id,
        })),
      },
    };
  }
  if (effect.kind === "tool-offer") {
    const offer = sampleDefinitions(eligibleTools(run, effect), effect.count, run.rngState);
    return {
      run: { ...run, rngState: offer.rngState },
      pending: {
        effectIndex,
        kind: "tool",
        prompt: "Choose a Tool",
        options: offer.items.map((toolId) => {
          const tool = getTool(toolId);
          return { id: toolId, label: tool.name, rules: tool.rules, toolId };
        }),
      },
    };
  }
  if (effect.kind === "temporary-guest-card") {
    const offer = sampleDefinitions(guestCards(run, effect), effect.count, run.rngState);
    return {
      run: { ...run, rngState: offer.rngState },
      pending: {
        effectIndex,
        kind: "guest",
        prompt: "Borrow a Starter",
        options: offer.items.map((card) => ({
          id: card.id,
          label: card.name,
          rules: card.rules,
          cardId: card.id,
        })),
      },
    };
  }
  return { run };
}

export function advanceEventResolution(
  run: RunState,
  effects: readonly EventEffect[],
  effectIndex = 0,
  outcome: readonly string[] = [],
): EventResolutionProgress {
  let nextRun = run;
  const appliedOutcome = [...outcome];
  for (let index = effectIndex; index < effects.length; index += 1) {
    const effect = effects[index];
    if (!effect) continue;
    const pending = createPendingSelection(nextRun, effect, index);
    nextRun = pending.run;
    if (pending.pending) {
      return {
        run: nextRun,
        effectIndex: index,
        outcome: appliedOutcome,
        pending: pending.pending,
      };
    }
    const applied = applyImmediateEffect(
      nextRun,
      effect as Exclude<
        EventEffect,
        | Extract<EventEffect, { kind: "filtered-draft" }>
        | Extract<EventEffect, { kind: "tool-offer" }>
        | Extract<EventEffect, { kind: "temporary-guest-card" }>
      >,
    );
    nextRun = applied.run;
    appliedOutcome.push(applied.outcome);
  }
  return { run: nextRun, effectIndex: effects.length, outcome: appliedOutcome };
}

function transformCard(
  instance: CardInstance,
  effect: Extract<EventDeckSurgeryEffect, { operation: "transform" }>,
): CardInstance {
  if (effect.transform.kind === "replace") {
    return { ...instance, cardId: effect.transform.cardId, dynamicDefinition: undefined };
  }
  const card = getCardForInstance(instance);
  return {
    ...instance,
    dynamicDefinition: {
      ...card,
      id: `${card.id}-verified`,
      name: `${card.name} (Verified)`,
      workKind: "verified",
      rules: card.rules.replace("Unverified.", "Verified."),
    },
  };
}

function resolvePendingEventSelection(
  run: RunState,
  effect: EventEffect,
  pending: EventPendingSelection,
  optionId: string,
): { run: RunState; outcome: string } | undefined {
  const option = pending.options.find((candidate) => candidate.id === optionId);
  if (!option) return undefined;
  if (effect.kind === "deck-surgery" && effect.operation !== "add") {
    const instance = run.deck.find((card) => card.instanceId === option.id);
    if (!instance || !matchesCardFilter(getCardForInstance(instance), run, effect.filter)) {
      return undefined;
    }
    const name = getCardForInstance(instance).name;
    if (effect.operation === "remove") {
      return {
        run: { ...run, deck: run.deck.filter((card) => card.instanceId !== instance.instanceId) },
        outcome: `Removed ${name}`,
      };
    }
    if (effect.operation === "duplicate") {
      return {
        run: addPersistentCard(run, instance.cardId, instance),
        outcome: `Duplicated ${name}`,
      };
    }
    if (effect.operation !== "transform") return undefined;
    return {
      run: {
        ...run,
        deck: run.deck.map((card) =>
          card.instanceId === instance.instanceId ? transformCard(card, effect) : card,
        ),
      },
      outcome: `Transformed ${name}`,
    };
  }
  if (effect.kind === "filtered-draft" && option.cardId) {
    return { run: addPersistentCard(run, option.cardId), outcome: `Added ${option.label}` };
  }
  if (effect.kind === "tool-offer" && option.toolId && !run.tools.includes(option.toolId)) {
    return {
      run: { ...run, tools: [...run.tools, option.toolId] },
      outcome: `Installed ${option.label}`,
    };
  }
  if (effect.kind === "temporary-guest-card" && option.cardId) {
    return {
      run: {
        ...run,
        nextCycleModifiers: [
          ...run.nextCycleModifiers,
          { kind: "temporary-guest", cardId: option.cardId },
        ],
      },
      outcome: `Borrowed ${option.label}`,
    };
  }
  return undefined;
}

export function continueEventResolution(
  run: RunState,
  effects: readonly EventEffect[],
  progress: EventResolutionProgress,
  optionId: string,
): EventResolutionProgress | undefined {
  const pending = progress.pending;
  const effect = pending ? effects[pending.effectIndex] : undefined;
  if (!pending || !effect) return undefined;
  const selection = resolvePendingEventSelection(run, effect, pending, optionId);
  if (!selection) return undefined;
  return advanceEventResolution(selection.run, effects, pending.effectIndex + 1, [
    ...progress.outcome,
    selection.outcome,
  ]);
}

function visibleMapModifiers(run: RunState): readonly string[] {
  const revealed = new Set(
    run.mapModifiers.flatMap((modifier) => (modifier.kind === "reveal" ? modifier.nodeIds : [])),
  );
  const connections = run.mapModifiers.filter((modifier) => modifier.kind === "connection").length;
  const labels: string[] = [];
  if (revealed.size > 0) labels.push(`${revealed.size} nodes revealed`);
  if (connections > 0) labels.push(`${connections} route opened`);
  return labels;
}

export function revealedMapNodeIds(run: RunState): ReadonlySet<string> {
  return new Set(
    run.mapModifiers.flatMap((modifier) => (modifier.kind === "reveal" ? modifier.nodeIds : [])),
  );
}

export function effectiveMapEdges(run: RunState) {
  return [
    ...mapEdges,
    ...run.mapModifiers.flatMap((modifier) =>
      modifier.kind === "connection" ? [modifier.edge] : [],
    ),
  ];
}

export function eventModifierLabels(run: RunState): readonly string[] {
  const labels = run.nextCycleModifiers.map((modifier) =>
    modifier.kind === "opening-focus"
      ? `Next Cycle: +${modifier.amount} Focus`
      : modifier.kind === "opening-draw"
        ? `Next Cycle: +${modifier.amount} Draw`
        : modifier.kind === "queued-status"
          ? `Next Cycle: ${modifier.count} ${getCard(modifier.cardId).name}`
          : modifier.kind === "intent-protection"
            ? `Next Cycle: cancel ${modifier.intentKind}`
            : `Next Cycle: ${getCard(modifier.cardId).name}`,
  );
  if (run.pendingBounties.length > 0) labels.push(`${run.pendingBounties.length} Bounty queued`);
  if (run.nextRewardModifiers.length > 0) labels.push("Next reward modified");
  return [...labels, ...visibleMapModifiers(run)];
}
