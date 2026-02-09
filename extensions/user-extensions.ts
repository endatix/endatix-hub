/**
 * User Extensions Registry
 *
 * This file is owned by YOU (the developer).
 * Update this file to add your own extensions.
 */

import type { ExtensionDefinition } from "@/lib/survey-extensions/types";

export const userExtensions: ExtensionDefinition[] = [
  {
    id: "hello-world",
    type: "question",
    shouldLoad: (_, analyzer) => true || analyzer.usesQuestionType("hello-world"),
    load: () =>
      import("@/extensions/questions/hello-world").then(
        (module) => module.default,
      ),
  },
  {
    id: "country",
    type: "question",
    shouldLoad: (_, analyzer) => true || analyzer.usesQuestionType("country"),
    load: () =>
      import("@/extensions/questions/country").then((module) => module.default),
  },
];
