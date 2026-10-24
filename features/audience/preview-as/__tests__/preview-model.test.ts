import { describe, expect, it, vi } from "vitest";
import * as personalization from "@/lib/personalization/apply-personalization";
import { previewAsModel } from "../preview-model";

const FORM = {
  title: "Renewal for {tier}",
  elements: [
    { type: "text", name: "plan", defaultValueExpression: "{tier}" },
    { type: "text", name: "seats", visibleIf: "{seats} > 10" },
  ],
};

describe("previewAsModel", () => {
  it("fills in defaults, text and conditions from the participant's values", () => {
    const model = previewAsModel(FORM, { tier: "gold", seats: 12 });

    expect(model.getQuestionByName("plan").value).toBe("gold");
    expect(model.processedTitle).toBe("Renewal for gold");
    expect(model.getQuestionByName("seats").isVisible).toBe(true);
  });

  it("applies the values through the shared form's personalization code", () => {
    const apply = vi.spyOn(personalization, "applyPersonalizationToModel");
    const values = { tier: "silver" };

    const model = previewAsModel(FORM, values);

    expect(apply).toHaveBeenCalledWith(model, { variables: values });
    apply.mockRestore();
  });

  it("leaves a value the participant has not filled in empty", () => {
    const model = previewAsModel(FORM, {});

    expect(model.getQuestionByName("plan").isEmpty()).toBe(true);
    expect(model.getQuestionByName("seats").isVisible).toBe(false);
  });

  it("cannot be completed, so a preview never becomes a response", () => {
    const model = previewAsModel(FORM, { tier: "gold" });

    expect(model.showCompleteButton).toBe(false);
    model.tryComplete();
    expect(model.state).not.toBe("completed");
  });
});
