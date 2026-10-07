// `pnpm dev`: prepares the Hub, then starts `next dev` with the .NET dev
// certificate trusted. Each step prints one status line; its own output shows
// only when it fails. Extra args go to `next dev`:
//
//   node scripts/dev.mjs                       (pnpm dev)
//   node scripts/dev.mjs --inspect             (pnpm dev:inspect)
//   node scripts/dev.mjs --experimental-https  (pnpm dev-https)

import { spawn } from "node:child_process";
import path from "node:path";
import { runWithDevCert } from "./with-dev-cert.mjs";

const STEPS = [
  {
    label: "embed.js build",
    script: "build-embed.mjs",
    detail: () => "",
  },
  {
    label: "custom questions",
    script: "discover-questions.mjs",
    detail: (output) => {
      const count = output
        .split("\n")
        .filter((line) => line.startsWith("\t- ")).length;
      return count === 0 ? "none" : `${count} registered`;
    },
  },
];

for (const step of STEPS) {
  await runStep(step);
}
runWithDevCert("next", ["dev", ...process.argv.slice(2)]);

/** Runs a setup script with its output captured; prints it only on failure. */
async function runStep({ label, script, detail }) {
  const started = performance.now();
  const { code, output } = await capture(
    path.join(import.meta.dirname, script),
  );
  const elapsed = `${Math.round(performance.now() - started)} ms`;
  if (code !== 0) {
    console.error(
      ` \x1b[31m✗\x1b[0m ${label} failed (${script}, exit ${code})`,
    );
    console.error(output.trimEnd());
    process.exit(code || 1);
  }
  const info = [detail(output), elapsed].filter(Boolean).join(", ");
  console.log(` \x1b[32m✓\x1b[0m ${label} \x1b[2m(${info})\x1b[0m`);
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
