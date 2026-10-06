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
const mockRefreshIncompleteSubmissionsAction = vi.fn();

type ExportTarget = "Submissions" | "Codebook";

type ExportPanelMockProps = {
  children: React.ReactNode;
  open: boolean;
  desktopType?: string;
  dismissible?: boolean;
  onOpenChange: (open: boolean) => void;
};

let latestPanelProps: ExportPanelMockProps | null = null;

vi.mock("../list-form-reporting-locales.action", () => ({
  listFormReportingLocalesAction: (...args: unknown[]) =>
    mockListFormReportingLocalesAction(...args),
}));

vi.mock("../refresh-incomplete-submissions.action", () => ({
  refreshIncompleteSubmissionsAction: (...args: unknown[]) =>
    mockRefreshIncompleteSubmissionsAction(...args),
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

vi.mock("@/components/ui/responsive-panel", () => ({
  ResponsivePanel: (props: ExportPanelMockProps) => {
    latestPanelProps = props;
    return props.open ? (
      <div data-testid="export-panel" data-desktop-type={props.desktopType}>
        {props.children}
      </div>
    ) : null;
  },
  ResponsivePanelHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResponsivePanelTitle: ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  ),
  ResponsivePanelDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  ResponsivePanelBody: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResponsivePanelFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="export-panel-footer">{children}</div>
  ),
}));

vi.mock("@/components/ui/select", async (importOriginal) => {
  const React = await import("react");

  type SelectWalkProps = {
    id?: string;
    "aria-describedby"?: string;
    value?: unknown;
    textValue?: string;
    children?: React.ReactNode;
  };

  function textOf(node: React.ReactNode): string {
    if (typeof node === "string" || typeof node === "number") {
      return String(node);
    }

    if (Array.isArray(node)) {
      return node.map(textOf).join("");
    }

    if (
      React.isValidElement<SelectWalkProps>(node) &&
      node.props.children != null
    ) {
      return textOf(node.props.children);
    }

    return "";
  }

  function walkOptions(
    node: React.ReactNode,
  ): Array<{ value: string; label: string }> {
    const opts: Array<{ value: string; label: string }> = [];
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement<SelectWalkProps>(child)) {
        return;
      }

      if (typeof child.props.value === "string") {
        const label = (
          child.props.textValue ?? textOf(child.props.children)
        ).trim();
        if (label) {
          opts.push({
            value: child.props.value,
            label,
          });
        }
      }
      if (child.props.children) {
        opts.push(...walkOptions(child.props.children));
      }
    });
    return opts;
  }

  function findTriggerProps(
    node: React.ReactNode,
  ): { id: string; describedBy?: string } | undefined {
    let found: { id: string; describedBy?: string } | undefined;
    React.Children.forEach(node, (child) => {
      if (found || !React.isValidElement<SelectWalkProps>(child)) {
        return;
      }

      if (typeof child.props.id === "string") {
        found = {
          id: child.props.id,
          describedBy: child.props["aria-describedby"],
        };
        return;
      }

      if (child.props.children) {
        found = findTriggerProps(child.props.children);
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
      const trigger = findTriggerProps(children);
      const triggerId = trigger?.id ?? "select";
      return (
        <select
          id={triggerId}
          aria-describedby={trigger?.describedBy}
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
              "collectionStatus",
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
              "collectionStatus",
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
    latestPanelProps = null;
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
    mockRefreshIncompleteSubmissionsAction.mockResolvedValue(
      Result.success({ kind: "refreshed", failed: 0, finished: true }),
    );
  });

  it("renders the dialog title and description when open", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    expect(screen.getByText("Export submissions")).toBeDefined();
    await waitForReady();
    expect(screen.getByText(/Choose a file format/)).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<ExportSubmissionsDialog {...createProps({ open: false })} />);
    expect(screen.queryByText("Export submissions")).toBeNull();
  });

  it("shows row filters by default for submission formats", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();
    expect(screen.getByText("Include test submissions")).toBeDefined();
    expect(screen.getByRole("button", { name: /status/i })).toBeDefined();
    expect(screen.getByText("Created at")).toBeDefined();
    expect(screen.getByText("Started at")).toBeDefined();
    expect(screen.getByText("Completed at")).toBeDefined();
  });

  it("hides completed-at fields when only incomplete statuses are selected", async () => {
    render(
      <ExportSubmissionsDialog
        {...createProps({ listFilters: { collectionStatus: ["in_progress"] } })}
      />,
    );
    await waitForReady();

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

    const completedFrom = screen.getAllByLabelText("From")[3];
    const completedTo = screen.getAllByLabelText("To")[3];

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
          createdFrom: "2026-01-01",
          createdTo: undefined,
          modifiedFrom: undefined,
          modifiedTo: undefined,
          startedFrom: undefined,
          startedTo: undefined,
          completedFrom: undefined,
          completedTo: undefined,
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
    expect(screen.getByText(/Prepare required|Export failed/i)).toBeDefined();
    expect(screen.queryByLabelText(/Full recompile/i)).toBeNull();
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

  it("says incomplete submissions are updated first unless only Complete is selected", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    expect(
      screen.getByText(/Incomplete submissions are updated first/i),
    ).toBeDefined();
    expect(latestPanelProps?.desktopType).toBe("complex");
  });

  it("refreshes incomplete submissions before download", async () => {
    let resolveRefresh: (value: unknown) => void = () => undefined;
    mockRefreshIncompleteSubmissionsAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /updating submissions/i }),
      ).toBeDefined();
    });
    expect(
      screen.getByText(/Updating incomplete submissions, then generating/i),
    ).toBeDefined();
    expect(latestPanelProps?.dismissible).toBe(false);
    expect(mockOnExport).not.toHaveBeenCalled();

    resolveRefresh(
      Result.success({ kind: "refreshed", failed: 0, finished: true }),
    );

    await waitFor(() => {
      expect(screen.getByText("CSV file downloaded")).toBeDefined();
    });
    expect(mockRefreshIncompleteSubmissionsAction).toHaveBeenCalledWith("100");
    expect(mockOnExport).toHaveBeenCalled();
    // The refresh is backfill only; it never recompiles the schema.
    expect(mockPrepareReportingExportAction).not.toHaveBeenCalled();
  });

  it("does not refresh incomplete submissions when only Complete is selected", async () => {
    render(
      <ExportSubmissionsDialog
        {...createProps({ listFilters: { collectionStatus: ["complete"] } })}
      />,
    );
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalled();
    });
    expect(mockRefreshIncompleteSubmissionsAction).not.toHaveBeenCalled();
  });

  it("does not download when the refresh fails", async () => {
    mockRefreshIncompleteSubmissionsAction.mockResolvedValue(
      Result.error("Failed to backfill submissions."),
    );
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to backfill submissions.")).toBeDefined();
    });
    expect(mockOnExport).not.toHaveBeenCalled();
  });

  it("still exports when the user cannot update submissions, and says so", async () => {
    mockRefreshIncompleteSubmissionsAction.mockResolvedValue(
      Result.success({ kind: "skipped" }),
    );
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalled();
    });
    expect(
      await screen.findByText(/needs permission to edit this form/i),
    ).toBeDefined();
  });

  it("warns after download when some incomplete submissions failed to update", async () => {
    mockRefreshIncompleteSubmissionsAction.mockResolvedValue(
      Result.success({ kind: "refreshed", failed: 2, finished: true }),
    );
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    expect(
      await screen.findByText(/2 incomplete submissions could not be updated/i),
    ).toBeDefined();
    expect(mockOnExport).toHaveBeenCalled();
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
      expect(mockPrepareReportingExportAction).toHaveBeenCalledWith("100", {
        fullRecompile: false,
      });
    });
    await waitForReady();
    expect(screen.getByText("Ready to export")).toBeDefined();
    expect(screen.getByText(/You can export now/)).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /prepare for export/i }),
    ).toBeNull();
  });

  it("warns when prepare finishes with failed submissions", async () => {
    mockListFormReportingLocalesAction
      .mockResolvedValueOnce(
        Result.error("Form schema has not been compiled for this form."),
      )
      .mockResolvedValueOnce(Result.success(["default"]));
    mockPrepareReportingExportAction.mockResolvedValue(
      Result.success({
        formDefinitionId: "1",
        processed: 4,
        skipped: 0,
        failed: 2,
        batches: 1,
      }),
    );

    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /prepare for export/i }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /prepare for export/i }),
    );

    await waitForReady();
    expect(screen.getByText("Ready, with failed submissions")).toBeDefined();
    expect(screen.getByText(/missing from the export/i)).toBeDefined();
  });

  it("does not show prepare CTA in ready when schema is already compiled", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    expect(
      screen.queryByRole("button", { name: /prepare for export/i }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /rebuild reporting data/i }),
    ).toBeDefined();
  });

  it("enters rebuild mode from ready and returns without preparing", async () => {
    mockListFormReportingLocalesAction
      .mockResolvedValueOnce(
        Result.error("Form schema has not been compiled for this form."),
      )
      .mockResolvedValue(Result.success(["default", "es"]));

    render(<ExportSubmissionsDialog {...createProps()} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /prepare for export/i }),
      ).toBeDefined();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /prepare for export/i }),
    );
    await waitForReady();
    expect(screen.getByText("Ready to export")).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: /rebuild reporting data/i }),
    );

    expect(screen.getByText("Rebuild reporting data")).toBeDefined();
    expect(screen.queryByText("Prepare required")).toBeNull();
    expect(
      screen.getByRole("button", { name: /prepare for export/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /back to export/i }),
    ).toBeDefined();
    expect(screen.getByLabelText(/Full recompile/i)).toBeDefined();
    expect(screen.queryByText("Export format")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /back to export/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^export$/i })).toBeDefined();
    });
    expect(screen.getByText("Ready to export")).toBeDefined();
    // Initial prepare only — rebuild enter/exit must not call prepare again.
    expect(mockPrepareReportingExportAction).toHaveBeenCalledTimes(1);
  });

  it("runs full recompile when rebuild checkbox is checked", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(
      screen.getByRole("button", { name: /rebuild reporting data/i }),
    );
    fireEvent.click(screen.getByLabelText(/Full recompile/i));
    fireEvent.click(
      screen.getByRole("button", { name: /prepare for export/i }),
    );

    await waitFor(() => {
      expect(mockPrepareReportingExportAction).toHaveBeenCalledWith("100", {
        fullRecompile: true,
      });
    });
    await waitForReady();
  });

  it("keeps rebuild recovery after prepare failure", async () => {
    mockPrepareReportingExportAction.mockResolvedValue(
      Result.error("Reporting service unavailable"),
    );
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.click(
      screen.getByRole("button", { name: /rebuild reporting data/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /prepare for export/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Reporting service unavailable")).toBeDefined();
    });
    expect(screen.getByText("Export failed")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /prepare for export/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /back to export/i }),
    ).toBeDefined();
    expect(screen.getByLabelText(/Full recompile/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /back to export/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^export$/i })).toBeDefined();
    });
  });

  it("hides full recompile option when schema is missing on open", async () => {
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
    expect(screen.queryByLabelText(/Full recompile/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /rebuild reporting data/i }),
    ).toBeNull();
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

    latestPanelProps?.onOpenChange(false);
    expect(mockOnOpenChange).not.toHaveBeenCalled();

    resolveExport({ succeeded: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /done/i })).toBeDefined();
    });
  });

  it("allows dismiss while ready", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    latestPanelProps?.onOpenChange(false);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
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

    expect(screen.getByText(/submission filters don't apply/i)).toBeDefined();
    expect(screen.queryByText("Include test submissions")).toBeNull();
  });

  it("hides locale field for submission formats", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    expect(screen.queryByText("Language")).toBeNull();
  });

  it("hides locale field for native codebook", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-format"), {
      target: { value: "cb-native" },
    });

    expect(screen.queryByText("Language")).toBeNull();
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
      ).toEqual(["English en", "Spanish es", "French fr"]);
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

    expect(screen.queryByText("Language")).toBeNull();
  });

  it("shows locale field for Shoji codebook", async () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    await waitForReady();

    fireEvent.change(screen.getByTestId("export-submissions-format"), {
      target: { value: "cb-shoji" },
    });

    expect(screen.getByText("Language")).toBeDefined();
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
            collectionStatus: ["in_progress"],
            createdFrom: "2026-03-01",
            createdTo: "2026-03-15",
            startedFrom: "2026-03-05",
            startedTo: "2026-03-10",
          },
        })}
      />,
    );
    await waitForReady();

    expect(
      (screen.getAllByLabelText("From")[0] as HTMLInputElement).value,
    ).toBe("2026-03-01");
    expect(
      (screen.getAllByLabelText("From")[2] as HTMLInputElement).value,
    ).toBe("2026-03-05");
    expect((screen.getAllByLabelText("To")[2] as HTMLInputElement).value).toBe(
      "2026-03-10",
    );
    expect(
      (screen.getByLabelText("Include test submissions") as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(screen.getByRole("button", { name: /status/i })).toBeDefined();
  });

  it("re-prefills grid filters including startedAt after close and reopen", async () => {
    const listFilters = {
      createdFrom: "2026-04-01",
      createdTo: "2026-04-02",
      startedFrom: "2026-04-03",
      startedTo: "2026-04-04",
      completedFrom: "2026-04-05",
      completedTo: "2026-04-06",
      collectionStatus: ["in_progress"],
    };

    const { rerender } = render(
      <ExportSubmissionsDialog {...createProps({ open: true, listFilters })} />,
    );
    await waitForReady();

    expect(
      (screen.getAllByLabelText("From")[2] as HTMLInputElement).value,
    ).toBe("2026-04-03");

    fireEvent.change(screen.getAllByLabelText("From")[2], {
      target: { value: "2026-01-01" },
    });
    expect(
      (screen.getAllByLabelText("From")[2] as HTMLInputElement).value,
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
      (screen.getAllByLabelText("From")[2] as HTMLInputElement).value,
    ).toBe("2026-04-03");
    expect((screen.getAllByLabelText("To")[2] as HTMLInputElement).value).toBe(
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
