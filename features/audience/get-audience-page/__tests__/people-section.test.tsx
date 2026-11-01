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
  AudiencePeopleTestFilter,
  type AudiencePerson,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { updateAudiencePersonAction } from "../../update-person/update-audience-person.action";
import { PeopleSection } from "../ui/people-section";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/forms/1/audience",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../../update-person/update-audience-person.action", () => ({
  updateAudiencePersonAction: vi.fn(),
}));
vi.mock("../../create-person/ui/add-person-panel", () => ({
  AddPersonPanel: () => null,
}));
vi.mock("../../generate-links/ui/generate-links-panel", () => ({
  GenerateLinksPanel: () => null,
}));
vi.mock("../../import-csv/ui/import-csv-panel", () => ({
  ImportCsvPanel: () => null,
}));
vi.mock("../../delete-person/ui/remove-person-dialog", () => ({
  RemovePersonDialog: () => null,
}));
vi.mock("../../test-as-person/open-test-submission.action", () => ({
  openTestSubmissionAction: vi.fn(),
}));
vi.mock("../../copy-test-link/create-test-link.action", () => ({
  createTestLinkAction: vi.fn(),
}));
vi.mock("../../reissue-link/reissue-audience-link.action", () => ({
  reissueAudienceLinkAction: vi.fn(),
}));

const textProperty = (
  id: string,
  variableName: string,
  name = variableName,
): AudienceProperty => ({
  id,
  formId: "1",
  variableName,
  name,
  dataType: AudienceDataType.Text,
  sortOrder: 0,
  allowsOther: false,
});

const PERSON: AudiencePerson = {
  membershipId: "9",
  audienceMemberId: "7",
  identifier: "CG-000003-01",
  values: { city: "Sofia", ext: "CG-000003-01" },
  isTest: false,
  link: { status: "none" },
};

const TEST_PERSON: AudiencePerson = {
  membershipId: "10",
  audienceMemberId: "8",
  identifier: "tester@example.com",
  values: {},
  isTest: true,
  link: { status: "none" },
};

const withLink = (
  membershipId: string,
  link: AudiencePerson["link"],
): AudiencePerson => ({
  ...PERSON,
  membershipId,
  identifier: `p${membershipId}@example.com`,
  link,
});

const EDIT = "Edit participant";

const LIST = {
  formId: "1",
  identifierKind: AudienceIdentifierKind.Email,
  properties: [] as AudienceProperty[],
  importLimits: {
    maxRows: 5_000,
    maxBytes: 20_971_520,
    runsInBackground: false,
  },
  totalPeople: 2,
  page: 1,
  pageSize: 50,
  totalPages: 1,
  hasNextPage: false,
  testFilter: AudiencePeopleTestFilter.All,
  search: "",
};

