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
import { developers, getCycle } from "../domain/content";
import { eventDefinitions } from "../domain/events";
import type { CardInstance, TaskState } from "../domain/models";
import { logGameAction } from "../game/actionLog";
import type { GameAction } from "../game/gameReducer";
import type { GameState } from "../game/gameReducer";

interface OpenCardCollection {
  cards: readonly CardInstance[];
  orderHidden?: boolean;
  title: string;
}

function createAppInitialState(base: GameState): GameState {
  const searchParams = new URLSearchParams(window.location.search);
  const qa = searchParams.get("qa");
  if (
    !import.meta.env.DEV ||
    !["paul", "madi", "odin", "irene", "basics", "event", "boss", "cycle", "retro"].includes(
      qa ?? "",
    )
  ) {
    return base;
  }

  const eventSeed = Number(searchParams.get("seed"));
  let state = gameReducer(base, {
    type: "START_RUN",
    seed:
      qa === "event" || qa === "boss"
        ? Number.isFinite(eventSeed) && eventSeed > 0
          ? eventSeed
          : 7
        : 0x0facade,
  });
  const squad =
    qa === "madi"
      ? (["madi", "irene", "odin"] as const)
      : qa === "irene"
        ? (["irene", "madi", "odin"] as const)
        : qa === "basics"
          ? (["odin", "irene", "paul"] as const)
          : qa === "odin"
            ? (["odin", "madi", "irene"] as const)
            : (["paul", "odin", "madi"] as const);
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (qa === "retro" && state.run) {
    const retro = searchParams.get("outcome") ?? "known";
    const defects = retro === "known" ? 1 : retro === "technical" ? 3 : 0;
    const cause =
      retro === "technical"
        ? ("technically-shipped" as const)
        : retro === "morale"
          ? ("morale" as const)
          : retro === "deadline"
            ? ("final-release" as const)
            : undefined;
    return {
      screen: {
        name: "retro",
        outcome: cause ? "defeat" : "victory",
        cause,
      },
      run: {
        ...state.run,
        tools: ["merge-queue", "test-suite"],
        morale: retro === "morale" ? 0 : 6,
        techDebt: 3,
        history: [
          ...state.run.history,
          {
            kind: "task-shipped",
            nodeId: "cycle-1",
            taskId: "status-composer",
            defects: 0,
            moraleLoss: 0,
            techDebtAdded: 0,
            focusGained: 0,
          },
          {
            kind: "task-shipped",
            nodeId: "final-release",
            taskId: "final-release",
            defects,
            moraleLoss: defects,
            techDebtAdded: defects > 1 ? 1 : 0,
            focusGained: 0,
          },
        ],
      },
    };
  }
  if (qa === "cycle" && state.run) {
    const requestedCycleId = searchParams.get("cycle") ?? "every-methodology";
    let cycleState = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
    if (!cycleState.run?.cycle) return cycleState;
    const definition = getCycle(requestedCycleId);
    const tasks: TaskState[] = definition.tasks
      .filter((task) => task.role !== "complication")
      .map((task) => ({
        taskId: task.id,
        name: task.name,
        role: task.role,
        status: "open" as const,
        stunned: false,
        spawnedDay: 1,
        requirements: task.requirements.map((requirement) => ({
          ...requirement,
          verified: 0,
          unverified: 0,
          scriptPower: 0,
          scriptBlock: 0,
        })),
      }));
    if (searchParams.get("temporary") === "1") {
      tasks.push({
        taskId: "qa-side-quest",
        name: "Dark Mode for Sharkimedes",
        role: "side-quest",
        status: "open",
        stunned: false,
        spawnedDay: 1,
        requirements: [
          {
            discipline: "frontend",
            target: 3,
            verified: 0,
            unverified: 0,
            scriptPower: 0,
            scriptBlock: 0,
          },
        ],
      });
    }
    return {
      ...cycleState,
      screen: { name: "cycle", nodeId: "cycle-1", cycleId: definition.id },
      run: {
        ...cycleState.run,
        cycle: {
          ...cycleState.run.cycle,
          cycleId: definition.id,
          focus: 10,
          tasks,
        },
      },
    };
  }
  if (qa === "boss" && state.run) {
    const bossMap: GameState = {
      screen: { name: "map" },
      run: {
        ...state.run,
        currentNodeId: "event-4",
        completedNodeIds: [
          "cycle-1",
          "event-1",
          "cycle-2",
          "incident-1",
          "event-2",
          "cycle-3",
          "event-3",
          "cycle-4",
          "incident-2",
          "event-4",
        ],
      },
    };
    if (searchParams.get("phase") !== "review") return bossMap;
    const bossCycle = gameReducer(bossMap, { type: "VISIT_NODE", nodeId: "final-release" });
    if (!bossCycle.run?.cycle) return bossCycle;
    return {
      ...bossCycle,
      run: {
        ...bossCycle.run,
        cycle: {
          ...bossCycle.run.cycle,
          focus: 10,
          tasks: bossCycle.run.cycle.tasks.map((task) => ({
            ...task,
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              verified: Math.min(4, requirement.target),
            })),
          })),
        },
      },
    };
  }
  if (qa === "event" && state.run) {
    const requestedEventId = searchParams.get("event");
    const requestedCreditsParam = searchParams.get("credits");
    const requestedCredits = Number(requestedCreditsParam);
    state = {
      screen:
        requestedEventId && eventDefinitions.some((event) => event.id === requestedEventId)
          ? { name: "event", nodeId: "event-1", eventId: requestedEventId }
          : { name: "map" },
      run: {
        ...state.run,
        credits:
          requestedCreditsParam !== null &&
          Number.isFinite(requestedCredits) &&
          requestedCredits >= 0
            ? requestedCredits
            : state.run.credits,
        currentNodeId: "cycle-1",
        completedNodeIds: ["cycle-1"],
      },
    };
    if (state.screen.name === "event") return state;
    return gameReducer(state, { type: "VISIT_NODE", nodeId: "event-1" });
  }
  if ((qa === "odin" || qa === "irene") && state.run) {
    state = {
      ...state,
      run: {
        ...state.run,
        currentNodeId: "event-1",
        completedNodeIds: ["cycle-1", "event-1"],
      },
    };
  }
  state = gameReducer(state, {
    type: "VISIT_NODE",
    nodeId: qa === "odin" || qa === "irene" ? "cycle-2" : "cycle-1",
  });
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
      : qa === "irene"
        ? [
            "quietly-automated",
            "last-10-percent",
            "no-fuss",
            "while-im-here",
            "quick-study",
            "all-sorted",
            "already-fixed",
          ]
        : qa === "basics"
          ? ["frontend-3", "frontend-3", "backend-3", "review-3", "flexible-2", "standup-cover"]
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
        focus: qa === "madi" || qa === "odin" || qa === "irene" || qa === "basics" ? 12 : 10,
        tasks:
          qa === "madi" || qa === "odin" || qa === "irene"
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
            eventId={state.screen.eventId}
            resolution={state.screen.resolution}
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
        screen = (
          <RetroScreen
            dispatch={dispatch}
            outcome={state.screen.outcome}
            cause={state.screen.cause}
            run={state.run}
          />
        );
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
