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
          <div className="report-stat__content">
            <strong>{report.shippedProgress}</strong>
            <span>Work</span>
          </div>
        </div>
        <div className="report-stat report-stat--pink">
          <div className="report-stat__content">
            <strong>{report.defects}</strong>
            <span>Defects</span>
          </div>
        </div>
        <div className="report-stat report-stat--mint">
          <div className="report-stat__content">
            <strong>{report.moraleDelta}</strong>
            <span>Morale</span>
          </div>
        </div>
        <div className="report-stat report-stat--blue">
          <div className="report-stat__content">
            <strong>+{report.techDebtAdded}</strong>
            <span>Debt</span>
          </div>
        </div>
      </div>

      <div className="task-recap" aria-label="Task results">
        {report.tasks.map((task) => (
          <div key={task.taskId}>
            <strong>{task.name}</strong>
            <span>{task.completed ? "Shipped" : task.cleared ? "Cleared" : "Open"}</span>
            <small>
              {task.verifiedWork} Verified · {task.unverifiedWork} Unverified
            </small>
          </div>
        ))}
      </div>

      <div className="reward-placeholder">
        <strong>
          {shipped ? (report.toolReward ? "Tool and card next" : "Card reward next") : "No reward"}
        </strong>
        <span>{report.creditsGained > 0 ? `+${report.creditsGained} Credits` : "No Credits"}</span>
      </div>

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
