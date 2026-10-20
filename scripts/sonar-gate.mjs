#!/usr/bin/env node
// Waits for the SonarCloud analysis the scanner just submitted and applies the
// quality-gate policy in lib/sonar-gate.mjs: duplication warns, every other red
// condition fails the job. Run after the scan step in build-ci.yml.
//
// Env: SONAR_TOKEN (required), SONAR_REPORT_TASK (default .scannerwork/report-task.txt),
// SONAR_ADVISORY_METRICS (default new_duplicated_lines_density),
// SONAR_GATE_TIMEOUT_SECONDS (default 300), GITHUB_STEP_SUMMARY (optional).

import { appendFile, readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import {
  annotations,
  evaluateGate,
  parseAdvisoryMetrics,
  parseReportTask,
  summaryMarkdown,
} from "./lib/sonar-gate.mjs";

const POLL_INTERVAL_MS = 5_000;

async function getJson(serverUrl, path, token) {
  const response = await fetch(new URL(path, serverUrl), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(
      `GET ${path} returned ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

async function waitForAnalysis(serverUrl, taskId, token, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { task } = await getJson(
      serverUrl,
      `/api/ce/task?id=${encodeURIComponent(taskId)}`,
      token,
    );
    if (task.status === "SUCCESS") return task.analysisId;
    if (task.status !== "PENDING" && task.status !== "IN_PROGRESS") {
      throw new Error(
        `SonarCloud background task ${taskId} ended as ${task.status}`,
      );
    }
    if (Date.now() > deadline) {
      throw new Error(
        `SonarCloud background task ${taskId} still ${task.status} after ${timeoutMs / 1000}s`,
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

async function main() {
  const token = process.env.SONAR_TOKEN;
  if (!token) throw new Error("SONAR_TOKEN is not set");
  const reportPath =
    process.env.SONAR_REPORT_TASK ?? ".scannerwork/report-task.txt";
  const advisoryMetrics = parseAdvisoryMetrics(
    process.env.SONAR_ADVISORY_METRICS,
  );
  const timeoutMs =
    Number(process.env.SONAR_GATE_TIMEOUT_SECONDS ?? 300) * 1000;

  const report = parseReportTask(await readFile(reportPath, "utf8"));
  if (!report.serverUrl || !report.ceTaskId) {
    throw new Error(`${reportPath} has no serverUrl or ceTaskId`);
  }

  const analysisId = await waitForAnalysis(
    report.serverUrl,
    report.ceTaskId,
    token,
    timeoutMs,
  );
  const { projectStatus } = await getJson(
    report.serverUrl,
    `/api/qualitygates/project_status?analysisId=${encodeURIComponent(analysisId)}`,
    token,
  );
  const result = evaluateGate(projectStatus, advisoryMetrics);

  for (const line of annotations(result)) console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `${summaryMarkdown(result, advisoryMetrics, report.dashboardUrl)}\n`,
    );
  }
  console.log(
    `SonarCloud quality gate: ${result.passed ? "passed" : "failed"} (${projectStatus.status} on SonarCloud)`,
  );
  process.exitCode = result.passed ? 0 : 1;
}

main().catch((error) => {
  console.log(`::error title=SonarCloud quality gate::${error.message}`);
  process.exitCode = 1;
});
