"use client";

import dynamic from "next/dynamic";
import type { SurveyDashboardProps } from "./survey-dashboard";

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
