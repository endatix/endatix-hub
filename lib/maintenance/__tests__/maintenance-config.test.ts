import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getMaintenanceData,
  getMaintenanceRetryAfterSeconds,
  isMaintenanceMode,
} from "../maintenance-config";

describe("isMaintenanceMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true only when MAINTENANCE_MODE is the string true", () => {
    vi.stubEnv("MAINTENANCE_MODE", "true");
    expect(isMaintenanceMode()).toBe(true);
  });

  it("returns false when unset, empty, or any other value", () => {
    vi.unstubAllEnvs();
    expect(isMaintenanceMode()).toBe(false);

    vi.stubEnv("MAINTENANCE_MODE", "");
    expect(isMaintenanceMode()).toBe(false);

    vi.stubEnv("MAINTENANCE_MODE", "false");
    expect(isMaintenanceMode()).toBe(false);

    vi.stubEnv("MAINTENANCE_MODE", "1");
    expect(isMaintenanceMode()).toBe(false);
  });
});

describe("getMaintenanceRetryAfterSeconds", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when unset or empty", () => {
    vi.unstubAllEnvs();
    expect(getMaintenanceRetryAfterSeconds()).toBeUndefined();

    vi.stubEnv("MAINTENANCE_RETRY_AFTER_SECONDS", "");
    expect(getMaintenanceRetryAfterSeconds()).toBeUndefined();
  });

  it("returns non-negative integers when valid", () => {
    vi.stubEnv("MAINTENANCE_RETRY_AFTER_SECONDS", "0");
    expect(getMaintenanceRetryAfterSeconds()).toBe(0);

    vi.stubEnv("MAINTENANCE_RETRY_AFTER_SECONDS", "600");
    expect(getMaintenanceRetryAfterSeconds()).toBe(600);
  });

  it("returns undefined for negative or non-finite values", () => {
    vi.stubEnv("MAINTENANCE_RETRY_AFTER_SECONDS", "-1");
    expect(getMaintenanceRetryAfterSeconds()).toBeUndefined();

    vi.stubEnv("MAINTENANCE_RETRY_AFTER_SECONDS", "not-a-number");
    expect(getMaintenanceRetryAfterSeconds()).toBeUndefined();
  });
});

describe("getMaintenanceData", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns default copy when maintenance env vars are unset", () => {
    vi.unstubAllEnvs();
    const data = getMaintenanceData();

    expect(data.badgeLabel).toBe("Maintenance");
    expect(data.title).toBe("We'll be right back");
    expect(data.cardDescription).toBe(
      "This application is temporarily unavailable.",
    );
    expect(data.body).toContain("scheduled maintenance");
    expect(data.footer).toBe("Thank you for your patience.");
    expect(data.metadataTitle).toBe("Scheduled maintenance - Endatix Hub");
    expect(data.metadataDescription).toContain("temporarily unavailable");
  });

  it("uses env overrides when set", () => {
    vi.stubEnv("MAINTENANCE_BADGE_LABEL", "Down");
    vi.stubEnv("MAINTENANCE_TITLE", "Custom title");
    vi.stubEnv("MAINTENANCE_CARD_DESCRIPTION", "Card");
    vi.stubEnv("MAINTENANCE_BODY", "Body");
    vi.stubEnv("MAINTENANCE_FOOTER", "Foot");
    vi.stubEnv("MAINTENANCE_METADATA_TITLE", "Meta title");
    vi.stubEnv("MAINTENANCE_METADATA_DESCRIPTION", "Meta desc");

    const data = getMaintenanceData();

    expect(data).toEqual({
      badgeLabel: "Down",
      title: "Custom title",
      cardDescription: "Card",
      body: "Body",
      footer: "Foot",
      metadataTitle: "Meta title",
      metadataDescription: "Meta desc",
    });
  });

  it("treats empty string as missing and falls back to default for that field", () => {
    vi.stubEnv("MAINTENANCE_TITLE", "");
    vi.stubEnv("MAINTENANCE_BODY", "Only body override");

    const data = getMaintenanceData();

    expect(data.title).toBe("We'll be right back");
    expect(data.body).toBe("Only body override");
  });
});
