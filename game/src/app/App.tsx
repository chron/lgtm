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
import { developers } from "../domain/content";

export function App() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const mainRef = useRef<HTMLElement>(null);
  const hasRun = Boolean(state.run);

  useEffect(() => {
    mainRef.current?.focus();
  }, [state.screen.name]);

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
      screen = <EventScreen dispatch={dispatch} run={state.run} />;
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
      {state.run && !["title", "squad", "cycle"].includes(state.screen.name) && (
        <div className="run-vitals run-vitals--floating" aria-label="Run status">
          <span>
            <small>Morale</small>
            <b>{state.run.morale}</b>
          </span>
          <span>
            <small>Credits</small>
            <b>${state.run.credits}</b>
          </span>
        </div>
      )}
      <main id="main" ref={mainRef} tabIndex={-1}>
        {screen}
      </main>
    </div>
  );
}
