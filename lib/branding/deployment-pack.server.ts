import "server-only";

import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { statSync } from "node:fs";
import path from "node:path";
import { BRAND_FILE, readBrandPack, type LoadedBrandPack } from "./read-pack";

export const BRAND_DIR_ENV = "ENDATIX_BRAND_DIR";

interface Snapshot {
  readonly dir: string;
  /** brand.json's and each named file's identity; a ConfigMap update swaps them. */
  readonly stamp: string;
  readonly loaded: LoadedBrandPack;
}

let snapshot: Snapshot | null = null;

/**
 * The mounted pack, or null when `ENDATIX_BRAND_DIR` is unset. It is read again
 * when brand.json or a file it names changes. A change that does not validate keeps the last good
 * pack and logs the field paths; with no good pack yet, it throws.
 */
export function loadDeploymentPack(): LoadedBrandPack | null {
  const dir = process.env[BRAND_DIR_ENV]?.trim();
  if (!dir) return null;

  const known = snapshot?.dir === dir ? snapshot.loaded.files.keys() : [];
  const stamp = stampOf(dir, [...known]);
  if (snapshot?.dir === dir && snapshot.stamp === stamp) return snapshot.loaded;

  try {
    const loaded = readBrandPack(dir);
    snapshot = { dir, stamp: stampOf(dir, [...loaded.files.keys()]), loaded };
    return loaded;
  } catch (error) {
    if (snapshot?.dir !== dir) throw error;
    reportReloadFailure(error);
    // Remember the bad stamp, so it is reported once and not re-read per request.
    snapshot = { ...snapshot, stamp };
    return snapshot.loaded;
  }
}

/**
 * Called once from `instrumentation.ts`: an invalid mounted pack stops the Hub
 * at start, with the field paths in the error, and old pods keep serving. It
 * checks the pack even while the white-labeling flag is off, so turning the flag
 * on later cannot meet a pack nobody validated.
 */
export function assertBrandPackAtStartup(): void {
  loadDeploymentPack();
}

function stampOf(dir: string, files: readonly string[]): string {
  return [BRAND_FILE, ...files]
    .map((file) => {
      try {
        const stat = statSync(path.join(dir, file));
        return `${file}:${stat.ino}:${stat.size}:${stat.mtimeMs}`;
      } catch {
        return `${file}:missing`;
      }
    })
    .join("|");
}

function reportReloadFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  logs.getLogger("endatix-hub.branding").emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: "ERROR",
    body: `Brand pack change ignored; still serving the last valid pack. ${message}`,
  });
}
