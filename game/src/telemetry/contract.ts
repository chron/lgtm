export const telemetrySchemaVersion = 1 as const;
export const maxTelemetryEventsPerBatch = 25;

const telemetryActionTypes = [
  "START_RUN",
  "TOGGLE_DEVELOPER",
  "RANDOMIZE_SQUAD",
  "CONFIRM_SQUAD",
  "VISIT_NODE",
  "PLAY_CARD",
  "CHOOSE_CYCLE_CARD",
  "DEBUG_WIN_CYCLE",
  "END_DAY",
  "ACKNOWLEDGE_BOSS_TRANSITION",
  "LAUNCH_FINAL_RELEASE",
  "SHIP_TASK",
  "CONTINUE_REPORT",
  "CHOOSE_CARD_REWARD",
  "SKIP_CARD_REWARD",
  "OFFER_TOOL_REWARD",
  "CHOOSE_TOOL_REWARD",
  "CHOOSE_EVENT",
  "CHOOSE_EVENT_OPTION",
  "BUY_SHOP_CARD",
  "BUY_SHOP_TOOL",
  "BUY_SHOP_SERVICE",
  "REFRESH_SHOP",
  "CHOOSE_WEEKEND",
  "LEAVE_NODE",
  "RETURN_TITLE",
] as const;

const telemetryScreens = [
  "title",
  "squad",
  "map",
  "cycle",
  "report",
  "reward",
  "tool-reward",
  "event",
  "shop",
  "weekend",
  "retro",
] as const;

const telemetryDetailKeys = [
  "seed",
  "developerId",
  "nodeId",
  "instanceId",
  "targetKind",
  "targetTaskId",
  "targetDiscipline",
  "cardId",
  "sourceNodeId",
  "toolId",
  "choiceId",
  "optionId",
  "offerId",
  "serviceId",
] as const;

type TelemetryActionType = (typeof telemetryActionTypes)[number];
type TelemetryScreen = (typeof telemetryScreens)[number];
type TelemetryDetailKey = (typeof telemetryDetailKeys)[number];
type TelemetryDetailValue = string | number | boolean | null;
export type TelemetryDetails = Partial<Record<TelemetryDetailKey, TelemetryDetailValue>>;

export interface ProductionRunSnapshot {
  screen: TelemetryScreen;
  elapsedMs: number;
  seed?: number;
  squad: readonly string[];
  bossId?: string;
  outcome?: "victory" | "defeat";
  cause?: "morale" | "final-release" | "technically-shipped";
  morale?: number;
  maxMorale?: number;
  techDebt?: number;
  credits?: number;
  deckSize: number;
  tools: readonly string[];
  currentNodeId?: string;
  cycleId?: string;
  day?: number;
  focus?: number;
  block?: number;
  openTasks: number;
  readyTasks: number;
  shippedTasks: number;
  encounters: number;
  cyclesShipped: number;
  cyclesMissed: number;
  days: number;
  cardsPlayed: number;
  generatedCardsPlayed: number;
  cardsExhausted: number;
  tasksShipped: number;
  defects: number;
}

export interface ProductionTelemetryEvent {
  schemaVersion: typeof telemetrySchemaVersion;
  at: string;
  sequence: number;
  type: TelemetryActionType;
  accepted: boolean;
  screenBefore: TelemetryScreen;
  screenAfter: TelemetryScreen;
  details: TelemetryDetails;
  snapshot: ProductionRunSnapshot;
}

