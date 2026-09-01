"use client";

import { useEffect, useRef } from "react";
import { Model, slk } from "survey-core";
import { VisualizationPanel } from "survey-analytics";
import "survey-analytics/survey.analytics.css";
import { useSurveyLicenseKey } from "@/features/config/survey-license-provider";
import { MOCK_SURVEY_JSON, MOCK_RESULTS } from "../data/mock-dashboard-data";

export interface SurveyDashboardProps {
  surveyJson: object | null;
  results?: Record<string, unknown>[];
}

export function SurveyDashboard({
  surveyJson,
  results = MOCK_RESULTS,
}: Readonly<SurveyDashboardProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<VisualizationPanel | null>(null);
  const surveyLicenseKey = useSurveyLicenseKey();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (surveyLicenseKey) {
      slk(surveyLicenseKey);
    }

    const json = surveyJson ?? MOCK_SURVEY_JSON;
    const survey = new Model(json);
    const vizPanel = new VisualizationPanel(
      survey.getAllQuestions(),
      results ?? [],
    );
    panelRef.current = vizPanel;
    vizPanel.render(container);

    return () => {
      vizPanel.clear();
      panelRef.current = null;
    };
  }, [surveyJson, results, surveyLicenseKey]);

  return <div ref={containerRef} className="min-h-[400px] w-full"></div>;
}
