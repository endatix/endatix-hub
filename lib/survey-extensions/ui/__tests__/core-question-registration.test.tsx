import { renderHook, waitFor } from "@testing-library/react";
import { Model, QuestionFactory, Serializer } from "survey-core";
import { describe, expect, it } from "vitest";
import { DRAG_CATEGORIZE_TYPE } from "@/lib/questions/drag-categorize/constants";
import { dragCategorizeExtension } from "@/lib/questions/drag-categorize/drag-categorize.extension";
import type { ExtensionDefinition } from "../../types";
import { useExtensionLoader } from "../use-extension-loader";

/**
 * The public form and the submission survey no longer register
 * extension-backed question types themselves — the loader does it through the
 * extension's onInit. If that stops happening, SurveyJS silently drops
 * elements of unknown type while parsing a definition: respondents lose the
 * question and reviewers lose the stored answer, with no error anywhere.
 *
 * Driven through useExtensionLoader rather than useSurveyExtensions so the
 * real core-registry — which reaches next-auth via the data-lists extension —
 * stays out of this test. The registry entry's own shape is enforced by the
 * ExtensionDefinition union: `loading: "static"` requires `module`.
 */
describe("a static question extension registers its type", () => {
  const runtimeDeps = { getRuntimeState: () => ({ formId: "form-1" }) };

  const definition = {
    pages: [
      {
        elements: [
          {
            type: DRAG_CATEGORIZE_TYPE,
            name: "q1",
            choices: [{ value: "item_1" }],
            zones: [{ value: "zone_a" }, { value: "zone_b" }],
          },
        ],
      },
    ],
  };

  const entry: ExtensionDefinition = {
    id: "drag-categorize",
    type: "question",
    loading: "static",
    module: dragCategorizeExtension,
  };

  function load() {
    return renderHook(() =>
      useExtensionLoader({
        allExtensions: [entry],
        extensionIdsToLoad: [entry.id],
        runtimeDeps,
      }),
    );
  }

  it("registers the type and reports ready", async () => {
    // Act
    const { result } = load();

    // Assert — ready must actually flip, or every gated surface spins forever
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(Serializer.findClass(DRAG_CATEGORIZE_TYPE)).toBeTruthy();
    expect(QuestionFactory.Instance.getAllTypes()).toContain(
      DRAG_CATEGORIZE_TYPE,
    );
  });

  it("keeps the question when a definition is parsed afterwards", async () => {
    // Arrange
    const { result } = load();
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Act
    const model = new Model(definition);

    // Assert — an unregistered type would be dropped from the page entirely
    expect(model.getQuestionByName("q1")?.getType()).toBe(
      DRAG_CATEGORIZE_TYPE,
    );
  });
});
