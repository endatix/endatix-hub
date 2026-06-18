import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { FormStorageStats } from "@/lib/endatix-api/stats";
import { formatBytes } from "@/lib/utils/formatters";
import { parseNumber } from "@/lib/utils/type-parsers";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { YAxisTickContentProps } from "recharts";
import { FormOverviewLink } from "./form-overview-link";

type FormsStorageBarChartProps = {
  formStats: FormStorageStats[];
};

type TopFormChartDatum = {
  name: string;
  fullName: string;
  formId: string;
  value: number;
  fill: string;
};

type FormStorageBarChartYAxisTickProps = YAxisTickContentProps & {
  formsByDisplayName: Map<string, TopFormChartDatum>;
};

function toTickCoordinate(value: string | number | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function FormStorageBarChartYAxisTick({
  x,
  y,
  payload,
  formsByDisplayName,
}: Readonly<FormStorageBarChartYAxisTickProps>) {
  const tickX = toTickCoordinate(x);
  const tickY = toTickCoordinate(y);
  const displayName =
    typeof payload?.value === "string" ? payload.value : undefined;
  const form = displayName ? formsByDisplayName.get(displayName) : undefined;

  if (!form) {
    return (
      <text
        x={tickX}
        y={tickY}
        dy={4}
        textAnchor="end"
        fontSize={12}
        className="fill-muted-foreground"
      >
        {displayName}
      </text>
    );
  }

  return (
    <foreignObject
      x={Math.max(tickX - 196, 0)}
      y={tickY - 12}
      width={196}
      height={24}
    >
      <div className="flex h-6 items-center justify-end">
        <FormOverviewLink
          formId={form.formId}
          label={displayName ?? form.fullName}
          className="text-xs"
        />
      </div>
    </foreignObject>
  );
}

/**
 * Bar Chart Component for Form Storage Distribution
 */
export function FormsStorageBarChart({
  formStats,
}: Readonly<FormsStorageBarChartProps>) {
  const topForms = useMemo<TopFormChartDatum[]>(
    () =>
      formStats.slice(0, 10).map((form) => {
        const formName =
          form.formName.length > 20
            ? `${form.formName.substring(0, 20)}...`
            : form.formName;
        const formId = form.formId.toString();

        return {
          name: formName,
          fullName: form.formName,
          formId,
          value: parseNumber(form.estimatedStorageBytes),
          fill: `var(--color-${formId})`,
        };
      }),
    [formStats],
  );

  const formsByDisplayName = useMemo(
    () => new Map(topForms.map((form) => [form.name, form])),
    [topForms],
  );

  const barChartConfig = useMemo(() => {
    let count = 0;
    const config: ChartConfig = {};

    topForms.forEach((form) => {
      const colorCount = ((count % 5) + 1) as 1 | 2 | 3 | 4 | 5;
      config[form.formId] = {
        label: form.name.slice(0, 1).toUpperCase() + form.name.slice(1),
        color: `var(--color-chart-${colorCount})`,
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
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <YAxis
          dataKey="name"
          type="category"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={200}
          tick={(props) => (
            <FormStorageBarChartYAxisTick
              {...props}
              formsByDisplayName={formsByDisplayName}
            />
          )}
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
              formatter={(value) => [
                formatBytes(Number(value ?? 0)),
                " Storage",
              ]}
              labelFormatter={(_label, payload) => {
                const form = payload.at(0)?.payload as
                  | TopFormChartDatum
                  | undefined;
                return form?.fullName ?? "Form";
              }}
            />
          }
        />
        <Bar
          dataKey="value"
          name="name"
          radius={4}
          label={{
            position: "right",
            formatter: (label) => formatBytes(Number(label ?? 0), 0),
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}
