"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { applyHubDashboardTheme } from "@/lib/themes/survey-theme";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { Dashboard } from "survey-analytics";
import { Model } from "survey-core";
import { MOCK_RESULTS, MOCK_SURVEY_JSON } from "../data/mock-dashboard-data";

export interface SurveyDashboardProps {
  surveyJson: object | null;
  results?: Record<string, unknown>[];
}

/** Matches `transition-[width] duration-200` on the sidebar. */
const SIDEBAR_WIDTH_MS = 200;

function isHubPalette(theme: string | undefined): theme is "light" | "dark" {
  return theme === "light" || theme === "dark";
}

export function SurveyDashboard({
  surveyJson,
  results = MOCK_RESULTS,
}: Readonly<SurveyDashboardProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<Dashboard | null>(null);
  const sidebarStateRef = useRef<"expanded" | "collapsed" | null>(null);
  const { resolvedTheme } = useTheme();
  const { state: sidebarState } = useSidebar();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const json = surveyJson ?? MOCK_SURVEY_JSON;
    const survey = new Model(json);
    const dashboard = new Dashboard({
      questions: survey.getAllQuestions(),
      data: results ?? [],
    });
    dashboardRef.current = dashboard;
    // Default isRoot=true. `render(container, false)` is nested-visualizer mode:
    // chrome is appended without `sa-visualizer-wrapper`, and `clear()` does not
    // remove it — React remount then stacks a second toolbar/content/footer.
    dashboard.render(container);

    return () => {
      dashboard.clear();
      dashboardRef.current = null;
    };
  }, [surveyJson, results]);

  useEffect(() => {
    const dashboard = dashboardRef.current;
    if (!dashboard || !isHubPalette(resolvedTheme)) {
      return;
    }

    const sidebarChanged =
      sidebarStateRef.current !== null &&
      sidebarStateRef.current !== sidebarState;
    sidebarStateRef.current = sidebarState;
    const delayMs = sidebarChanged ? SIDEBAR_WIDTH_MS : 0;

    const timer = window.setTimeout(() => {
      applyHubDashboardTheme(dashboard, resolvedTheme);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [resolvedTheme, sidebarState, surveyJson, results]);

  return <div ref={containerRef} className="min-h-[400px] w-full"></div>;
}
