import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AchievementToast } from "./AchievementToast";

describe("AchievementToast", () => {
  it("announces the unlocked achievement with its real catalogue copy", () => {
    const markup = renderToStaticMarkup(
      <AchievementToast achievementId="clean-final-release" onDismiss={() => undefined} />,
    );

    expect(markup).toContain("<output");
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Achievement Unlocked");
    expect(markup).toContain("No Notes");
    expect(markup).toContain("Win with no Unverified Work or defects in the Final Release.");
    expect(markup).toContain('aria-label="Dismiss achievement"');
  });
});
