import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudiencePerson,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { openTestSubmissionAction } from "../../test-as-person/open-test-submission.action";
import type { PreviewAsData } from "../load-preview-as.server";
import { PreviewAsView } from "../ui/preview-as-view";

const router = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../../update-person/update-audience-person.action", () => ({
  updateAudiencePersonAction: vi.fn(),
}));
vi.mock("../../test-as-person/open-test-submission.action", () => ({
  openTestSubmissionAction: vi.fn(),
}));
// The survey itself is previewAsModel's (preview-model.test.ts); here only what it is given.
const survey = vi.fn();
vi.mock("../ui/preview-survey", () => ({
  PreviewSurvey: (props: Record<string, unknown>) => {
    survey(props);
    return <div data-testid="survey" />;
  },
}));

const property = (id: string, name: string): AudienceProperty => ({
  id,
  formId: "1",
  variableName: name.toLowerCase(),
  name,
  dataType: AudienceDataType.Text,
  sortOrder: 0,
  allowsOther: false,
});

const person = (
  memberId: string,
  identifier: string,
  isTest: boolean,
  values: Record<string, string> = {},
): AudiencePerson => ({
  membershipId: `9${memberId}`,
  audienceMemberId: memberId,
  identifier,
  values,
  isTest,
  link: { status: "none" },
});

const MARIA = person("7", "maria@acme.test", true, { "11": "Gold" });
const JO = person("8", "jo@acme.test", true);
const SAM = person("20", "sam@acme.com", false);
const FORM = { elements: [{ type: "text", name: "plan" }] };
const THEME = JSON.stringify({ cssVariables: {} });

function data(overrides: Partial<PreviewAsData> = {}): PreviewAsData {
  return {
    form: {
      definition: FORM,
      savedAt: "2026-10-23T14:30:00Z",
      theme: THEME,
      customQuestions: [],
    },
    hasVariables: true,
    testParticipants: [MARIA, JO],
    totalTest: 2,
    search: "",
    matches: null,
    totalMatches: 0,
    selected: { status: "found", person: MARIA, variables: { tier: "gold" } },
    identifierKind: AudienceIdentifierKind.Email,
    properties: [property("11", "Tier"), property("12", "Region")],
    canTest: true,
    ...overrides,
  };
}

const renderView = (overrides: Partial<PreviewAsData> = {}) =>
  render(<PreviewAsView formId="1" {...data(overrides)} />);

const participants = () =>
  screen.getByRole("listbox", { name: "Participants" });

