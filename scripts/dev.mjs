// `pnpm dev`: prepares the Hub, then starts `next dev` with the .NET dev
// certificate trusted. Each step prints one status line; its own output shows
// when it fails or warns. Extra args go to `next dev`:
//
//   node scripts/dev.mjs                       (pnpm dev)
//   node scripts/dev.mjs --inspect             (pnpm dev:inspect)
//   node scripts/dev.mjs --experimental-https  (pnpm dev-https)

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { styleText } from "node:util";
import { runWithDevCert } from "./dev-cert.mjs";

const QUESTION_REGISTRY = path.join(
  import.meta.dirname,
  "../customizations/questions/question-registry.ts",
);

const STDERR = { stream: process.stderr };

// Same scripts as `pnpm build:embed` and `pnpm discover-questions`.
const STEPS = [
  { label: "embed.js build", script: "build-embed.mjs" },
  {
    label: "custom questions",
    script: "discover-questions.mjs",
    detail: registeredQuestions,
  },
];

// The steps are independent, so they run together; lines print in step order.
const results = await Promise.all(STEPS.map(runStep));
results.forEach(report);
runWithDevCert("next", ["dev", ...process.argv.slice(2)]);

/** Runs a setup script with its output captured. */
async function runStep(step) {
  const started = performance.now();
  const { code, output } = await capture(
    path.join(import.meta.dirname, step.script),
  );
  const elapsed = `${Math.round(performance.now() - started)} ms`;
  return { ...step, code, output, elapsed };
}

/** One status line per step; the step's output only when it failed or warned. */
function report({ label, script, detail, code, output, elapsed }) {
  if (code !== 0) {
    console.error(
      ` ${styleText("red", "✗", STDERR)} ${label} failed (${script}, exit ${code})`,
    );
    console.error(output.trimEnd());
    process.exit(code || 1);
  }
  const info = [detail?.(), elapsed].filter(Boolean).join(", ");
  const warned = /warn|⚠/i.test(output);
  const mark = warned ? styleText("yellow", "!") : styleText("green", "✓");
  console.log(` ${mark} ${label} ${styleText("dim", `(${info})`)}`);
  if (warned) {
    console.log(output.trimEnd());
  }
}

/** Counts the names in the generated registry's `customQuestions` list. */
function registeredQuestions() {
  const registry = readFileSync(QUESTION_REGISTRY, "utf8");
  const names = registry.match(/customQuestions = \[([^\]]*)\]/)?.[1] ?? "";
  const count = names.split(",").filter((name) => name.trim()).length;
  return count === 0 ? "none" : `${count} registered`;
}

function capture(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", (error) => resolve({ code: 1, output: error.message }));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}
