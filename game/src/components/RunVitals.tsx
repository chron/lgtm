import type { RunState } from "../domain/models";
import { ToolRack } from "./ToolRack";

interface RunVitalsProps {
  floating?: boolean;
  run: RunState;
}

export function RunVitals({ floating, run }: RunVitalsProps) {
  const debtUntilJunk = 3 - (run.techDebt % 3);

  return (
    <div className={`run-vitals${floating ? " run-vitals--floating" : ""}`} aria-label="Run status">
      <span>
        <small>Morale</small>
        <b>{run.morale}/10</b>
      </span>
      <span>
        <small>Credits</small>
        <b>${run.credits}</b>
      </span>
      <span
        className="run-vital--debt"
        aria-label={`Tech Debt ${run.techDebt}. Next junk card in ${debtUntilJunk} Debt.`}
      >
        <small>Tech Debt</small>
        <b>{run.techDebt}</b>
        <span className="game-tooltip" aria-hidden="true">
          <strong>Next junk card</strong>
          <span>{debtUntilJunk} Debt away</span>
        </span>
      </span>
      <ToolRack toolIds={run.tools} />
    </div>
  );
}
