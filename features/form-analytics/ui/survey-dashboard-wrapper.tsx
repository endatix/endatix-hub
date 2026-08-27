"use client";

import dynamic from "next/dynamic";
import type { SurveyDashboardProps } from "./survey-dashboard";
// Keep analytics CSS on this always-mounted parent of `next/dynamic`.
// Importing it inside the lazy child hits Turbopack CSS HMR after unmount
// (vercel/next.js#74749) and loops `?_rsc=` refreshes.
//
// Do not relocate SurveyJS `data-survey-base-theme-variables` out of the
// dashboard root. `applyTheme` must rewrite that `<style>` in place on Hub
// light/dark toggle. Moving it to `document.head` left stale/`--sjs2-*`
// incomplete until a full remount. Sidebar width: delay then `applyTheme`
// again (not `refresh()` alone). Translations still paints tokens instead
// of `stringsSurvey.applyTheme` — different surface, same HMR class of bug.
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
