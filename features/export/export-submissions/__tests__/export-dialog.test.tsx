import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import {
  ExportSubmissionsDialog,
  type ExportSubmissionsDialogProps,
} from "../ui/export-dialog";

const mockOnExport = vi.fn();
const mockOnOpenChange = vi.fn();
const mockTrackFeatureUsage = vi.fn();
const mockListFormReportingLocalesAction = vi.fn();
const mockPrepareReportingExportAction = vi.fn();

type ExportTarget = "Submissions" | "Codebook";

type DialogContentMockProps = {
  children: React.ReactNode;
  showCloseButton?: boolean;
  onInteractOutside?: (event: { preventDefault: () => void }) => void;
  onEscapeKeyDown?: (event: { preventDefault: () => void }) => void;
  onOpenAutoFocus?: (event: { preventDefault: () => void }) => void;
};

let latestDialogContentProps: DialogContentMockProps | null = null;

vi.mock("../list-form-reporting-locales.action", () => ({
  listFormReportingLocalesAction: (...args: unknown[]) =>
    mockListFormReportingLocalesAction(...args),
}));

vi.mock("@/features/export/prepare-reporting-export", () => ({
  prepareReportingExportAction: (...args: unknown[]) =>
    mockPrepareReportingExportAction(...args),
}));

vi.stubGlobal(
  "ResizeObserver",
  vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
);

vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: () => ({
    trackFeatureUsage: mockTrackFeatureUsage,
  }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: (props: DialogContentMockProps) => {
    latestDialogContentProps = props;
    return <div data-testid="dialog-content">{props.children}</div>;
  },
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  ),
}));

vi.mock("@/components/ui/select", async (importOriginal) => {
  const React = await import("react");

  function walkOptions(
    node: React.ReactNode,
  ): Array<{ value: string; label: string }> {
    const opts: Array<{ value: string; label: string }> = [];
    React.Children.forEach(node, (child) => {
      if (React.isValidElement(child)) {
        if (
          typeof child.props.value === "string" &&
          typeof child.props.children === "string"
        ) {
          opts.push({
            value: child.props.value,
            label: child.props.children,
          });
        }
        if (child.props.children) {
          opts.push(...walkOptions(child.props.children));
        }
      }
    });
    return opts;
  }

  function findTriggerId(node: React.ReactNode): string | undefined {
    let found: string | undefined;
    React.Children.forEach(node, (child) => {
      if (found || !React.isValidElement(child)) {
        return;
      }

      if (typeof child.props.id === "string") {
        found = child.props.id;
        return;
      }

      if (child.props.children) {
        found = findTriggerId(child.props.children);
      }
    });
    return found;
  }

  return {
    Select: ({
      value,
      onValueChange,
      children,
      disabled,
    }: {
      value: string;
      onValueChange: (v: string) => void;
      children: React.ReactNode;
      disabled?: boolean;
    }) => {
      const items = walkOptions(children);
      const triggerId = findTriggerId(children) ?? "select";
      return (
        <select
          id={triggerId}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          data-testid={triggerId}
        >
          {items.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    },
    SelectTrigger: ({
      children,
      id,
    }: {
      children: React.ReactNode;
      id?: string;
      className?: string;
    }) => <div id={id}>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span>{placeholder}</span>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectGroup: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectLabel: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectItem: () => null,
    SelectScrollUpButton: () => null,
    SelectScrollDownButton: () => null,
    SelectSeparator: () => null,
  };
});

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    disabled,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
    ref,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit";
    ref?: React.Ref<HTMLButtonElement>;
  }) => (
    <button type={type} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
    ...props
  }: {
    children: React.ReactNode;
    htmlFor?: string;
    className?: string;
  }) => (
    <label htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => (
    <div role="alert">{children}</div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => (
    <strong>{children}</strong>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

function createProps(
  overrides?: Partial<ExportSubmissionsDialogProps>,
): ExportSubmissionsDialogProps {
  return {
    open: true,
    onOpenChange: mockOnOpenChange,
    formId: "100",
    groups: [
      {
        target: "Submissions" as ExportTarget,
        label: "Submissions",
        options: [
          {
            exportFormatId: "csv-1",
            formatKey: "csv",
            label: "CSV",
            fallbackExtension: "csv",
            exportTarget: "Submissions" as ExportTarget,
            profile: "Native",
            allowedFilters: [
              "includeTestSubmissions",
              "createdAtRange",
              "startedAtRange",
              "completedAtRange",
              "completionStatus",
            ],
          },
          {
            exportFormatId: "json-1",
            formatKey: "json",
            label: "JSON",
            fallbackExtension: "json",
            exportTarget: "Submissions" as ExportTarget,
            profile: "Native",
            allowedFilters: [
              "includeTestSubmissions",
              "createdAtRange",
              "startedAtRange",
              "completedAtRange",
              "completionStatus",
            ],
          },
        ],
      },
      {
        target: "Codebook" as ExportTarget,
        label: "Codebook",
        options: [
          {
            exportFormatId: "cb-native",
            formatKey: "codebook",
            label: "Native codebook",
            fallbackExtension: "json",
            exportTarget: "Codebook" as ExportTarget,
            profile: "Native",
            allowedFilters: [],
          },
          {
            exportFormatId: "cb-shoji",
            formatKey: "codebook-shoji",
            label: "Shoji codebook",
            fallbackExtension: "json",
            exportTarget: "Codebook" as ExportTarget,
            profile: "Shoji",
            allowedFilters: ["locale"],
          },
        ],
      },
    ],
    listFilters: undefined,
    isExporting: false,
    onExport: mockOnExport,
    ...overrides,
  };
}

async function waitForReady() {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /^export$/i })).toBeDefined();
  });
}

