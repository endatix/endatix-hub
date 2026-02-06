# Endatix Extensions

This directory contains custom extensions that enhance SurveyJS functionality in your Endatix application.

## What are Extensions?

Extensions allow you to customize SurveyJS behavior without modifying core code. They support:

- **Custom Questions**: Add new question types (barcode scanners, signature pads, etc.)
- **Global Patches**: Modify SurveyJS prototypes and defaults (like the camera-fix)
- **Model Hooks**: Run code when survey instances are created (analytics, validation)
- **Creator Customization**: Customize the form editor experience (toolbox, tabs)

## Extension Types

| Type        | When it Runs        | Use Cases                          |
| ----------- | ------------------- | ---------------------------------- |
| `init`      | Once at app startup | Prototype patches, global settings |
| `question`  | At registration     | Custom question types              |
| `model`     | Per survey instance | Event handlers, analytics          |
| `creator`   | Per editor instance | Toolbox customization, tabs        |
| `composite` | Multiple phases     | All-in-one extensions              |

## Quick Start: Adding Your First Extension

### Step 1: Create the Extension Folder

```bash
mkdir -p customizations/extensions/my-extension
```

### Step 2: Define Your Extension

Create `customizations/extensions/my-extension/index.ts`:

```typescript
import type { ExtensionDefinition } from "@/lib/survey-extensions";

export const myExtension: ExtensionDefinition = {
  id: "my-extension",
  name: "My Extension",
  type: "init",
  description: "What this extension does",

  // Server-side detection (for smart loading)
  detect: () => true,

  // Lazy loading (optional, for heavy modules)
  loader: () => import("./my-extension-logic"),

  // Lifecycle hooks
  hooks: {
    onInit: () => {
      console.log("Extension initialized!");
    },
  },
};
```

### Step 3: Register in User Extensions

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

### Init Extension (Global Patch)

Perfect for modifying SurveyJS prototypes or global settings:

```typescript
import type { ExtensionDefinition } from "@/lib/survey-extensions";

export const myPatchExtension: ExtensionDefinition = {
  id: "my-patch",
  name: "My Patch",
  type: "init",
  description: "Patches SurveyJS behavior",

  detect: () => true, // Always include
  loader: () => import("./patch-logic"),

  hooks: {
    onInit: async () => {
      const { applyPatch } = await import("./patch-logic");
      applyPatch();
    },
  },
};
```

### Question Extension

Add custom question types with React components:

```typescript
import dynamic from "next/dynamic";
import type { ExtensionDefinition } from "@/lib/survey-extensions";
import { formUsesQuestionType } from "@/lib/survey-extensions";

// Lazy load component for better performance
const MyQuestionComponent = dynamic(
  () => import("./component").then((m) => ({ default: m.MyQuestion })),
  { ssr: false },
);

export const myQuestionExtension: ExtensionDefinition = {
  id: "my-question",
  name: "My Custom Question",
  type: "question",
  description: "A custom question type",

  // Only load if form actually uses this question
  detect: (json) => formUsesQuestionType(json, "myquestion"),

  loader: () => import("./component"),

  Component: MyQuestionComponent,

  config: {
    name: "myquestion",
    title: "My Question Type",
    iconName: "icon-custom",
    questionJSON: { type: "text" }, // Base structure
  },

  hooks: {
    onCreatorCreated: (creator) => {
      // Customize the form editor
      creator.toolbox.changeCategory("myquestion", "custom");
    },
  },
};
```

### Model Extension (Event Handlers)

Add behavior to survey instances:

```typescript
import type { ExtensionDefinition } from "@/lib/survey-extensions";

export const analyticsExtension: ExtensionDefinition = {
  id: "analytics",
  name: "Analytics Tracking",
  type: "model",
  description: "Tracks survey interactions",

  detect: () => true, // Include on all forms

  hooks: {
    onModelCreated: (model) => {
      // Attach event handlers to this survey instance
      model.onComplete.add((sender) => {
        console.log("Survey completed!", sender.data);
      });

      model.onValueChanged.add((sender, options) => {
        console.log("Answer changed:", options.name, options.value);
      });
    },
  },
};
```

### Composite Extension

Combine multiple lifecycle hooks in one extension:

