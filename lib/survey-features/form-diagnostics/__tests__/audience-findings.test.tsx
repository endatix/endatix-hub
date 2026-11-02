import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import { TelemetryLogger } from "@/features/telemetry";
import type { AudienceFinding } from "@/lib/personalization/authoring";
import { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";
import type { DiagnosticsAudience } from "../form-diagnostics-context";
import { describeAudienceFinding } from "../ui/audience-findings";
import { FormDiagnosticsView } from "../ui/form-diagnostics-tab";

const MISSPELLED: AudienceFinding = {
  kind: "unknown-variable",
  variable: "tierr",
  path: "pages[0].elements[0].title",
  elementName: "plan",
  suggestion: "tier",
  fix: { reason: "renameReference", edits: [] },
  canAddProperty: false,
};
const UNDECLARED: AudienceFinding = {
  kind: "unknown-variable",
  variable: "city",
  path: "pages[0].elements[0].title",
  elementName: "plan",
  canAddProperty: true,
};
const UNUSED: AudienceFinding = {
  kind: "unused-property",
  variableName: "seats",
};

function audienceWith(findings: AudienceFinding[]): DiagnosticsAudience {
  return {
    review: vi.fn(() => Promise.resolve({ findings })),
    applyFix: vi.fn(),
    addProperty: vi.fn(() => Promise.resolve()),
    refresh: vi.fn(() => Promise.resolve()),
  };
}

async function pluginWith(audience?: DiagnosticsAudience) {
  const plugin = new FormDiagnosticsPlugin(new SurveyCreatorModel({}));
  plugin.audience = audience;
  await plugin.updateAudienceFindings();
  return plugin;
}

describe("Audience findings in Diagnostics", () => {
  it("lists them as warnings, with the suggested spelling", async () => {
    render(
      <FormDiagnosticsView
        model={await pluginWith(audienceWith([MISSPELLED, UNUSED]))}
      />,
    );

    const section = screen.getByRole("region", { name: /Personalization/ });
    expect(within(section).getByText("{tierr} is not declared")).toBeTruthy();
    expect(within(section).getByText(/Did you mean \{tier\}\?/)).toBeTruthy();
    expect(within(section).getByText("{seats} is never used")).toBeTruthy();
    expect(within(section).queryByText(/critical/i)).toBeNull();
  });

  it("applies the fix and reviews again", async () => {
    const audience = audienceWith([MISSPELLED]);
    const plugin = await pluginWith(audience);
    render(<FormDiagnosticsView model={plugin} />);
    vi.mocked(audience.review).mockResolvedValue({ findings: [] });

    fireEvent.click(screen.getByRole("button", { name: "Use {tier}" }));

    expect(audience.applyFix).toHaveBeenCalledWith(MISSPELLED);
    await waitFor(() =>
      expect(screen.queryByText("{tierr} is not declared")).toBeNull(),
    );
  });

  it("adds an undeclared variable as a participant property and reviews again", async () => {
    // Arrange
    const audience = audienceWith([UNDECLARED]);
    const plugin = await pluginWith(audience);
    render(<FormDiagnosticsView model={plugin} />);
    vi.mocked(audience.review).mockResolvedValue({ findings: [] });

    // Act
    fireEvent.click(
      screen.getByRole("button", { name: "Add as participant property" }),
    );

    // Assert
    expect(audience.addProperty).toHaveBeenCalledWith(UNDECLARED);
    await waitFor(() =>
      expect(screen.queryByText("{city} is not declared")).toBeNull(),
    );
  });

  it("offers Add as Audience property only where a Property would declare the name", async () => {
    // Act
    render(
      <FormDiagnosticsView
        model={await pluginWith(audienceWith([MISSPELLED]))}
      />,
    );

    // Assert
    expect(
      screen.queryByRole("button", { name: "Add as participant property" }),
    ).toBeNull();
  });

  it("reads the variables again when the tab opens, then reviews once", async () => {
    // Arrange
    const audience = audienceWith([]);
    const plugin = await pluginWith(audience);
    vi.mocked(audience.review).mockClear();

    // Act
    plugin.activate();

    // Assert
    expect(audience.refresh).toHaveBeenCalledOnce();
    expect(audience.review).not.toHaveBeenCalled();
    await waitFor(() => expect(audience.review).toHaveBeenCalledOnce());
  });

  it("keeps the findings already shown when refresh rejects", async () => {
    const audience = audienceWith([UNUSED]);
    vi.mocked(audience.refresh).mockRejectedValue(new Error("offline"));
    const logged = vi
      .spyOn(TelemetryLogger, "error")
      .mockImplementation(() => {});
    const plugin = await pluginWith(audience);
    vi.mocked(audience.review).mockClear();

    plugin.activate();

    await waitFor(() => expect(audience.review).toHaveBeenCalledOnce());
    expect(logged).toHaveBeenCalledWith(
      "Personalization refresh failed.",
      expect.any(Error),
      {},
      "form-diagnostics.audience",
    );
    expect(plugin.audienceFindings).toEqual([UNUSED]);
  });

  it("shows findings that arrive after the tab rendered", async () => {
    const audience = audienceWith([]);
    const plugin = await pluginWith(audience);
    render(<FormDiagnosticsView model={plugin} />);

    vi.mocked(audience.review).mockResolvedValue({ findings: [UNUSED] });
    plugin.activate();

    expect(await screen.findByText("{seats} is never used")).toBeTruthy();
  });

  it("reviews again when the Creator loads the form with Diagnostics open", async () => {
    const creator = new SurveyCreatorModel({});
    const plugin = new FormDiagnosticsPlugin(creator);
    creator.addTab({ name: "form-diagnostics", plugin, title: "Diagnostics" });
    creator.activeTab = "form-diagnostics";
    const audience = audienceWith([]);
    plugin.audience = audience;
    vi.mocked(audience.review).mockImplementation(() =>
      Promise.resolve({
        findings: creator.JSON.pages?.length ? [UNUSED] : [],
      }),
    );

    creator.JSON = { elements: [{ type: "text", name: "q" }] };

    await waitFor(() => expect(plugin.audienceFindings).toEqual([UNUSED]));
    // Once per load: the Creator's second `update()` and `applyTheme` bring no new survey.
    creator.applyTheme({});
    expect(audience.review).toHaveBeenCalledOnce();
  });

  it("keeps only the latest review when an earlier one lands late", async () => {
    const audience = audienceWith([]);
    const plugin = await pluginWith(audience);
    let landLate: (review: { findings: AudienceFinding[] }) => void = () => {};
    vi.mocked(audience.review)
      .mockImplementationOnce(
        () => new Promise((resolve) => (landLate = resolve)),
      )
      .mockResolvedValueOnce({ findings: [UNUSED] });

    const late = plugin.updateAudienceFindings();
    await plugin.updateAudienceFindings();
    landLate({ findings: [MISSPELLED] });
    await late;

    expect(plugin.audienceFindings).toEqual([UNUSED]);
  });

  it("shows no findings, and keeps working, when the review throws", async () => {
    const audience = audienceWith([]);
    vi.mocked(audience.review).mockRejectedValue(new Error("linter broke"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const plugin = await pluginWith(audience);

    expect(plugin.audienceFindings).toEqual([]);
  });

  it("names a calculated value that collides with a property", async () => {
    const collision: AudienceFinding = {
      kind: "variable-collision",
      variable: "seats",
      path: "calculatedValues[0].name",
      declaredBy: "calculatedValue",
    };
    render(
      <FormDiagnosticsView
        model={await pluginWith(audienceWith([collision]))}
      />,
    );

    expect(
      screen.getByText(
        "A calculated value shares its name with the Property {seats}",
      ),
    ).toBeTruthy();
  });

  it("shows no Personalization section without Audience variables", async () => {
    render(<FormDiagnosticsView model={await pluginWith(undefined)} />);

    expect(
      screen.queryByRole("region", { name: /Personalization/ }),
    ).toBeNull();
  });
});

describe("describeAudienceFinding", () => {
  it("offers to clear a prefill whose question type no longer fits", () => {
    // Act
    const described = describeAudienceFinding({
      kind: "prefill-type-mismatch",
      variable: "age",
      propertyTitle: "Age",
      path: "pages[0].elements[0].defaultValueExpression",
      elementName: "city",
      fix: { reason: "clearPrefill", edits: [] },
    });

    // Assert
    expect(described).toEqual({
      title: "{age} no longer fits this question",
      description:
        "Age does not fit this question's type. Clear the prefill. Allow respondent to edit stays as it is.",
      fixLabel: "Clear prefill",
    });
  });

  it("counts the participants without a value the way the Audience tab does", () => {
    const { title } = describeAudienceFinding({
      kind: "not-filled-in",
      variableName: "tier",
      filledReal: 4790,
      real: 6810,
    });

    expect(title).toBe(
      "{tier} is not filled in for 2,020 of 6,810 real participants",
    );
  });
});
