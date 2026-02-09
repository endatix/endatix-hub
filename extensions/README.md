# Endatix Extensions Architecture 🧩

> **Experimental Feature** 🚧
> This feature is currently experimental and enabled by default in development.
> To configure it, check the `experimental.extensions` flag in `endatix-config.ts`.

## Overview

The Endatix Extensions Architecture is designed for **Zero-Overhead** modularity. It allows developers to extend the SurveyJS form runner (and Creator) with custom questions, logic, and widgets without bloating the initial bundle.

**Key Goals:**

- **Performance (TTI)**: Extensions are lazy-loaded only when the form actually needs them.
- **Isolation**: Each extension is a self-contained module (code, types, logic).
- **Composability**: Extensions are managed via hooks, avoiding global pollution and complex Context wrappers.

## Directory Structure

All extensions live in `hub/extensions/`.

```
hub/extensions/
├── README.md             # This file
├── index.ts              # Public API export
├── types.ts              # Type definitions
├── user-extensions.ts    # Registry for YOUR custom extensions
├── camera-fix/           # Example: Built-in Camera Patch extension
│   ├── index.ts          # Extension entry point
│   └── camera-patch.ts   # Implementation logic
└── ...
```

## How It Works

1.  **Detection (Server-Side)**:
    When a form is requested, the server analyzes the JSON definition using `detectUsage` (or `shouldLoad`). It determines exactly which extensions are required.

2.  **Loading (Client-Side)**:
    The `useSurveyExtensions` hook receives the list of required IDs. It fetches the implementation chunks in parallel using dynamic `import()`.

3.  **Initialization**:
    Once loaded, the extension's `onInit` hook runs (for global registration like `Serializer.addClass`). Then, when the Survey Model is created, `onModelReady` runs for instance-specific logic.

## Creating a New Extension

To create a new extension (e.g., `my-custom-widget`):

### 1. Implement the Logic

Create a folder `hub/extensions/my-custom-widget/` and add `index.ts`.

```typescript
// hub/extensions/my-custom-widget/index.ts
import { ExtensionModule } from "@/lib/survey-extensions/types";
import { Serializer } from "survey-core";

const extension: ExtensionModule = {
  // Optional: React Component for rendering
  Component: MyReactComponent,

  // Optional: Global registration (run once)
  onInit: () => {
    Serializer.addClass("my-custom-widget", [
      { name: "myProperty", default: "value" },
    ]);
  },

  // Optional: Instance logic
  onModelReady: (model) => {
    console.log("Survey model is ready!");
  },
};

export default extension;
```

### 2. Register the Extension

Add it to `hub/extensions/user-extensions.ts`.

```typescript
// hub/extensions/user-extensions.ts
import type { ExtensionDefinition } from "@/lib/survey-extensions/types";

export const userExtensions: ExtensionDefinition[] = [
  {
    id: "my-custom-widget",
    type: "question",
    // Intelligent loading: only load if form uses this type
    shouldLoad: (_, analyzer) => analyzer.usesQuestionType("my-custom-widget"),
    // Dynamic import
    load: () => import("@/extensions/my-custom-widget").then((m) => m.default),
  },
];
```

## Configuration

This feature is guarded by a compile-time/build-time flag.

To enable or disable extensions project-wide, update your `next.config.ts` (via `withEndatix`):

```typescript
// next.config.ts
export default withEndatix(nextConfig, {
  experimental: {
    extensions: true, // Set to false to disable all extensions
  },
});
```

When disabled, `useSurveyExtensions` returns an empty list, and no extension code will be downloaded or executed.
