import { disciplineLabel, formatIntent } from "../domain/content";
import type { CardInstance, Discipline, RunState, TaskState } from "../domain/models";
import {
  getCurrentIntent,
  isTaskReady,
  requirementProgress,
  resolveCardTarget,
} from "../game/rules";

interface TaskPanelProps {
  run: RunState;
  task: TaskState;
  taskName: string;
  selectedCard?: CardInstance;
  hoveredTargetKey?: string;
  resolving?: boolean;
  onTarget: (taskId: string, discipline?: Discipline) => void;
}

export function TaskPanel({
  run,
  task,
  taskName,
  selectedCard,
  hoveredTargetKey,
  resolving,
  onTarget,
}: TaskPanelProps) {
  const cycle = run.cycle;
  if (!cycle) return null;
  const ready = isTaskReady(task);
  const intent = getCurrentIntent(cycle, task);
  const selectedDefinition = selectedCard
    ? resolveCardTarget(run, selectedCard, { taskId: task.taskId })
    : undefined;
  const reviewing =
    selectedCard && selectedDefinition?.legal && selectedDefinition.kind === "review";

  return (
    <article className={`task-panel${ready ? " is-ready" : ""}${resolving ? " is-resolving" : ""}`}>
      <header className="task-panel__header">
        <div>
          <span className="task-panel__state">{ready ? "Ready" : "Open"}</span>
          <h2>{taskName}</h2>
        </div>
        <div className={`intent-badge intent-badge--${intent?.kind ?? "cancelled"}`}>
          <span>Intent</span>
          <strong>{intent ? formatIntent(intent) : "Cancelled"}</strong>
        </div>
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
              ? (preview.amount / requirement.target) * 100
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
              </span>
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

      {reviewing && (
        <button
          className={`review-target${hoveredTargetKey === `${task.taskId}:review` ? " is-aimed" : ""}`}
          type="button"
          onClick={() => onTarget(task.taskId)}
          data-card-target={`${task.taskId}:review`}
          data-task-id={task.taskId}
        >
          {selectedDefinition.label}
        </button>
      )}
    </article>
  );
}
