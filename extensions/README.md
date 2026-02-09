# Endatix Extension System

This directory contains the extension infrastructure and definitions for enhancing SurveyJS functionality in Endatix.

## Overview

The extension system allows you to:
1.  **Add Custom Question Types**: Create new question types (like `hello-world`, `scandit`, etc.) with their own models and React components.
2.  **Patch Global Behavior**: Modify SurveyJS prototypes or settings (like `camera-fix`).
3.  **Optimize Loading**: Extensions are **lazy-loaded** via Next.js dynamic imports only when needed (based on the form definition).

## Directory Structure

```text
hub/extensions/
├── core/                  # (Future) Core extensions maintained by Endatix
├── user-extensions.ts     # Registry where you add your custom extensions
├── use-survey-extensions.ts # Hook to load extensions in your components
├── types.ts               # TypeScript interfaces (ExtensionDefinition, ExtensionModule)
├── camera-fix/            # Example extension implementation
└── index.ts               # Main entry point
```

## How It Works

1.  **Definition**: You define an extension in `user-extensions.ts` with metadata and a loader.
2.  **Detection**: The `shouldLoad` function checks the form JSON (e.g., "does this form use question type 'x'?").
3.  **Loading**: If `shouldLoad` returns true, `useSurveyExtensions` triggers the `load()` function.
4.  **Execution**: The extension module is downloaded and its `onInit` (or other hooks) are executed.

## Creating a New Extension

### 1. Create the Extension Module

Create a folder, e.g., `hub/customizations/questions/my-extension/`.
Create an `index.ts` file that implements `ExtensionModule`.

```typescript
// hub/customizations/questions/my-extension/index.ts
import { Serializer } from "survey-core";
import type { ExtensionModule } from "@/extensions/types";

const extension: ExtensionModule = {
  // Lifecycle hook called once when the extension is loaded
  onInit: () => {
    // Register your question type, add classes, etc.
    Serializer.addClass("my-extension", [], ...);
  },
  
  // Optional: React Component for rendering (if using ReactQuestionFactory)
  Component: MyComponent,

  // Optional: Hook called every time a Survey Model is created
  onModelReady: (model) => {
    model.onValueChanged.add(...)
  }
};

export default extension;
```

### 2. Register the Extension

Add your extension to `hub/extensions/user-extensions.ts`.

```typescript
// hub/extensions/user-extensions.ts
import { formUsesQuestionType } from "./analyzer";
import type { ExtensionDefinition } from "./types";

export const userExtensions: ExtensionDefinition[] = [
  {
    id: "my-extension",
    type: "question",
    
    // Only load if the form actually uses this question type
    shouldLoad: (json) => formUsesQuestionType(json, "my-extension"),
    
    // Lazy load the implementation
    load: () => import("@/customizations/questions/my-extension").then(m => m.default),
  },
];
```

## Usage

In your form viewer component:

```typescript
import { useSurveyExtensions } from "@/extensions/use-survey-extensions";

function MyFormViewer({ formDefinition }) {
  // Automatically loads extensions based on form definition
  const { isReady, onModelCreated } = useSurveyExtensions({ 
    formJson: formDefinition 
  });

  if (!isReady) return <LoadingSpinner />;

  return (
    <SurveyComponent 
      model={model} 
      onModelCreated={onModelCreated} 
    />
  );
}
```

## Extension Interface

See `types.ts` for full details.

```typescript
interface ExtensionModule {
  onInit?: () => void;
  onModelReady?: (model: Model) => void;
  Component?: React.ComponentType<any>;
}
```
