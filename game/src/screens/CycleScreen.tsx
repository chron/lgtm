import { useEffect, useState } from "react";
import type { DispatchProps, RunProps } from "../app/types";
import { GameCard } from "../components/GameCard";
import { TaskPanel } from "../components/TaskPanel";
import { getCard, getCycle, getDeveloper } from "../domain/content";
import type { Discipline } from "../domain/models";
import { effectiveCardCost, incomingMorale, isCycleReady, shippingPreview } from "../game/rules";

type CycleScreenProps = DispatchProps & RunProps;

export function CycleScreen({ dispatch, run }: CycleScreenProps) {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>();
  const cycle = run?.cycle;
  const selectedCard = cycle?.hand.find((instance) => instance.instanceId === selectedInstanceId);

  useEffect(() => {
    if (!selectedCard) setSelectedInstanceId(undefined);
  }, [cycle?.day, selectedCard]);

  if (!run || !cycle) return null;
  const definition = getCycle(cycle.cycleId);
  const canShip = isCycleReady(cycle);
  const ship = shippingPreview(cycle);
  const moraleIncoming = incomingMorale(cycle);

  function playSelected(taskId: string, discipline?: Discipline) {
    if (!selectedCard) return;
    dispatch({
      type: "PLAY_CARD",
      instanceId: selectedCard.instanceId,
      target: { taskId, discipline },
    });
    setSelectedInstanceId(undefined);
  }

  return (
    <section className="screen cycle-screen" aria-labelledby="cycle-heading">
      <div className="cycle-masthead">
        <div>
          <div className="cycle-stamp">Cycle 01</div>
          <h1 id="cycle-heading">{definition.name}</h1>
        </div>
        <div className="cycle-counters">
          <span>
            Day{" "}
            <b>
              {cycle.day}/{definition.maxDays}
            </b>
          </span>
          <span>
            Focus <b>{cycle.focus}/3</b>
          </span>
        </div>
      </div>

      <div className="passive-rack" aria-label="Squad passives">
        {run.squad.map((developerId) => {
          const developer = getDeveloper(developerId);
          const triggered = cycle.triggeredPassiveIds.includes(developerId);
          return (
            <span
              key={developer.id}
              className={triggered ? "is-spent" : ""}
              title={developer.passiveRules}
            >
              {developer.passiveName}
              <b>{triggered ? "Used" : "Ready"}</b>
            </span>
          );
        })}
      </div>

      <div className="task-board" aria-label="Cycle Tasks">
        {cycle.tasks.map((task) => {
          const taskDefinition = definition.tasks.find((candidate) => candidate.id === task.taskId);
          return (
            <TaskPanel
              key={task.taskId}
              run={run}
              task={task}
              taskName={taskDefinition?.name ?? task.taskId}
              selectedCard={selectedCard}
              onTarget={playSelected}
            />
          );
        })}
      </div>

      <div className="cycle-controls">
        <div className="pile-counts" aria-label="Card piles">
          <span>Draw {cycle.drawPile.length}</span>
          <span>Discard {cycle.discardPile.length}</span>
        </div>
        <div className="target-prompt" aria-live="polite">
          {selectedCard ? `${getCard(selectedCard.cardId).name}: choose a target` : "Choose a card"}
        </div>
        <div className="cycle-actions">
          <button
            className="button button--secondary"
            type="button"
            onClick={() => dispatch({ type: "END_DAY" })}
          >
            {moraleIncoming > 0 ? `End Day · −${moraleIncoming} Morale` : "End Day"}
          </button>
          <button
            className="button button--primary"
            type="button"
            disabled={!canShip}
            onClick={() => dispatch({ type: "SHIP_CYCLE" })}
          >
            {!canShip
              ? "Ship"
              : ship.defects > 0
                ? `Ship · ${ship.defects} Defect${ship.defects === 1 ? "" : "s"} · −${ship.moraleLoss} Morale${ship.techDebt ? " · +1 Debt" : ""}`
                : "Ship · Clean"}
          </button>
        </div>
      </div>

      <div className="hand" aria-label="Cards in hand">
        {cycle.hand.map((instance) => {
          const card = getCard(instance.cardId);
          const cost = effectiveCardCost(card, cycle, run.squad);
          return (
            <GameCard
              key={instance.instanceId}
              instance={instance}
              effectiveCost={cost}
              selected={selectedInstanceId === instance.instanceId}
              disabled={cost > cycle.focus}
              onSelect={() =>
                setSelectedInstanceId((current) =>
                  current === instance.instanceId ? undefined : instance.instanceId,
                )
              }
            />
          );
        })}
      </div>
    </section>
  );
}
