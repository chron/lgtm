import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  playtestScenarios,
  runPlaytestBatch,
  type PlaytestDeckMode,
  type PlaytestPolicy,
} from "../src/playtest/simulator";
import { createPlaytestReport, formatPlaytestReport } from "../src/playtest/report";

const parsed = parseArgs({
  args: process.argv.slice(2),
  options: {
    runs: { type: "string", default: "20" },
    seed: { type: "string", default: "1000" },
    policy: { type: "string", default: "balanced" },
    deck: { type: "string", default: "starter" },
    scenario: { type: "string", multiple: true },
    json: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
  allowPositionals: false,
});

if (parsed.values.help) {
  console.log(`LGTM! scripted playtests

Usage: bun run playtest [options]

  --runs <n>          Runs per build family (default: 20)
  --seed <n>          First deterministic seed (default: 1000)
  --policy <name>     balanced, velocity, or careful
  --deck <mode>       starter or showcase (default: starter)
  --scenario <id>     Only run a named scenario; repeatable
  --json <path>       Also write the complete report and raw runs as JSON
  -h, --help          Show this help

Scenarios: ${playtestScenarios.map((scenario) => scenario.id).join(", ")}`);
  process.exit(0);
}

const runsPerScenario = Number.parseInt(parsed.values.runs ?? "20", 10);
const seed = Number.parseInt(parsed.values.seed ?? "1000", 10);
const policy = parsed.values.policy as PlaytestPolicy;
const deckMode = parsed.values.deck as PlaytestDeckMode;
const validPolicies: readonly PlaytestPolicy[] = ["balanced", "velocity", "careful"];
const validDeckModes: readonly PlaytestDeckMode[] = ["starter", "showcase"];

if (!Number.isSafeInteger(runsPerScenario) || runsPerScenario < 1 || runsPerScenario > 10_000) {
  throw new Error("--runs must be an integer between 1 and 10000.");
}
if (!Number.isSafeInteger(seed)) throw new Error("--seed must be an integer.");
if (!validPolicies.includes(policy)) {
  throw new Error(`--policy must be one of: ${validPolicies.join(", ")}.`);
}
if (!validDeckModes.includes(deckMode)) {
  throw new Error(`--deck must be one of: ${validDeckModes.join(", ")}.`);
}

const selectedIds = parsed.values.scenario;
const unknownIds = selectedIds?.filter(
  (id) => !playtestScenarios.some((scenario) => scenario.id === id),
);
if (unknownIds?.length) throw new Error(`Unknown scenario: ${unknownIds.join(", ")}.`);

const runs = runPlaytestBatch({
  runsPerScenario,
  seed,
  policy,
  deckMode,
  scenarioIds: selectedIds,
});
const selectedScenarios = selectedIds?.length
  ? playtestScenarios.filter((scenario) => selectedIds.includes(scenario.id))
  : playtestScenarios;
const report = createPlaytestReport(runs, selectedScenarios);
console.log(formatPlaytestReport(report));

if (parsed.values.json) {
  const outputPath = resolve(parsed.values.json);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nRaw report: ${outputPath}`);
}