// Radix tooltips (the identifier's copy affordance) measure with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("PeopleSection", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(updateAudiencePersonAction).mockReset();
  });

  it("filters the match-key property out of edit values and the save payload", async () => {
    // Arrange
    vi.mocked(updateAudiencePersonAction).mockResolvedValue(
      Result.success(PERSON),
    );
    const properties = [
      textProperty("ext", "external_id"),
      textProperty("city", "city", "City"),
    ];
    render(
      <PeopleSection
        {...LIST}
        identifierKind={AudienceIdentifierKind.ExternalId}
        properties={properties}
        people={[PERSON]}
        totalPeople={1}
        canEdit
        canTest={false}
      />,
    );

    // Assert — table: match key as the person column only, not a second value column
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["External ID", "City", "Actions"]);

    // Act — open edit with the matching identifier property still in the section props
    fireEvent.click(
      screen.getByRole("button", { name: "Edit values for CG-000003-01" }),
    );

    // Assert — identity locked; identifier property absent from editable values
    expect(await screen.findByRole("heading", { name: EDIT })).toBeTruthy();
    const lockedLabel = screen
      .getAllByText("External ID")
      .find((node) => node.tagName === "DT");
    expect(lockedLabel).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "External ID" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "external_id" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "City" })).toBeTruthy();

    // Act
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Plovdiv" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Assert — save payload has only the changed value property
    await waitFor(() =>
      expect(updateAudiencePersonAction).toHaveBeenCalledWith({
        formId: "1",
        membershipId: "9",
        values: { city: "Plovdiv" },
      }),
    );
  });

  it("badges test people and offers Test as this participant with forms.test alone", () => {
    render(
      <PeopleSection
        {...LIST}
        people={[PERSON, TEST_PERSON]}
        canEdit={false}
        canTest
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0].textContent).not.toContain("Test");
    expect(rows[1].textContent).toContain("Test");
    expect(
      screen.getByRole("button", {
        name: "Test as this participant: tester@example.com",
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
  });

  it("offers Copy test link on test people only, and opens it with a 7-day lifetime", () => {
    render(
      <PeopleSection
        {...LIST}
        people={[PERSON, TEST_PERSON]}
        canEdit={false}
        canTest
        canCopyTestLink
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Copy test link: CG-000003-01" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy test link: tester@example.com",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "Copy test link" });
    expect(dialog.textContent).toContain("tester@example.com");
    expect(
      within(dialog).getByRole("combobox", { name: "Link lifetime" })
        .textContent,
    ).toBe("7 days");
  });

  it("puts Copy test link first, so the actions both rows share line up", () => {
    render(
      <PeopleSection
        {...LIST}
        people={[PERSON, TEST_PERSON]}
        canEdit
        canTest
        canCopyTestLink
      />,
    );

    const [real, test] = screen.getAllByRole("row").slice(1);
    const actions = (row: HTMLElement) =>
      within(row)
        .getAllByRole("button")
        .map(
          (b) =>
            /^(Copy test link|Test as|Remove)/.exec(b.ariaLabel ?? "")?.[1],
        )
        .filter(Boolean);
    expect(actions(test)).toEqual(["Copy test link", "Test as", "Remove"]);
    expect(actions(real)).toEqual(["Test as", "Remove"]);
  });

  it("leaves out Copy test link for a reader who cannot share submissions", () => {
    render(
      <PeopleSection
        {...LIST}
        people={[TEST_PERSON]}
        canEdit={false}
        canTest
        canCopyTestLink={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /^Copy test link/ }),
    ).toBeNull();
  });

  it("offers Reissue link on real people whose link was issued or opened, and warns first", () => {
    const opened = { status: "opened", openedAt: "2026-10-20T09:30:00Z" };
    const people = [
      withLink("1", { status: "none" }),
      withLink("2", { status: "issued" }),
      withLink("3", opened as AudiencePerson["link"]),
      TEST_PERSON,
    ];
    render(
      <PeopleSection
        {...LIST}
        people={people}
        totalPeople={people.length}
        canEdit
        canTest={false}
      />,
    );

    const offered = screen
      .getAllByRole("button", { name: /^Reissue link/ })
      .map((b) => b.ariaLabel);
    expect(offered).toEqual([
      "Reissue link: p2@example.com",
      "Reissue link: p3@example.com",
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "Reissue link: p2@example.com" }),
    );
    const dialog = screen.getByRole("alertdialog", {
      name: "Reissue the link for p2@example.com?",
    });
    expect(dialog.textContent).toContain("current link stops working");
  });

  it("leaves out Reissue link without forms.edit", () => {
    render(
      <PeopleSection
        {...LIST}
        people={[withLink("2", { status: "issued" })]}
        canEdit={false}
        canTest
      />,
    );

    expect(screen.queryByRole("button", { name: /^Reissue link/ })).toBeNull();
  });

  it("links each identifier to the participant's page for a reader who may edit", () => {
    render(
      <PeopleSection {...LIST} people={[PERSON]} canEdit canTest={false} />,
    );

    const identifier = screen.getByRole("link", { name: "CG-000003-01" });
    expect(identifier.getAttribute("href")).toBe(
      "/forms/1/audience/participants/7",
    );
  });

  it("keeps the identifier plain text without forms.edit, which the page needs", () => {
    render(
      <PeopleSection {...LIST} people={[PERSON]} canEdit={false} canTest />,
    );

    expect(screen.queryByRole("link", { name: "CG-000003-01" })).toBeNull();
  });

  it("leaves out Test as this participant without forms.test", () => {
    render(
      <PeopleSection {...LIST} people={[PERSON]} canEdit canTest={false} />,
    );

    expect(
      screen.queryByRole("button", { name: /^Test as this participant/ }),
    ).toBeNull();
  });

  it("marks a participant missing values the saved form reads", () => {
    const verdicts = {
      forProperty: () => ({ used: true, filledReal: 0, real: 0 }),
      notFilledIn: (filled: string[]) =>
        ["city", "tier"].filter((name) => !filled.includes(name)),
    };
    const properties = [
      textProperty("city", "city", "City"),
      textProperty("tier", "tier", "Tier"),
    ];
    render(
      <PeopleSection
        {...LIST}
        properties={properties}
        people={[
          PERSON,
          { ...TEST_PERSON, values: { city: "Ruse", tier: "gold" } },
        ]}
        canEdit={false}
        canTest={false}
        verdicts={verdicts}
      />,
    );

    const [missing, complete] = screen.getAllByRole("row").slice(1);
    expect(
      within(missing!).getByText("1 not filled in", { exact: false }),
    ).toBeTruthy();
    expect(within(missing!).getByLabelText("Not filled in: Tier")).toBeTruthy();
    expect(complete!.textContent).not.toContain("not filled in");
  });

  it("checks the match key's own value when the form reads it", () => {
    const verdicts = {
      forProperty: () => ({ used: true, filledReal: 0, real: 0 }),
      notFilledIn: (filled: string[]) =>
        ["external_id", "city"].filter((name) => !filled.includes(name)),
    };
    const withoutKeyValue = {
      ...PERSON,
      membershipId: "11",
      values: { city: "Ruse" },
    };
    render(
      <PeopleSection
        {...LIST}
        identifierKind={AudienceIdentifierKind.ExternalId}
        properties={[
          textProperty("ext", "external_id", "External ID"),
          textProperty("city", "city", "City"),
        ]}
        people={[PERSON, withoutKeyValue]}
        canEdit={false}
        canTest={false}
        verdicts={verdicts}
      />,
    );

    const [withKey, withoutKey] = screen.getAllByRole("row").slice(1);
    expect(withKey!.textContent).not.toContain("not filled in");
    expect(
      within(withoutKey!).getByLabelText("Not filled in: External ID"),
    ).toBeTruthy();
  });

  it("says the filter found nobody, with a way back to everyone", () => {
    render(
      <PeopleSection
        {...LIST}
        people={[]}
        totalPeople={0}
        testFilter={AudiencePeopleTestFilter.Test}
        canEdit
        canTest
      />,
    );

    expect(screen.getByText("No test participants")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", {
        name: "Filter participants by test or real",
      }),
    ).toBeTruthy();
  });
  it("shows Link only when someone on the page has a link", () => {
    render(
      <PeopleSection
        {...LIST}
        people={[PERSON, TEST_PERSON]}
        canEdit={false}
        canTest={false}
      />,
    );

    expect(screen.queryByRole("columnheader", { name: "Link" })).toBeNull();
  });

  it("says each link's status, and an opened one goes to its response", () => {
    const people = [
      withLink("1", { status: "none" }),
      withLink("2", { status: "issued" }),
      withLink("3", {
        status: "opened",
        openedAt: "2026-10-20T09:30:00Z",
        submissionId: "55",
      }),
      withLink("4", { status: "opened", openedAt: "2026-10-20T10:00:00Z" }),
      TEST_PERSON,
    ];
    render(
      <PeopleSection
        {...LIST}
        people={people}
        totalPeople={people.length}
        canEdit={false}
        canTest={false}
      />,
    );

    const headers = screen.getAllByRole("columnheader");
    const linkColumn = headers.findIndex((h) => h.textContent === "Link");
    const linkCells = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.querySelectorAll("td")[linkColumn]);
    expect(linkCells.map((cell) => cell.textContent)).toEqual([
      "Not issued",
      "Issued",
      expect.stringContaining("Opened"),
      "Opened",
      expect.stringContaining("—"),
    ]);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/forms/1/submissions/55");
    expect(links[0].textContent).toContain("Opened");
  });
});
