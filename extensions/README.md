# Endatix Extensions Architecture 🧩

> **Experimental Feature** 🚧
> Local Hub keeps extensions **off** unless you set `ENDATIX_ENABLE_EXTENSIONS=true` in `.env`.
> The Helm chart defaults that flag **on**, so data-list questions work on a stock install.
> Optional `withEndatix(nextConfig, { experimental: { extensions: true } })` is a rebuild-time code override — it cannot retarget a published image; use container/SWA env for that.
>
> The browser must **not** read `process.env.ENDATIX_ENABLE_EXTENSIONS` (Next would inline it at build). Layouts pass `{ apiBaseUrl, extensionsEnabled }` into `AppProvider`; `useSurveyExtensions` reads that context.

## Overview

The Endatix Extensions Architecture is designed for **Zero-Overhead** modularity. It allows developers to extend the SurveyJS Model and Creator with custom questions, logic, and widgets without bloating the initial bundle.

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

## Configuration (Feature Flag)

Extensions are gated by the runtime env var `ENDATIX_ENABLE_EXTENSIONS` (`true` to enable). Set it in `.env`, Helm, or SWA appsettings — published images pick it up without a rebuild.

`withEndatix(nextConfig, { experimental: { extensions: true } })` remains a rebuild-time code override only. Prefer the env flag for deployed environments.

When disabled, `useSurveyExtensions` returns an empty list, and no extension code is downloaded or executed.

## Advanced Usage: Context-Based Filtering

You may want to load extensions not just based on the form content, but also based on **User Permissions**, **Tenant Settings**, or **Feature Flags**.

The best place to do this is in your **Server Component** (e.g., `page.tsx`) before rendering the form.

### Example: Filtering by Tenant Plan

```typescript
// app/(public)/view/[formId]/page.tsx
import { getRequiredExtensionIds } from "@/lib/survey-extensions/server/analyzer";
import { ALL_EXTENSIONS } from "@/lib/survey-extensions";

export default async function Page({ params }) {
  const form = await getForm(params.formId);
  const tenant = await getTenant(form.tenantId);

  // 1. Get extensions required by the form content (Base)
  const requiredIds = getRequiredExtensionIds(form.definition, ALL_EXTENSIONS);

  // 2. Apply Business Logic Filtering
  const allowedIds = requiredIds.filter(id => {
    // Example: 'ai-assistant' requires 'enterprise' plan
    if (id === 'ai-assistant' && tenant.plan !== 'enterprise') {
      return false;
    }
    return true;
  });

  // 3. Pass filtered IDs to the client
  return (
    <SurveyJsWrapper
      formId={form.id}
      definition={form.definition}
      // explicit list overrides internal detection
      extensionIdsToLoad={allowedIds}
    />
  );
}
```

This ensures that sensitive or premium code is never even requested by the client if the user isn't authorized.
