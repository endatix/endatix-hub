"use client";

import dynamic from "next/dynamic";
import type { SurveyDashboardProps } from "./survey-dashboard";
// Own these styles in the always-mounted parent of `next/dynamic`. CSS in the
// lazy child chunk hits Turbopack CSS HMR after unmount (vercel/next.js#74749,
// still reproduces on 16.3 canary — vercel-labs/next.js#13).
import "survey-analytics/survey.analytics.css";
import "./survey-dashboard.css";

const SurveyDashboard = dynamic(
  () => import("./survey-dashboard").then((m) => m.SurveyDashboard),
  {
    ssr: false,
  },
);

export type SurveyDashboardWrapperProps = SurveyDashboardProps;

export function SurveyDashboardWrapper(
  props: Readonly<SurveyDashboardWrapperProps>,
) {
  return <SurveyDashboard {...props} />;
}
