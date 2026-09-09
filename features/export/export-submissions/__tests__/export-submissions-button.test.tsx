import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { ExportSubmissionsButton } from "../ui/export-submissions-button";

const mockRunExport = vi.fn();
const mockGetTenantSettingsAction = vi.fn();

vi.mock("../use-submissions-export.hook", () => ({
  useSubmissionsExport: () => ({
    isExporting: false,
    runExport: mockRunExport,
  }),
}));

vi.mock("../use-tenant-export-formats.hook", () => ({
  useTenantExportFormats: () => ({
    groups: [],
    isLoading: false,
    loadError: null,
  }),
}));

vi.mock("../ui/export-dialog", () => ({
  ExportSubmissionsDialog: () => null,
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock(
  "@/features/forms/application/actions/get-tenant-settings.action",
  () => ({
    getTenantSettingsAction: (...args: unknown[]) =>
      mockGetTenantSettingsAction(...args),
  }),
);

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
  }: {
    children: ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="legacy-export-menu">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

describe("ExportSubmissionsButton (legacy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunExport.mockResolvedValue({ succeeded: true });
  });

  it("shows a dropdown with CSV and Excel when there are no custom exports", async () => {
    // Arrange
    mockGetTenantSettingsAction.mockResolvedValue(
      Result.success({ customExports: [] }),
    );

    // Act
    render(<ExportSubmissionsButton formId="100" />);
    const menu = await screen.findByTestId("legacy-export-menu");

    // Assert
    expect(menu.textContent).toContain("CSV");
    expect(menu.textContent).toContain("Excel (XLSX)");
    expect(
      screen.getByRole("button", { name: /Export Submissions/i }),
    ).toBeTruthy();
  });

  it("exports Excel with format=xlsx and an .xlsx fallback filename", async () => {
    // Arrange
    mockGetTenantSettingsAction.mockResolvedValue(
      Result.success({ customExports: [] }),
    );
    render(<ExportSubmissionsButton formId="100" />);
    const excel = await screen.findByRole("button", {
      name: /Excel \(XLSX\)/i,
    });

    // Act
    fireEvent.click(excel);

    // Assert
    await waitFor(() => {
      expect(mockRunExport).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackFilename: "form-100-submissions.xlsx",
          url: expect.stringContaining("format=xlsx"),
        }),
      );
    });
  });

  it("exports custom rows with exportId only (no format query)", async () => {
    // Arrange
    mockGetTenantSettingsAction.mockResolvedValue(
      Result.success({
        customExports: [
          { id: "custom-1", name: "Ops CSV", sqlFunctionName: "ops_csv" },
        ],
      }),
    );
    render(<ExportSubmissionsButton formId="100" />);
    const custom = await screen.findByRole("button", { name: /Ops CSV/i });

    // Act
    fireEvent.click(custom);

    // Assert
    await waitFor(() => {
      expect(mockRunExport).toHaveBeenCalledTimes(1);
    });
    const [{ url }] = mockRunExport.mock.calls[0] as [{ url: string }];
    expect(url).toContain("exportId=custom-1");
    expect(url).not.toContain("format=");
  });
});
