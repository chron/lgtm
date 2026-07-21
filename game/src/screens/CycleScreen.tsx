import { useEffect, useRef, useState } from "react";
import type { DispatchProps, RunProps } from "../app/types";
import { CardCollectionBrowser } from "../components/CardCollectionBrowser";
import { CharacterReaction } from "../components/CharacterReaction";
import { BossIntentPanel } from "../components/BossIntentPanel";
import { GameCard } from "../components/GameCard";
import { PassiveChip } from "../components/PassiveChip";
import { RunVitals } from "../components/RunVitals";
import { TaskPanel } from "../components/TaskPanel";
import { TargetingArrow } from "../components/TargetingArrow";
import { disciplineLabel, formatIntent, getCardForInstance, getDeveloper } from "../domain/content";
import { getBossDefinition, getBossPhase, getEncounterCycleDefinition } from "../domain/bosses";
import type {
  CardInstance,
  CardTag,
  CharacterMood,
  Discipline,
  DeveloperId,
} from "../domain/models";
import { getCardPresentation } from "../game/presentation";
import { getBossIntentPreview, getBossLaunchPreview } from "../game/bossEngine";
import type { CharacterCue } from "../game/presentation";
import {
  absorbMoraleDamage,
  effectiveCardCost,
  getCurrentIntent,
  getScheduledIntent,
  incomingMorale,
  resolveCardTarget,
} from "../game/rules";
import type { CardTarget } from "../game/rules";
import { CombatTutorial } from "../tutorial/CombatTutorial";

type CycleScreenProps = DispatchProps &
  RunProps & {
    onInspectCards: (title: string, cards: readonly CardInstance[], orderHidden?: boolean) => void;
  };

interface AimState {
  instanceId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  hoveredTargetKey?: string;
}

interface CeremonyItem {
  taskId?: string;
  taskName: string;
  label: string;
  eyebrow: "End Day" | "Automation Runs" | "Cancelled Today";
}

interface CeremonyState {
  items: CeremonyItem[];
  index: number;
}

interface ReactionState extends CharacterCue {
  id: number;
}

const END_DAY_CEREMONY_DURATION_MS = 1050;

export function taskBoardLayoutClass(taskCount: number): string {
  return taskCount >= 5 ? "compact" : String(Math.max(1, taskCount));
}

function cardTagLabel(tag: CardTag): string {
  return tag === "ai-assisted"
    ? "AI Assisted"
    : tag
        .split("-")
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join(" ");
}

