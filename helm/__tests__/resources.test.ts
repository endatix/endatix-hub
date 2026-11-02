import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const helmDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const values = readFileSync(path.join(helmDir, "values.yaml"), "utf8");

describe("helm resources", () => {
  test("default values request and limit ephemeral storage", () => {
    expect(values).toMatch(
      /requests:\n(?: {4}.*\n)*? {4}ephemeral-storage: 256Mi/,
    );
    expect(values).toMatch(/limits:\n(?: {4}.*\n)*? {4}ephemeral-storage: 1Gi/);
  });
});
