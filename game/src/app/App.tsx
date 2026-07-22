import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Settings } from "lucide-react";
import {
  haveSameAchievements,
  loadAchievements,
  saveAchievements,
  evaluateAchievements,
  type AchievementId,
} from "../achievements/achievementStore";
import { AchievementToast } from "../achievements/AchievementToast";
import { CardCollectionBrowser } from "../components/CardCollectionBrowser";
import { RunVitals } from "../components/RunVitals";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { CycleScreen } from "../screens/CycleScreen";
import { AchievementsScreen } from "../screens/AchievementsScreen";
import { CodexScreen } from "../screens/CodexScreen";
import { EventScreen } from "../screens/EventScreen";
import { MapScreen } from "../screens/MapScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { RewardScreen } from "../screens/RewardScreen";
import { RetroScreen } from "../screens/RetroScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { SquadScreen } from "../screens/SquadScreen";
import { TitleScreen } from "../screens/TitleScreen";
import { ToolRewardScreen } from "../screens/ToolRewardScreen";
import { WeekendScreen } from "../screens/WeekendScreen";
import { developers, getCycle } from "../domain/content";
import { eventDefinitions } from "../domain/events";
import type { CardInstance, TaskState } from "../domain/models";
import { discardQueuedProductionTelemetry, logGameAction } from "../game/actionLog";
import type { GameAction } from "../game/gameReducer";
import type { GameState } from "../game/gameReducer";
import { SettingsModal } from "../settings/SettingsModal";
import { loadTelemetryPreference, saveTelemetryPreference } from "../settings/settingsStore";
import {
  completeCombatTutorial,
  restartCombatTutorial,
  shouldShowCombatTutorial,
} from "../tutorial/combatTutorialState";

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
    ![
      "paul",
      "madi",
      "odin",
      "irene",
      "basics",
      "event",
      "boss",
      "cycle",
      "retro",
      "final",
      "shop",
      "weekend",
      "seb",
      "matt",
      "toby",
      "steph",
      "elspeth",
    ].includes(qa ?? "")
  ) {
    return base;
  }

  const eventSeed = Number(searchParams.get("seed"));
  let state = gameReducer(base, {
    type: "START_RUN",
    seed:
      qa === "event" || qa === "boss" || qa === "final"
        ? Number.isFinite(eventSeed) && eventSeed > 0
          ? eventSeed
          : 7
        : 0x0facade,
  });
  const squad =
    qa === "toby"
      ? (["toby", "steph", "elspeth"] as const)
      : qa === "steph"
        ? (["steph", "madi", "toby"] as const)
        : qa === "elspeth"
          ? (["elspeth", "toby", "steph"] as const)
          : qa === "seb"
            ? (["seb", "matt", "irene"] as const)
            : qa === "matt"
              ? (["matt", "seb", "odin"] as const)
              : qa === "madi"
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
        peakTechDebt: 3,
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
  if ((qa === "boss" || qa === "final") && state.run) {
    const bossMap: GameState = {
      screen: { name: "map" },
      run: {
        ...state.run,
        currentNodeId: "weekend-2",
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
          "weekend-2",
        ],
      },
    };
    if (qa === "boss" && searchParams.get("phase") !== "review") return bossMap;
    const bossCycle = gameReducer(bossMap, { type: "VISIT_NODE", nodeId: "final-release" });
    if (!bossCycle.run?.cycle) return bossCycle;
    if (qa === "final") {
      const quality = searchParams.get("quality") ?? "known";
      const unverified =
        quality === "known" || quality === "burnout" ? 3 : quality === "technical" ? 4 : 0;
      return {
        ...bossCycle,
        run: {
          ...bossCycle.run,
          morale: quality === "burnout" ? 1 : bossCycle.run.morale,
          cycle: {
            ...bossCycle.run.cycle,
            focus: 10,
            boss: bossCycle.run.cycle.boss
              ? {
                  ...bossCycle.run.cycle.boss,
                  phase: "launch-window",
                  transitionNotice: undefined,
                }
              : undefined,
            tasks: bossCycle.run.cycle.tasks.map((task) => ({
              ...task,
              status: "ready" as const,
              requirements: task.requirements.map((requirement, index) => ({
                ...requirement,
                verified: requirement.target - (index === 0 ? unverified : 0),
                unverified: index === 0 ? unverified : 0,
              })),
            })),
          },
        },
      };
    }
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
  if (qa === "shop" && state.run) {
    const requestedCredits = Number(searchParams.get("credits"));
    const shopMap: GameState = {
      screen: { name: "map" },
      run: {
        ...state.run,
        credits:
          Number.isFinite(requestedCredits) && requestedCredits >= 0 ? requestedCredits : 260,
        techDebt: 3,
        peakTechDebt: 3,
        currentNodeId: "cycle-safe-1",
        completedNodeIds: ["cycle-1", "event-1", "cycle-2", "cycle-safe-1"],
      },
    };
    return gameReducer(shopMap, { type: "VISIT_NODE", nodeId: "shop-1" });
  }
  if (qa === "weekend" && state.run) {
    const finalWeekend = searchParams.get("final") === "1";
    const requestedMoraleParam = searchParams.get("morale");
    const requestedMorale = Number(requestedMoraleParam);
    const weekendMap: GameState = {
      screen: { name: "map" },
      run: {
        ...state.run,
        morale:
          requestedMoraleParam !== null && Number.isFinite(requestedMorale) && requestedMorale >= 0
            ? Math.min(state.run.maxMorale, requestedMorale)
            : 6,
        currentNodeId: finalWeekend ? "event-4" : "event-2",
        completedNodeIds: finalWeekend
          ? [
              "cycle-1",
              "event-1",
              "cycle-2",
              "incident-1",
              "event-2",
              "weekend-1",
              "cycle-3",
              "event-3",
              "cycle-4",
              "incident-2",
              "event-4",
            ]
          : ["cycle-1", "event-1", "cycle-2", "incident-1", "event-2"],
      },
    };
    return gameReducer(weekendMap, {
      type: "VISIT_NODE",
      nodeId: finalWeekend ? "weekend-2" : "weekend-1",
    });
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
    qa === "toby"
      ? [
          "check-the-logs",
          "on-call",
          "useful-alerting",
          "above-and-beyond",
          "keep-it-humming",
          "triage",
          "nothing-gets-past-me",
        ]
      : qa === "steph"
        ? [
            "one-click-setup",
            "automate-this-bit",
            "guardrails-not-gatekeepers",
            "refactor-the-workflow",
            "hot-reload",
            "make-it-a-command",
            "golden-path",
          ]
        : qa === "elspeth"
          ? [
              "make-space",
              "psychological-safety",
              "check-in",
              "air-cover",
              "room-to-breathe",
              "healthy-guardrails",
              "sustainable-pace",
            ]
          : qa === "seb"
            ? [
                "use-the-component",
                "design-tokens",
                "ladle",
                "extract-component",
                "used-everywhere",
                "polish-the-primitives",
                "design-system-migration",
              ]
            : qa === "matt"
              ? [
                  "delight-moment",
                  "one-more-pass",
                  "polish-budget",
                  "no-rough-edges",
                  "delight-budget",
                  "microinteraction",
                  "pixel-perfect",
                ]
              : qa === "madi"
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
                    ? [
                        "frontend-3",
                        "frontend-3",
                        "backend-3",
                        "review-3",
                        "flexible-2",
                        "standup-cover",
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
        focus:
          qa === "madi" ||
          qa === "odin" ||
          qa === "irene" ||
          qa === "basics" ||
          qa === "seb" ||
          qa === "matt" ||
          qa === "toby" ||
          qa === "steph" ||
          qa === "elspeth"
            ? 12
            : 10,
        tasks:
          qa === "madi" ||
          qa === "odin" ||
          qa === "irene" ||
          qa === "seb" ||
          qa === "matt" ||
          qa === "toby" ||
          qa === "steph" ||
          qa === "elspeth"
            ? state.run.cycle.tasks.map((task) => ({
                ...task,
                requirements: task.requirements.map((requirement) => ({
                  ...requirement,
                  verified:
                    qa === "seb" && requirement.discipline === "frontend"
                      ? Math.max(0, requirement.target - 2)
                      : requirement.verified,
                  unverified:
                    qa === "madi" || qa === "matt"
                      ? Math.min(2, requirement.target)
                      : qa === "seb"
                        ? 0
                        : Math.min(3, requirement.target),
                  scriptPower:
                    (qa === "madi" && requirement.discipline === "frontend") || qa === "steph"
                      ? 2
                      : 0,
                })),
              }))
            : state.run.cycle.tasks,
        guardPower: qa === "steph" || qa === "toby" ? 2 : state.run.cycle.guardPower,
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
  const [codexOpen, setCodexOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(loadTelemetryPreference);
  const [tutorialEnabled, setTutorialEnabled] = useState(shouldShowCombatTutorial);
  const [unlockedAchievements, setUnlockedAchievements] = useState<readonly AchievementId[]>(() =>
    loadAchievements(),
  );
  const [achievementQueue, setAchievementQueue] = useState<readonly AchievementId[]>([]);
  const mainRef = useRef<HTMLElement>(null);
  const hasRun = Boolean(state.run);
  const retroOutcome = state.screen.name === "retro" ? state.screen.outcome : undefined;

  useEffect(() => {
    mainRef.current?.focus();
  }, [state.screen.name, achievementsOpen, codexOpen]);

  useEffect(() => {
    setCardCollection(undefined);
  }, [state.screen.name]);

  useEffect(() => {
    if (!state.run) return;
    const next = evaluateAchievements(unlockedAchievements, {
      run: state.run,
      victory: retroOutcome === "victory",
    });
    if (haveSameAchievements(unlockedAchievements, next)) return;
    const newlyUnlocked = next.filter((id) => !unlockedAchievements.includes(id));
    saveAchievements(next);
    setUnlockedAchievements(next);
    setAchievementQueue((current) => [
      ...current,
      ...newlyUnlocked.filter((id) => !current.includes(id)),
    ]);
  }, [retroOutcome, state.run, unlockedAchievements]);

  const activeAchievement = achievementQueue[0];
  const inspectDeck = () => {
    if (state.run) setCardCollection({ title: "Deck", cards: state.run.deck });
  };

  useEffect(() => {
    if (!activeAchievement) return;
    const timer = window.setTimeout(() => setAchievementQueue((current) => current.slice(1)), 3200);
    return () => window.clearTimeout(timer);
  }, [activeAchievement]);

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
  if (codexOpen) {
    screen = <CodexScreen onBack={() => setCodexOpen(false)} />;
  } else if (achievementsOpen) {
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
          <TitleScreen
            dispatch={dispatch}
            onOpenAchievements={() => setAchievementsOpen(true)}
            onOpenCodex={() => setCodexOpen(true)}
          />
        );
        break;
      case "squad":
        screen = <SquadScreen dispatch={dispatch} run={state.run} />;
        break;
      case "map":
        screen = <MapScreen dispatch={dispatch} run={state.run} />;
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
          />
        );
        break;
      case "shop":
        screen = (
          <ShopScreen dispatch={dispatch} run={state.run} inventory={state.screen.inventory} />
        );
        break;
      case "weekend":
        screen = <WeekendScreen dispatch={dispatch} run={state.run} nodeId={state.screen.nodeId} />;
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
        <RunVitals run={state.run} floating onInspectDeck={inspectDeck} />
      )}
      <button
        className="settings-trigger"
        type="button"
        onClick={() => {
          setTutorialEnabled(shouldShowCombatTutorial());
          setSettingsOpen(true);
        }}
        aria-label="Open settings"
        aria-haspopup="dialog"
      >
        <Settings aria-hidden="true" />
      </button>
      <main id="main" ref={mainRef} tabIndex={-1}>
        {screen}
      </main>
      {activeAchievement && (
        <AchievementToast
          achievementId={activeAchievement}
          onDismiss={() => setAchievementQueue((current) => current.slice(1))}
        />
      )}
      {cardCollection && (
        <CardCollectionBrowser
          cards={cardCollection.cards}
          title={cardCollection.title}
          orderHidden={cardCollection.orderHidden}
          onClose={() => setCardCollection(undefined)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          telemetryEnabled={telemetryEnabled}
          tutorialEnabled={tutorialEnabled}
          onTelemetryChange={(enabled) => {
            setTelemetryEnabled(enabled);
            saveTelemetryPreference(enabled);
            if (!enabled) discardQueuedProductionTelemetry();
          }}
          onTutorialChange={(enabled) => {
            setTutorialEnabled(enabled);
            if (enabled) restartCombatTutorial();
            else completeCombatTutorial();
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
