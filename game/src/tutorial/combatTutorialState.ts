/** Versioned so future tutorial rewrites can be shown once without nagging returning players. */
export const COMBAT_TUTORIAL_STORAGE_KEY = "backlog-combat-tutorial-v1";

type CombatTutorialAnchor = "tasks" | "focus" | "hand" | "end-day";

export interface CombatTutorialStep {
  id: "tasks" | "focus" | "targeting" | "end-day" | "shipping";
  anchor: CombatTutorialAnchor;
  title: string;
  body: string;
}

export const combatTutorialSteps: readonly CombatTutorialStep[] = [
  {
    id: "tasks",
    anchor: "tasks",
    title: "Read the work",
    body: "Fill every requirement bar. A Task's Intent fires at End Day unless you ship or Stun it.",
  },
  {
    id: "focus",
    anchor: "focus",
    title: "Spend Focus",
    body: "Cards cost Focus. You start each Day with 3, so choose what matters now.",
  },
  {
    id: "targeting",
    anchor: "hand",
    title: "Aim a card",
    body: "Drag a card upward, then release on a matching requirement. The preview shows exactly what lands.",
  },
  {
    id: "end-day",
    anchor: "end-day",
    title: "Let chaos happen",
    body: "End Day refreshes your hand and Focus, then every open Intent fires. Check the damage first.",
  },
  {
    id: "shipping",
    anchor: "tasks",
    title: "Ship it",
    body: "Fill every bar, then Ship Task to cancel its Intent and collect the reward.",
  },
];

interface TutorialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): TutorialStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function shouldShowCombatTutorial(storage = browserStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(COMBAT_TUTORIAL_STORAGE_KEY) !== "complete";
  } catch {
    return false;
  }
}

export function completeCombatTutorial(storage = browserStorage()): void {
  try {
    storage?.setItem(COMBAT_TUTORIAL_STORAGE_KEY, "complete");
  } catch {
    // A private or locked-down browser should never prevent play.
  }
}

export function restartCombatTutorial(storage = browserStorage()): void {
  try {
    storage?.removeItem(COMBAT_TUTORIAL_STORAGE_KEY);
  } catch {
    // The tutorial still remains manually dismissible when storage is unavailable.
  }
}

export type TutorialKeyboardAction = "next" | "previous" | "skip";

export function tutorialKeyboardAction(key: string): TutorialKeyboardAction | undefined {
  switch (key) {
    case "ArrowRight":
      return "next";
    case "ArrowLeft":
      return "previous";
    case "Escape":
      return "skip";
    default:
      return undefined;
  }
}

export interface TutorialRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface TutorialPosition {
  left: number;
  top: number;
}

export function positionTutorialCallout(
  anchor: TutorialRect | undefined,
  viewportWidth: number,
  viewportHeight: number,
): TutorialPosition {
  const gap = 18;
  const edge = 16;
  const width = Math.min(340, viewportWidth - edge * 2);
  const estimatedHeight = 230;
  if (!anchor) {
    return {
      left: Math.max(edge, (viewportWidth - width) / 2),
      top: Math.max(edge, (viewportHeight - estimatedHeight) / 2),
    };
  }

  const clampLeft = (value: number) =>
    Math.min(Math.max(edge, value), Math.max(edge, viewportWidth - width - edge));
  const clampTop = (value: number) =>
    Math.min(Math.max(edge, value), Math.max(edge, viewportHeight - estimatedHeight - edge));

  if (anchor.right + gap + width <= viewportWidth - edge) {
    return { left: anchor.right + gap, top: clampTop(anchor.top) };
  }
  if (anchor.left - gap - width >= edge) {
    return { left: anchor.left - gap - width, top: clampTop(anchor.top) };
  }
  if (anchor.bottom + gap + estimatedHeight <= viewportHeight - edge) {
    return { left: clampLeft(anchor.left), top: anchor.bottom + gap };
  }
  return {
    left: clampLeft(anchor.right - width),
    top: clampTop(anchor.top - gap - estimatedHeight),
  };
}
