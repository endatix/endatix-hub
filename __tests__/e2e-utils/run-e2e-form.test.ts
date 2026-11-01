import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runE2eForms } from "../../e2e/utils/run-e2e-form";

const { annotations } = vi.hoisted(() => ({
  annotations: [] as { type: string; description: string }[],
}));

vi.mock("@playwright/test", () => ({
  test: {
    info: () => ({ annotations }),
  },
}));

describe("runE2eForms", () => {
  const previousKeep = process.env.E2E_KEEP_DATA;

  beforeEach(() => {
    annotations.length = 0;
    delete process.env.E2E_KEEP_DATA;
  });

  afterEach(() => {
    if (previousKeep === undefined) {
      delete process.env.E2E_KEEP_DATA;
      return;
    }
    process.env.E2E_KEEP_DATA = previousKeep;
  });

  it("annotates the form id and deletes on success", async () => {
    // Arrange
    const release = vi.fn().mockResolvedValue("deleted");

    // Act
    await runE2eForms(["form-1"], release, async () => {});

    // Assert
    expect(annotations).toContainEqual({
      type: "formId",
      description: "form-1",
    });
    expect(release).toHaveBeenCalledWith(false);
  });

  it("keeps the form and rethrows when the body throws", async () => {
    // Arrange
    const release = vi.fn().mockResolvedValue("kept");

    // Act
    const run = runE2eForms(["form-9"], release, async () => {
      throw new Error("survey failed");
    });

    // Assert
    await expect(run).rejects.toThrow("survey failed");
    expect(release).toHaveBeenCalledWith(true);
  });

  it("keeps the form on success when E2E_KEEP_DATA is set", async () => {
    // Arrange
    process.env.E2E_KEEP_DATA = "1";
    const release = vi.fn().mockResolvedValue("kept");

    // Act
    await runE2eForms(["form-1"], release, async () => {});

    // Assert
    expect(release).toHaveBeenCalledWith(true);
  });
});
