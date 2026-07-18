import { useEffect, useReducer, useRef } from "react";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { CycleScreen } from "../screens/CycleScreen";
import { EventScreen } from "../screens/EventScreen";
import { MapScreen } from "../screens/MapScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { RetroScreen } from "../screens/RetroScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { SquadScreen } from "../screens/SquadScreen";
import { TitleScreen } from "../screens/TitleScreen";

export function App() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus();
  }, [state.screen.name]);

  let screen;
  switch (state.screen.name) {
    case "title":
      screen = <TitleScreen dispatch={dispatch} />;
      break;
    case "squad":
      screen = <SquadScreen dispatch={dispatch} run={state.run} />;
      break;
    case "map":
      screen = <MapScreen dispatch={dispatch} run={state.run} />;
      break;
    case "cycle":
      screen = <CycleScreen dispatch={dispatch} run={state.run} />;
      break;
    case "report":
      screen = <ReportScreen dispatch={dispatch} report={state.screen.report} />;
      break;
    case "event":
      screen = <EventScreen dispatch={dispatch} />;
      break;
    case "shop":
      screen = <ShopScreen dispatch={dispatch} run={state.run} />;
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
      <header className="topbar">
        <span className="wordmark">BACKLOG</span>
        {state.run && state.screen.name !== "title" && (
          <div className="run-stats" aria-label="Run status">
            <span>Morale {state.run.morale}</span>
            <span>${state.run.credits}</span>
          </div>
        )}
      </header>
      <main id="main" ref={mainRef} tabIndex={-1}>
        {screen}
      </main>
    </div>
  );
}
