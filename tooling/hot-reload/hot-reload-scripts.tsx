import { QuestionHotReload } from "./question-hot-reload";

interface HotReloadScriptsProps {
  /**
   * Optional list of custom question names to hot reload
   * If not provided, uses the auto-generated customQuestions list
   */
  customQuestionNames?: string[];
}

/**
 * Server component wrapper that conditionally renders hot reload
 * Only includes the component in development builds
 *
 * This wrapper is designed to be general-purpose for future customizations
 * beyond just questions (e.g., themes, components, etc.)
 */
export function HotReloadScripts({
  customQuestionNames,
}: HotReloadScriptsProps) {
  // Only render in development - this check happens at build time
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <QuestionHotReload customQuestionNames={customQuestionNames} />;
}
