import {
  Bot,
  CheckCheck,
  LockKeyhole,
  Network,
  Rocket,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { achievementDefinitions, type AchievementId } from "../achievements/achievementStore";
import { getDeveloper } from "../domain/content";

interface AchievementsScreenProps {
  unlocked: readonly AchievementId[];
  onBack: () => void;
}

const achievementIcons: Readonly<Record<AchievementId, LucideIcon>> = {
  "game-won": Trophy,
  "win-paul": Rocket,
  "win-odin": Network,
  "win-irene": CheckCheck,
  "win-madi": Bot,
};

export function AchievementsScreen({ unlocked, onBack }: AchievementsScreenProps) {
  const unlockedIds = new Set(unlocked);

  return (
    <section className="screen achievements-screen" aria-labelledby="achievements-heading">
      <header className="achievements-heading">
        <div>
          <h1 id="achievements-heading" className="display-title">
            ACHIEVEMENTS
          </h1>
        </div>
        <div
          className="achievements-tally"
          aria-label={`${unlocked.length} of ${achievementDefinitions.length} unlocked`}
        >
          <strong>
            {unlocked.length}/{achievementDefinitions.length}
          </strong>
          <span>Unlocked</span>
        </div>
      </header>

      <div className="achievement-grid" aria-label="Achievement gallery">
        {achievementDefinitions.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const Icon = isUnlocked ? achievementIcons[achievement.id] : LockKeyhole;
          const accent =
            "developerId" in achievement
              ? getDeveloper(achievement.developerId).accent
              : "var(--yellow)";

          return (
            <article
              key={achievement.id}
              className={`achievement-tile ${achievement.id === "game-won" ? "achievement-tile--major" : ""} ${isUnlocked ? "is-unlocked" : "is-locked"}`}
              style={{ "--achievement-accent": accent } as CSSProperties}
              aria-label={`${achievement.name}, ${isUnlocked ? "unlocked" : "locked"}`}
            >
              <div className="achievement-icon" aria-hidden="true">
                <Icon strokeWidth={3.2} />
              </div>
              <div className="achievement-copy">
                <span className="achievement-state">{isUnlocked ? "Unlocked" : "Locked"}</span>
                <h2>{achievement.name}</h2>
                <p>{achievement.rules}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="achievements-actions">
        <button className="button button--secondary" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
