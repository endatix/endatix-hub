import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmissionDataPieChart } from "../submission-data-pie-chart";
import { FormsStorageBarChart } from "../form-storage-bar-chart";
import { StorageDashboard } from "../storage-dashboard";

vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({
    children,
    config,
  }: {
    children: React.ReactNode;
    config: object;
  }) => (
    <div data-testid="chart-container" data-config={JSON.stringify(config)}>
      {children}
    </div>
  ),
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
  ChartLegend: () => <div data-testid="chart-legend" />,
  ChartLegendContent: () => <div data-testid="chart-legend-content" />,
}));

describe("SubmissionDataPieChart", () => {
  it("renders pie chart with submission and version data", () => {
    render(
      <SubmissionDataPieChart submissionCount={1000} versionCount={500} />,
    );
    expect(screen.getByTestId("chart-container")).toBeDefined();
    expect(screen.getByTestId("pie-chart")).toBeDefined();
  });

  it("renders with zero values", () => {
    render(<SubmissionDataPieChart submissionCount={0} versionCount={0} />);
    expect(screen.getByTestId("chart-container")).toBeDefined();
  });

  it("renders with large values", () => {
    render(
      <SubmissionDataPieChart
        submissionCount={1000000}
        versionCount={5000000}
      />,
    );
    expect(screen.getByTestId("chart-container")).toBeDefined();
  });
});

describe("FormsStorageBarChart", () => {
  const mockFormStats = [
    {
      formId: 1,
      formName: "Form 1",
      submissionCount: 100,
      versionCount: 200,
      estimatedStorageBytes: 1024,
    },
    {
      formId: 2,
      formName: "Form 2",
      submissionCount: 50,
      versionCount: 100,
      estimatedStorageBytes: 512,
    },
  ];

  it("renders bar chart with form stats", () => {
    render(<FormsStorageBarChart formStats={mockFormStats} />);
    expect(screen.getByTestId("chart-container")).toBeDefined();
    expect(screen.getByTestId("bar-chart")).toBeDefined();
  });

  it("renders with empty form stats", () => {
    render(<FormsStorageBarChart formStats={[]} />);
    expect(screen.getByTestId("chart-container")).toBeDefined();
  });

  it("truncates long form names", () => {
    const longNameForm = {
      formId: 3,
      formName: "This is a very long form name that exceeds twenty characters",
      submissionCount: 10,
      versionCount: 20,
      estimatedStorageBytes: 256,
    };
    render(<FormsStorageBarChart formStats={[longNameForm]} />);
    expect(screen.getByTestId("chart-container")).toBeDefined();
  });

  it("handles more than 10 forms (only top 10 displayed)", () => {
    const manyForms = Array.from({ length: 15 }, (_, i) => ({
      formId: i + 1,
      formName: `Form ${i + 1}`,
      submissionCount: 10 * (i + 1),
      versionCount: 20 * (i + 1),
      estimatedStorageBytes: 256 * (i + 1),
    }));
    render(<FormsStorageBarChart formStats={manyForms} />);
    expect(screen.getByTestId("chart-container")).toBeDefined();
  });
});

describe("StorageDashboard", () => {
  const mockSuccessData = {
    success: true,
    data: {
      tenantStats: {
        estimatedStorageBytes: 1048576,
        submissionCount: 1000,
        versionCount: 500,
      },
      formStats: [
        {
          formId: 1,
          formName: "Test Form",
          submissionCount: 100,
          versionCount: 200,
          estimatedStorageBytes: 1024,
        },
      ],
      tableStats: [
        {
          tableName: "submissions",
          tableSizeBytes: 512000,
          indexSizeBytes: 128000,
          totalSizeBytes: 640000,
        },
      ],
    },
  };

  const mockErrorData = {
    success: false,
    error: { message: "Failed to load" },
  };

  it("renders error state when data fetch fails", async () => {
    const errorPromise = Promise.resolve(mockErrorData);
    await act(async () => {
      render(<StorageDashboard storageStatsPromise={errorPromise} />);
    });
    expect(screen.getByText("Error Loading Statistics")).toBeDefined();
  });

  it("renders overview cards with success data", async () => {
    const successPromise = Promise.resolve(mockSuccessData);
    await act(async () => {
      render(<StorageDashboard storageStatsPromise={successPromise} />);
    });
    await waitFor(() => {
      expect(screen.getByText("Total Storage (Est.)")).toBeDefined();
    });
  });

  it("renders forms tab with table data", async () => {
    const successPromise = Promise.resolve(mockSuccessData);
    await act(async () => {
      render(<StorageDashboard storageStatsPromise={successPromise} />);
    });
    await waitFor(() => {
      expect(screen.getByText("Forms Distribution")).toBeDefined();
    });
    const formLink = screen.getByRole("link", { name: /Test Form/i });
    expect(formLink.getAttribute("href")).toBe("/forms/1");
    expect(formLink.getAttribute("target")).toBe("_blank");
  });

  it("renders tables tab", async () => {
    const successPromise = Promise.resolve(mockSuccessData);
    await act(async () => {
      render(<StorageDashboard storageStatsPromise={successPromise} />);
    });
    await waitFor(() => {
      expect(screen.getByText("Tables Storage (DB)")).toBeDefined();
    });
  });
});