```typescript
import type { ExtensionDefinition } from "@/lib/survey-extensions";

export const comprehensiveExtension: ExtensionDefinition = {
  id: "comprehensive",
  name: "Comprehensive Extension",
  type: "composite",
  description: "Handles multiple concerns",

  detect: () => true,

  hooks: {
    // Global initialization
    onInit: () => {
      console.log("Setting up global configuration");
    },

    // Per-form setup
    onModelCreated: (model) => {
      console.log("Form instance created");
    },

    // Editor setup
    onCreatorCreated: (creator) => {
      console.log("Form editor initialized");
    },
  },
};
```

## Performance: Smart Loading

### The `detect()` Function

The `detect()` function enables server-side analysis to determine which extensions are needed:

```typescript
// Global patches - always needed
detect: () => true;

// Question-specific - only if form uses it
detect: (json) => formUsesQuestionType(json, "myquestion");

// Custom logic - check for specific configuration
detect: (json) => {
  const str = JSON.stringify(json);
  return str.includes('"enableAnalytics":true');
};
```

### The `loader()` Function

The `loader()` function enables smart preloading:

```typescript
// Simple loader
loader: () => import("./my-logic");

// Complex loader with multiple modules
loader: async () => {
  const [logic, utils] = await Promise.all([
    import("./logic"),
    import("./utils"),
  ]);
  return { logic, utils };
};
```

### When to Use Lazy Loading

**Use lazy loading (`loader`) for:**

- ✅ Third-party libraries (barcode scanners, media processors)
- ✅ Heavy components (>50KB)
- ✅ Questions used in <10% of forms

**Skip lazy loading for:**

- ❌ Lightweight patches (<5KB)
- ❌ Core questions used frequently
- ❌ Simple utility functions

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
├── survey-extensions.tsx        # Client bootstrapper (imports both registries)
├── user-extensions.ts           # YOUR extensions (no conflicts!)
├── camera-fix/                  # Example extension
│   ├── index.ts                 # Extension definition
│   └── camera-patch.ts          # Patch logic (lazy loaded)
└── README.md                    # This file
```

## Integration Points

### In Layouts

Extensions are automatically available via `SurveyExtensions` component:

```typescript
// Already integrated in all layouts
<SurveyExtensions>
  {children}
</SurveyExtensions>
```

### In Survey Hooks

```typescript
import { useSurveyExtensions } from "@/lib/survey-extensions";

const { applyToModel } = useSurveyExtensions();
const model = new Model(json);
applyToModel(model); // All extensions applied!
```

### In Form Editor

```typescript
import { useCreatorExtensions } from "@/lib/survey-extensions";

const { applyToCreator } = useCreatorExtensions();
const creator = new SurveyCreator(options);
applyToCreator(creator); // All extensions applied!
```

## Debugging Extensions

### Check Which Extensions Are Loaded

```typescript
import { useExtensionContext } from "@/lib/survey-extensions";

function MyComponent() {
  const { extensions, registry } = useExtensionContext();

  console.log("All extensions:", extensions);
  console.log("Init extensions:", registry.getByType("init"));
  console.log("Questions:", registry.getByType("question"));
}
```

### Common Issues

**Extension not running?**

1. Check it's in `user-extensions.ts`
2. Verify `hooks.onInit` is defined (for init extensions)
3. Check browser console for error messages

**Component not loading?**

1. Ensure `Component` prop is set
2. Check `config` is properly defined
3. Verify the component is properly exported

## Example: Camera Fix Extension

See `camera-fix/` folder for a complete working example:

- **index.ts**: Extension definition with metadata and hooks
- **camera-patch.ts**: Actual patch logic (lazy loaded for performance)

This extension demonstrates:

- ✅ Global patch (init extension)
- ✅ Lazy loading with `loader()`
- ✅ Clean separation of concerns
- ✅ Proper error handling

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

- Public forms (`/share/[formId]`)
- Form editor (`/forms/[formId]/design`)
- Submission views (`/forms/[formId]/submissions`)

## Next Steps

1. **Review the camera-fix example** to understand the pattern
2. **Create your first extension** following the Quick Start guide
3. **Test thoroughly** in both public forms and editor
4. **Share feedback** to help us improve the system

## Need Help?

- Review `camera-fix/` for a working example
- Check SurveyJS docs: https://surveyjs.io/form-library/documentation/
- See `lib/survey-extensions/types.ts` for all available options
