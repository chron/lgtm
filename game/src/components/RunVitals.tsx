import type { RunState } from "../domain/models";
import { eventModifierLabels } from "../game/eventResolution";
import { ToolRack } from "./ToolRack";

interface RunVitalsProps {
  floating?: boolean;
  run: RunState;
  showMorale?: boolean;
}

export function RunVitals({ floating, run, showMorale = true }: RunVitalsProps) {
  const debtUntilJunk = 3 - (run.techDebt % 3);
  const modifierLabels = eventModifierLabels(run);

  return (
    <div className={`run-vitals${floating ? " run-vitals--floating" : ""}`} aria-label="Run status">
      {showMorale && (
        <span>
          <small>Morale</small>
          <b>
            {run.morale}/{run.maxMorale}
          </b>
        </span>
      )}
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
      {modifierLabels.length > 0 && (
        <span className="run-modifiers" aria-label="Queued run effects">
          {modifierLabels.map((label) => (
            <small key={label}>{label}</small>
          ))}
        </span>
      )}
    </div>
  );
}
