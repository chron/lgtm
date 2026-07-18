import { disciplineLabel, formatIntent } from "../domain/content";
import type { CardInstance, Discipline, RunState, TaskState } from "../domain/models";
import {
  getCurrentIntent,
  isTaskReady,
  remainingWork,
  requirementProgress,
  resolveCardTarget,
  taskUnverifiedWork,
} from "../game/rules";

interface TaskPanelProps {
  run: RunState;
  task: TaskState;
  taskName: string;
  selectedCard?: CardInstance;
  onTarget: (taskId: string, discipline?: Discipline) => void;
}

export function TaskPanel({ run, task, taskName, selectedCard, onTarget }: TaskPanelProps) {
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
    <article className={`task-panel${ready ? " is-ready" : ""}`}>
      <header className="task-panel__header">
        <div>
          <span className="task-panel__state">{ready ? "Ready" : "Open"}</span>
          <h2>{taskName}</h2>
        </div>
        <div className={`intent-badge intent-badge--${intent?.kind ?? "cancelled"}`}>
          {intent ? formatIntent(intent) : "Intent Cancelled"}
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

          return (
            <button
              className={`requirement${legalTarget ? " is-targetable" : ""}`}
              type="button"
              key={requirement.discipline}
              disabled={!legalTarget}
              onClick={() => onTarget(task.taskId, requirement.discipline)}
              aria-label={`${disciplineLabel(requirement.discipline)} ${progress} of ${requirement.target}${legalTarget ? `. Play card: ${preview.label}` : ""}`}
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
              </span>
              <span className="requirement__foot">
                <span>
                  {requirement.unverified > 0
                    ? `${requirement.unverified} Unverified`
                    : `${remainingWork(requirement)} left`}
                </span>
                {legalTarget && <b>{preview.label}</b>}
              </span>
            </button>
          );
        })}
      </div>

      {reviewing && (
        <button className="review-target" type="button" onClick={() => onTarget(task.taskId)}>
          {selectedDefinition.label}
        </button>
      )}

      {ready && taskUnverifiedWork(task) > 0 && !reviewing && (
        <span className="task-panel__warning">{taskUnverifiedWork(task)} Unverified</span>
      )}
    </article>
  );
}
