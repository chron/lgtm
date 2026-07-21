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
        <button
          className="run-vital"
          type="button"
          aria-label={`Morale ${run.morale} of ${run.maxMorale}. Morale at zero ends the run.`}
        >
          <small>Morale</small>
          <b>
            {run.morale}/{run.maxMorale}
          </b>
          <span className="game-tooltip" role="tooltip">
            <strong>Morale</strong>
            <span>Reach zero and the run ends. Block prevents incoming Morale loss.</span>
          </span>
        </button>
      )}
      <button
        className="run-vital"
        type="button"
        aria-label={`Credits ${run.credits}. Spend Credits at Shops.`}
      >
        <small>Credits</small>
        <b>${run.credits}</b>
        <span className="game-tooltip" role="tooltip">
          <strong>Credits</strong>
          <span>Spend these on cards, Tools, and services at Shops.</span>
        </span>
      </button>
      <button
        className="run-vital run-vital--debt"
        type="button"
        aria-label={`Tech Debt ${run.techDebt}. Next junk card in ${debtUntilJunk} Debt.`}
      >
        <small>Tech Debt</small>
        <b>{run.techDebt}</b>
        <span className="game-tooltip" role="tooltip">
          <strong>Next junk card</strong>
          <span>{debtUntilJunk} Debt away</span>
        </span>
      </button>
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
