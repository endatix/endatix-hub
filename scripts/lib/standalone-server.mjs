import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname } from "node:path";

// Start and stop `.next/standalone/server.js` for the smoke checks in scripts/.

const READY_TIMEOUT_MS = 60_000;

export function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function waitForReady(child, getOutput) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`server not ready after ${READY_TIMEOUT_MS} ms`)),
      READY_TIMEOUT_MS,
    );
    const onData = () => {
      if (getOutput().includes("Ready")) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited before ready (code ${code})`));
    });
  });
}

/**
 * Runs `probe(port)` against a started standalone server, then kills it.
 * Resolves with the server's combined output and the probe's error, if any.
 */
export async function withStandaloneServer(serverFile, env, probe) {
  const port = await findFreePort();
  const child = spawn(process.execPath, [serverFile], {
    cwd: dirname(serverFile),
    env: { ...env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  // Callers delete the server's folder next; Windows refuses while the process lives.
  const closed = new Promise((resolve) => child.once("close", resolve));

  let probeError;
  try {
    await waitForReady(child, () => output);
    await probe(port);
  } catch (error) {
    probeError = error;
  } finally {
    child.kill("SIGKILL");
    await closed;
  }

  return { output, error: probeError };
}
