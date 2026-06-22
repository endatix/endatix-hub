"use client";

import { BicepsFlexed, Code, Copy, Folder as FolderIcon } from "lucide-react";
import { CreateFormOptionCard } from "./create-form-option-card";
import type { CreateFormOption, CreateFormOptionConfig } from "./types";

const CREATE_FORM_OPTIONS: CreateFormOptionConfig[] = [
  {
    option: "from_scratch",
    title: "Start from Scratch",
    description: "Use the WYSIWYG Survey Creator to build your form.",
    icon: BicepsFlexed,
  },
  {
    option: "from_existing",
    title: "Copy an Existing Form",
    description: "You have your JSON code ready? Paste it here.",
    icon: Copy,
    disabled: true,
  },
  {
    option: "from_template",
    title: "Create from a Template",
    description: "Choose from a variety of templates to get started.",
    icon: FolderIcon,
  },
  {
    option: "from_json",
    title: "Import a Form",
    description: "You have your JSON code ready? Paste it here.",
    icon: Code,
    disabled: true,
  },
];

interface CreateFormOptionsGridProps {
  selectedOption: CreateFormOption | undefined;
  onSelectOption: (option: CreateFormOption) => void;
  isPending: boolean;
}

export function CreateFormOptionsGrid({
  selectedOption,
  onSelectOption,
  isPending,
}: Readonly<CreateFormOptionsGridProps>) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {CREATE_FORM_OPTIONS.map((config) => (
        <CreateFormOptionCard
          key={config.option}
          title={config.title}
          description={config.description}
          icon={config.icon}
          isSelected={selectedOption === config.option}
          disabled={
            config.disabled ??
            (config.option === "from_scratch" ? isPending : false)
          }
          onClick={() => onSelectOption(config.option)}
        />
      ))}
    </div>
  );
}
