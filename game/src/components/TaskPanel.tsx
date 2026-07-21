import { describeIntent, disciplineLabel, formatIntent } from "../domain/content";
import type { CardInstance, Discipline, RunState, TaskState } from "../domain/models";
import {
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
  taskRole?: "primary" | "complication" | "side-quest" | "bounty";
  selectedCard?: CardInstance;
  hoveredTargetKey?: string;
  resolving?: boolean;
  shippingDisabled?: boolean;
  releaseTask?: boolean;
  suppressEmptyIntent?: boolean;
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
  releaseTask,
  suppressEmptyIntent,
  onTarget,
  onShip,
}: TaskPanelProps) {
  const cycle = run.cycle;
  if (!cycle) return null;
  const ready = task.status === "ready";
  const bountyReward =
    task.bountyReward?.kind === "credits"
      ? `${task.bountyReward.amount} Credits`
      : task.bountyReward?.kind === "tool-offer"
        ? "Tool Offer"
        : task.bountyReward?.kind === "rare-card-offer"
          ? "Rare Card Offer"
          : undefined;
  const shipped = task.status === "shipped";
  const ship = taskShippingPreview(task);
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
      className={`task-panel${taskRole ? ` task-panel--${taskRole}` : ""}${ready ? " is-ready" : ""}${shipped ? " is-shipped" : ""}${task.stunned ? " is-stunned" : ""}${resolving ? " is-resolving" : ""}`}
    >
      <header className="task-panel__header">
        <div>
          <span className="task-panel__state">
            {taskRole
              ? `${taskRole === "side-quest" ? "Side Quest" : taskRole === "bounty" ? "Bounty" : taskRole} · `
              : ""}
            {shipped ? "Shipped" : ready ? "Ready" : "Open"}
          </span>
          <h2>{taskName}</h2>
          {bountyReward && (
            <span className="task-panel__bounty-reward">Reward · {bountyReward}</span>
          )}
        </div>
        {(!suppressEmptyIntent || intentForHelp) && (
          <button
            className={`intent-badge intent-badge--${task.stunned ? "stunned" : (intent?.kind ?? "cancelled")}`}
            type="button"
            disabled={!intentForHelp}
            aria-describedby={intentForHelp ? intentTooltipId : undefined}
          >
            <span className="intent-badge__label">End Day</span>
            <strong>
              {task.stunned && scheduledIntent
                ? "Cancelled Today"
                : intent
                  ? formatIntent(intent)
                  : taskRole === "side-quest" || taskRole === "bounty"
                    ? "None"
                    : "Cancelled"}
            </strong>
            {intentForHelp && (
              <span className="game-tooltip" id={intentTooltipId} role="tooltip">
                <strong>{task.stunned ? "Cancelled Today" : "When you End Day"}</strong>
                <span>
                  {task.stunned ? `${formatIntent(intentForHelp)} will not happen today. ` : ""}
                  {describeIntent(intentForHelp)}
                </span>
              </span>
            )}
          </button>
        )}
      </header>

      <div className="requirement-stack">
        {task.requirements.map((requirement) => {
          const preview = selectedCard
            ? resolveCardTarget(run, selectedCard, {
                taskId: task.taskId,
                discipline: requirement.discipline,
              })
            : undefined;
          const legalTarget =
            selectedCard &&
            preview?.legal &&
            (preview.kind === "work" || preview.kind === "tactic");
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
                  {legalTarget && <b>{preview.label}</b>}
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
              {requirement.scriptPower > 0 && (
                <span
                  className="requirement__script"
                  aria-label={`Script ${requirement.scriptPower}`}
                >
                  <b>Script +{requirement.scriptPower}</b>
                  <small>Each Day</small>
                </span>
              )}
              {requirement.unverified > 0 && (
                <span className="requirement__foot">
                  <span>{requirement.unverified} Unverified</span>
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
              ship.defects > 0 ? `${defectLabel}` : "Clean",
              ship.techDebt > 0 ? `+${ship.techDebt} Debt` : undefined,
              shippingRewards.cardsDrawn > 0 ? `Draw ${shippingRewards.cardsDrawn}` : undefined,
              shippingRewards.focusGained > 0 ? `+${shippingRewards.focusGained} Focus` : undefined,
              task.prototypeReward ? `Prototype +${task.prototypeReward}` : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {releaseTask ? (
            <strong className="task-ship__release-ready">Ready for Launch</strong>
          ) : (
            <button
              className="button button--primary task-ship__button"
              type="button"
              disabled={shippingDisabled}
              onClick={() => onShip(task.taskId)}
              aria-label={`Ship ${taskName}. ${ship.defects > 0 ? defectLabel : "Clean ship"}${ship.techDebt > 0 ? `, plus ${ship.techDebt} Tech Debt` : ""}${shippingRewards.cardsDrawn > 0 ? `, draw ${shippingRewards.cardsDrawn} cards` : ""}${shippingRewards.focusGained > 0 ? `, gain ${shippingRewards.focusGained} Focus` : ""}${task.prototypeReward ? `, gain ${task.prototypeReward} Prototype` : ""}`}
            >
              Ship Task
            </button>
          )}
        </div>
      )}

      {shipped && <div className="task-shipped-stamp">Shipped</div>}
    </article>
  );
}
