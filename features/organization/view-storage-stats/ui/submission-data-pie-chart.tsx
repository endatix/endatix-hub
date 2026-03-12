import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { parseNumber } from "@/lib/utils/type-parsers";
import { Pie, PieChart } from "recharts";

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

/**
 * Pie Chart Component for Data Composition (Submissions vs Versions)
 */
export function SubmissionDataPieChart({
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
