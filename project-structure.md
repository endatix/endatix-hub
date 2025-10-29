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

```
features/
├── {feature-name}/
│   ├── index.ts                              # Public API exports
│   ├── types.ts                              # Feature-specific types
│   ├── __tests__/                            # Feature-level tests
│   ├── use-cases/                            # Business logic by use case
│   │   ├── {verb-noun}/                      # e.g., create-form, update-user
│   │   │   ├── {verb-noun}.use-case.ts       # Pure business logic
│   │   │   ├── {verb-noun}.action.ts         # Next.js server action
│   │   │   ├── {verb-noun}.hook.ts           # Client hook (optional)
│   │   │   └── ui/                           # Use-case specific components
│   │   └── ...
│   ├── infrastructure/                       # External adapters, providers
│   ├── shared/                               # Cross use-case items
│   └── ui/                                   # Feature-wide components
```

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
