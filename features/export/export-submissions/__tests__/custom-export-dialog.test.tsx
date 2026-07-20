import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ExportSubmissionsDialog,
  type ExportSubmissionsDialogProps,
} from "../ui/custom-export-dialog";

const mockOnExport = vi.fn();
const mockOnOpenChange = vi.fn();
const mockTrackFeatureUsage = vi.fn();

type ExportTarget = "Submissions" | "Codebook";

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
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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
      return (
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          data-testid="format-select"
        >
          {items.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
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

function createProps(
  overrides?: Partial<ExportSubmissionsDialogProps>,
): ExportSubmissionsDialogProps {
  return {
    open: true,
    onOpenChange: mockOnOpenChange,
    groups: [
      {
        target: "Submissions" as ExportTarget,
        label: "Submissions",
        options: [
          {
            exportFormatId: "csv-1",
            wireKey: "csv",
            label: "CSV",
            fallbackExtension: "csv",
            exportTarget: "Submissions" as ExportTarget,
            allowedFilters: [
              "includeTestSubmissions",
              "createdAtRange",
              "completedAtRange",
              "locale",
            ],
          },
          {
            exportFormatId: "json-1",
            wireKey: "json",
            label: "JSON",
            fallbackExtension: "json",
            exportTarget: "Submissions" as ExportTarget,
            allowedFilters: [
              "includeTestSubmissions",
              "createdAtRange",
              "completedAtRange",
              "locale",
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
            wireKey: "codebook",
            label: "Native codebook",
            fallbackExtension: "json",
            exportTarget: "Codebook" as ExportTarget,
            allowedFilters: [],
          },
          {
            exportFormatId: "cb-shoji",
            wireKey: "codebook-shoji",
            label: "Shoji codebook",
            fallbackExtension: "json",
            exportTarget: "Codebook" as ExportTarget,
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

describe("ExportSubmissionsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dialog title and description when open", () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    expect(screen.getByText("Export submissions")).toBeDefined();
    expect(screen.getByText(/Choose a format/)).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<ExportSubmissionsDialog {...createProps({ open: false })} />);
    expect(screen.queryByText("Export submissions")).toBeNull();
  });

  it("shows row filters by default for submission formats", () => {
    render(<ExportSubmissionsDialog {...createProps()} />);
    expect(screen.getByText("Include test submissions")).toBeDefined();
    expect(screen.getByText("Created at")).toBeDefined();
    expect(screen.getByText("Completed at")).toBeDefined();
  });

  it("shows inline error when created from > created to", () => {
    render(<ExportSubmissionsDialog {...createProps()} />);

    const fromInput = screen.getAllByLabelText("From")[0];
    const toInput = screen.getAllByLabelText("To")[0];

    fireEvent.change(fromInput, { target: { value: "2026-01-10" } });
    fireEvent.change(toInput, { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(
      screen.getByText("Created From must be on or before Created To."),
    ).toBeDefined();
    expect(mockOnExport).not.toHaveBeenCalled();
    expect(mockTrackFeatureUsage).not.toHaveBeenCalled();
  });

  it("shows inline error when completed from > completed to", () => {
    render(<ExportSubmissionsDialog {...createProps()} />);

    const completedFrom = screen.getAllByLabelText("From")[1];
    const completedTo = screen.getAllByLabelText("To")[1];

    fireEvent.change(completedFrom, { target: { value: "2026-01-10" } });
    fireEvent.change(completedTo, { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(
      screen.getByText("Completed From must be on or before Completed To."),
    ).toBeDefined();
    expect(mockOnExport).not.toHaveBeenCalled();
    expect(mockTrackFeatureUsage).not.toHaveBeenCalled();
  });

  it("passes filters to onExport on submit", async () => {
    mockOnExport.mockResolvedValue(true);
    render(<ExportSubmissionsDialog {...createProps()} />);

    const fromInput = screen.getAllByLabelText("From")[0];
    fireEvent.change(fromInput, { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /export/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith({
        wireKey: "csv",
        exportName: "CSV",
        exportFormatId: "csv-1",
        fallbackExtension: "csv",
        filters: {
          includeTestSubmissions: false,
          createdAtFrom: "2026-01-01",
          createdAtTo: undefined,
          completedAtFrom: undefined,
          completedAtTo: undefined,
        },
      });
    });

    expect(mockTrackFeatureUsage).toHaveBeenCalledWith(
      "export",
      "submissions_export",
      {
        wire_key: "csv",
        export_format_id: "csv-1",
        export_target: "Submissions",
        export_name: "CSV",
      },
    );
  });

  it("does not track analytics when onExport returns false", async () => {
    mockOnExport.mockResolvedValue(false);
    render(<ExportSubmissionsDialog {...createProps()} />);

    fireEvent.click(screen.getByRole("button", { name: /export/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalled();
    });
    expect(mockTrackFeatureUsage).not.toHaveBeenCalled();
  });

  it("does not track analytics when onExport rejects", async () => {
    mockOnExport.mockRejectedValue(new Error("export failed"));
    render(<ExportSubmissionsDialog {...createProps()} />);

    fireEvent.click(screen.getByRole("button", { name: /export/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalled();
    });
    expect(mockTrackFeatureUsage).not.toHaveBeenCalled();
  });

  it("hides row filters and shows codebook note when codebook is selected", () => {
    render(<ExportSubmissionsDialog {...createProps()} />);

    fireEvent.change(screen.getByTestId("format-select"), {
      target: { value: "cb-native" },
    });

    expect(
      screen.getByText(
        "Codebook exports do not use submission row filters (test or dates).",
      ),
    ).toBeDefined();
    expect(
      screen.queryByText("Include test submissions"),
    ).toBeNull();
  });

  it("hides locale field for native codebook", () => {
    render(<ExportSubmissionsDialog {...createProps()} />);

    fireEvent.change(screen.getByTestId("format-select"), {
      target: { value: "cb-native" },
    });

    expect(screen.queryByText("Locale")).toBeNull();
  });

  it("shows locale field for Shoji codebook", () => {
    render(<ExportSubmissionsDialog {...createProps()} />);

    fireEvent.change(screen.getByTestId("format-select"), {
      target: { value: "cb-shoji" },
    });

    expect(screen.getByText("Locale")).toBeDefined();
  });

  it("prefills filters from listFilters", () => {
    render(
      <ExportSubmissionsDialog
        {...createProps({
          listFilters: {
            includeTestSubmissions: true,
            createdAtFrom: "2026-03-01",
            createdAtTo: "2026-03-15",
            locale: "fr",
          },
        })}
      />,
    );

    expect(
      (screen.getAllByLabelText("From")[0] as HTMLInputElement).value,
    ).toBe("2026-03-01");
    expect(
      (screen.getByLabelText("Include test submissions") as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it("calls onOpenChange(false) when cancel is clicked", () => {
    render(<ExportSubmissionsDialog {...createProps()} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables form elements while exporting", () => {
    render(<ExportSubmissionsDialog {...createProps({ isExporting: true })} />);

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
