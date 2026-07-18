import { describeIntent, disciplineLabel, formatIntent } from "../domain/content";
import type { CardInstance, Discipline, RunState, TaskState } from "../domain/models";
import {
  absorbMoraleDamage,
  getCurrentIntent,
  getScheduledIntent,
  requirementProgress,
  resolveCardTarget,
  taskShippingPreview,
  taskShippingRewards,
} from "../game/rules";

interface TaskPanelProps {
  run: RunState;
  task: TaskState;
  taskName: string;
  taskRole?: "primary" | "complication";
  selectedCard?: CardInstance;
  hoveredTargetKey?: string;
  resolving?: boolean;
  shippingDisabled?: boolean;
  onTarget: (taskId: string, discipline?: Discipline) => void;
  onShip: (taskId: string) => void;
}

export function TaskPanel({
  run,
  task,
  taskName,
  taskRole,
  selectedCard,
  hoveredTargetKey,
  resolving,
  shippingDisabled,
  onTarget,
  onShip,
}: TaskPanelProps) {
  const cycle = run.cycle;
  if (!cycle) return null;
  const ready = task.status === "ready";
  const shipped = task.status === "shipped";
  const ship = taskShippingPreview(task);
  const shippingDamage = absorbMoraleDamage(cycle.block, ship.moraleLoss);
  const defectLabel = `${ship.defects} Defect${ship.defects === 1 ? "" : "s"}`;
  const shippingRewards = taskShippingRewards(run, task.taskId);
  const intent = getCurrentIntent(cycle, task);
  const scheduledIntent = getScheduledIntent(cycle, task);
  const intentForHelp = scheduledIntent ?? intent;
  const intentTooltipId = `intent-help-${task.taskId}`;
  const selectedDefinition = selectedCard
    ? resolveCardTarget(run, selectedCard, { taskId: task.taskId })
    : undefined;
  const taskTargeting =
    selectedCard &&
    selectedDefinition?.legal &&
    (selectedDefinition.kind === "review" || selectedDefinition.kind === "tactic");

  return (
    <article
      className={`task-panel${taskRole ? ` task-panel--${taskRole}` : ""}${ready ? " is-ready" : ""}${shipped ? " is-shipped" : ""}${resolving ? " is-resolving" : ""}`}
    >
      <header className="task-panel__header">
        <div>
          <span className="task-panel__state">
            {taskRole ? `${taskRole} · ` : ""}
            {shipped ? "Shipped" : ready ? "Ready" : "Open"}
          </span>
          <h2>{taskName}</h2>
        </div>
        <button
          className={`intent-badge intent-badge--${task.stunned ? "stunned" : (intent?.kind ?? "cancelled")}`}
          type="button"
          disabled={!intentForHelp}
          aria-describedby={intentForHelp ? intentTooltipId : undefined}
        >
          <span className="intent-badge__label">Intent</span>
          <strong>
            {task.stunned && scheduledIntent
              ? `Stunned · ${formatIntent(scheduledIntent)}`
              : intent
                ? formatIntent(intent)
                : "Cancelled"}
          </strong>
          {intentForHelp && (
            <span className="game-tooltip" id={intentTooltipId} role="tooltip">
              <strong>{task.stunned ? "Stunned" : "At End Day"}</strong>
              <span>
                {task.stunned ? "Cancelled for today. " : ""}
                {describeIntent(intentForHelp)}
              </span>
            </span>
          )}
        </button>
      </header>

      <div className="requirement-stack">
        {task.requirements.map((requirement) => {
          const preview = selectedCard
            ? resolveCardTarget(run, selectedCard, {
                taskId: task.taskId,
                discipline: requirement.discipline,
              })
            : undefined;
          const legalTarget = selectedCard && preview?.legal && preview.kind === "work";
          const progress = requirementProgress(requirement);
          const verifiedPercent = (requirement.verified / requirement.target) * 100;
          const unverifiedPercent = (requirement.unverified / requirement.target) * 100;
          const targetKey = `${task.taskId}:${requirement.discipline}`;
          const aimed = hoveredTargetKey === targetKey;
          const previewPercent =
            legalTarget && preview.kind === "work"
              ? ((preview.amount + preview.scriptRunAmount) / requirement.target) * 100
              : 0;

          return (
            <button
              className={`requirement${legalTarget ? " is-targetable" : ""}${aimed ? " is-aimed" : ""}`}
              type="button"
              key={requirement.discipline}
              disabled={!legalTarget}
              onClick={() => onTarget(task.taskId, requirement.discipline)}
              aria-label={`${disciplineLabel(requirement.discipline)} ${progress} of ${requirement.target}${legalTarget ? `. Play card: ${preview.label}` : ""}`}
              data-card-target={legalTarget ? targetKey : undefined}
              data-task-id={legalTarget ? task.taskId : undefined}
              data-target-discipline={legalTarget ? requirement.discipline : undefined}
            >
              <span className="requirement__line">
                <strong>{disciplineLabel(requirement.discipline)}</strong>
                <span>
                  {progress}/{requirement.target}
                </span>
              </span>
              <span className="requirement__track" aria-hidden="true">
                <span
                  className="requirement__fill requirement__fill--verified"
                  style={{ width: `${verifiedPercent}%` }}
                />
                <span
                  className="requirement__fill requirement__fill--unverified"
                  style={{
                    left: `${verifiedPercent}%`,
                    width: `${unverifiedPercent}%`,
                  }}
                />
                {legalTarget && preview.kind === "work" && (
                  <span
                    className={`requirement__fill requirement__fill--preview requirement__fill--preview-${preview.workKind}`}
                    style={{
                      left: `${verifiedPercent + unverifiedPercent}%`,
                      width: `${previewPercent}%`,
                    }}
                  />
                )}
                <span className="requirement__segments">
                  {Array.from({ length: requirement.target }, (_, index) => (
                    <span key={index} />
                  ))}
                </span>
              </span>
              {(requirement.scriptPower > 0 || requirement.scriptBlock > 0) && (
                <span
                  className="requirement__script"
                  aria-label={`${requirement.scriptPower > 0 ? `Script ${requirement.scriptPower}` : ""}${requirement.scriptPower > 0 && requirement.scriptBlock > 0 ? ", " : ""}${requirement.scriptBlock > 0 ? `Guard ${requirement.scriptBlock}` : ""}`}
                >
                  {requirement.scriptPower > 0 && <b>Script +{requirement.scriptPower}</b>}
                  {requirement.scriptBlock > 0 && <b>Guard +{requirement.scriptBlock}</b>}
                  <small>Each Day</small>
                </span>
              )}
              {(requirement.unverified > 0 || legalTarget) && (
                <span className="requirement__foot">
                  <span>
                    {requirement.unverified > 0
                      ? `${requirement.unverified} Unverified`
                      : undefined}
                  </span>
                  {legalTarget && <b>{preview.label}</b>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {taskTargeting && (
        <button
          className={`review-target${hoveredTargetKey === `${task.taskId}:${selectedDefinition.kind}` ? " is-aimed" : ""}`}
          type="button"
          onClick={() => onTarget(task.taskId)}
          data-card-target={`${task.taskId}:${selectedDefinition.kind}`}
          data-task-id={task.taskId}
        >
          {selectedDefinition.label}
        </button>
      )}

      {ready && (
        <div className="task-ship">
          <span>
            {[
              ship.defects > 0
                ? `${defectLabel} · ${shippingDamage.moraleLoss > 0 ? `−${shippingDamage.moraleLoss} Morale` : "Blocked"}`
                : "Clean",
              ship.techDebt > 0 ? `+${ship.techDebt} Debt` : undefined,
              shippingRewards.cardsDrawn > 0 ? `Draw ${shippingRewards.cardsDrawn}` : undefined,
              shippingRewards.focusGained > 0 ? `+${shippingRewards.focusGained} Focus` : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <button
            className="button button--primary task-ship__button"
            type="button"
            disabled={shippingDisabled}
            onClick={() => onShip(task.taskId)}
            aria-label={`Ship ${taskName}. ${ship.defects > 0 ? `${defectLabel}, ${shippingDamage.blocked} blocked and ${shippingDamage.moraleLoss} Morale lost` : "Clean ship"}${ship.techDebt > 0 ? `, plus ${ship.techDebt} Tech Debt` : ""}${shippingRewards.cardsDrawn > 0 ? `, draw ${shippingRewards.cardsDrawn} cards` : ""}${shippingRewards.focusGained > 0 ? `, gain ${shippingRewards.focusGained} Focus` : ""}`}
          >
            Ship Task
          </button>
        </div>
      )}

      {shipped && <div className="task-shipped-stamp">Shipped</div>}
    </article>
  );
}