// Radix measures with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("PreviewAsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  it("lists the Test participants with the previewed one selected", () => {
    renderView();

    const options = within(participants()).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining("maria@acme.test"),
      expect.stringContaining("jo@acme.test"),
    ]);
    expect(options[0].getAttribute("aria-selected")).toBe("true");
  });

  it("lists the search matches after the Test participants, without repeating one", () => {
    renderView({ search: "acme", matches: [SAM, MARIA], totalMatches: 2 });

    const options = within(participants()).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining("maria@acme.test"),
      expect.stringContaining("jo@acme.test"),
      expect.stringContaining("sam@acme.com"),
    ]);
  });

  it("searches everyone on the form", () => {
    renderView();

    const search = screen.getByRole("searchbox", {
      name: "Find a participant",
    });
    fireEvent.change(search, { target: { value: "sam" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(router.replace).toHaveBeenCalledWith(
      "/forms/1/audience/preview-as?q=sam",
      { scroll: false },
    );
  });

  it("moves through the list with the arrow keys", () => {
    renderView({ search: "acme", matches: [SAM], totalMatches: 1 });

    fireEvent.keyDown(participants(), { key: "ArrowDown" });
    expect(router.replace).toHaveBeenLastCalledWith(
      "/forms/1/audience/preview-as?member=8&q=acme",
      { scroll: false },
    );
    fireEvent.keyDown(participants(), { key: "ArrowUp" });
    expect(router.replace).toHaveBeenLastCalledWith(
      "/forms/1/audience/preview-as?member=7&q=acme",
      { scroll: false },
    );
  });

  it("keeps moving while the previous step is still loading", () => {
    renderView({ search: "acme", matches: [SAM], totalMatches: 1 });

    fireEvent.keyDown(participants(), { key: "ArrowDown" });
    fireEvent.keyDown(participants(), { key: "ArrowDown" });

    expect(router.replace).toHaveBeenLastCalledWith(
      "/forms/1/audience/preview-as?member=20&q=acme",
      { scroll: false },
    );
    expect(
      screen
        .getByRole("option", { name: /sam@acme.com/ })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("lists a linked participant who is in neither list, selected", () => {
    renderView({
      selected: { status: "found", person: SAM, variables: {} },
    });

    const previewing = screen.getByRole("group", { name: "Previewing" });
    expect(
      within(previewing).getByRole("option").getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("says so when every match is already listed", () => {
    renderView({ search: "maria", matches: [MARIA], totalMatches: 1 });

    screen.getByText("Every match is listed above.");
  });

  it("stops at the ends of the list", () => {
    renderView();

    fireEvent.keyDown(participants(), { key: "ArrowUp" });
    fireEvent.keyDown(participants(), { key: "Home" });

    expect(router.replace).not.toHaveBeenCalled();
  });

  it("jumps to the last participant with End", () => {
    renderView();

    fireEvent.keyDown(participants(), { key: "End" });

    expect(router.replace).toHaveBeenCalledWith(
      "/forms/1/audience/preview-as?member=8",
      { scroll: false },
    );
  });

  it("previews a participant on click", () => {
    renderView();

    fireEvent.click(screen.getByRole("option", { name: /jo@acme.test/ }));

    expect(router.replace).toHaveBeenCalledWith(
      "/forms/1/audience/preview-as?member=8",
      { scroll: false },
    );
  });

  it("shows the participant's values and what they have not filled in", () => {
    renderView();

    const strip = screen.getByRole("region", { name: "maria@acme.test" });
    within(strip).getByText("Gold");
    within(strip).getByText("Not filled in: Region");
  });

  it("renders the saved form with the participant's values and its save time", () => {
    renderView();

    expect(survey).toHaveBeenLastCalledWith(
      expect.objectContaining({
        definition: FORM,
        variables: { tier: "gold" },
      }),
    );
    screen.getByText(/Saved form, last saved/);
    expect(
      screen
        .getByText(/Saved form/)
        .querySelector("time")
        ?.getAttribute("dateTime"),
    ).toBe("2026-10-23T14:30:00Z");
  });

  it("tests as this participant", async () => {
    const tab = { close: vi.fn(), opener: {}, location: { href: "" } };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    vi.mocked(openTestSubmissionAction).mockResolvedValue(
      Result.success({ url: "/share/1" }),
    );
    renderView();

    fireEvent.click(
      screen.getByRole("button", { name: "Test as this participant" }),
    );

    await waitFor(() => expect(tab.location.href).toBe("/share/1"));
    expect(openTestSubmissionAction).toHaveBeenCalledWith("1", "97");
  });

  it("offers Test as only to a reader who may test forms", () => {
    renderView({ canTest: false });

    expect(
      screen.queryByRole("button", { name: "Test as this participant" }),
    ).toBeNull();
  });

  it("opens the edit panel on Edit values", async () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Edit values" }));

    expect(
      await screen.findByRole("dialog", { name: "Edit person" }),
    ).toBeDefined();
  });

  it("says so when the participant the link names is no longer on the form", () => {
    renderView({ selected: { status: "gone" } });

    screen.getByText("This participant is no longer on the form.");
    expect(survey).not.toHaveBeenCalled();
  });

  it("asks for a Test participant when nobody is listed", () => {
    renderView({ testParticipants: [], totalTest: 0, selected: null });

    screen.getByText(/Nobody to preview as yet/);
    expect(survey).not.toHaveBeenCalled();
  });

  it("asks for a save before there is a form to preview", () => {
    renderView({ form: null });

    screen.getByText(/Save the form in the designer/);
    expect(survey).not.toHaveBeenCalled();
  });
});
