import { CheckSquare, Eye, Sparkles } from "lucide-react";

/** The Review facet's options, shared by the submissions grid and the legacy list. */
export const REVIEW_STATUS_OPTIONS = [
  { label: "New", value: "new", icon: Sparkles },
  { label: "Read", value: "read", icon: Eye },
  { label: "Approved", value: "approved", icon: CheckSquare },
];

/** The Submission Type facet's options (`isTestSubmission`). */
export const SUBMISSION_TYPE_OPTIONS = [
  { label: "Production", value: "false" },
  { label: "Test", value: "true" },
];
