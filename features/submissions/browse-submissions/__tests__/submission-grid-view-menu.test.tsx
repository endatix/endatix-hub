import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmissionGridViewLoad } from "../submission-grid-view";
import { SubmissionGridUrlProvider } from "../ui/submission-grid-url-context";
import { SubmissionGridViewProvider } from "../ui/submission-grid-view-context";
import { SubmissionGridViewMenu } from "../ui/submission-grid-view-menu";

const navigation = vi.hoisted(() => ({
  router: { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() },
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => "/forms/42/submissions",
  useSearchParams: () => navigation.searchParams,
}));
vi.mock("../save-submission-grid-view.action", () => ({
  saveSubmissionGridViewAction: vi.fn(),
}));
vi.mock("@/components/ui/dropdown-menu", () => {
  const Pass = ({ children }: { children: ReactNode }) => <>{children}</>;
  return {
    DropdownMenu: Pass,
    DropdownMenuTrigger: Pass,
    DropdownMenuContent: Pass,
    DropdownMenuLabel: Pass,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({
      children,
      onSelect,
    }: {
      children: ReactNode;
      onSelect?: () => void;
    }) => (
      <button type="button" role="menuitem" onClick={onSelect}>
        {children}
      </button>
    ),
    DropdownMenuCheckboxItem: ({
      children,
      checked,
      onCheckedChange,
    }: {
      children: ReactNode;
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
    }) => (
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
      >
        {children}
      </button>
    ),
  };
});

const SAVED: SubmissionGridViewLoad = {
  revision: "3",
  settings: { v: 1, columns: [{ key: "completedAt", visible: false }] },
};

function renderMenu(view: SubmissionGridViewLoad, canSaveView: boolean) {
  render(
    <SubmissionGridUrlProvider viewSettings={view.settings}>
      <SubmissionGridViewProvider
        formId="42"
        catalog={[]}
        view={view}
        canSaveView={canSaveView}
      >
        <SubmissionGridViewMenu disabled={false} />
      </SubmissionGridViewProvider>
    </SubmissionGridUrlProvider>,
  );
}

const saveItem = () =>
  screen.queryByRole("menuitem", { name: "Save view for everyone" });
const detail = (name: string) => screen.getByRole("menuitemcheckbox", { name });

describe("SubmissionGridViewMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers Save view to a form editor", () => {
    // Act
    renderMenu(SAVED, true);

    // Assert
    expect(saveItem()).not.toBeNull();
  });

  it("offers no Save view to someone who cannot edit the form", () => {
    // Act
    renderMenu(SAVED, false);

    // Assert
    expect(saveItem()).toBeNull();
  });

  it("offers no Save view over a view that could not be read", () => {
    // Act
    renderMenu({ ...SAVED, revision: null }, true);

    // Assert
    expect(saveItem()).toBeNull();
  });

  it("shows the saved view's hidden details unticked and toggles them", () => {
    // Arrange
    renderMenu(SAVED, true);
    const hiddenBefore = detail("Completed").getAttribute("aria-checked");

    // Act
    fireEvent.click(detail("Completed"));
    fireEvent.click(detail("Started"));

    // Assert
    expect(hiddenBefore).toBe("false");
    expect(detail("Completed").getAttribute("aria-checked")).toBe("true");
    expect(detail("Started").getAttribute("aria-checked")).toBe("false");
  });
});