describe("ExportSubmissionsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestDialogContentProps = null;
    mockListFormReportingLocalesAction.mockResolvedValue(
      Result.success(["default", "es", "fr"]),
    );
    mockPrepareReportingExportAction.mockResolvedValue(
      Result.success({
        formDefinitionId: "1",
        processed: 1,
        skipped: 0,
        failed: 0,
        batches: 1,
      }),
    );
    mockOnExport.mockResolvedValue({ succeeded: true });
  });

  it("renders the dialog title and description when open", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    expect(screen.getByText("Export submissions")).toBeDefined();
    await waitForReady();
    expect(screen.getByText(/Choose a format/)).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<ExportSubmissionsDialog {...createProps({ open: false })} />);
    expect(screen.queryByText("Export submissions")).toBeNull();
  });

  it("shows row filters by default for submission formats", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();
    expect(screen.getByText("Include test submissions")).toBeDefined();
    expect(screen.getByText("Completion")).toBeDefined();
    expect(screen.getByText("Created at")).toBeDefined();
    expect(screen.getByText("Started at")).toBeDefined();
    expect(screen.getByText("Completed at")).toBeDefined();
  });

  it("hides completed-at fields when completion is incomplete", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-completion"), {
      target: { value: "incomplete" },
    });

    expect(screen.queryByText("Completed at")).toBeNull();
  });

  it("shows inline error when created from > created to", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    const fromInput = screen.getAllByLabelText("From")[0];
    const toInput = screen.getAllByLabelText("To")[0];

    fireEvent.change(fromInput, { target: { value: "2026-01-10" } });
    fireEvent.change(toInput, { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    expect(
      screen.getByText("Created From must be on or before Created To."),
    ).toBeDefined();
    expect(mockOnExport).not.toHaveBeenCalled();
    expect(mockTrackFeatureUsage).not.toHaveBeenCalled();
  });

  it("shows inline error when completed from > completed to", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    const completedFrom = screen.getAllByLabelText("From")[2];
    const completedTo = screen.getAllByLabelText("To")[2];

    fireEvent.change(completedFrom, { target: { value: "2026-01-10" } });
    fireEvent.change(completedTo, { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    expect(
      screen.getByText("Completed From must be on or before Completed To."),
    ).toBeDefined();
    expect(mockOnExport).not.toHaveBeenCalled();
    expect(mockTrackFeatureUsage).not.toHaveBeenCalled();
  });

  it("passes filters to onExport on submit", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    const fromInput = screen.getAllByLabelText("From")[0];
    fireEvent.change(fromInput, { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith({
        formatKey: "csv",
        exportName: "CSV",
        exportFormatId: "csv-1",
        fallbackExtension: "csv",
        filters: {
          includeTestSubmissions: false,
          completionStatus: "completed",
          createdAtFrom: "2026-01-01",
          createdAtTo: undefined,
          startedAtFrom: undefined,
          startedAtTo: undefined,
          completedAtFrom: undefined,
          completedAtTo: undefined,
        },
      });
    });

    expect(mockTrackFeatureUsage).toHaveBeenCalledWith(
      "export",
      "submissions_export",
      {
        format_key: "csv",
        export_format_id: "csv-1",
        export_target: "Submissions",
        export_name: "CSV",
      },
    );
  });

  it("keeps the dialog open on success until Done is clicked", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /done/i })).toBeDefined();
    });
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not track analytics when onExport returns failure", async () => {
    mockOnExport.mockResolvedValue({
      succeeded: false,
      message: "Export format is not supported.",
    });
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(screen.getByText("Export format is not supported.")).toBeDefined();
    });
    expect(mockTrackFeatureUsage).not.toHaveBeenCalled();
  });

  it("shows prepare recovery when export fails with a backfill message", async () => {
    mockOnExport.mockResolvedValue({
      succeeded: false,
      message:
        "No processed flattened submissions found. Run admin backfill to populate the reporting read model before exporting.",
    });
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /prepare for export/i }),
      ).toBeDefined();
    });
    expect(
      screen.getByText(/flattened submissions|backfill|read model/i),
    ).toBeDefined();
  });

  it("shows empty completed error without prepare recovery", async () => {
    mockOnExport.mockResolvedValue({
      succeeded: false,
      message:
        "No completed submissions are available to export for this form. Incomplete drafts are not included in the reporting export.",
    });
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/No completed submissions are available to export/i),
      ).toBeDefined();
    });
    expect(
      screen.queryByRole("button", { name: /prepare for export/i }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: /^export$/i })).toBeDefined();
  });

  it("shows incomplete filter helper note", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-completion"), {
      target: { value: "incomplete" },
    });

    expect(
      screen.getByText(/Incomplete drafts are not in the read model yet/i),
    ).toBeDefined();
  });

  it("shows prepare CTA when schema is missing on open", async () => {
    mockListFormReportingLocalesAction.mockResolvedValue(
      Result.error(
        "Form schema has not been compiled for this form. Compile the schema first.",
      ),
    );
    render(<ExportSubmissionsDialog {...createProps()} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /prepare for export/i }),
      ).toBeDefined();
    });
    expect(screen.getByText(/Prepare required/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /^export$/i })).toBeNull();
    expect(screen.queryByText("Export format")).toBeNull();
    expect(screen.queryByText("Completion")).toBeNull();
    expect(screen.queryByText("Include test submissions")).toBeNull();
    expect(
      screen.getByText(/one-time prepare step before you can export/i),
    ).toBeDefined();
  });

  it("surfaces unexpected readiness failures without export controls", async () => {
    mockListFormReportingLocalesAction.mockResolvedValue(
      Result.error("Reporting service unavailable"),
    );
    render(<ExportSubmissionsDialog {...createProps()} />);

    await waitFor(() => {
      expect(screen.getByText("Reporting service unavailable")).toBeDefined();
    });
    expect(screen.queryByRole("button", { name: /^export$/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /prepare for export/i }),
    ).toBeNull();
    expect(screen.queryByText("Export format")).toBeNull();
    expect(screen.queryByText("Completion")).toBeNull();
    expect(screen.queryByText("Include test submissions")).toBeNull();
  });

  it("runs prepare then returns to ready with success feedback", async () => {
    mockListFormReportingLocalesAction
      .mockResolvedValueOnce(
        Result.error("Form schema has not been compiled for this form."),
      )
      .mockResolvedValueOnce(Result.success(["default", "es"]));

    render(<ExportSubmissionsDialog {...createProps()} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /prepare for export/i }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /prepare for export/i }),
    );

    await waitFor(() => {
      expect(mockPrepareReportingExportAction).toHaveBeenCalledWith("100");
    });
    await waitForReady();
    expect(screen.getByText("Ready to export")).toBeDefined();
    expect(screen.getByText(/Schema compiled/)).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /prepare for export/i }),
    ).toBeNull();
  });

  it("does not show prepare in ready when schema is already compiled", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    expect(
      screen.queryByRole("button", { name: /prepare for export/i }),
    ).toBeNull();
    expect(screen.queryByText(/Prepare for export/i)).toBeNull();
  });

  it("blocks outside interact and escape while exporting", async () => {
    let resolveExport: (value: { succeeded: boolean }) => void = () =>
      undefined;
    mockOnExport.mockImplementation(
      () =>
        new Promise<{ succeeded: boolean }>((resolve) => {
          resolveExport = resolve;
        }),
    );

    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /exporting/i })).toBeDefined();
    });

    expect(latestDialogContentProps?.showCloseButton).toBe(false);

    const interactEvent = { preventDefault: vi.fn() };
    latestDialogContentProps?.onInteractOutside?.(interactEvent);
    expect(interactEvent.preventDefault).toHaveBeenCalled();

    const escapeEvent = { preventDefault: vi.fn() };
    latestDialogContentProps?.onEscapeKeyDown?.(escapeEvent);
    expect(escapeEvent.preventDefault).toHaveBeenCalled();

    resolveExport({ succeeded: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /done/i })).toBeDefined();
    });
  });

  it("allows dismiss while ready", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    expect(latestDialogContentProps?.showCloseButton).toBe(true);

    const interactEvent = { preventDefault: vi.fn() };
    latestDialogContentProps?.onInteractOutside?.(interactEvent);
    expect(interactEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("does not track analytics when onExport rejects", async () => {
    mockOnExport.mockRejectedValue(new Error("export failed"));
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalled();
    });
    expect(mockTrackFeatureUsage).not.toHaveBeenCalled();
  });

  it("hides row filters and shows codebook note when codebook is selected", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-format"), {
      target: { value: "cb-native" },
    });

    expect(
      screen.getByText(
        "Codebook exports do not use submission row filters (test or dates).",
      ),
    ).toBeDefined();
    expect(screen.queryByText("Include test submissions")).toBeNull();
  });

  it("hides locale field for submission formats", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    expect(screen.queryByText("Locale")).toBeNull();
  });

  it("hides locale field for native codebook", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-format"), {
      target: { value: "cb-native" },
    });

    expect(screen.queryByText("Locale")).toBeNull();
  });

  it("exports native codebook without locale", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-format"), {
      target: { value: "cb-native" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith(
        expect.objectContaining({
          formatKey: "codebook",
          filters: {},
        }),
      );
    });
  });

  it("defaults Shoji codebook locale to default and sends it on export", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-format"), {
      target: { value: "cb-shoji" },
    });

    await waitFor(() => {
      const localeSelect = screen.getByTestId(
        "export-submissions-locale",
      ) as HTMLSelectElement;
      expect(localeSelect.value).toBe("default");
      expect(
        Array.from(localeSelect.options).map((option) => option.text),
      ).toEqual(["default", "es", "fr"]);
    });

    fireEvent.change(screen.getByTestId("export-submissions-locale"), {
      target: { value: "es" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith(
        expect.objectContaining({
          formatKey: "codebook-shoji",
          filters: { locale: "es" },
        }),
      );
    });
  });

  it("hides locale field for Shoji codebook when allowedFilters omits locale", async () => {
    render(
      <ExportSubmissionsDialog
        {...createProps({
          groups: [
            {
              target: "Codebook" as ExportTarget,
              label: "Codebook",
              options: [
                {
                  exportFormatId: "cb-shoji",
                  formatKey: "codebook-shoji",
                  label: "Shoji (Crunch.io)",
                  fallbackExtension: "json",
                  exportTarget: "Codebook" as ExportTarget,
                  profile: "Shoji",
                  allowedFilters: [],
                },
              ],
            },
          ],
        })}
      />,
    );
    await waitForReady();

    expect(screen.queryByText("Locale")).toBeNull();
  });

  it("shows locale field for Shoji codebook", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-format"), {
      target: { value: "cb-shoji" },
    });

    expect(screen.getByText("Locale")).toBeDefined();
    await waitFor(() => {
      expect(mockListFormReportingLocalesAction).toHaveBeenCalledWith("100");
    });
  });

  it("prefills filters from listFilters", async () => {
    render(
      <ExportSubmissionsDialog
        {...createProps({
          listFilters: {
            includeTestSubmissions: true,
            completionStatus: "all",
            createdAtFrom: "2026-03-01",
            createdAtTo: "2026-03-15",
            startedAtFrom: "2026-03-05",
            startedAtTo: "2026-03-10",
          },
        })}
      />,
    );
    await waitForReady();

    expect(
      (screen.getAllByLabelText("From")[0] as HTMLInputElement).value,
    ).toBe("2026-03-01");
    expect(
      (screen.getAllByLabelText("From")[1] as HTMLInputElement).value,
    ).toBe("2026-03-05");
    expect((screen.getAllByLabelText("To")[1] as HTMLInputElement).value).toBe(
      "2026-03-10",
    );
    expect(
      (screen.getByLabelText("Include test submissions") as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (screen.getByTestId("export-submissions-completion") as HTMLSelectElement)
        .value,
    ).toBe("all");
  });

  it("re-prefills grid filters including startedAt after close and reopen", async () => {
    const listFilters = {
      createdAtFrom: "2026-04-01",
      createdAtTo: "2026-04-02",
      startedAtFrom: "2026-04-03",
      startedAtTo: "2026-04-04",
      completedAtFrom: "2026-04-05",
      completedAtTo: "2026-04-06",
      completionStatus: "all" as const,
    };

    const { rerender } = render(
      <ExportSubmissionsDialog {...createProps({ open: true, listFilters })} />,
    );
    await waitForReady();

    expect(
      (screen.getAllByLabelText("From")[1] as HTMLInputElement).value,
    ).toBe("2026-04-03");

    fireEvent.change(screen.getAllByLabelText("From")[1], {
      target: { value: "2026-01-01" },
    });
    expect(
      (screen.getAllByLabelText("From")[1] as HTMLInputElement).value,
    ).toBe("2026-01-01");

    fireEvent.change(screen.getByTestId("export-submissions-format"), {
      target: { value: "cb-native" },
    });
    expect(screen.queryByText("Started at")).toBeNull();

    rerender(
      <ExportSubmissionsDialog
        {...createProps({
          open: false,
          listFilters: { ...listFilters },
        })}
      />,
    );
    rerender(
      <ExportSubmissionsDialog
        {...createProps({
          open: true,
          listFilters: { ...listFilters },
        })}
      />,
    );
    await waitForReady();

    expect(screen.getByText("Started at")).toBeDefined();
    expect(
      (screen.getByTestId("export-submissions-format") as HTMLSelectElement)
        .value,
    ).toBe("csv-1");
    expect(
      (screen.getAllByLabelText("From")[0] as HTMLInputElement).value,
    ).toBe("2026-04-01");
    expect(
      (screen.getAllByLabelText("From")[1] as HTMLInputElement).value,
    ).toBe("2026-04-03");
    expect((screen.getAllByLabelText("To")[1] as HTMLInputElement).value).toBe(
      "2026-04-04",
    );
  });

  it("prefills locale when Shoji codebook is selected", async () => {
    render(
      <ExportSubmissionsDialog
        {...createProps({
          listFilters: {
            locale: "fr",
          },
        })}
      />,
    );
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-format"), {
      target: { value: "cb-shoji" },
    });

    await waitFor(() => {
      expect(
        (screen.getByTestId("export-submissions-locale") as HTMLSelectElement)
          .value,
      ).toBe("fr");
    });
  });

  it("calls onOpenChange(false) when cancel is clicked", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables form elements while exporting", async () => {
    render(<ExportSubmissionsDialog {...createProps({ isExporting: true })} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /exporting/i })).toBeDefined();
    });

    expect(
      (screen.getByRole("button", { name: /exporting/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /cancel/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
