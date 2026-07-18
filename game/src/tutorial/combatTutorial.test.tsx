import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CombatTutorialCallout } from "./CombatTutorial";
import {
  COMBAT_TUTORIAL_STORAGE_KEY,
  combatTutorialSteps,
  completeCombatTutorial,
  positionTutorialCallout,
  restartCombatTutorial,
  shouldShowCombatTutorial,
  tutorialKeyboardAction,
} from "./combatTutorialState";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("combat tutorial", () => {
  it("covers the five essential combat concepts in order", () => {
    expect(combatTutorialSteps.map((step) => step.id)).toEqual([
      "tasks",
      "focus",
      "targeting",
      "end-day",
      "shipping",
    ]);
    expect(combatTutorialSteps.map((step) => step.anchor)).toEqual([
      "tasks",
      "focus",
      "hand",
      "end-day",
      "tasks",
    ]);
  });

  it("persists completion and can be explicitly restarted", () => {
    const storage = memoryStorage();
    expect(shouldShowCombatTutorial(storage)).toBe(true);

    completeCombatTutorial(storage);
    expect(storage.getItem(COMBAT_TUTORIAL_STORAGE_KEY)).toBe("complete");
    expect(shouldShowCombatTutorial(storage)).toBe(false);

    restartCombatTutorial(storage);
    expect(shouldShowCombatTutorial(storage)).toBe(true);
  });

  it("maps keyboard shortcuts without stealing ordinary keys", () => {
    expect(tutorialKeyboardAction("ArrowRight")).toBe("next");
    expect(tutorialKeyboardAction("ArrowLeft")).toBe("previous");
    expect(tutorialKeyboardAction("Escape")).toBe("skip");
    expect(tutorialKeyboardAction("Enter")).toBeUndefined();
  });

  it("positions the callout alongside an anchor when there is room", () => {
    expect(
      positionTutorialCallout(
        { top: 80, right: 300, bottom: 280, left: 100, width: 200, height: 200 },
        1000,
        800,
      ),
    ).toEqual({ left: 318, top: 80 });
  });

  it("renders a non-modal, skippable keyboard-friendly callout", () => {
    const markup = renderToStaticMarkup(
      <CombatTutorialCallout
        step={combatTutorialSteps[0]}
        stepIndex={0}
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
      />,
    );

    expect(markup).toContain("<dialog");
    expect(markup).toContain('open=""');
    expect(markup).toContain('aria-modal="false"');
    expect(markup).toContain('aria-label="Skip tutorial"');
    expect(markup).toContain("1/5");
    expect(markup).toContain("← → to move · Esc to skip");
  });
});
