# Endatix Extensions

This directory contains custom extensions that enhance SurveyJS functionality in your Endatix application.

## What are Extensions?

Extensions allow you to customize SurveyJS behavior without modifying core code. They support:

- **Custom Questions**: Add new question types (barcode scanners, signature pads, etc.)
- **Global Patches**: Modify SurveyJS prototypes and defaults (like the camera-fix)
- **Event Handlers**: Run code when survey instances are created (analytics, validation)
- **Creator Customization**: Customize the form editor experience (toolbox, tabs)

## Core Concepts

### Extension Definition vs Implementation

The new architecture separates **metadata** from **code**:

- **`ExtensionDefinition`**: Metadata about the extension (ID, name, where it runs, when to load)
- **`ExtensionImplementation`**: The actual code (React components, lifecycle hooks)

This separation enables:

- ✅ **Smart Preloading**: Server decides what to load before the page renders
- ✅ **Optimized TTI**: Only necessary JS chunks are downloaded
- ✅ **Code Splitting**: Large extensions don't bloat the main bundle

### Extension Scopes

Extensions run in specific contexts:

| Scope    | Where                 | Use Cases                                              |
| -------- | --------------------- | ------------------------------------------------------ |
| `form`   | Public survey forms   | Analytics, custom validation, event tracking           |
| `editor` | Form designer/creator | Toolbox customization, property panels, editor plugins |

You can target both scopes: `scopes: ['form', 'editor']`

## Quick Start: Adding Your First Extension

### Step 1: Create the Extension Folder

```bash
mkdir -p customizations/extensions/my-extension
```

### Step 2: Create the Definition

Create `customizations/extensions/my-extension/index.ts`:

```typescript
import type { ExtensionDefinition } from "@/lib/survey-extensions";

export const myExtension: ExtensionDefinition = {
  id: "my-extension",
  name: "My Extension",
  description: "What this extension does",

  // Where should this run?
  scopes: ["form"], // or ['editor'] or ['form', 'editor']

  // When should this load?
  shouldActivate: () => true, // Always, or check form JSON

  // How to load the implementation?
  loader: () => import("./implementation"),
};
```

### Step 3: Create the Implementation

Create `customizations/extensions/my-extension/implementation.ts`:

```typescript
import type { ExtensionImplementation } from "@/lib/survey-extensions";

const implementation: ExtensionImplementation = {
  onInit: () => {
    console.log("Extension initialized!");
  },
};

export default implementation;
```

### Step 4: Register in User Extensions

Add to `customizations/extensions/user-extensions.ts`:

```typescript
import { myExtension } from "./my-extension";

export const userExtensions: ExtensionDefinition[] = [
  cameraFixExtension,
  myExtension, // ← Add your extension
];
```

**That's it!** Your extension is now active across the entire application.

## Extension Examples

### Global Patch Extension

Perfect for modifying SurveyJS prototypes or global settings:

```typescript
// Definition: customizations/extensions/my-patch/index.ts
import type { ExtensionDefinition } from "@/lib/survey-extensions";

export const myPatchExtension: ExtensionDefinition = {
  id: "my-patch",
  name: "My Patch",
  description: "Patches SurveyJS behavior",
  scopes: ["form", "editor"], // Global patches need both

  shouldActivate: () => true, // Always include
  loader: () => import("./patch"),
};

// Implementation: customizations/extensions/my-patch/patch.ts
import type { ExtensionImplementation } from "@/lib/survey-extensions";

const implementation: ExtensionImplementation = {
  onInit: () => {
    // Your patch logic here
    console.log("Patching SurveyJS...");
  },
};

export default implementation;
```

### Custom Question Extension

Add custom question types with React components:

```typescript
// Definition: customizations/extensions/my-question/index.ts
import type { ExtensionDefinition } from '@/lib/survey-extensions';
import { formUsesQuestionType } from '@/lib/survey-extensions';

export const myQuestionExtension: ExtensionDefinition = {
  id: 'my-question',
  name: 'My Custom Question',
  description: 'A custom question type',
  scopes: ['form', 'editor'],

  // Smart detection: only load if form actually uses this question
  shouldActivate: (json) => formUsesQuestionType(json, 'myquestion'),

  loader: () => import('./implementation'),
};

// Implementation: customizations/extensions/my-question/implementation.ts
import React from 'react';
import type { ExtensionImplementation } from '@/lib/survey-extensions';

function MyQuestionComponent(props: any) {
  return <div>My custom question: {props.question.name}</div>;
}

const implementation: ExtensionImplementation = {
  Component: MyQuestionComponent,

  onCreatorCreated: (creator) => {
    // Customize the form editor
    creator.toolbox.addItem({
      name: 'myquestion',
      title: 'My Question',
      json: { type: 'text' },
    });
  },
};

export default implementation;
```

