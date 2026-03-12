"use client";

import { use, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatBytes, formatNumber } from "@/lib/utils";
import { parseNumber } from "@/lib/utils/type-parsers";
import {
  StorageDashboard as StorageDashboardData,
  FormStorageStats as FormStorageStatsDto,
} from "@/lib/endatix-api/stats/types";
import { ApiResult } from "@/lib/endatix-api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
} from "recharts";
import { Database, FileText, History, Layers, AlertCircle } from "lucide-react";

type StorageStatsPromise = Promise<ApiResult<StorageDashboardData>>;

type StorageDashboardProps = {
  storageStatsPromise: StorageStatsPromise;
};

/**
 * Bar Chart Component for Form Storage Distribution
 */
function FormsStorageBarChart({
  formStats,
}: {
  formStats: FormStorageStatsDto[];
}) {
  const topForms = formStats.slice(0, 10).map((f) => {
    const formName =
      f.formName.length > 20 ? f.formName.substring(0, 20) + "..." : f.formName;
    const formId = f.formId.toString();
    return {
      name: formName,
      fullName: f.formName,
      formId: formId,
      value: parseNumber(f.estimatedStorageBytes),
      fill: `var(--color-${formId})`,
    };
  });

  const barChartConfig = useMemo(() => {
    let count = 0;
    const config: ChartConfig = {};

    topForms.forEach((form) => {
      const colorCount = (count % 5) + 1;
      const color = `var(--color-chart-${colorCount})`;
      config[form.formId] = {
        label: form.name.slice(0, 1).toUpperCase() + form.name.slice(1),
        color: color
      };
      count++;
    });
    return config;
  }, [topForms]);

  return (
    <ChartContainer config={barChartConfig} className="h-[350px] w-full">
      <BarChart
        accessibilityLayer
        data={topForms}
        layout="vertical"
        margin={{
          left: 0,
          right: 24,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={true} />
        <YAxis
          dataKey="name"
          type="category"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={200}
        />
        <XAxis
          dataKey="value"
          type="number"
          hide
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatBytes(value, 0)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [formatBytes(value as number), " Storage"]}
              labelFormatter={(_, payload) =>
                payload.at(0)?.payload?.fullName || "Form"
              }
            />
          }
        />
        <Bar
          dataKey="value"
          name="name"
          layout="vertical"
          radius={4}
          activeIndex={0}
          label={{
            position: "right",
            formatter: (value: number) => formatBytes(value, 0),
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}

/**
 * Pie Chart Component for Data Composition (Submissions vs Versions)
 */
function DataCompositionPieChart({
  submissionCount,
  versionCount,
}: {
  submissionCount: number;
  versionCount: number;
}) {
  const storageDistribution = [
    {
      type: "submissions",
      value: parseNumber(submissionCount),
      fill: "var(--color-submissions)",
    },
    {
      type: "versions",
      value: parseNumber(versionCount),
      fill: "var(--color-versions)",
    },
  ];

  const chartConfig = {
    submissions: {
      label: "Submissions",
      color: "var(--color-chart-1)",
    },
    versions: {
      label: "Versions",
      color: "var(--color-chart-2)",
    },
    storage: {
      label: "Storage",
      color: "var(--color-chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[420px] min-h-[280px] w-full max-w-full p-2"
    >
      <PieChart margin={{ top: 8, right: 56, bottom: 8, left: 56 }}>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideIndicator={false} />}
        />
        <Pie
          data={storageDistribution}
          dataKey="value"
          nameKey="type"
          innerRadius={60}
          strokeWidth={5}
          labelLine={false}
          label={({ payload, ...props }) => {
            return (
              <text
                cx={props.cx}
                cy={props.cy}
                x={props.x}
                y={props.y}
                textAnchor={props.textAnchor}
                dominantBaseline={props.dominantBaseline}
                fill="hsla(var(--foreground))"
              >
                {payload.value.toLocaleString()}
              </text>
            );
          }}
        />
        <ChartLegend
          content={<ChartLegendContent nameKey="type" />}
          className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}

export function StorageDashboard({
  storageStatsPromise,
}: StorageDashboardProps) {
  const result = use(storageStatsPromise);

  if (!result.success) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-10">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Error Loading Statistics</h3>
            <p className="text-sm text-muted-foreground">
              {result.error?.message || "Failed to load storage statistics"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { tenantStats, formStats, tableStats } = result.data;

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Storage (Est.)
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(parseNumber(tenantStats.estimatedStorageBytes))}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated across all forms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formStats.length}</div>
            <p className="text-xs text-muted-foreground">Total forms defined</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Submissions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(parseNumber(tenantStats.submissionCount))}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {formStats.length} forms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Submission Versions
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(parseNumber(tenantStats.versionCount))}
            </div>
            <p className="text-xs text-muted-foreground">
              Historical data entries
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="forms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forms">Forms Distribution</TabsTrigger>
          <TabsTrigger value="tables">Tables Storage (DB)</TabsTrigger>
        </TabsList>
        <TabsContent value="forms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Top 10 Forms by Storage</CardTitle>
                <CardDescription>
                  Estimated storage consumption per form.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <FormsStorageBarChart formStats={formStats} />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Data Composition</CardTitle>
                <CardDescription>
                  Submissions vs Versions count.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataCompositionPieChart
                  submissionCount={tenantStats.submissionCount}
                  versionCount={tenantStats.versionCount}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Form Breakdown</CardTitle>
              <CardDescription>
                Detailed storage metrics for all active forms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Name</TableHead>
                    <TableHead className="text-right">Submissions</TableHead>
                    <TableHead className="text-right">Submission Versions</TableHead>
                    <TableHead className="text-right">
                      Estimated Storage
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formStats.map((form) => (
                    <TableRow key={form.formId}>
                      <TableCell className="font-medium">
                        {form.formName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(parseNumber(form.submissionCount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(parseNumber(form.versionCount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatBytes(parseNumber(form.estimatedStorageBytes))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle>Tables Storage</CardTitle>
              <CardDescription>
                Actual database storage size for forms & submission tables
                (including all tenants).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table Name</TableHead>
                    <TableHead className="text-right">Data Size</TableHead>
                    <TableHead className="text-right">Index Size</TableHead>
                    <TableHead className="text-right">Total Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableStats.map((table) => (
                    <TableRow key={table.tableName}>
                      <TableCell className="font-medium">
                        {table.tableName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatBytes(parseNumber(table.tableSizeBytes))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatBytes(parseNumber(table.indexSizeBytes))}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatBytes(parseNumber(table.totalSizeBytes))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
