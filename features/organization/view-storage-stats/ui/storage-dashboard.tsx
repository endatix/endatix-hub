"use client";

import { use } from "react";
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
import { formatBytes, formatNumber } from "@/lib/utils/formatters";
import { parseNumber } from "@/lib/utils/type-parsers";
import { Database, FileText, History, Layers, AlertCircle } from "lucide-react";
import { SubmissionDataPieChart } from "./submission-data-pie-chart";
import { StorageStatsPromise } from "../types";
import { FormsStorageBarChart } from "./form-storage-bar-chart";

type StorageDashboardProps = {
  storageStatsPromise: StorageStatsPromise;
};

export function StorageDashboard({
  storageStatsPromise,
}: Readonly<StorageDashboardProps>) {
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
                <SubmissionDataPieChart
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
                    <TableHead className="text-right">
                      Submission Versions
                    </TableHead>
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
