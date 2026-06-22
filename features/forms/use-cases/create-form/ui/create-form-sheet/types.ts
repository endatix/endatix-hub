import type { LucideIcon } from "lucide-react";

export type CreateFormOption =
  | "from_scratch"
  | "from_existing"
  | "from_template"
  | "from_json"
  | "via_assistant";

export const NO_FOLDER_ID = "__none__";

export type CreateFormOptionConfig = {
  option: CreateFormOption;
  title: string;
  description: string;
  icon: LucideIcon;
  disabled?: boolean;
};
