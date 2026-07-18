import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const maxRequestBytes = 5 * 1024 * 1024;

/** Dev-only sink for the reducer action stream. */
function gameActionLogSink(): Plugin {
  const directory = join(import.meta.dirname, "telemetry");
  return {
    name: "backlog-game-action-log-sink",
    configureServer(server) {
      server.middlewares.use("/__game-actions", (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end();
          return;
        }

        let body = "";
        request.on("data", (chunk: Buffer) => {
          body += chunk;
          if (body.length > maxRequestBytes) request.destroy();
        });
        request.on("end", () => {
          try {
            const payload = JSON.parse(body) as { runId?: unknown; events?: unknown };
            if (typeof payload.runId !== "string" || !Array.isArray(payload.events)) {
              throw new Error("Invalid action log payload");
            }
            const safeRunId = payload.runId.replace(/[^a-z0-9-]/gi, "").slice(0, 80);
            if (!safeRunId || payload.events.length === 0) {
              throw new Error("Empty action log payload");
            }

            mkdirSync(directory, { recursive: true });
            const lines = `${payload.events.map((event) => JSON.stringify(event)).join("\n")}\n`;
            appendFileSync(join(directory, `run-${safeRunId}.jsonl`), lines);
            response.statusCode = 204;
          } catch {
            response.statusCode = 400;
          }
          response.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), gameActionLogSink()],
});
