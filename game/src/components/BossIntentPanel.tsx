import { getBossDefinition, getBossPhase } from "../domain/bosses";
import type { CycleState, RunState } from "../domain/models";
import { getBossIntentPreview } from "../game/bossEngine";
import "./BossIntentPanel.css";

interface BossIntentPanelProps {
  run: RunState;
  cycle: CycleState;
}

export function BossIntentPanel({ run, cycle }: BossIntentPanelProps) {
  if (!cycle.boss) return null;
  const boss = getBossDefinition(cycle.boss.bossId);
  const intent = getBossIntentPreview(run, cycle, boss);
  if (!intent) return null;
  const phase = getBossPhase(boss, cycle.boss.phase);

  return (
    <aside
      className={`boss-intent${intent.stunned ? " boss-intent--stunned" : ""}`}
      aria-label={`${boss.stakeholder} End Day effect: ${intent.label}`}
    >
      <img src={phase.reactionArt} alt="" />
      <div className="boss-intent__copy">
        <span>
          {boss.stakeholder} · {phase.title}
        </span>
        <strong>{intent.stunned ? `Cancelled Today · ${intent.label}` : intent.label}</strong>
        <p>{intent.summary}</p>
        <small>“{intent.quote}”</small>
      </div>
      <b className="boss-intent__state">{intent.stunned ? "Cancelled Today" : "End Day"}</b>
    </aside>
  );
}
