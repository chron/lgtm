import type { DispatchProps } from "../app/types";
import type { CycleReport } from "../domain/models";

interface ReportScreenProps extends DispatchProps {
  report: CycleReport;
}

export function ReportScreen({ dispatch, report }: ReportScreenProps) {
  const shipped = report.outcome === "shipped";
  return (
    <section className="screen report-screen" aria-labelledby="report-heading">
      <div className="screen-heading">
        <h1 id="report-heading" className="display-title">
          {shipped ? "SHIPPED" : "MISSED"}
        </h1>
        <span>Day {report.day}</span>
      </div>

      <div className="report-grid">
        <div className="report-stat report-stat--yellow">
          <strong>{report.shippedProgress}</strong>
          <span>Work</span>
        </div>
        <div className="report-stat report-stat--pink">
          <strong>{report.defects}</strong>
          <span>Defects</span>
        </div>
        <div className="report-stat report-stat--mint">
          <strong>{report.moraleDelta}</strong>
          <span>Morale</span>
        </div>
      </div>

      <div className="task-recap" aria-label="Task results">
        {report.tasks.map((task) => (
          <div key={task.taskId}>
            <strong>{task.name}</strong>
            <span>{task.completed ? "Ready" : "Open"}</span>
            <small>
              {task.verifiedWork} Verified · {task.unverifiedWork} Unverified
            </small>
          </div>
        ))}
      </div>

      {shipped && (
        <div className="reward-placeholder">
          <strong>Card reward next</strong>
          <span>+{report.creditsGained} Credits</span>
        </div>
      )}

      <div className="screen-actions">
        <button
          className="button button--primary"
          type="button"
          onClick={() => dispatch({ type: "CONTINUE_REPORT" })}
        >
          Continue
        </button>
      </div>
    </section>
  );
}
