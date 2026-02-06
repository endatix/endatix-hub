"use client";

import { ExtensionProvider } from "@/lib/survey-extensions";
import { cameraFixExtension } from "./camera-fix";

/**
 * Application Extensions Configuration
 *
 * This is your entry point for registering extensions to your Survey and Survey Creator.
 * *************************************
 * TO ADD A NEW EXTENSION:
 * 1. Create your extension in customizations/extensions/[name]/
 * 2. Import it below
 * 3. Add it to the activeExtensions array
 */

// Import all active extensions here
const activeExtensions = [
  cameraFixExtension,
  // Add more extensions here as they're created:
  // audioRecorderExtension,
  // myCustomQuestionExtension,
];

interface SurveyExtensionsProps {
  children: React.ReactNode;
}

/**
 * Integrates the extension system with the Survey and Survey Creator.
 */
export function SurveyExtensions({ children }: SurveyExtensionsProps) {
  return (
    <ExtensionProvider extensions={activeExtensions}>
      {children}
    </ExtensionProvider>
  );
}
