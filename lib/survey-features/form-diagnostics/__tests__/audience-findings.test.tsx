import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceFinding } from "@/lib/personalization/authoring";
import { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";
import type { DiagnosticsAudience } from "../form-diagnostics-context";
import { FormDiagnosticsView } from "../ui/form-diagnostics-tab";

const MISSPELLED: AudienceFinding = {
  kind: "unknown-variable",
  variable: "tierr",
  path: "pages[0].elements[0].title",
  elementName: "plan",
  suggestion: "tier",
  fix: { reason: "renameReference", edits: [] },
};
const UNUSED: AudienceFinding = {
  kind: "unused-property",
  variableName: "seats",
};

function audienceWith(findings: AudienceFinding[]): DiagnosticsAudience {
  return {
    review: vi.fn(() => ({ findings })),
    applyFix: vi.fn(),
    refresh: vi.fn(() => Promise.resolve()),
  };
}

function pluginWith(audience?: DiagnosticsAudience) {
  const plugin = new FormDiagnosticsPlugin(new SurveyCreatorModel({}));
  plugin.audience = audience;
  plugin.updateStats();
  return plugin;
}

describe("Audience findings in Diagnostics", () => {
  it("lists them as warnings, with the suggested spelling", () => {
    render(
      <FormDiagnosticsView
        model={pluginWith(audienceWith([MISSPELLED, UNUSED]))}
      />,
    );

    const section = screen.getByRole("region", { name: /Personalization/ });
    expect(within(section).getByText("{tierr} is not declared")).toBeTruthy();
    expect(within(section).getByText(/Did you mean \{tier\}\?/)).toBeTruthy();
    expect(within(section).getByText("{seats} is never used")).toBeTruthy();
    expect(within(section).queryByText(/critical/i)).toBeNull();
  });

  it("applies the fix and reviews again", () => {
    const audience = audienceWith([MISSPELLED]);
    const plugin = pluginWith(audience);
    render(<FormDiagnosticsView model={plugin} />);

    fireEvent.click(screen.getByRole("button", { name: "Use {tier}" }));

    expect(audience.applyFix).toHaveBeenCalledWith(MISSPELLED);
    expect(audience.review).toHaveBeenCalledTimes(2);
  });

  it("reads the variables again when the tab opens", async () => {
    const audience = audienceWith([]);
    const plugin = pluginWith(audience);

    plugin.activate();
    await Promise.resolve();

    expect(audience.refresh).toHaveBeenCalledOnce();
    expect(audience.review).toHaveBeenCalledTimes(3);
  });

  it("shows findings that arrive after the tab rendered", async () => {
    const audience = audienceWith([]);
    const plugin = pluginWith(audience);
    render(<FormDiagnosticsView model={plugin} />);

    vi.mocked(audience.review).mockReturnValue({ findings: [UNUSED] });
    plugin.activate();

    expect(await screen.findByText("{seats} is never used")).toBeTruthy();
  });

  it("reviews again when the Creator loads the form", () => {
    const creator = new SurveyCreatorModel({});
    const plugin = new FormDiagnosticsPlugin(creator);
    const audience = audienceWith([UNUSED]);
    plugin.audience = audience;

    creator.JSON = { elements: [{ type: "text", name: "q" }] };

    expect(plugin.audienceFindings).toEqual([UNUSED]);
  });

  it("shows no findings, and keeps working, when the review throws", () => {
    const audience = audienceWith([]);
    vi.mocked(audience.review).mockImplementation(() => {
      throw new Error("linter broke");
    });

    expect(() => pluginWith(audience)).not.toThrow();
    expect(pluginWith(audience).audienceFindings).toEqual([]);
  });

  it("names a calculated value that collides with a property", () => {
    const collision: AudienceFinding = {
      kind: "variable-collision",
      variable: "seats",
      path: "calculatedValues[0].name",
      declaredBy: "calculatedValue",
    };
    render(
      <FormDiagnosticsView model={pluginWith(audienceWith([collision]))} />,
    );

    expect(
      screen.getByText("A calculated value hides the Property {seats}"),
    ).toBeTruthy();
  });

  it("shows no Personalization section without Audience variables", () => {
    render(<FormDiagnosticsView model={pluginWith(undefined)} />);

    expect(
      screen.queryByRole("region", { name: /Personalization/ }),
    ).toBeNull();
  });
});