export interface ProductionTelemetryBatch {
  schemaVersion: typeof telemetrySchemaVersion;
  runId: string;
  events: readonly ProductionTelemetryEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedInteger(value: unknown, minimum = 0, maximum = 1_000_000): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function isLimitedId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

function isOptionalLimitedId(value: unknown): value is string | undefined {
  return value === undefined || isLimitedId(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 35 && Number.isFinite(Date.parse(value));
}

function isStringArray(value: unknown, maximumLength: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maximumLength &&
    value.every((entry) => isLimitedId(entry))
  );
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function isDetails(value: unknown): value is TelemetryDetails {
  if (!isRecord(value) || Object.keys(value).length > telemetryDetailKeys.length) return false;
  return Object.entries(value).every(
    ([key, detail]) =>
      telemetryDetailKeys.includes(key as TelemetryDetailKey) &&
      (detail === null ||
        typeof detail === "boolean" ||
        (typeof detail === "number" && Number.isSafeInteger(detail)) ||
        (typeof detail === "string" && detail.length <= 100)),
  );
}

function isSnapshot(value: unknown): value is ProductionRunSnapshot {
  if (!isRecord(value)) return false;
  const outcomeValid =
    value.outcome === undefined || value.outcome === "victory" || value.outcome === "defeat";
  const causeValid =
    value.cause === undefined ||
    value.cause === "morale" ||
    value.cause === "final-release" ||
    value.cause === "technically-shipped";
  return (
    isOneOf(value.screen, telemetryScreens) &&
    isBoundedInteger(value.elapsedMs, 0, 7 * 24 * 60 * 60 * 1_000) &&
    (value.seed === undefined || isBoundedInteger(value.seed, 0, 0xffffffff)) &&
    isStringArray(value.squad, 3) &&
    isOptionalLimitedId(value.bossId) &&
    outcomeValid &&
    causeValid &&
    (value.morale === undefined || isBoundedInteger(value.morale, 0, 1_000)) &&
    (value.maxMorale === undefined || isBoundedInteger(value.maxMorale, 0, 1_000)) &&
    (value.techDebt === undefined || isBoundedInteger(value.techDebt, 0, 1_000_000)) &&
    (value.credits === undefined || isBoundedInteger(value.credits, -1_000_000, 1_000_000)) &&
    isBoundedInteger(value.deckSize, 0, 10_000) &&
    isStringArray(value.tools, 100) &&
    isOptionalLimitedId(value.currentNodeId) &&
    isOptionalLimitedId(value.cycleId) &&
    (value.day === undefined || isBoundedInteger(value.day, 0, 10_000)) &&
    (value.focus === undefined || isBoundedInteger(value.focus, 0, 10_000)) &&
    (value.block === undefined || isBoundedInteger(value.block, 0, 1_000_000)) &&
    isBoundedInteger(value.openTasks, 0, 10_000) &&
    isBoundedInteger(value.readyTasks, 0, 10_000) &&
    isBoundedInteger(value.shippedTasks, 0, 10_000) &&
    isBoundedInteger(value.encounters, 0, 10_000) &&
    isBoundedInteger(value.cyclesShipped, 0, 10_000) &&
    isBoundedInteger(value.cyclesMissed, 0, 10_000) &&
    isBoundedInteger(value.days, 0, 100_000) &&
    isBoundedInteger(value.cardsPlayed, 0, 1_000_000) &&
    isBoundedInteger(value.generatedCardsPlayed, 0, 1_000_000) &&
    isBoundedInteger(value.cardsExhausted, 0, 1_000_000) &&
    isBoundedInteger(value.tasksShipped, 0, 100_000) &&
    isBoundedInteger(value.defects, 0, 1_000_000)
  );
}

function isEvent(value: unknown): value is ProductionTelemetryEvent {
  return (
    isRecord(value) &&
    value.schemaVersion === telemetrySchemaVersion &&
    isIsoTimestamp(value.at) &&
    isBoundedInteger(value.sequence, 1, 1_000_000) &&
    isOneOf(value.type, telemetryActionTypes) &&
    typeof value.accepted === "boolean" &&
    isOneOf(value.screenBefore, telemetryScreens) &&
    isOneOf(value.screenAfter, telemetryScreens) &&
    isDetails(value.details) &&
    isSnapshot(value.snapshot)
  );
}

export function parseProductionTelemetryBatch(
  value: unknown,
): ProductionTelemetryBatch | undefined {
  if (!isRecord(value) || value.schemaVersion !== telemetrySchemaVersion) return undefined;
  if (typeof value.runId !== "string" || !/^[a-z0-9-]{1,80}$/.test(value.runId)) return undefined;
  if (
    !Array.isArray(value.events) ||
    value.events.length === 0 ||
    value.events.length > maxTelemetryEventsPerBatch ||
    !value.events.every(isEvent)
  ) {
    return undefined;
  }
  if (new Set(value.events.map((event) => event.sequence)).size !== value.events.length) {
    return undefined;
  }
  return {
    schemaVersion: telemetrySchemaVersion,
    runId: value.runId,
    events: value.events,
  };
}
