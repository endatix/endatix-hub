# Project Structure

Quick reference for organizing features using vertical slice architecture.

## lib/ vs features/ vs packages/

### Use `lib/` for:

- **Internal utilities** used across multiple features
- **Framework-specific adapters** (Next.js, React)
- **Cross-cutting concerns** that aren't ready for packages

### Use `features/` for:

- **Endatix-specific business logic**
- **App configuration** (features/config/)
- **Complete vertical slices** with use-cases, UI, and infrastructure

### Use `packages/` for:

- **Future npm packages** with their own package.json
- **Reusable libraries** that can be published independently
- **Workspace packages** that other projects can consume

## Feature Structure

Vertical Slice Architecture: organize by business feature, then by use-case slice.

```text
features/
├── {feature-name}/
│   ├── server.ts                             # Optional: curated server-safe exports
│   ├── index.ts                              # Optional: curated shared/client-safe exports
│   ├── types.ts                              # Feature-shared types across slices
│   ├── utils.ts                              # Feature-shared pure helpers
│   ├── ui/                                   # Cross-slice reusable UI only
│   ├── {verb-noun}/                          # Use-case slice (preferred)
│   │   ├── {verb-noun}.action.ts             # Server action for this slice
│   │   ├── {verb-noun}.server.ts             # Optional server-only loader/helper
│   │   ├── use-{noun}.hook.ts                # Optional slice-local hook
│   │   ├── ui/                               # Slice-local UI
│   │   ├── __tests__/                        # Slice-local tests
│   │   └── index.ts                          # Slice barrel exports
│   └── __tests__/                            # Optional cross-slice integration tests
```

### Reference Example: `features/folders`

Use `features/folders` as the canonical implementation of this pattern:

- slices like `create-folder`, `update-folder`, `delete-folder`, `move-form-to-folder`, `view-forms-header`
- shared root artifacts in `types.ts`, `utils.ts`, and root `ui/` for cross-slice components
- server-safe curated exports via `features/folders/server.ts`
- slice-local tests in `features/folders/create-folder/__tests__/`

### Organization Management Slices

Organization identity surfaces follow the same vertical-slice rule:

- `features/organization/user-management/use-cases/create-tenant-user` owns tenant invites. Invite actions must not collect a password from the inviter.
- `features/organization/user-management/use-cases/delete-user` owns tenant access removal. It keeps typed confirmation in UI and must not delete the global user identity.
- `features/organization/user-management/use-cases/resend-verification` owns pending-user activation email resend.
- `features/organization/user-management/use-cases/cancel-invite` owns pending invite cancellation and token invalidation.
- `features/organization/user-management/use-cases/manage-user-roles` owns assigning and removing user roles.
- `features/organization/role-management` owns role CRUD and permission catalog UI.

New organization server actions should return `ServerActionState` and convert Zod failures through `ServerActionState.fromZodError`.

### Entry Point Pattern (Idiomatic Next.js)

To prevent server-side dependencies (like database clients or SDKs) from leaking into the client bundle, use explicit entry points:

1.  **Slice `index.ts`**: Primary import point for each vertical slice.
2.  **`server.ts`**: Optional feature-level curated exports for Server Components and Server Actions.
3.  **`index.ts`**: Optional feature-level curated shared/client-safe exports.

## Why Vertical Slice Architecture?

**Cohesion**: Related code lives together - business logic, actions, UI, and tests are co-located.

**Discoverability**: Find everything related to a feature without navigating multiple folders.

**Collaboration**: Teams work on different features simultaneously with minimal conflicts.

**Flexibility**: Features vary in complexity without artificial constraints.

## Testing Convention

Use `__tests__/` folders for test organization:

- **Slice level (default)**: `features/{name}/{verb-noun}/__tests__/` - Test slice behavior close to implementation
- **Feature level (optional)**: `features/{name}/__tests__/` - Cross-slice integration and shared feature helpers
- **Component level**: Place `.test.tsx` files alongside components when testing specific UI behavior
- **Focus on slices**: Test actions, loaders, hooks, and UI inside the slice where they live

