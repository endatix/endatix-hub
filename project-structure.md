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

Vertical Slice Architecture: organize by business feature, then by use-case.

```text
features/
├── {feature-name}/
│   ├── client.ts                             # Client-side only exports
│   ├── server.ts                             # Server-side only exports
│   ├── index.ts                              # Shared exports (both client and server)
│   ├── types.ts                              # Feature-specific types
│   ├── use-cases/                            # Business logic by use case
│   │   ├── {verb-noun}/                      # e.g., create-form
│   │   │   ├── {verb-noun}.use-case.ts       # Pure business logic
│   │   │   ├── {verb-noun}.action.ts         # Use case specific server action
│   │   │   ├── use-{noun}.hook.ts            # Use-case specific hook
│   │   │   └── ui/                           # Use-case specific components
│   ├── infrastructure/                       # External adapters, config
│   ├── ui/                                   # Cross-use-case components & context
│   └── __tests__/                            # Feature-level tests
```

### Entry Point Pattern (Idiomatic Next.js)

To prevent server-side dependencies (like database clients or SDKs) from leaking into the client bundle, use explicit entry points:

1.  **client.ts**: Exports for Client Components (hooks, providers, safe types). Mark with `"use client"`.
2.  **server.ts**: Exports for Server Components and Server Actions. Mark with `"use server"`.
3.  **index.ts**: Shared exports (primitive types, basic utilities) that are safe for both environments.

## Why Vertical Slice Architecture?

**Cohesion**: Related code lives together - business logic, actions, UI, and tests are co-located.

**Discoverability**: Find everything related to a feature without navigating multiple folders.

**Collaboration**: Teams work on different features simultaneously with minimal conflicts.

**Flexibility**: Features vary in complexity without artificial constraints.

## Testing Convention

Use `__tests__/` folders for test organization:

- **Feature level**: `features/{name}/__tests__/` - Test feature integration and shared utilities
- **Component level**: Place `.test.tsx` files alongside components when testing specific UI behavior
- **Focus on use-cases**: Write comprehensive unit tests for `.use-case.ts` files as they contain core business logic

## Layers

### Use-Case Layer (.use-case.ts)

```typescript
// Pure business logic, no Next.js dependencies
export const createFormUseCase = async (
  request: CreateFormRequest,
): Promise<Result<string>> => {
  // Business logic here
};
```

### Action Layer (.action.ts)

```typescript
// Next.js server action - thin wrapper
"use server";

export async function createFormAction(
  request: CreateFormRequest,
): Promise<Result<string>> {
  await ensureAuthenticated(); // Next.js concerns
  const result = await createFormUseCase(request);
  if (result.isSuccess()) {
    revalidatePath("/(main)/forms"); // Next.js concerns
  }
  return result;
}
```

### Infrastructure Layer

- External adapters (auth providers, storage, APIs)
- Framework-specific integrations
- Configuration and setup

### Data Fetching and State Management

#### Data Fetching (Server to Client)
For optimal performance and UX, prefer **streaming promises** from Server Components to Client Components. Use the React `use()` hook to unwrap these promises. This prevents blocking the initial render while data is being fetched.

**Recommended Pattern:**
1.  **Server Page/Component**: Initiate the fetch and pass the *promise* (not the awaited result).
2.  **Context Provider (Client)**: Accept the promise as a prop and use `use(promise)` to resolve it.

```tsx
// features/my-feature/ui/my-feature-provider.tsx (Client Component)
'use client';
import { createContext, use, useMemo } from 'react';

export function MyFeatureProvider({ children, dataPromise }) {
  const data = use(dataPromise); // Resolves via React Suspense
  const value = useMemo(() => ({ data }), [data]);
  return <MyContext value={value}>{children}</MyContext>;
}

// app/(main)/my-feature/page.tsx (Server Component)
export default async function Page() {
  const dataPromise = getMyData(); // Start fetching, don't await
  return (
    <MyFeatureProvider dataPromise={dataPromise}>
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
- **Custom Hooks**: Expose context via hooks (e.g., `useMyFeature`) to provide a clean API.
- **Reference Implementations**:
  - `storage-config.context.tsx`: Clean configuration streaming.
  - `form-assistant.context.tsx`: Complex state with optimistic updates and reducer.

More on this in the [Next.js Data Fetching Documentation](https://nextjs.org/docs/app/getting-started/fetching-data#streaming-data-with-the-use-hook).


## Naming Conventions

### Files & Folders

- **kebab-case**: `create-form.use-case.ts`, `use-cases/`
- **Functions**: `camelCase` → `createFormUseCase`
- **Classes/Types**: `PascalCase` → `CreateFormRequest`

### Files

- **Use-cases**: `{verb-noun}.use-case.ts`
- **Actions**: `{verb-noun}.action.ts`
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

1. **Start with use-case** - Write business logic first
2. **Keep actions thin** - Simple wrappers around use-cases
3. **Co-locate related code** - Keep use-case items together
4. **Use feature exports** - Import from `features/{name}/index.ts`
5. **Move to lib/ when reusable** - Extract to lib/ when used across projects
6. **Move to packages/ when publishable** - Extract to packages/ when ready for npm

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