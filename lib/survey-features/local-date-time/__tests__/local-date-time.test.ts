import { describe, expect, it, vi } from "vitest";
import { SurveyModel } from "survey-core";
import { coreExtensions } from "@/lib/survey-extensions/core-registry";
import { LOCAL_DATE_TIME_EXTENSION_ID } from "../constants";
import { localDateTimeExtension } from "../infrastructure/local-date-time.extension";

function shown(stored: unknown): unknown {
  const survey = new SurveyModel({
    elements: [
      {
        type: "text",
        inputType: "datetime-local",
        name: "when",
        defaultValueExpression: "edxLocalDateTime({renews_at})",
      },
    ],
  });
  survey.setVariable("renews_at", stored);
  return survey.getQuestionByName("when")?.value;
}

describe("edxLocalDateTime", () => {
  it("keeps the wall-clock time and drops the offset", () => {
    // Arrange
    localDateTimeExtension.onInit?.();

    // Act & Assert
    expect(shown("2026-10-27T10:00+02:00")).toBe("2026-10-27T10:00");
    expect(shown("2026-10-27T10:00Z")).toBe("2026-10-27T10:00");
    expect(shown("2026-10-27T10:00-05:00")).toBe("2026-10-27T10:00");
  });

  it("leaves a value that is not an offset date-time unchanged", () => {
    // Arrange
    localDateTimeExtension.onInit?.();

    // Act & Assert
    expect(shown("2026-10-27T10:00")).toBe("2026-10-27T10:00");
    expect(shown("hello")).toBe("hello");
    expect(shown(12)).toBe(12);
  });

  it("registers once, and the Hub loads that function on every survey", () => {
    // Arrange
    localDateTimeExtension.onInit?.();

    // Act
    localDateTimeExtension.onInit?.();
    const extension = coreExtensions.find((item) => item.id === LOCAL_DATE_TIME_EXTENSION_ID);

    // Assert
    expect(shown("2026-10-27T10:00+02:00")).toBe("2026-10-27T10:00");
    expect(extension?.loading).toBe("static");
    expect(extension && "module" in extension ? extension.module : undefined).toBe(
      localDateTimeExtension,
    );
  });

  it("does not register a second function when init runs twice", async () => {
    // Arrange
    vi.resetModules();
    const { FunctionFactory } = await import("survey-core");
    const registry = await import("../infrastructure/registry");
    const registerSpy = vi.spyOn(FunctionFactory.Instance, "register");

    // Act
    registry.registerLocalDateTime();
    registry.registerLocalDateTime();

    // Assert
    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(FunctionFactory.Instance.hasFunction("edxLocalDateTime")).toBe(true);
  });
});