## Layers

### Use-Case Layer (optional `.use-case.ts`)

```typescript
// Pure business logic, no Next.js dependencies (only when needed)
export const createFormUseCase = async (
  request: CreateFormRequest,
): Promise<Result<string>> => {
  // Business logic here
};
```

### Action Layer (.action.ts)

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

export type DeleteItemResult = Result<string>;

export async function deleteItemAction(
  itemId: string,
): Promise<DeleteItemResult> {
  const session = await requireAccess(); // auth + authorization at the boundary
  const api = new EndatixApi(session.accessToken);
  const apiResult = await api.items.delete(itemId);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to delete item.",
    logMessage: "Failed to delete item.",
    loggerName: "feature.items",
    mapData: (data) => data.message,
  });

  if (Result.isSuccess(result)) {
    revalidatePath("/(main)/items");
  }

  return result;
}
```

Action rules:

- Return `Result<T>` (or `ServerActionState` for multi-field forms) — never swallow failures silently
- Authenticate and authorize inside the action, or accept a session already validated by the caller
- Map `ApiResult` failures with `toResult(...)` so expected 403/404/validation errors stay user-facing and unexpected failures are logged through `TelemetryLogger`
- Revalidate paths only after success
- Surface success and failure in the UI with toast or inline feedback; pair actions with a client handler using `useTransition` when not using `useActionState`

### Server Helper Layer (`*.server.ts`)

- Server-only read-model loaders and helper orchestration
- Can live inside a slice (preferred) or feature root for shared server-only code

### Data Fetching and State Management

#### Data Fetching (Server to Client)

For optimal performance and UX, prefer **streaming promises** from Server Components to Client Components. Use the React `use()` hook to unwrap these promises. This prevents blocking the initial render while data is being fetched.

**Recommended Pattern:**

1.  **Server Page/Component**: Initiate the fetch and pass the _promise_ (not the awaited result).
2.  **Context Provider (Client)**: Accept the promise as a prop and use `use(promise)` to resolve it.

```tsx
// features/my-feature/ui/my-feature.context.tsx (Client Component)
'use client';
import { createContext, use, useMemo } from 'react';

export function MyFeatureClientProvider({ children, dataPromise }) {
  const data = use(dataPromise); // Resolves via React Suspense
  const value = useMemo(() => ({ data }), [data]);
  return <MyContext value={value}>{children}</MyContext>;
}

// features/my-feature/ui/my-feature.provider.tsx (Server Component)
import { MyFeatureClientProvider } from './my-feature.context';

export function MyFeatureProvider({ children }) {
  const dataPromise = getMyData(); // Start fetching locally on server
  return (
    <MyFeatureClientProvider dataPromise={dataPromise}>
      {children}
    </MyFeatureClientProvider>
  );
}

