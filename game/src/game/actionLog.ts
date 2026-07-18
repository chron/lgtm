/**
 * Local-development action logging. Every reducer transition is batched to the
 * Vite dev server and appended to one JSONL file per run. Logging is best-effort
 * and must never interfere with gameplay or production builds.
 */

import type { GameAction, GameState } from "./gameReducer";

const endpoint = "/__game-actions";
const flushDelayMs = 250;

interface GameActionLogEvent {
  schemaVersion: 1;
  at: string;
  runId: string;
  sessionId: string;
  sequence: number;
  type: GameAction["type"];
  action: GameAction;
  accepted: boolean;
  screenBefore: GameState["screen"]["name"];
  screenAfter: GameState["screen"]["name"];
  state: GameState;
}

export function createGameActionLogEvent(
  action: GameAction,
  stateBefore: GameState,
  stateAfter: GameState,
  context: { at: string; runId: string; sessionId: string; sequence: number },
): GameActionLogEvent {
  return {
    schemaVersion: 1,
    ...context,
    type: action.type,
    action,
    accepted: stateAfter !== stateBefore,
    screenBefore: stateBefore.screen.name,
    screenAfter: stateAfter.screen.name,
    state: stateAfter,
  };
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function freshRunId(): string {
  return `${new Date().toISOString().slice(0, 10)}-${randomId()}`;
}

const sessionId = randomId();
let runId: string | undefined;
let sequence = 0;
let queue: GameActionLogEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function send(events: readonly GameActionLogEvent[], useBeacon: boolean): void {
  if (!runId || events.length === 0) return;
  const payload = JSON.stringify({ runId, events });
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, payload);
    } else {
      fetch(endpoint, { method: "POST", body: payload, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // There is no sink in production or when the dev server is unavailable.
  }
}

function flush(useBeacon = false): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  }
  if (queue.length === 0) return;
  const events = queue;
  queue = [];
  send(events, useBeacon);
}

export function logGameAction(
  action: GameAction,
  stateBefore: GameState,
  stateAfter: GameState,
): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  if (action.type === "START_RUN") {
    flush();
    runId = freshRunId();
    sequence = 0;
  }
  if (!runId) return;

  sequence += 1;
  queue.push(
    createGameActionLogEvent(action, stateBefore, stateAfter, {
      at: new Date().toISOString(),
      runId,
      sessionId,
      sequence,
    }),
  );

  if (!flushTimer) {
    flushTimer = setTimeout(() => flush(), flushDelayMs);
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flush(true);
  });
  window.addEventListener("beforeunload", () => flush(true));
}
