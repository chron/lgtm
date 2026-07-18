import { useEffect, useRef, useState } from "react";
import type { DispatchProps, RunProps } from "../app/types";
import { CharacterReaction } from "../components/CharacterReaction";
import { GameCard } from "../components/GameCard";
import { PassiveChip } from "../components/PassiveChip";
import { TaskPanel } from "../components/TaskPanel";
import { TargetingArrow } from "../components/TargetingArrow";
import { formatIntent, getCard, getCycle, getDeveloper } from "../domain/content";
import type { CharacterMood, Discipline, DeveloperId } from "../domain/models";
import { getCardPresentation } from "../game/presentation";
import type { CharacterCue } from "../game/presentation";
import {
  effectiveCardCost,
  getCurrentIntent,
  incomingMorale,
  isCycleReady,
  shippingPreview,
} from "../game/rules";
import type { CardTarget } from "../game/rules";

type CycleScreenProps = DispatchProps & RunProps;

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
}

interface CeremonyState {
  items: CeremonyItem[];
  index: number;
}

interface ReactionState extends CharacterCue {
  id: number;
}

export function CycleScreen({ dispatch, run }: CycleScreenProps) {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>();
  const [aim, setAim] = useState<AimState>();
  const aimRef = useRef<AimState | undefined>(undefined);
  const suppressedClickRef = useRef<string | undefined>(undefined);
  const playCardRef = useRef<(instanceId: string, target: CardTarget) => void>(() => undefined);
  const reactionIdRef = useRef(0);
  const [ceremony, setCeremony] = useState<CeremonyState>();
  const [dayBanner, setDayBanner] = useState<string>();
  const [reaction, setReaction] = useState<ReactionState>();
  const [reactingPassiveIds, setReactingPassiveIds] = useState<DeveloperId[]>([]);
  const cycle = run?.cycle;
  const activeInstanceId = aim?.instanceId ?? selectedInstanceId;
  const selectedCard = cycle?.hand.find((instance) => instance.instanceId === activeInstanceId);
  const selectedOwnerId = selectedCard ? getCard(selectedCard.cardId).ownerId : undefined;
  const resolvingCard = reaction?.level === "hero";

  useEffect(() => {
    if (!selectedCard) setSelectedInstanceId(undefined);
  }, [cycle?.day, selectedCard]);

  useEffect(() => {
    if (aim && !cycle?.hand.some((instance) => instance.instanceId === aim.instanceId)) {
      aimRef.current = undefined;
      setAim(undefined);
    }
  }, [aim, cycle?.hand]);

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

      suppressedClickRef.current = currentAim.instanceId;
      playCardRef.current(currentAim.instanceId, {
        taskId: target.taskId,
        discipline: target.discipline,
      });
      setSelectedInstanceId(undefined);
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
        setDayBanner(`Day ${(cycle?.day ?? 0) + 1}`);
        dispatch({ type: "END_DAY" });
      },
      reducedMotion ? 80 : 720,
    );
    return () => window.clearTimeout(timer);
  }, [ceremony, cycle?.day, dispatch]);

  useEffect(() => {
    if (!dayBanner) return;
    const timer = window.setTimeout(() => setDayBanner(undefined), 850);
    return () => window.clearTimeout(timer);
  }, [dayBanner]);

  if (!run || !cycle) return null;
  const definition = getCycle(cycle.cycleId);
  const canShip = isCycleReady(cycle);
  const ship = shippingPreview(cycle);
  const moraleIncoming = incomingMorale(cycle);
  const resolvingDay = Boolean(ceremony);
  const shipSummary = !canShip
    ? undefined
    : ship.defects > 0
      ? `${ship.defects} Defect${ship.defects === 1 ? "" : "s"} · −${ship.moraleLoss} Morale${ship.techDebt ? " · +1 Debt" : ""}`
      : "Clean";

  function updateAim(nextAim?: AimState) {
    aimRef.current = nextAim;
    setAim(nextAim);
  }

  function pointerTarget(clientX: number, clientY: number) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-card-target]");
    const taskId = target?.dataset.taskId;
    if (!target || !taskId) return undefined;
    return {
      key: target.dataset.cardTarget,
      taskId,
      discipline: target.dataset.targetDiscipline as Discipline | undefined,
    };
  }

  function beginAim(instanceId: string, event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || resolvingDay || resolvingCard) return;
    const instance = cycle?.hand.find((candidate) => candidate.instanceId === instanceId);
    if (!instance || getCard(instance.cardId).kind === "status") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateAim({
      instanceId,
      startX: rect.left + rect.width / 2,
      startY: rect.top,
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
      suppressedClickRef.current = instanceId;
      commitCardPlay(instanceId, {
        taskId: target.taskId,
        discipline: target.discipline,
      });
      setSelectedInstanceId(undefined);
    }
  }

  function cancelAim() {
    updateAim(undefined);
  }

  function playSelected(taskId: string, discipline?: Discipline) {
    if (!selectedCard) return;
    commitCardPlay(selectedCard.instanceId, { taskId, discipline });
    setSelectedInstanceId(undefined);
  }

  function commitCardPlay(instanceId: string, target: CardTarget) {
    if (!run) return;
    const instance = cycle?.hand.find((candidate) => candidate.instanceId === instanceId);
    if (!instance) return;
    const presentation = getCardPresentation(run, instance, target);
    if (!presentation) return;

    dispatch({ type: "PLAY_CARD", instanceId, target });
    setReactingPassiveIds(presentation.triggeredPassiveIds);
    if (presentation.cue) {
      reactionIdRef.current += 1;
      setReaction({ ...presentation.cue, id: reactionIdRef.current });
    }
  }

  function chooseCard(instanceId: string) {
    if (suppressedClickRef.current === instanceId) {
      suppressedClickRef.current = undefined;
      return;
    }
    setSelectedInstanceId((current) => (current === instanceId ? undefined : instanceId));
  }

  function startEndDay() {
    if (!cycle) return;
    setSelectedInstanceId(undefined);
    setReaction(undefined);
    setReactingPassiveIds([]);
    updateAim(undefined);
    const items = cycle.tasks.flatMap((task) => {
      const intent = getCurrentIntent(cycle, task);
      if (!intent) return [];
      const definitionTask = definition.tasks.find((candidate) => candidate.id === task.taskId);
      return [
        {
          taskId: task.taskId,
          taskName: definitionTask?.name ?? task.taskId,
          label: formatIntent(intent),
        },
      ];
    });
    setCeremony({
      items: items.length > 0 ? items : [{ taskName: "All Tasks", label: "No open intents" }],
      index: 0,
    });
  }

  const ceremonyItem = ceremony?.items[ceremony.index];
  playCardRef.current = commitCardPlay;

  function portraitMood(developerId: DeveloperId): CharacterMood {
    if (reaction?.developerId === developerId) return "success";
    if (selectedOwnerId === developerId) return "thinking";
    return "idle";
  }

  return (
    <section className="screen cycle-screen" aria-label={definition.name}>
      <header className="cycle-hud">
        <div className="run-vitals" aria-label="Run status">
          <span>
            <small>Morale</small>
            <b>{run.morale}</b>
          </span>
          <span>
            <small>Credits</small>
            <b>${run.credits}</b>
          </span>
        </div>

        <div className="passive-rack" aria-label="Squad passives">
          {run.squad.map((developerId) => {
            const developer = getDeveloper(developerId);
            const triggered = cycle.triggeredPassiveIds.includes(developerId);
            return (
              <PassiveChip
                key={developer.id}
                developerId={developer.id}
                spent={triggered}
                mood={portraitMood(developer.id)}
                reacting={reactingPassiveIds.includes(developer.id)}
              />
            );
          })}
        </div>

        <div className="cycle-counters">
          <span>
            <small>Day</small>
            <b>
              {cycle.day}/{definition.maxDays}
            </b>
          </span>
          <span>
            <small>Focus</small>
            <b>{cycle.focus}/3</b>
          </span>
        </div>
      </header>

      <div
        className={`task-board task-board--${Math.min(cycle.tasks.length, 4)}`}
        aria-label="Cycle Tasks"
      >
        {cycle.tasks.map((task) => {
          const taskDefinition = definition.tasks.find((candidate) => candidate.id === task.taskId);
          return (
            <TaskPanel
              key={task.taskId}
              run={run}
              task={task}
              taskName={taskDefinition?.name ?? task.taskId}
              selectedCard={selectedCard}
              hoveredTargetKey={aim?.hoveredTargetKey}
              resolving={ceremonyItem?.taskId === task.taskId}
              onTarget={playSelected}
            />
          );
        })}
      </div>

      <div className="sr-only" aria-live="polite">
        {selectedCard ? `${getCard(selectedCard.cardId).name}: choose a target` : ""}
      </div>

      <div className="cycle-bottom">
        <div
          className="card-pile card-pile--draw"
          aria-label={`Draw pile, ${cycle.drawPile.length}`}
        >
          <span>Draw</span>
          <b>{cycle.drawPile.length}</b>
        </div>

        <div className="hand" aria-label="Cards in hand">
          {cycle.hand.map((instance) => {
            const card = getCard(instance.cardId);
            const cost = effectiveCardCost(card, cycle, run.squad);
            const unplayable = card.kind === "status";
            return (
              <GameCard
                key={instance.instanceId}
                instance={instance}
                effectiveCost={cost}
                selected={activeInstanceId === instance.instanceId}
                disabled={unplayable || resolvingDay || resolvingCard || cost > cycle.focus}
                onSelect={() => chooseCard(instance.instanceId)}
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
              className="button button--primary cycle-action"
              type="button"
              disabled={!canShip || resolvingDay || resolvingCard}
              onClick={() => dispatch({ type: "SHIP_CYCLE" })}
              aria-label={shipSummary ? `Ship: ${shipSummary}` : "Ship unavailable"}
            >
              <strong>Ship</strong>
              {shipSummary && <small>{shipSummary}</small>}
            </button>
            <button
              className="button button--secondary cycle-action"
              type="button"
              disabled={resolvingDay || resolvingCard}
              onClick={startEndDay}
            >
              <strong>End Day</strong>
              {moraleIncoming > 0 && <small>−{moraleIncoming} Morale</small>}
            </button>
          </div>
          <div
            className="card-pile card-pile--discard"
            aria-label={`Discard pile, ${cycle.discardPile.length}`}
          >
            <span>Discard</span>
            <b>{cycle.discardPile.length}</b>
          </div>
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

      {ceremonyItem && (
        <output className="day-ceremony" aria-live="assertive">
          <span>Intent Resolves</span>
          <strong>{ceremonyItem.taskName}</strong>
          <b>{ceremonyItem.label}</b>
        </output>
      )}

      {dayBanner && !ceremony && (
        <output className="day-banner" aria-live="polite">
          {dayBanner}
        </output>
      )}

      {reaction && <CharacterReaction key={reaction.id} cue={reaction} />}
    </section>
  );
}
