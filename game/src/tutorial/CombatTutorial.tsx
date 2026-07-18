import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  combatTutorialSteps,
  completeCombatTutorial,
  positionTutorialCallout,
  shouldShowCombatTutorial,
  tutorialKeyboardAction,
} from "./combatTutorialState";
import type { CombatTutorialStep, TutorialRect } from "./combatTutorialState";

const SPOTLIGHT_PADDING = 8;

export function CombatTutorial() {
  const [open, setOpen] = useState(shouldShowCombatTutorial);
  const [stepIndex, setStepIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<TutorialRect>();
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const step = combatTutorialSteps[stepIndex];

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = document.querySelector<HTMLElement>(`[data-tutorial-anchor="${step.anchor}"]`);

    function updateAnchor() {
      if (!anchor) {
        setAnchorRect(undefined);
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const top = Math.max(0, rect.top - SPOTLIGHT_PADDING);
      const right = Math.min(window.innerWidth, rect.right + SPOTLIGHT_PADDING);
      const bottom = Math.min(window.innerHeight, rect.bottom + SPOTLIGHT_PADDING);
      const left = Math.max(0, rect.left - SPOTLIGHT_PADDING);
      setAnchorRect({
        top,
        right,
        bottom,
        left,
        width: right - left,
        height: bottom - top,
      });
    }

    updateAnchor();
    const observer =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(updateAnchor);
    observer?.observe(anchor ?? document.documentElement);
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [open, step.anchor]);

  useEffect(() => {
    if (!open) return;
    nextButtonRef.current?.focus();
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      const action = tutorialKeyboardAction(event.key);
      if (!action) return;
      event.preventDefault();
      if (action === "skip") {
        finish();
      } else if (action === "previous") {
        setStepIndex((current) => Math.max(0, current - 1));
      } else {
        advance();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!open) return null;

  function finish() {
    completeCombatTutorial();
    setOpen(false);
  }

  function advance() {
    if (stepIndex === combatTutorialSteps.length - 1) {
      finish();
      return;
    }
    setStepIndex((current) => current + 1);
  }

  return (
    <div className="combat-tutorial" data-testid="combat-tutorial">
      <TutorialSpotlight rect={anchorRect} />
      <CombatTutorialCallout
        step={step}
        stepIndex={stepIndex}
        anchorRect={anchorRect}
        nextButtonRef={nextButtonRef}
        onBack={() => setStepIndex((current) => Math.max(0, current - 1))}
        onNext={advance}
        onSkip={finish}
      />
    </div>
  );
}

interface TutorialSpotlightProps {
  rect?: TutorialRect;
}

function TutorialSpotlight({ rect }: TutorialSpotlightProps) {
  if (!rect) return <div className="combat-tutorial__shade combat-tutorial__shade--full" />;
  return (
    <>
      <div
        className="combat-tutorial__shade"
        style={{ top: 0, right: 0, left: 0, height: rect.top }}
      />
      <div
        className="combat-tutorial__shade"
        style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }}
      />
      <div
        className="combat-tutorial__shade"
        style={{
          top: rect.top,
          right: 0,
          width: window.innerWidth - rect.right,
          height: rect.height,
        }}
      />
      <div
        className="combat-tutorial__shade"
        style={{ top: rect.bottom, right: 0, bottom: 0, left: 0 }}
      />
      <div
        className="combat-tutorial__spotlight"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />
    </>
  );
}

interface CombatTutorialCalloutProps {
  step: CombatTutorialStep;
  stepIndex: number;
  anchorRect?: TutorialRect;
  nextButtonRef?: RefObject<HTMLButtonElement | null>;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function CombatTutorialCallout({
  step,
  stepIndex,
  anchorRect,
  nextButtonRef,
  onBack,
  onNext,
  onSkip,
}: CombatTutorialCalloutProps) {
  const position = positionTutorialCallout(
    anchorRect,
    typeof window === "undefined" ? 1180 : window.innerWidth,
    typeof window === "undefined" ? 800 : window.innerHeight,
  );
  const lastStep = stepIndex === combatTutorialSteps.length - 1;
  const titleId = `combat-tutorial-title-${step.id}`;
  const bodyId = `combat-tutorial-body-${step.id}`;

  return (
    <dialog
      className={`combat-tutorial__callout combat-tutorial__callout--${step.id}`}
      open
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      style={{ left: position.left, top: position.top }}
    >
      <div className="combat-tutorial__meta">
        <b>
          {stepIndex + 1}/{combatTutorialSteps.length}
        </b>
        <button type="button" onClick={onSkip} aria-label="Skip tutorial">
          Skip
        </button>
      </div>
      <h2 id={titleId}>{step.title}</h2>
      <p id={bodyId}>{step.body}</p>
      <div className="combat-tutorial__actions">
        <button
          className="button button--text"
          type="button"
          disabled={stepIndex === 0}
          onClick={onBack}
        >
          Back
        </button>
        <button
          ref={nextButtonRef}
          className="button button--primary"
          type="button"
          onClick={onNext}
        >
          {lastStep ? "Got it" : "Next"}
        </button>
      </div>
      <small>← → to move · Esc to skip</small>
    </dialog>
  );
}
