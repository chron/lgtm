import type { Dispatch } from "react";
import type { RunState } from "../domain/models";
import type { GameAction } from "../game/gameReducer";

export interface DispatchProps {
  dispatch: Dispatch<GameAction>;
}

export interface RunProps {
  run: RunState | null;
}
