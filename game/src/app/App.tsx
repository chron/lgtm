import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  haveSameAchievements,
  loadAchievements,
  saveAchievements,
  unlockVictoryAchievements,
  type AchievementId,
} from "../achievements/achievementStore";
import { CardCollectionBrowser } from "../components/CardCollectionBrowser";
import { RunVitals } from "../components/RunVitals";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { CycleScreen } from "../screens/CycleScreen";
import { AchievementsScreen } from "../screens/AchievementsScreen";
import { EventScreen } from "../screens/EventScreen";
import { MapScreen } from "../screens/MapScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { RewardScreen } from "../screens/RewardScreen";
import { RetroScreen } from "../screens/RetroScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { SquadScreen } from "../screens/SquadScreen";
import { TitleScreen } from "../screens/TitleScreen";
import { ToolRewardScreen } from "../screens/ToolRewardScreen";
import { developers } from "../domain/content";
import type { CardInstance } from "../domain/models";
import { logGameAction } from "../game/actionLog";
import type { GameAction } from "../game/gameReducer";
import type { GameState } from "../game/gameReducer";

interface OpenCardCollection {
  cards: readonly CardInstance[];
  orderHidden?: boolean;
  title: string;
}

function createAppInitialState(base: GameState): GameState {
  const qa = new URLSearchParams(window.location.search).get("qa");
  if (!import.meta.env.DEV || !["paul", "madi", "odin"].includes(qa ?? "")) {
    return base;
  }

  let state = gameReducer(base, { type: "START_RUN", seed: 0x0facade });
  const squad =
    qa === "madi"
      ? (["madi", "irene", "odin"] as const)
      : qa === "odin"
        ? (["odin", "madi", "irene"] as const)
        : (["paul", "odin", "madi"] as const);
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (qa === "odin" && state.run) {
    state = {
      ...state,
      run: {
        ...state.run,
        currentNodeId: "event-1",
        completedNodeIds: ["cycle-1", "event-1"],
      },
    };
  }
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: qa === "odin" ? "cycle-2" : "cycle-1" });
  if (!state.run?.cycle) return state;

  const cardIds =
    qa === "madi"
      ? [
          "yak-shave",
          "custom-toolchain",
          "plan-it-out",
          "write-the-rfc",
          "agentic-loop",
          "parallel-agents",
          "agent-swarm",
        ]
      : qa === "odin"
        ? [
            "one-more-diagram",
            "strong-opinions-loosely-held",
            "approved-with-comments",
            "boring-technology",
            "manual-mode",
            "architecture-review",
            "design-review",
          ]
        : [
            "side-quest",
            "full-stack",
            "new-model-dropped",
            "post-through-it",
            "spike-it",
            "ebb-and-flow",
            "vibe-code",
          ];
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        focus: qa === "madi" || qa === "odin" ? 12 : 10,
        tasks:
          qa === "madi" || qa === "odin"
            ? state.run.cycle.tasks.map((task) => ({
                ...task,
                requirements: task.requirements.map((requirement) => ({
                  ...requirement,
                  unverified: qa === "madi" ? 1 : Math.min(3, requirement.target),
                  scriptPower: qa === "madi" && requirement.discipline === "frontend" ? 2 : 0,
                })),
              }))
            : state.run.cycle.tasks,
        hand: cardIds.map((cardId, index) => ({
          cardId,
          instanceId: `qa-${qa}-${index + 1}`,
        })),
      },
    },
  };
}

export function App() {
  const [state, reducerDispatch] = useReducer(gameReducer, initialGameState, createAppInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const dispatch = useCallback((action: GameAction) => {
    const stateBefore = stateRef.current;
    const stateAfter = gameReducer(stateBefore, action);
    stateRef.current = stateAfter;
    reducerDispatch(action);
    logGameAction(action, stateBefore, stateAfter);
  }, []);
  const [cardCollection, setCardCollection] = useState<OpenCardCollection>();
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<readonly AchievementId[]>(() =>
    loadAchievements(),
  );
  const mainRef = useRef<HTMLElement>(null);
  const hasRun = Boolean(state.run);
  const retroOutcome = state.screen.name === "retro" ? state.screen.outcome : undefined;

  useEffect(() => {
    mainRef.current?.focus();
  }, [state.screen.name, achievementsOpen]);

  useEffect(() => {
    setCardCollection(undefined);
  }, [state.screen.name]);

  useEffect(() => {
    if (retroOutcome !== "victory" || !state.run) return;
    setUnlockedAchievements((current) => {
      const next = unlockVictoryAchievements(current, state.run?.squad ?? []);
      if (haveSameAchievements(current, next)) return current;
      saveAchievements(next);
      return next;
    });
  }, [retroOutcome, state.run]);

  useEffect(() => {
    if (!hasRun) return;
    const preloaders = developers.flatMap((developer) =>
      Object.values(developer.art).map((src) => {
        const image = new Image();
        image.src = src;
        return image;
      }),
    );
    return () => {
      for (const image of preloaders) image.src = "";
    };
  }, [hasRun]);

  let screen;
  if (achievementsOpen) {
    screen = (
      <AchievementsScreen
        unlocked={unlockedAchievements}
        onBack={() => setAchievementsOpen(false)}
      />
    );
  } else
    switch (state.screen.name) {
      case "title":
        screen = (
          <TitleScreen dispatch={dispatch} onOpenAchievements={() => setAchievementsOpen(true)} />
        );
        break;
      case "squad":
        screen = <SquadScreen dispatch={dispatch} run={state.run} />;
        break;
      case "map":
        screen = (
          <MapScreen
            dispatch={dispatch}
            run={state.run}
            onInspectDeck={() =>
              state.run && setCardCollection({ title: "Deck", cards: state.run.deck })
            }
          />
        );
        break;
      case "cycle":
        screen = (
          <CycleScreen
            dispatch={dispatch}
            run={state.run}
            onInspectCards={(title, cards, orderHidden) =>
              setCardCollection({ title, cards, orderHidden })
            }
          />
        );
        break;
      case "report":
        screen = <ReportScreen dispatch={dispatch} report={state.screen.report} />;
        break;
      case "reward":
        screen = <RewardScreen dispatch={dispatch} run={state.run} />;
        break;
      case "tool-reward":
        screen = <ToolRewardScreen dispatch={dispatch} run={state.run} />;
        break;
      case "event":
        screen = (
          <EventScreen
            dispatch={dispatch}
            run={state.run}
            onInspectDeck={() =>
              state.run && setCardCollection({ title: "Deck", cards: state.run.deck })
            }
          />
        );
        break;
      case "shop":
        screen = (
          <ShopScreen
            dispatch={dispatch}
            run={state.run}
            onInspectDeck={() =>
              state.run && setCardCollection({ title: "Deck", cards: state.run.deck })
            }
          />
        );
        break;
      case "retro":
        screen = <RetroScreen dispatch={dispatch} outcome={state.screen.outcome} />;
        break;
    }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to game
      </a>
      {state.run && !["title", "squad", "cycle"].includes(state.screen.name) && (
        <RunVitals run={state.run} floating />
      )}
      <main id="main" ref={mainRef} tabIndex={-1}>
        {screen}
      </main>
      {cardCollection && (
        <CardCollectionBrowser
          cards={cardCollection.cards}
          title={cardCollection.title}
          orderHidden={cardCollection.orderHidden}
          onClose={() => setCardCollection(undefined)}
        />
      )}
    </div>
  );
}
