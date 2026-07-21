import { Award, X } from "lucide-react";
import { achievementDefinitions, type AchievementId } from "./achievementStore";

interface AchievementToastProps {
  achievementId: AchievementId;
  onDismiss: () => void;
}

export function AchievementToast({ achievementId, onDismiss }: AchievementToastProps) {
  const achievement = achievementDefinitions.find((candidate) => candidate.id === achievementId);
  if (!achievement) return null;

  return (
    <output className="achievement-toast" aria-live="polite" aria-atomic="true">
      <span className="achievement-toast__icon" aria-hidden="true">
        <Award />
      </span>
      <span className="achievement-toast__copy">
        <small>Achievement Unlocked</small>
        <strong>{achievement.name}</strong>
        <span>{achievement.rules}</span>
      </span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss achievement">
        <X aria-hidden="true" />
      </button>
    </output>
  );
}
