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

type FormsStorageBarChartProps = {
  formStats: FormStorageStats[];
};
/**
 * Bar Chart Component for Form Storage Distribution
 */
export function FormsStorageBarChart({
  formStats,
}: Readonly<FormsStorageBarChartProps>) {
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
