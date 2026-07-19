import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { summarizeHumanActionLog } from "../src/playtest/humanTelemetry";
import { createPlaytestReport, formatPlaytestReport } from "../src/playtest/report";
import { playtestScenarios } from "../src/playtest/simulator";

const parsed = parseArgs({
  args: process.argv.slice(2),
  options: {
    latest: { type: "string", default: "3" },
    file: { type: "string", multiple: true },
    directory: { type: "string", default: "telemetry" },
    "include-incomplete": { type: "boolean" },
    json: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
  allowPositionals: false,
});

if (parsed.values.help) {
  console.log(`LGTM! human playtest report

Usage: bun run playtest:human [options]

  --latest <n>          Latest completed runs to include (default: 3)
  --file <path>         Analyze an exact JSONL file; repeatable
  --directory <path>    Telemetry directory (default: telemetry)
  --include-incomplete  Keep runs that have not reached Retro
  --json <path>         Also write the aggregate and raw summaries as JSON
  -h, --help            Show this help`);
  process.exit(0);
}

const latest = Number.parseInt(parsed.values.latest ?? "3", 10);
if (!Number.isSafeInteger(latest) || latest < 1 || latest > 10_000) {
  throw new Error("--latest must be an integer between 1 and 10000.");
}

const exactFiles = parsed.values.file?.map((file) => resolve(file));
const candidateFiles = exactFiles?.length
  ? exactFiles
  : (await readdir(resolve(parsed.values.directory ?? "telemetry")))
      .filter((file) => /^run-.*\.jsonl$/.test(file))
      .map((file) => resolve(parsed.values.directory ?? "telemetry", file));

const loaded = await Promise.all(
  candidateFiles.map(async (file) => ({
    file,
    modifiedAt: (await stat(file)).mtimeMs,
    result: summarizeHumanActionLog(basename(file), await readFile(file, "utf8")),
  })),
);
const eligible = parsed.values["include-incomplete"]
  ? loaded
  : loaded.filter(({ result }) => result.outcome !== "incomplete");
const limit = exactFiles?.length ? exactFiles.length : latest;
const selected = eligible.sort((left, right) => right.modifiedAt - left.modifiedAt).slice(0, limit);

if (selected.length === 0) {
  throw new Error(
    "No completed human runs found. Finish a run in the dev build or pass --include-incomplete.",
  );
}

const report = createPlaytestReport(
  selected.map(({ result }) => result),
  playtestScenarios,
);
console.log(formatPlaytestReport(report));
console.log("\nRUN FILES");
for (const { file, result } of selected) {
  console.log(`  ${basename(file)} · seed ${result.seed} · ${result.scenarioName}`);
}

if (parsed.values.json) {
  const outputPath = resolve(parsed.values.json);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nRaw report: ${outputPath}`);
}