### Event Handler Extension

Add behavior to survey instances:

```typescript
// Definition: customizations/extensions/analytics/index.ts
import type { ExtensionDefinition } from "@/lib/survey-extensions";

export const analyticsExtension: ExtensionDefinition = {
  id: "analytics",
  name: "Analytics Tracking",
  description: "Tracks survey interactions",
  scopes: ["form"], // Only needed in forms

  shouldActivate: () => true, // Include on all forms
  loader: () => import("./tracker"),
};

// Implementation: customizations/extensions/analytics/tracker.ts
import type { ExtensionImplementation } from "@/lib/survey-extensions";

const implementation: ExtensionImplementation = {
  onModelCreated: (model) => {
    // Attach event handlers to this survey instance
    model.onComplete.add((sender) => {
      console.log("Survey completed!", sender.data);
      // Send to analytics service
    });

    model.onValueChanged.add((sender, options) => {
      console.log("Answer changed:", options.name, options.value);
    });
  },
};

export default implementation;
```

### Multi-Scope Extension

Handle both form and editor in one extension:

```typescript
// Definition
export const comprehensiveExtension: ExtensionDefinition = {
  id: "comprehensive",
  name: "Comprehensive Extension",
  description: "Handles multiple concerns",
  scopes: ["form", "editor"], // Runs in both contexts

  shouldActivate: () => true,
  loader: () => import("./implementation"),
};

// Implementation
const implementation: ExtensionImplementation = {
  // Global initialization (runs once)
  onInit: () => {
    console.log("Setting up global configuration");
  },

  // Per-form setup (runs for each survey instance)
  onModelCreated: (model) => {
    console.log("Form instance created");
  },

  // Editor setup (runs for each creator instance)
  onCreatorCreated: (creator) => {
    console.log("Form editor initialized");
  },
};
```

## Performance: Smart Loading

### The `shouldActivate()` Function

The `shouldActivate()` function enables server-side analysis to determine which extensions are needed:

```typescript
// Global patches - always needed
shouldActivate: () => true;

// Question-specific - only if form uses it
shouldActivate: (json) => formUsesQuestionType(json, "myquestion");

// Custom logic - check for specific configuration
shouldActivate: (json) => {
  const str = JSON.stringify(json);
  return str.includes('"enableAnalytics":true');
};
```

### The `loader()` Function

The `loader()` function enables lazy loading and smart preloading:

```typescript
// Simple loader
loader: () => import("./implementation");

// The implementation module should export default:
// export default implementation: ExtensionImplementation = { ... }
```

### Server-Side Optimization (Public Forms)

In public form pages, the server analyzes which extensions are needed:

```typescript
// app/(public)/view/[formId]/page.tsx
import { getRequiredExtensionIds } from '@/lib/survey-extensions/server';

export default async function Page({ params }) {
  const form = await getForm(params.formId);

  // Server determines which extensions to load
  const requiredIds = getRequiredExtensionIds(
    form.definition,
    [...coreExtensions, ...userExtensions]
  );

  return (
    <SurveyExtensions activeIds={requiredIds} scope="form">
      <PublicFormView form={form} />
    </SurveyExtensions>
  );
}
```

### When to Use Lazy Loading

**Use lazy loading (`loader`) for:**

- ✅ Third-party libraries (barcode scanners, media processors)
- ✅ Heavy components (>50KB)
- ✅ Questions used in <10% of forms

**Benefits of lazy loading:**

- ✅ Faster initial page load (smaller main bundle)
- ✅ Better TTI (Time To Interactive)
- ✅ Only downloads code when needed

## Architecture

### No Merge Conflicts Strategy

```
Core Extensions (Endatix)      →  lib/survey-extensions/core-registry.ts
User Extensions (Developer)    →  customizations/extensions/user-extensions.ts
Merged at Runtime              →  SurveyExtensions component
```

When Endatix updates:

