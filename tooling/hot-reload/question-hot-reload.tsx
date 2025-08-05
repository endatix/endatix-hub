"use client";

import { useEffect } from "react";
import Script from "next/script";
import { customQuestions } from "@/customizations/questions/custom-questions";

interface QuestionHotReloadProps {
  /**
   * Optional list of custom question names to hot reload
   * TODO: This shall be used as primary loading mechanism for custom questions by detecting the specific question's loaded in the Survey model
   */
  customQuestionNames?: string[];
}

/**
 * Component that handles hot reload for custom questions
 * Only active in development mode
 */
export function QuestionHotReload({
  customQuestionNames,
}: QuestionHotReloadProps = {}) {
  // Use provided list or fall back to auto-generated list
  const questionsToReload = customQuestionNames || customQuestions;

  useEffect(() => {
    // Make custom questions available to the hot reload script
    (
      window as typeof window & { __CUSTOM_QUESTIONS__: string[] }
    ).__CUSTOM_QUESTIONS__ = questionsToReload;

    console.debug(
      "🔥 Hot reload setup: custom questions available",
      questionsToReload,
    );
  }, [questionsToReload]);

  return (
    <Script
      id="question-hot-reload"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            console.debug('🔥 Hot reload script loaded for question modules');
            
            // Import all question indexes for hot reload
            async function reloadAllQuestionIndexes() {
              try {
                console.debug('🔄 Hot reloading all question indexes...');
                
                // Get custom questions from window object (set by client component)
                const customQuestions = window.__CUSTOM_QUESTIONS__ || [];
                
                const importPromises = customQuestions.map(async (questionName) => {
                  try {
                    await import(\`/customizations/questions/\${questionName}/index\`);
                    console.debug(\`✅ Hot reloaded index: \${questionName}\`);
                  } catch (error) {
                    console.warn(\`Failed to hot reload question index: \${questionName}\`, error);
                  }
                });
                
                await Promise.all(importPromises);
                console.debug('✅ Hot reload completed for all question indexes');
              } catch (error) {
                console.warn('Failed to hot reload question indexes:', error);
              }
            }
            
            // Set up event listeners for hot reload
            window.addEventListener('beforeunload', reloadAllQuestionIndexes);
            window.addEventListener('focus', reloadAllQuestionIndexes);
            document.addEventListener('visibilitychange', () => {
              if (!document.hidden) {
                reloadAllQuestionIndexes();
              }
            });
            
            // Make function available globally for manual triggering
            window.__reloadAllQuestionIndexes = reloadAllQuestionIndexes;
          })();
        `,
      }}
    />
  );
}
