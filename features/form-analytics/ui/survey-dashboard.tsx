"use client";

import { useEffect, useRef, useState } from "react";
import { Model } from "survey-core";
import { VisualizationPanel } from "survey-analytics";
import "survey-analytics/survey.analytics.css";
import { MOCK_SURVEY_JSON, MOCK_RESULTS } from "../data/mock-dashboard-data";

export interface SurveyDashboardProps {
  surveyJson: object | null;
  results?: Record<string, unknown>[];
}

export function SurveyDashboard({
  surveyJson,
  results = MOCK_RESULTS,
}: SurveyDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<VisualizationPanel | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const json = surveyJson ?? MOCK_SURVEY_JSON;
    const survey = new Model(json);
    const vizPanel = new VisualizationPanel(
      survey.getAllQuestions(),
      results as Record<string, unknown>[],
    );
    panelRef.current = vizPanel;
    vizPanel.render(container);

    return () => {
      vizPanel.clear();
      panelRef.current = null;
    };
  }, [surveyJson, results]);

  return <div ref={containerRef} className="min-h-[400px] w-full"></div>;
}