- Core extensions are added to `core-registry.ts`
- Your `user-extensions.ts` remains untouched
- No merge conflicts!

### File Structure

```
customizations/extensions/
├── survey-extensions.tsx        # Client bootstrapper (auto-configured)
├── user-extensions.ts           # YOUR extensions (no conflicts!)
├── camera-fix/                  # Example extension
│   ├── index.ts                 # Extension definition
│   └── camera-patch.ts          # Implementation (lazy loaded)
└── README.md                    # This file
```

## Integration Points

### In Layouts

Extensions are automatically available via `SurveyExtensions` component:

```typescript
// Already integrated in layouts
<SurveyExtensions scope="form">  {/* or scope="editor" */}
  {children}
</SurveyExtensions>
```

### In Form Hooks

```typescript
import { useFormExtensions } from "@/lib/survey-extensions";

const { applyToModel } = useFormExtensions();
const model = new Model(json);
applyToModel(model); // All form extensions applied!
```

### In Form Editor

```typescript
import { useEditorExtensions } from "@/lib/survey-extensions";

const { applyToCreator } = useEditorExtensions();
const creator = new SurveyCreator(options);
applyToCreator(creator); // All editor extensions applied!
```

## Debugging Extensions

### Check Which Extensions Are Loaded

```typescript
import { useExtensionContext } from "@/lib/survey-extensions";

function MyComponent() {
  const { registry } = useExtensionContext();

  console.log("All definitions:", registry.getAllDefinitions());
  console.log("Loaded implementations:", registry.getAllImplementations());
}
```

### Common Issues

**Extension not running?**

1. Check it's in `user-extensions.ts`
2. Verify `loader()` returns `ExtensionImplementation`
3. Check browser console for error messages
4. Ensure `shouldActivate()` returns true for your form

**Component not loading?**

1. Ensure implementation exports default
2. Check `Component` prop is set in implementation
3. Verify the component is properly exported

**Wrong scope?**

1. Check `scopes` array includes the right scope ('form' or 'editor')
2. Verify you're using the right hook (`useFormExtensions` vs `useEditorExtensions`)

## Example: Camera Fix Extension

See `camera-fix/` folder for a complete working example:

- **index.ts**: Extension definition with metadata
- **camera-patch.ts**: Implementation with actual patch logic (lazy loaded)

This extension demonstrates:

- ✅ Global patch (runs in both form and editor)
- ✅ Lazy loading with `loader()`
- ✅ Clean separation of definition and implementation
- ✅ Proper error handling

## Migration from Old System

### Old Format (Deprecated)

```typescript
// ❌ Old way
export const oldExtension: Extension = {
  id: 'old',
  name: 'Old Extension',
  type: 'init',
  hooks: {
    onInit: () => { ... }
  }
};
```

### New Format (Current)

```typescript
// ✅ New way - Definition
export const newExtension: ExtensionDefinition = {
  id: 'new',
  name: 'New Extension',
  scopes: ['form', 'editor'],
  shouldActivate: () => true,
  loader: () => import('./implementation'),
};

// ✅ New way - Implementation (separate file)
const implementation: ExtensionImplementation = {
  onInit: () => { ... }
};
export default implementation;
```

### Key Changes

1. **`type`** → **`scopes`**: More flexible, supports multiple contexts
2. **`detect`** → **`shouldActivate`**: Clearer naming
3. **`hooks`** → Implementation: Separation of concerns
4. **Direct export** → **`loader()`**: Enables lazy loading

## Testing Your Extension

### 1. Development Mode

```bash
cd hub
pnpm dev
```

### 2. Check Console

Look for initialization messages:

```
[Endatix] Initializing extension: My Extension
```

### 3. Test Behavior

Verify your extension works as expected in:

- Public forms (`/share/[formId]`) - scope: 'form'
- Form editor (`/forms/[formId]/design`) - scope: 'editor'
- Submission views (`/forms/[formId]/submissions`) - scope: 'form'

## Next Steps

1. **Review the camera-fix example** to understand the pattern
2. **Create your first extension** following the Quick Start guide
3. **Test thoroughly** in both public forms and editor
4. **Share feedback** to help us improve the system

## Need Help?

- Review `camera-fix/` for a working example
- Check SurveyJS docs: https://surveyjs.io/form-library/documentation/
- See `lib/survey-extensions/types.ts` for all available options
- Read the inline documentation in the type definitions