// app/(main)/my-feature/page.tsx (Server Page)
export default async function Page() {
  return (
    <MyFeatureProvider>
      <MyFeatureComponent />
    </MyFeatureProvider>
  );
}
```

#### State Management & Interactions

Combine `use()` with `useReducer` and `useOptimistic` for features with complex interactions (like forms or AI assistants).

```tsx
// Example in FormAssistantProvider
export function FeatureProvider({ children, initialDataPromise }) {
  const initialData = initialDataPromise ? use(initialDataPromise) : defaultState;
  const [state, dispatch] = useReducer(reducer, initialData);
  const [optimisticState, setOptimisticState] = useOptimistic(state, (s, u) => ({ ...s, ...u }));

  const handleAction = async (payload) => {
    setOptimisticState({ isPending: true }); // Immediate UI feedback
    const result = await myServerAction(payload); // Next.js Server Action
    dispatch({ type: 'UPDATE', payload: result });
  };

  const value = useMemo(() => ({ state: optimisticState, handleAction }), [optimisticState]);
  return <MyContext value={value}>{children}</MyContext>;
}
```

#### Best Practices

- **Thin Providers**: Keep context providers focused on data sharing and state management.
- **Custom Hooks**: Expose context via hooks (e.g., `useAssetStorage`) to provide a clean API.
- **Server-Side Providers**: Use Server Component wrappers (like `AssetStorageProvider`) to orchestrate configuration and data fetching on the server.
- **Zero-Latency Orchestration**: By using Server Components for providers, we can pass _unresolved_ promises to the client. This allows the page to start streaming immediately while SAS tokens or other data are generated on the server, avoiding extra HTTP round-trips from the client.
- **Reference Implementations**:
  - `asset-storage.context.tsx`: Clean configuration streaming and client-side state.
  - `asset-storage.provider.tsx`: Server Component orchestration.
  - `form-assistant.context.tsx`: Complex state with optimistic updates and reducer.

More on this in the [Next.js Data Fetching Documentation](https://nextjs.org/docs/app/getting-started/fetching-data#streaming-data-with-the-use-hook).

## Naming Conventions

### Files & Folders

- **kebab-case**: `create-form.action.ts`, `view-forms-header/`
- **Functions**: `camelCase` → `createFormUseCase`
- **Classes/Types**: `PascalCase` → `CreateFormRequest`

### Files

- **Use-cases**: `{verb-noun}.use-case.ts` (optional)
- **Actions**: `{verb-noun}.action.ts`
- **Server-only helpers**: `{verb-noun}.server.ts`
- **Hooks**: `use-{noun}.hook.ts`
- **Components**: `{feature-name}-{purpose}.tsx`

## App Folder Structure

```
app/
├── (main)/                    # Main application routes
│   ├── dashboard/
│   ├── forms/
│   ├── settings/
│   └── ...
├── (public)/                  # Public routes
│   ├── share/
│   └── ...
├── api/                       # API routes
├── globals.css
└── layout.tsx
```

**Keep `/app` focused on Next.js routing only - no business logic.**

## Package Structure Guidelines

### When to Create a Package

- **Multiple consumers** - Used by multiple apps/projects
- **Independent versioning** - Can be versioned separately
- **Clear API boundaries** - Well-defined public interface
- **No framework coupling** - Not tied to Next.js/React

### Package.json Structure

```json
{
  "name": "@endatix/api-client",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types.js"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

### Workspace Configuration

```json
// package.json (root)
{
  "workspaces": ["apps/*", "packages/*"]
}
```

## Guidelines

1. **Start with a slice** - Create `{verb-noun}/` and co-locate action, UI, tests, and exports
2. **Keep actions thin** - Wrap API calls and orchestration, move complex logic to helpers/use-case files
3. **Co-locate related code** - Keep slice internals inside the slice folder
4. **Use slice exports first** - Import from `features/{name}/{verb-noun}` before feature-level barrels
5. **Move to lib/ when reusable** - Extract to lib/ when used across projects
6. **Move to packages/ when publishable** - Extract to packages/ when ready for npm
7. **Document Architecture Updates** - Any new architectural items, patterns, or cross-cutting features discovered during planning or development must be documented in a dedicated `ARCHITECTURE.md` file in the root of the project.

## Package Evolution Path

### Current Structure

```
hub/
├── lib/                    # Internal utilities
│   ├── endatix-api/       # API client (internal)
│   └── utils/             # Shared utilities
├── features/              # App-specific features
│   ├── config/            # App configuration
│   ├── auth/              # Auth business logic
│   └── forms/             # Form management
└── packages/              # Future workspace packages
```

### Target Monorepo Structure

```
endatix-saas/
├── apps/
│   └── hub/               # Next.js application
└──packages/
    ├── @endatix/api-client/    # API client package
    ├── @endatix/ui/            # UI components package
    ├── @endatix/config/        # Configuration package
    └── @endatix/utils/         # Utilities package
```

### Migration Steps

1. **lib/endatix-api/** → **packages/@endatix/api-client/**
2. **lib/utils/** → **packages/@endatix/utils/**
3. **features/config/** → **packages/@endatix/config/**
4. **features/auth/** → Keep in apps/hub/features/auth/ (app-specific)
