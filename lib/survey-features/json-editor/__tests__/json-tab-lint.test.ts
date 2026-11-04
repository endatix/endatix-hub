import { readFileSync } from "node:fs";
import path from "node:path";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SurveyCreatorModel, TabJsonEditorAcePlugin } from "survey-creator-core";
import type { LintSeverity } from "survey-core/linter";
import { Result } from "@/lib/result";
import { LINT_RULE } from "@/lib/survey-features/survey-lint";
import { useJsonEditor } from "../use-json-editor.hook";

const CEDAR_GROVE = readFileSync(
  path.join(
    process.cwd(),
    "e2e/fixtures/audience/cedar-grove-pulse.survey.json",
  ),
  "utf8",
);

function mountJsonEditor() {
  const { result } = renderHook(() => useJsonEditor({}));
  const creator = new SurveyCreatorModel();
  let cleanup: () => void = () => {};
  act(() => {
    cleanup = result.current.registerJsonEditor(creator);
  });
  return { creator, cleanup, result };
}

function openJsonTab() {
  const onJsonStateChange = vi.fn();
  const { result } = renderHook(() => useJsonEditor({ onJsonStateChange }));
  const creator = new SurveyCreatorModel();
  creator.activeTab = "json";
  vi.spyOn(TabJsonEditorAcePlugin, "hasAceEditor").mockReturnValue(true);
  act(() => {
    result.current.registerJsonEditor(creator);
    creator.activeTab = "designer";
    creator.activeTab = "json";
  });
  return {
    creator,
    model: creator.getPlugin("json").model,
    onJsonStateChange,
    result,
  };
}

describe("registerJsonEditor", () => {
  it("sets an unknown reference to a warning and leaves other rules and variable presets", () => {
    // Arrange
    const { creator, cleanup } = mountJsonEditor();
    const presets = creator.variablePresets;
    const rules: Record<string, LintSeverity> = {
      "property/unknown": "error",
    };
    const lintOptions = { rules, variablePresets: presets };

    // Act
    creator.onLintSurvey.fire(creator, { lintOptions });

    // Assert
    expect(rules[LINT_RULE.unknown]).toBe("warning");
    expect(rules["property/unknown"]).toBe("error");
    expect(lintOptions.variablePresets).toBe(presets);
    cleanup();
  });

  it("stops downgrading unknown references after cleanup", () => {
    // Arrange
    const { creator, cleanup } = mountJsonEditor();
    cleanup();
    const rules: Record<string, LintSeverity> = {
      "property/unknown": "error",
    };

    // Act
    creator.onLintSurvey.fire(creator, { lintOptions: { rules } });

    // Assert
    expect(rules[LINT_RULE.unknown]).toBeUndefined();
    expect(rules["property/unknown"]).toBe("error");
  });

  it("does not publish a block for cedar grove when no property is declared", () => {
    // Arrange
    const { model, onJsonStateChange } = openJsonTab();

    // Act
    act(() => {
      model.text = CEDAR_GROVE;
    });

    // Assert
    const published = onJsonStateChange.mock.calls.at(-1)?.[0];
    expect(published?.isOnJsonTab).toBe(true);
    expect(published?.hasErrors).toBe(false);
    expect(model.hasErrors).toBe(true);
  });

  it("updates the published flag when a syntax error becomes unknown references and back", () => {
    // Arrange
    const syntaxError = JSON.stringify({
      pages: [
        {
          name: "page1",
          elements: [{ type: "text", name: "q1", visibleIf: "age >" }],
        },
      ],
    });
    const { model, onJsonStateChange } = openJsonTab();
    act(() => {
      model.text = "{";
    });
    const published = () => onJsonStateChange.mock.calls.at(-1)?.[0];

    // Act
    act(() => {
      model.text = CEDAR_GROVE;
    });

    // Assert
    expect(published()?.hasErrors).toBe(false);
    expect(model.hasErrors).toBe(true);

    // Act
    act(() => {
      model.text = syntaxError;
    });

    // Assert
    expect(published()?.hasErrors).toBe(true);
    expect(model.hasErrors).toBe(true);
  });

  it("does not report city, family_size, or age when those properties are declared", () => {
    // Arrange
    const { creator, model } = openJsonTab();
    creator.variablePresets = {
      definition: {
        elements: [
          { type: "text", name: "city" },
          { type: "text", name: "family_size" },
          { type: "text", name: "age" },
        ],
      },
      presets: [],
    };

    // Act
    act(() => {
      model.text = CEDAR_GROVE;
    });

    // Assert
    const titles = model.errorList.actions
      .map((action) => action.title ?? "")
      .join("\n");
    expect(titles).not.toMatch(/\bcity\b/);
    expect(titles).not.toMatch(/\bfamily_size\b/);
    expect(titles).not.toMatch(/\bage\b/);
  });
});

describe("getJsonModel", () => {
  it("accepts unknown references and still rejects text that does not parse", () => {
    // Arrange
    const { creator, model, result } = openJsonTab();
    act(() => {
      model.text = CEDAR_GROVE;
    });

    // Act
    const unknown = result.current.getJsonModel(creator);

    // Assert
    expect(Result.isSuccess(unknown)).toBe(true);

    // Act
    act(() => {
      model.text = "{";
    });
    const broken = result.current.getJsonModel(creator);

    // Assert
    expect(Result.isError(broken)).toBe(true);

    // Act
    act(() => {
      model.text = JSON.stringify({
        pages: [
          {
            name: "page1",
            elements: [{ type: "text", name: "q1", visibleIf: "age >" }],
          },
        ],
      });
    });
    const syntax = result.current.getJsonModel(creator);

    // Assert
    expect(Result.isError(syntax)).toBe(true);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
