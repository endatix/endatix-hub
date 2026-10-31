import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudienceIdentifierKind,
  AudiencePeopleTestFilter,
  type AudiencePerson,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PeopleSection } from "../ui/people-section";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/forms/1/audience",
  useSearchParams: () => new URLSearchParams(),
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
vi.mock("../../update-person/ui/edit-person-panel", () => ({
  EditPersonPanel: () => null,
}));
vi.mock("../../reissue-link/ui/reissue-link-dialog", () => ({
  ReissueLinkOverlay: () => null,
}));
vi.mock("../../test-as-person/open-test-submission.action", () => ({
  openTestSubmissionAction: vi.fn(),
}));
vi.mock("../../copy-test-link/create-test-link.action", () => ({
  createTestLinkAction: vi.fn(),
}));
vi.mock("../../delete-person/ui/remove-person-dialog", () => ({
  RemovePersonDialog: (props: {
    person: { identifier: string } | null;
    onRemoved?: (person: unknown) => void;
  }) =>
    props.person ? (
      <button type="button" onClick={() => props.onRemoved?.(props.person)}>
        Confirm remove {props.person.identifier}
      </button>
    ) : null,
}));
vi.mock("../../download-test-links/ui/download-test-links-panel", () => ({
  DownloadTestLinksPanel: (props: {
    testParticipants: number;
    selectedIds: string[];
  }) => (
    <output aria-label="Download test links">
      {props.testParticipants}:{props.selectedIds.join(",")}
    </output>
  ),
}));

const person = (
  membershipId: string,
  identifier: string,
  isTest: boolean,
): AudiencePerson => ({
  membershipId,
  audienceMemberId: `m${membershipId}`,
  identifier,
  values: {},
  isTest,
  link: { status: "none" },
});

const REAL = person("9", "real@acme.test", false);
const T1 = person("10", "t1@acme.test", true);
const T2 = person("11", "t2@acme.test", true);

const LIST = {
  formId: "1",
  identifierKind: AudienceIdentifierKind.Email,
  properties: [] as AudienceProperty[],
  importLimits: {
    maxRows: 5_000,
    maxBytes: 20_971_520,
    runsInBackground: false,
  },
  people: [REAL, T1, T2],
  totalPeople: 3,
  page: 1,
  pageSize: 50,
  totalPages: 1,
  hasNextPage: false,
  testFilter: AudiencePeopleTestFilter.All,
  canEdit: true,
  canTest: true,
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const SELECT_PAGE = "Select test participants on this page";
const download = () =>
  screen.getByRole("status", { name: "Download test links" }).textContent;
const tick = (name: string) =>
  fireEvent.click(screen.getByRole("checkbox", { name }));

function renderWithTestLinks() {
  render(<PeopleSection {...LIST} canMintTestLinks testParticipants={2} />);
}

describe("PeopleSection test links", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  it("offers Download test links, with ticks on test participants only", () => {
    renderWithTestLinks();

    expect(download()).toBe("2:");
    expect(
      screen.queryByRole("checkbox", { name: "Select real@acme.test" }),
    ).toBeNull();
    expect(
      screen.getByText("No tick: only test participants get test links"),
    ).toBeTruthy();
    tick("Select t1@acme.test");
    expect(download()).toBe("2:10");
  });

  it("ticks every test participant on the page, shows some as mixed, and clears them", () => {
    renderWithTestLinks();
    const selectPage = () =>
      screen.getByRole("checkbox", { name: SELECT_PAGE });

    tick("Select t1@acme.test");
    expect(selectPage().getAttribute("aria-checked")).toBe("mixed");
    tick(SELECT_PAGE);
    expect(download()).toBe("2:10,11");
    tick(SELECT_PAGE);
    expect(download()).toBe("2:");
  });

  it("drops a removed participant's tick, and clears the rest with Clear selection", () => {
    renderWithTestLinks();

    tick("Select t1@acme.test");
    tick("Select t2@acme.test");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove t2@acme.test from this form",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm remove t2@acme.test" }),
    );
    expect(download()).toBe("2:10");

    fireEvent.click(
      screen.getByRole("button", { name: "Clear selection (1)" }),
    );
    expect(download()).toBe("2:");
    expect(
      screen.queryByRole("button", { name: /Clear selection/ }),
    ).toBeNull();
  });

  it.each([
    ["the API cannot make test links", false, 2],
    ["the form has no test participants", true, 0],
  ])(
    "offers no download or ticks when %s",
    (_, canMintTestLinks, testParticipants) => {
      render(
        <PeopleSection
          {...LIST}
          canMintTestLinks={canMintTestLinks}
          testParticipants={testParticipants}
        />,
      );

      expect(
        screen.queryByRole("status", { name: "Download test links" }),
      ).toBeNull();
      expect(screen.queryByRole("checkbox")).toBeNull();
    },
  );
});