export function CycleScreen({ dispatch, run, onInspectCards }: CycleScreenProps) {
  const [aim, setAim] = useState<AimState>();
  const aimRef = useRef<AimState | undefined>(undefined);
  const playCardRef = useRef<(instanceId: string, target: CardTarget) => void>(() => undefined);
  const reactionIdRef = useRef(0);
  const [ceremony, setCeremony] = useState<CeremonyState>();
  const [dayBanner, setDayBanner] = useState<string>();
  const [reaction, setReaction] = useState<ReactionState>();
  const [reactingPassiveIds, setReactingPassiveIds] = useState<DeveloperId[]>([]);
  const [launchConfirmOpen, setLaunchConfirmOpen] = useState(false);
  const [retrievalInstanceId, setRetrievalInstanceId] = useState<string>();
  const cycle = run?.cycle;
  const maxDays = cycle ? getEncounterCycleDefinition(cycle).maxDays : 0;
  const activeInstanceId = aim?.instanceId;
  const selectedCard = cycle?.hand.find((instance) => instance.instanceId === activeInstanceId);
  const retrievalSource = cycle?.hand.find(
    (instance) => instance.instanceId === retrievalInstanceId,
  );
  const retrievalChoices =
    run && cycle && retrievalSource
      ? cycle.exhaustPile.filter(
          (instance) =>
            resolveCardTarget(run, retrievalSource, {
              kind: "exhaust-card",
              instanceId: instance.instanceId,
            }).legal,
        )
      : [];
  const selectedOwnerId = selectedCard ? getCardForInstance(selectedCard).ownerId : undefined;
  const resolvingCard = reaction?.level === "hero";
  const resolvingBoss = Boolean(cycle?.boss?.transitionNotice);

  useEffect(() => {
    if (aim && !cycle?.hand.some((instance) => instance.instanceId === aim.instanceId)) {
      aimRef.current = undefined;
      setAim(undefined);
    }
  }, [aim, cycle?.hand]);

  useEffect(() => {
    if (
      retrievalInstanceId &&
      !cycle?.hand.some((instance) => instance.instanceId === retrievalInstanceId)
    ) {
      setRetrievalInstanceId(undefined);
    }
  }, [cycle?.hand, retrievalInstanceId]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const currentAim = aimRef.current;
      if (!currentAim) return;
      const target = pointerTarget(event.clientX, event.clientY);
      updateAim({
        ...currentAim,
        endX: event.clientX,
        endY: event.clientY,
        hoveredTargetKey: target?.key,
      });
    }

    function handlePointerUp(event: PointerEvent) {
      const currentAim = aimRef.current;
      if (!currentAim) return;
      const target = pointerTarget(event.clientX, event.clientY);
      updateAim(undefined);
      if (!target) return;

      playCardRef.current(currentAim.instanceId, target.target);
    }

    function handlePointerCancel() {
      updateAim(undefined);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, []);

  useEffect(() => {
    if (!reaction) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 280 : reaction.level === "hero" ? 1080 : 680;
    const timer = window.setTimeout(() => {
      setReaction(undefined);
      setReactingPassiveIds([]);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  useEffect(() => {
    if (!ceremony) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => {
        if (ceremony.index < ceremony.items.length - 1) {
          setCeremony({ ...ceremony, index: ceremony.index + 1 });
          return;
        }

        setCeremony(undefined);
        setDayBanner(cycle && cycle.day < maxDays ? `Day ${cycle.day + 1}` : "Deadline");
        dispatch({ type: "END_DAY" });
      },
      reducedMotion ? 80 : END_DAY_CEREMONY_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [ceremony, cycle, dispatch, maxDays]);

  useEffect(() => {
    if (!dayBanner) return;
    const timer = window.setTimeout(() => setDayBanner(undefined), 850);
    return () => window.clearTimeout(timer);
  }, [dayBanner]);

  if (!run || !cycle) return null;
  const definition = getEncounterCycleDefinition(cycle);
  const boss = cycle.boss ? getBossDefinition(cycle.boss.bossId) : undefined;
  const launchPreview = boss ? getBossLaunchPreview(run, cycle, boss) : undefined;
  const releaseProjectTaskIds = new Set(
    boss?.project.tasks.filter((task) => task.role !== "complication").map((task) => task.id) ?? [],
  );
  const scriptMultiplier = run.tools.includes("cron-upgrade") ? 2 : 1;
  const moraleIncoming = incomingMorale(run, cycle);
  const incomingDamage = absorbMoraleDamage(cycle.block, moraleIncoming);
  const resolvingDay = Boolean(ceremony);

  function updateAim(nextAim?: AimState) {
    aimRef.current = nextAim;
    setAim(nextAim);
  }

  function pointerTarget(clientX: number, clientY: number) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-card-target]");
    if (!target) return undefined;
    if (target.dataset.targetKind === "squad") {
      return {
        key: target.dataset.cardTarget,
        target: { kind: "squad" } as CardTarget,
      };
    }
    if (target.dataset.targetKind === "discipline") {
      const discipline = target.dataset.targetDiscipline as Discipline | undefined;
      if (!discipline) return undefined;
      return {
        key: target.dataset.cardTarget,
        target: { kind: "discipline", discipline } as CardTarget,
      };
    }
    if (target.dataset.targetKind === "hand-card") {
      const instanceId = target.dataset.targetInstanceId;
      if (!instanceId) return undefined;
      return {
        key: target.dataset.cardTarget,
        target: { kind: "hand-card", instanceId } as CardTarget,
      };
    }
    if (target.dataset.targetKind === "exhaust-card") {
      const instanceId = target.dataset.targetInstanceId;
      if (!instanceId) return undefined;
      return {
        key: target.dataset.cardTarget,
        target: { kind: "exhaust-card", instanceId } as CardTarget,
      };
    }
    const taskId = target.dataset.taskId;
    if (!taskId) return undefined;
    return {
      key: target.dataset.cardTarget,
      target: {
        taskId,
        discipline: target.dataset.targetDiscipline as Discipline | undefined,
      } as CardTarget,
    };
  }

  function beginAim(instanceId: string, event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || resolvingDay || resolvingCard || resolvingBoss) return;
    const instance = cycle?.hand.find((candidate) => candidate.instanceId === instanceId);
    if (!instance) return;
    const card = getCardForInstance(instance);
    if (card.kind === "status" && !card.cycleFlexibleBlockBonus) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateAim({
      instanceId,
      startX: rect.left + rect.width / 2,
      startY: rect.top + Math.min(52, rect.height * 0.22),
      endX: event.clientX,
      endY: event.clientY,
    });
  }

  function moveAim(instanceId: string, event: React.PointerEvent<HTMLButtonElement>) {
    const currentAim = aimRef.current;
    if (currentAim?.instanceId !== instanceId) return;
    const target = pointerTarget(event.clientX, event.clientY);
    updateAim({
      ...currentAim,
      endX: event.clientX,
      endY: event.clientY,
      hoveredTargetKey: target?.key,
    });
  }

  function finishAim(instanceId: string, event: React.PointerEvent<HTMLButtonElement>) {
    const currentAim = aimRef.current;
    if (currentAim?.instanceId !== instanceId) return;
    const target = pointerTarget(event.clientX, event.clientY);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    updateAim(undefined);

    if (target) {
      commitCardPlay(instanceId, target.target);
    }
  }

  function cancelAim() {
    updateAim(undefined);
  }

  function commitCardPlay(instanceId: string, target: CardTarget) {
    if (!run || !cycle) return;
    const instance = cycle.hand.find((candidate) => candidate.instanceId === instanceId);
    if (!instance) return;
    const definition = getCardForInstance(instance);
    if (definition.retrieveGeneratedFromExhaust && target.kind === "squad") {
      const hasEligibleCard = cycle.exhaustPile.some(
        (candidate) =>
          resolveCardTarget(run, instance, {
            kind: "exhaust-card",
            instanceId: candidate.instanceId,
          }).legal,
      );
      if (hasEligibleCard) setRetrievalInstanceId(instanceId);
      return;
    }
    const presentation = getCardPresentation(run, instance, target);
    if (!presentation) return;

    dispatch({ type: "PLAY_CARD", instanceId, target });
    setReactingPassiveIds(presentation.triggeredPassiveIds);
    if (presentation.cue) {
      reactionIdRef.current += 1;
      setReaction({ ...presentation.cue, id: reactionIdRef.current });
    }
  }

  function startEndDay() {
    if (!cycle) return;
    setReaction(undefined);
    setReactingPassiveIds([]);
    updateAim(undefined);
    const bossIntent = boss ? getBossIntentPreview(run, cycle, boss) : undefined;
    const bossIntentItems: CeremonyItem[] =
      boss && bossIntent
        ? [
            {
              taskId: bossIntent.sourceTaskId,
              taskName: `${boss.stakeholder} · ${bossIntent.label}`,
              label: bossIntent.stunned ? `${bossIntent.summary} · No Effect` : bossIntent.summary,
              eyebrow: bossIntent.stunned ? "Cancelled Today" : "End Day",
            },
          ]
        : [];
    const intentItems = cycle.tasks.flatMap<CeremonyItem>((task) => {
      const scheduledIntent = getScheduledIntent(cycle, task);
      if (task.stunned && scheduledIntent) {
        const definitionTask = definition.tasks.find((candidate) => candidate.id === task.taskId);
        return [
          {
            taskId: task.taskId,
            taskName: task.name ?? definitionTask?.name ?? task.taskId,
            label: `${formatIntent(scheduledIntent)} · No Effect`,
            eyebrow: "Cancelled Today" as const,
          },
        ];
      }
      const intent = getCurrentIntent(cycle, task);
      if (!intent) return [];
      const definitionTask = definition.tasks.find((candidate) => candidate.id === task.taskId);
      return [
        {
          taskId: task.taskId,
          taskName: task.name ?? definitionTask?.name ?? task.taskId,
          label: formatIntent(intent),
          eyebrow: "End Day" as const,
        },
      ];
    });
    const automationItems: CeremonyItem[] =
      cycle.day >= definition.maxDays || run.morale <= moraleIncoming
        ? []
        : cycle.tasks.flatMap<CeremonyItem>((task) => {
            if (task.status === "shipped") return [];
            const scripted = task.requirements.flatMap((requirement) => {
              const amount = Math.min(
                requirement.scriptPower * scriptMultiplier,
                Math.max(0, requirement.target - requirement.verified - requirement.unverified),
              );
              return amount > 0
                ? [`${disciplineLabel(requirement.discipline)} Script · +${amount} Verified`]
                : [];
            });
            if (scripted.length === 0) return [];
            const definitionTask = definition.tasks.find(
              (candidate) => candidate.id === task.taskId,
            );
            return scripted.map((label) => ({
              taskId: task.taskId,
              taskName: task.name ?? definitionTask?.name ?? task.taskId,
              label,
              eyebrow: "Automation Runs" as const,
            }));
          });
    const guardAmount =
      cycle.guardPower * scriptMultiplier +
      (cycle.guardPower > 0 && run.tools.includes("platypus") ? 1 : 0);
    const guardItems: CeremonyItem[] =
      cycle.day < definition.maxDays && run.morale > moraleIncoming && guardAmount > 0
        ? [
            {
              taskName: "Squad Guard",
              label: `Guard · +${guardAmount} Block`,
              eyebrow: "Automation Runs",
            },
          ]
        : [];
    const items = [...bossIntentItems, ...intentItems, ...automationItems, ...guardItems];
    setCeremony({
      items:
        items.length > 0
          ? items
          : [
              {
                taskName: "All Tasks",
                label: "No open End Day effects",
                eyebrow: "End Day",
              },
            ],
      index: 0,
    });
  }

  function shipTask(taskId: string) {
    updateAim(undefined);
    dispatch({ type: "SHIP_TASK", taskId });
  }

  const ceremonyItem = ceremony?.items[ceremony.index];
  playCardRef.current = commitCardPlay;
  const selectedDefinition = selectedCard ? getCardForInstance(selectedCard) : undefined;
  const squadResolution = selectedCard
    ? resolveCardTarget(run, selectedCard, { kind: "squad" })
    : undefined;
  const exhaustCardTargets = selectedCard
    ? cycle.exhaustPile
        .map((instance) => ({
          instance,
          resolution: resolveCardTarget(run, selectedCard, {
            kind: "exhaust-card",
            instanceId: instance.instanceId,
          }),
        }))
        .filter(({ resolution }) => resolution.legal)
    : [];
  const retrievalTargetable = Boolean(
    selectedDefinition?.retrieveGeneratedFromExhaust && exhaustCardTargets.length,
  );
  const squadTargetable = Boolean(
    retrievalTargetable ||
    (squadResolution?.legal &&
      (squadResolution.kind === "tactic" ||
        (squadResolution.kind === "review" && !squadResolution.taskId))),
  );
  const squadTargetLabel = retrievalTargetable
    ? "Choose a Generated card from Exhaust"
    : squadResolution?.legal
      ? squadResolution.label
      : "Squad status";
  const sideQuestTargets = selectedCard
    ? (["frontend", "backend", "infra"] as const)
        .map((discipline) => ({
          discipline,
          resolution: resolveCardTarget(run, selectedCard, { kind: "discipline", discipline }),
        }))
        .filter(({ resolution }) => resolution.legal)
    : [];
  const sideQuestTargetable = Boolean(
    selectedDefinition?.spawnSideQuest && sideQuestTargets.length,
  );
  const visibleTasks = cycle.tasks.filter(
    (task) => !(task.role === "side-quest" && task.status === "shipped"),
  );
  const lastWorkLabel = cycle.lastWorkCard
    ? cycle.lastWorkCard.discipline === "flexible"
      ? "Any"
      : disciplineLabel(cycle.lastWorkCard.discipline)
    : undefined;

  function portraitMood(developerId: DeveloperId): CharacterMood {
    if (reaction?.developerId === developerId) return "success";
    if (selectedOwnerId === developerId) return "thinking";
    return "idle";
  }

  return (
    <section
      className={`screen cycle-screen${cycle.boss ? " cycle-screen--boss" : ""}`}
      aria-label={definition.name}
    >
      <header className="cycle-hud">
        <RunVitals run={run} showMorale={false} />

        <div className="squad-zone">
          <div className="passive-rack" aria-label="Squad passives">
            {run.squad.map((developerId) => {
              const developer = getDeveloper(developerId);
              return (
                <PassiveChip
                  key={developer.id}
                  developerId={developer.id}
                  mood={portraitMood(developer.id)}
                  reacting={reactingPassiveIds.includes(developer.id)}
                />
              );
            })}
          </div>
          <div
            className={`squad-status-rack${squadTargetable ? " is-targetable" : ""}${aim?.hoveredTargetKey === "squad" ? " is-aimed" : ""}`}
            data-card-target={squadTargetable ? "squad" : undefined}
            data-target-kind={squadTargetable ? "squad" : undefined}
            aria-label={squadTargetLabel}
          >
            <span className="player-state-vital player-state-vital--morale">
              <small>Morale</small>
              <b>
                {run.morale}/{run.maxMorale}
              </b>
            </span>
            <button
              className="player-state-vital player-state-vital--focus"
              type="button"
              data-tutorial-anchor="focus"
              aria-label={`Focus ${cycle.focus}. Start each Day with 3 Focus. Effects can raise it above 3.`}
            >
              <small>Focus</small>
              <b>{cycle.focus}</b>
              <span className="game-tooltip" role="tooltip">
                Start each Day with 3 Focus. Effects can raise it above 3.
              </span>
            </button>
            <span className="status-buff status-buff--block">Block {cycle.block}</span>
            {cycle.guardPower > 0 && (
              <button
                className="status-buff status-buff--guard"
                type="button"
                aria-label={`Guard ${cycle.guardPower}. At the start of each Day, gain ${cycle.guardPower} Block before Tool bonuses.`}
              >
                Guard {cycle.guardPower}
                <span className="game-tooltip" role="tooltip">
                  At the start of each Day, gain {cycle.guardPower} Block before Tool bonuses.
                </span>
              </button>
            )}
            {cycle.prototypePower > 0 && (
              <button
                className="status-buff status-buff--prototype"
                type="button"
                aria-label={`Prototype ${cycle.prototypePower}. Every Work card gains ${cycle.prototypePower} Work this Cycle.`}
              >
                Prototype +{cycle.prototypePower}
                <span className="game-tooltip" role="tooltip">
                  Every Work card gains +{cycle.prototypePower} Work this Cycle.
                </span>
              </button>
            )}
            {cycle.fullStackPower > 0 && (
              <button
                className="status-buff status-buff--variety"
                type="button"
                aria-label={`Full Stack ${cycle.fullStackPower}. Switching target discipline adds ${cycle.fullStackPower} Work.`}
              >
                Full Stack +{cycle.fullStackPower}
                <span className="game-tooltip" role="tooltip">
                  Switching target discipline adds +{cycle.fullStackPower} Work.
                </span>
              </button>
            )}
            {(Object.entries(cycle.cardTagWorkBonuses) as [CardTag, number][]).map(
              ([tag, amount]) =>
                amount > 0 && (
                  <button
                    className="status-buff status-buff--automation"
                    type="button"
                    key={tag}
                    aria-label={`${cardTagLabel(tag)} Work gains ${amount} this Cycle.`}
                  >
                    {cardTagLabel(tag)} +{amount}
                    <span className="game-tooltip" role="tooltip">
                      {cardTagLabel(tag)} Work gains +{amount} this Cycle.
                    </span>
                  </button>
                ),
            )}
            {cycle.dayWorkBonuses.map((bonus, index) => (
              <button
                className="status-buff status-buff--variety"
                type="button"
                key={`${bonus.amount}-${bonus.excludedTags.join("-")}-${index}`}
                aria-label={`Eligible Work gains ${bonus.amount} this Day. Excludes ${bonus.excludedTags.map(cardTagLabel).join(", ") || "nothing"}.`}
              >
                Non-{bonus.excludedTags.map(cardTagLabel).join("/")} Work +{bonus.amount}
                <span className="game-tooltip" role="tooltip">
                  Eligible Work gains +{bonus.amount} this Day.
                </span>
              </button>
            ))}
            {cycle.reviewStunFocusBonus > 0 && (
              <button
                className="status-buff status-buff--prototype"
                type="button"
                aria-label={`Gain ${cycle.reviewStunFocusBonus} Focus whenever a Review cancels an End Day effect this Day.`}
              >
                Review Cancel · +{cycle.reviewStunFocusBonus} Focus
                <span className="game-tooltip" role="tooltip">
                  Gain +{cycle.reviewStunFocusBonus} Focus whenever a Review cancels an End Day
                  effect this Day.
                </span>
              </button>
            )}
            {cycle.queuedCardsDrawn > 0 && (
              <span className="status-counter">Next Draw +{cycle.queuedCardsDrawn}</span>
            )}
            {cycle.queuedDistractions > 0 && (
              <span className="status-debuff">
                Next Day · {cycle.queuedDistractions} Distraction
                {cycle.queuedDistractions === 1 ? "" : "s"}
              </span>
            )}
            {cycle.cardsPlayedThisDay > 0 && (
              <span className="status-counter">Plays {cycle.cardsPlayedThisDay}</span>
            )}
            {cycle.chain.count > 0 && cycle.chain.taskId && (
              <button
                className="status-counter status-counter--button"
                type="button"
                aria-label={`Chain ${cycle.chain.count} on ${cycle.tasks.find((task) => task.taskId === cycle.chain.taskId)?.name ?? cycle.chain.taskId}. Consecutive targeted cards on this Task increase Chain.`}
              >
                Chain ×{cycle.chain.count}
                <span className="game-tooltip" role="tooltip">
                  Consecutive targeted cards on the same Task build Chain.
                </span>
              </button>
            )}
            {cycle.lastWorkCard && (
              <button
                className="status-counter status-counter--button"
                type="button"
                aria-label={`Last printed Work: ${lastWorkLabel} ${cycle.lastWorkCard.amount}. Quick Study will copy this discipline and amount.`}
              >
                Last Work · {lastWorkLabel} {cycle.lastWorkCard.amount}
                <span className="game-tooltip" role="tooltip">
                  Quick Study copies this printed discipline and amount.
                </span>
              </button>
            )}
            {cycle.exhaustPile.length > 0 && (
              <button
                className="status-counter status-counter--button"
                type="button"
                onClick={() => onInspectCards("Exhaust", cycle.exhaustPile)}
              >
                Exhaust {cycle.exhaustPile.length}
              </button>
            )}
            {cycle.blockedDisciplines.map((discipline) => (
              <span className="status-debuff" key={discipline}>
                {disciplineLabel(discipline)} +1 Cost
              </span>
            ))}
            {sideQuestTargetable && (
              <span className="side-quest-targets" aria-label="Choose Side Quest discipline">
                {sideQuestTargets.map(({ discipline, resolution }) => (
                  <button
                    className={`side-quest-target${aim?.hoveredTargetKey === `discipline:${discipline}` ? " is-aimed" : ""}`}
                    type="button"
                    key={discipline}
                    data-card-target={`discipline:${discipline}`}
                    data-target-kind="discipline"
                    data-target-discipline={discipline}
                    aria-label={resolution.legal ? resolution.label : disciplineLabel(discipline)}
                  >
                    {disciplineLabel(discipline)}
                  </button>
                ))}
              </span>
            )}
            {squadTargetable && <b>{squadTargetLabel}</b>}
          </div>
        </div>

        <div className="cycle-counters">
          {definition.kind === "incident" && <span className="status-incident">Incident</span>}
          <span>
            <small>Day</small>
            <b>
              {cycle.day}/{definition.maxDays}
            </b>
          </span>
        </div>
      </header>

      <BossIntentPanel run={run} cycle={cycle} />

      <div
        className={`task-board task-board--${taskBoardLayoutClass(visibleTasks.length)}${squadTargetable ? " is-squad-targetable" : ""}${aim?.hoveredTargetKey === "squad" ? " is-aimed" : ""}`}
        aria-label={definition.kind === "incident" ? "Incident Tasks" : "Cycle Tasks"}
        data-card-target={squadTargetable ? "squad" : undefined}
        data-target-kind={squadTargetable ? "squad" : undefined}
        data-tutorial-anchor="tasks"
      >
        {visibleTasks.map((task) => {
          const taskDefinition = definition.tasks.find((candidate) => candidate.id === task.taskId);
          return (
            <TaskPanel
              key={task.taskId}
              run={run}
              task={task}
              taskName={task.name ?? taskDefinition?.name ?? task.taskId}
              taskRole={task.role ?? taskDefinition?.role}
              selectedCard={selectedCard}
              hoveredTargetKey={aim?.hoveredTargetKey}
              resolving={ceremonyItem?.taskId === task.taskId}
              shippingDisabled={
                resolvingDay || resolvingCard || resolvingBoss || Boolean(cycle.pendingCardChoice)
              }
              releaseTask={
                cycle.boss?.phase === "launch-window" && releaseProjectTaskIds.has(task.taskId)
              }
              suppressEmptyIntent={Boolean(cycle.boss)}
              onTarget={() => undefined}
              onShip={shipTask}
            />
          );
        })}
      </div>

      {launchPreview?.ready && boss && (
        <aside className={`launch-dock launch-dock--${launchPreview.outcome}`}>
          <div>
            <span>Release Candidate</span>
            <strong>
              {launchPreview.defects === 0
                ? "Clean"
                : `${launchPreview.defects} Defect${launchPreview.defects === 1 ? "" : "s"}`}
            </strong>
            <small>
              {launchPreview.unverifiedWork} Unverified ·
              {launchPreview.moraleLoss > 0
                ? ` −${launchPreview.moraleLoss} Morale`
                : " Morale protected"}
            </small>
          </div>
          <button
            className="button button--primary"
            type="button"
            disabled={resolvingDay || resolvingCard || resolvingBoss}
            onClick={() => setLaunchConfirmOpen(true)}
          >
            Review Launch
          </button>
        </aside>
      )}

      <div className="sr-only" aria-live="polite">
        {selectedCard ? `${getCardForInstance(selectedCard).name}: choose a target` : ""}
      </div>

      <div className="cycle-bottom">
        <button
          className="card-pile card-pile--draw card-pile--button"
          type="button"
          onClick={() => onInspectCards("Draw", cycle.drawPile, true)}
          aria-label={`Draw pile, ${cycle.drawPile.length}`}
        >
          <span>Draw</span>
          <b>{cycle.drawPile.length}</b>
        </button>

        <div className="hand" aria-label="Cards in hand" data-tutorial-anchor="hand">
          {cycle.hand.map((instance) => {
            const card = getCardForInstance(instance);
            const cost = effectiveCardCost(card, cycle, run.squad, instance);
            const unplayable = card.kind === "status" && !card.cycleFlexibleBlockBonus;
            const handTargetResolution = selectedCard
              ? resolveCardTarget(run, selectedCard, {
                  kind: "hand-card",
                  instanceId: instance.instanceId,
                })
              : undefined;
            const handTargetable = handTargetResolution?.legal === true;
            return (
              <GameCard
                key={instance.instanceId}
                instance={instance}
                effectiveCost={cost}
                selected={activeInstanceId === instance.instanceId}
                disabled={
                  unplayable ||
                  resolvingDay ||
                  resolvingCard ||
                  resolvingBoss ||
                  Boolean(cycle.pendingCardChoice) ||
                  cost > cycle.focus
                }
                cardTarget={
                  handTargetable
                    ? {
                        key: `hand:${instance.instanceId}`,
                        kind: "hand-card",
                        instanceId: instance.instanceId,
                      }
                    : undefined
                }
                onPointerDown={
                  unplayable ? undefined : (event) => beginAim(instance.instanceId, event)
                }
                onPointerMove={
                  unplayable ? undefined : (event) => moveAim(instance.instanceId, event)
                }
                onPointerUp={
                  unplayable ? undefined : (event) => finishAim(instance.instanceId, event)
                }
                onPointerCancel={unplayable ? undefined : cancelAim}
              />
            );
          })}
        </div>

        <div className="cycle-corner">
          <div className="cycle-actions">
            <button
              className="button button--secondary cycle-action"
              type="button"
              data-tutorial-anchor="end-day"
              disabled={
                resolvingDay || resolvingCard || resolvingBoss || Boolean(cycle.pendingCardChoice)
              }
              onClick={startEndDay}
            >
              <strong>End Day</strong>
              {moraleIncoming > 0 && (
                <small>
                  {incomingDamage.moraleLoss > 0
                    ? `−${incomingDamage.moraleLoss} Morale`
                    : "Blocked"}
                </small>
              )}
            </button>
          </div>
          <button
            className="card-pile card-pile--discard card-pile--button"
            type="button"
            onClick={() => onInspectCards("Discard", cycle.discardPile)}
            aria-label={`Discard pile, ${cycle.discardPile.length}`}
          >
            <span>Discard</span>
            <b>{cycle.discardPile.length}</b>
          </button>
        </div>
      </div>

      {aim && (
        <TargetingArrow
          startX={aim.startX}
          startY={aim.startY}
          endX={aim.endX}
          endY={aim.endY}
          locked={Boolean(aim.hoveredTargetKey)}
        />
      )}

      {retrievalInstanceId && retrievalChoices.length > 0 && (
        <CardCollectionBrowser
          cards={retrievalChoices}
          title="Second Attempt"
          mode="choose-one"
          confirmLabel="Return to Hand"
          onClose={() => setRetrievalInstanceId(undefined)}
          onChoose={(instanceId) => {
            const sourceInstanceId = retrievalInstanceId;
            setRetrievalInstanceId(undefined);
            commitCardPlay(sourceInstanceId, { kind: "exhaust-card", instanceId });
          }}
        />
      )}

      {cycle.pendingCardChoice && (
        <dialog className="cycle-card-choice" open aria-labelledby="cycle-card-choice-title">
          <span>Prioritise Ruthlessly</span>
          <h2 id="cycle-card-choice-title">
            Put {cycle.pendingCardChoice.remaining} card
            {cycle.pendingCardChoice.remaining === 1 ? "" : "s"} on Draw
          </h2>
          <p>Choose in the order you want to draw them.</p>
          <div>
            {cycle.hand.map((instance) => (
              <button
                className="button button--secondary"
                type="button"
                key={instance.instanceId}
                onClick={() =>
                  dispatch({ type: "CHOOSE_CYCLE_CARD", instanceId: instance.instanceId })
                }
              >
                {getCardForInstance(instance).name}
              </button>
            ))}
          </div>
        </dialog>
      )}

      {launchConfirmOpen && launchPreview?.ready && boss && (
        <dialog className="launch-confirm" open aria-labelledby="launch-confirm-title">
          <div className="launch-confirm__slash" aria-hidden="true" />
          <img src={getBossPhase(boss, "launch-window").reactionArt} alt="" />
          <div className="launch-confirm__copy">
            <span>Final Release · Confirm</span>
            <h2 id="launch-confirm-title">Launch {boss.projectTitle}?</h2>
            <strong className={`launch-outcome launch-outcome--${launchPreview.outcome}`}>
              {launchPreview.outcome === "clean"
                ? "Clean Victory"
                : launchPreview.outcome === "known-issues"
                  ? "Victory · Known Issues"
                  : launchPreview.outcome === "burned-out"
                    ? "Burnout · Defeat"
                    : "Technically Shipped · Defeat"}
            </strong>
            <dl>
              <div>
                <dt>Unverified</dt>
                <dd>{launchPreview.unverifiedWork}</dd>
              </div>
              <div>
                <dt>Defects</dt>
                <dd>{launchPreview.defects}</dd>
              </div>
              <div>
                <dt>Morale</dt>
                <dd>
                  {run.morale} → {launchPreview.finalMorale}
                </dd>
              </div>
            </dl>
            <p>
              {launchPreview.defects >= 2
                ? "Two or more Defects will end the run, even if the team survives the launch."
                : launchPreview.finalMorale <= 0
                  ? "The launch would reduce Morale to zero."
                  : launchPreview.defects === 1
                    ? "This ships successfully, with one Known Issue recorded in the Retro."
                    : "All required Work is complete and verified. This is the good button."}
            </p>
            <div className="launch-confirm__actions">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setLaunchConfirmOpen(false)}
              >
                Keep Working
              </button>
              <button
                className="button button--primary"
                type="button"
                onClick={() => dispatch({ type: "LAUNCH_FINAL_RELEASE" })}
              >
                {launchPreview.outcome === "clean" || launchPreview.outcome === "known-issues"
                  ? "Ship It"
                  : "Launch Anyway"}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {ceremonyItem && (
        <output
          className={`day-ceremony${ceremonyItem.eyebrow === "Cancelled Today" ? " day-ceremony--cancelled" : ""}`}
          aria-live="assertive"
        >
          <span>
            {ceremonyItem.eyebrow} · {ceremony.index + 1}/{ceremony.items.length}
          </span>
          <strong>{ceremonyItem.taskName}</strong>
          <b>{ceremonyItem.label}</b>
        </output>
      )}

      {dayBanner && !ceremony && (
        <output className="day-banner" aria-live="polite">
          {dayBanner}
        </output>
      )}

      {cycle.boss?.transitionNotice && boss && (
        <dialog className="boss-transition" open aria-labelledby="boss-phase-title">
          <div className="boss-transition__slash" aria-hidden="true" />
          <img src={getBossPhase(boss, cycle.boss.phase).reactionArt} alt="" />
          <div className="boss-transition__copy">
            <span>Final Release · Phase Change</span>
            <h2 id="boss-phase-title">{cycle.boss.transitionNotice.title}</h2>
            <p>{cycle.boss.transitionNotice.summary}</p>
            {cycle.boss.transitionNotice.resolvedEffects.length > 0 && (
              <ul>
                {cycle.boss.transitionNotice.resolvedEffects.map((effect) => (
                  <li key={effect}>{effect}</li>
                ))}
              </ul>
            )}
            <button
              className="button button--primary"
              type="button"
              onClick={() => dispatch({ type: "ACKNOWLEDGE_BOSS_TRANSITION" })}
            >
              Back to Work
            </button>
          </div>
        </dialog>
      )}

      {reaction && <CharacterReaction key={reaction.id} cue={reaction} />}
      <CombatTutorial />
    </section>
  );
}
