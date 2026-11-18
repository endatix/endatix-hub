import "server-only";

import { readdirSync, statSync } from "node:fs";
import { TelemetryLogger } from "@/features/telemetry";
import { envFlagName } from "@/lib/feature-flags/factories/environment-flag-factory";
import { shouldUsePostHogFlags } from "@/lib/feature-flags/factories/posthog-flag-settings";
import path from "node:path";
import { packColor } from "./layers";
import { checkBrandContrast } from "./palette";
import { BRAND_FILE, readBrandPack, type LoadedBrandPack } from "./read-pack";

export const BRAND_DIR_ENV = "ENDATIX_BRAND_DIR";

interface Snapshot {
  readonly dir: string;
  /** The folder listing and brand.json's and each named file's identity. */
  readonly stamp: string;
  readonly loaded: LoadedBrandPack;
}

let snapshot: Snapshot | null = null;
/** The stamp of a pack that never validated, so it is reported once. */
let failedStamp: string | null = null;
/** The pack whose contrast was last checked, so a weak accent is reported once. */
let checkedFingerprint: string | null = null;

/**
 * The mounted pack, or null when `ENDATIX_BRAND_DIR` is unset. It is read again
 * when brand.json or a file it names changes. A change that does not validate
 * keeps the last good pack and logs the field paths; with no good pack yet, it throws.
 */
export function loadDeploymentPack(): LoadedBrandPack | null {
  const dir = process.env[BRAND_DIR_ENV]?.trim();
  if (!dir) return null;

  const known = snapshot?.dir === dir ? snapshot.loaded.files.keys() : [];
  const stamp = stampOf(dir, [...known]);
  if (snapshot?.dir === dir && snapshot.stamp === stamp) return snapshot.loaded;
  return reload(dir, stamp);
}

/**
 * `stamp` was taken before the read, so a change during the read leaves the
 * stored stamp behind the mount, and the next request reads again.
 */
function reload(dir: string, stamp: string): LoadedBrandPack {
  try {
    const loaded = readBrandPack(dir);
    snapshot = { dir, stamp, loaded };
    return loaded;
  } catch (error) {
    if (snapshot?.dir !== dir) throw error;
    report(
      "Brand pack change ignored; still serving the last valid pack",
      error,
    );
    // Remember the bad stamp, so it is reported once and not re-read per request.
    snapshot = { ...snapshot, stamp };
    return snapshot.loaded;
  }
}

/**
 * As `loadDeploymentPack`, for request time: never throws. A pack that has
 * never validated gives null (the built-in brand) and is reported once.
 */
export function currentDeploymentPack(): LoadedBrandPack | null {
  try {
    const loaded = loadDeploymentPack();
    if (loaded) warnAboutContrast(loaded);
    return loaded;
  } catch (error) {
    const stamp = stampOf(process.env[BRAND_DIR_ENV]?.trim() ?? "", []);
    if (stamp !== failedStamp) {
      failedStamp = stamp;
      report("Brand pack not applied; serving the built-in brand", error);
    }
    return null;
  }
}

/**
 * Called once from `instrumentation.ts`. While the white-labeling flag may be
 * on, an invalid mounted pack stops the Hub at start with the field paths, and
 * old pods keep serving. PostHog decides the flag per request, so it counts as
 * on. With the env flag off the pack is ignored: a problem is reported, and the
 * Hub starts on the built-in brand.
 */
export function assertBrandPackAtStartup(): void {
  if (whiteLabelingMayBeOn()) loadDeploymentPack();
  else currentDeploymentPack();
}

function whiteLabelingMayBeOn(): boolean {
  return (
    shouldUsePostHogFlags() ||
    process.env[envFlagName("white-labeling")] === "true"
  );
}

/**
 * WCAG 2.x 3:1 for the accent against each page; the foreground's 4.5:1 is
 * guaranteed by derivation. A warning only: the pack still applies.
 */
function warnAboutContrast(loaded: LoadedBrandPack): void {
  if (checkedFingerprint === loaded.fingerprint) return;
  checkedFingerprint = loaded.fingerprint;
  const color = packColor(loaded.pack.tokens?.color);
  for (const finding of color ? checkBrandContrast(color) : []) {
    TelemetryLogger.warn(
      `Brand accent ${finding.token} is ${finding.ratio}:1 against the ${finding.mode} page; WCAG 2.x asks ${finding.minimum}:1 for controls and focus rings`,
      {},
      "endatix-hub.branding",
    );
  }
}

/**
 * The folder listing (so adding a file a rejected brand.json named counts as a
 * change) and the identity of brand.json and each file the last good pack names.
 */
function stampOf(dir: string, files: readonly string[]): string {
  return [listing(dir), BRAND_FILE, ...files]
    .map((file) => {
      try {
        const stat = statSync(path.join(dir, file));
        return `${file}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
      } catch {
        return `${file}:missing`;
      }
    })
    .join("|");
}

function listing(dir: string): string {
  try {
    return readdirSync(dir).sort().join(",");
  } catch {
    return "";
  }
}

/** Through TelemetryLogger, which also prints when no log exporter runs. */
function report(what: string, error: unknown): void {
  TelemetryLogger.error(what, error, {}, "endatix-hub.branding");
}
