# Survey Extensions Infrastructure 🏗️

This directory contains the core infrastructure for the "Zero-Overhead" extension system.

## Components

- **`types.ts`**: Core interfaces (`ExtensionDefinition`, `ExtensionModule`).
- **`extension-utils.ts`**: optimized JSON analyzer (`createFormAnalyzer`).
- **`server/analyzer.ts`**: Logic to calculate required extensions based on form content.
- **`ui/use-extension-loader.tsx`**: The React Hook that loads chunks.
- **`core-registry.ts`**: Built-in extensions (e.g. `camera-fix`).

---

## Implementation Guide: Custom Filtering

By default, extensions are loaded based on **Form Content** (e.g. if the JSON has `type: "country"`).
However, you often need to filter extensions based on **Context** (User Plan, Tenant ID, Feature Flags).

### 1. Update your Wrapper

Ensure your `SurveyJsWrapper` accepts an explicit list of extensions.

```typescript
// hub/features/public-form/ui/survey-js-wrapper.tsx
export interface SurveyJsWrapperProps {
  // ...
  extensionIdsToLoad?: string[]; // Add this prop
}

const SurveyJsWrapper = ({ extensionIdsToLoad, ...props }) => {
  const { isReady, onModelCreated } = useSurveyExtensions({
    formJson: props.definition,
    extensionIdsToLoad, // Pass it to the hook
  });
  // ...
};
```

### 2. Best Practices: Keeping it DRY DRY 🌵

Instead of repeating the filtering logic in every page (`/view`, `/share`, `/embed`), create a shared helper function in your domain logic layer.

#### Recommended Pattern: The "Authorized Extensions" Helper

Create a helper in `hub/features/public-form/application/get-authorized-extensions.ts`:

```typescript
import { getRequiredExtensionIds } from "@/lib/survey-extensions/server/analyzer";
import { ALL_EXTENSIONS } from "@/lib/survey-extensions";

export async function getAuthorizedExtensions(
  form: Form,
  tenant: Tenant,
): Promise<string[]> {
  // 1. Get Base Requirements
  const baseIds = getRequiredExtensionIds(form.definition, ALL_EXTENSIONS);

  // 2. Centralized Business Rules
  return baseIds.filter((id) => {
    const ext = ALL_EXTENSIONS.find((e) => e.id === id);

    // Rule: AI Features require Enterprise
    if (ext?.id === "ai-helper" && tenant.plan !== "enterprise") {
      return false;
    }

    // Rule: Beta Features
    if (ext?.metadata?.category === "beta" && !tenant.features.beta) {
      return false;
    }

    return true;
  });
}
```

#### Usage in Server Components

```typescript
// app/(public)/view/[formId]/page.tsx
export default async function Page({ params }) {
  const form = await getForm(params.formId);
  const tenant = await getTenant(form.tenantId);

  // Single line usage
  const authorizedExtensions = await getAuthorizedExtensions(form, tenant);

  return (
    <SurveyJsWrapper
      // ...
      extensionIdsToLoad={authorizedExtensions}
    />
  );
}
```

This ensures that if you add a new restriction rule, it applies to all public-facing pages instantly.
