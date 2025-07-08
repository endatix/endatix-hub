# Project Structure

Quick reference for organizing features using vertical slice architecture.

## Feature Structure

```
features/
├── {feature-name}/
│   ├── index.ts                              # Public API exports
│   ├── types.ts                              # Feature-specific types
│   ├── __tests__/                            # Feature-level tests
│   │   ├── {use-case-name}.test.ts
│   │   └── ...
│   ├── use-cases/                            # Business logic by use case
│   │   ├── {verb-noun}/                      # e.g., create-form, update-user
│   │   │   ├── {verb-noun}.use-case.ts       # Pure business logic
│   │   │   ├── {verb-noun}.action.ts         # Next.js server action
│   │   │   ├── {verb-noun}.hook.ts           # Client hook (optional)
│   │   │   └── ui/                           # Use-case specific components
│   │   │       ├── {verb-noun}-form.tsx
│   │   │       ├── {verb-noun}-dialog.tsx
│   │   │       └── ...
│   │   └── ...
│   ├── shared/                               # Cross use-case items
│   │   ├── types.ts, schemas.ts, services.ts
│   │   ├── hooks.ts, utils.ts
│   │   └── ...
│   └── ui/                                   # Feature-wide components
│       ├── {feature-name}-card.tsx
│       ├── {feature-name}-list.tsx
│       └── ...
```

## Why Vertical Slice Architecture?

**Cohesion**: All related code for a use case lives together - business logic, actions, UI, and tests are co-located, making changes easier and faster.

**Discoverability**: Developers can quickly find everything related to a feature without navigating multiple folders. The structure "screams" what the application does.

**Collaboration**: Teams can work on different features simultaneously with minimal conflicts. Each slice is self-contained and has clear boundaries.

**Flexibility**: Features can vary in complexity - simple features have fewer files, complex features can grow without affecting the structure. No artificial constraints.

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
  request: CreateFormRequest
): Promise<Result<string>> => {
  // Business logic here
};
```

### Action Layer (.action.ts)
```typescript
// Next.js server action - thin wrapper
"use server";

export async function createFormAction(
  request: CreateFormRequest
): Promise<Result<string>> {
  await ensureAuthenticated();           // Next.js concerns
  const result = await createFormUseCase(request);
  if (result.isSuccess()) {
    revalidatePath("/forms");            // Next.js concerns
  }
  return result;
}
```

### UI Layer
- Use-case specific: `use-cases/{name}/ui/`
- Feature-wide: `ui/`

## Naming Conventions

### Case Conventions
- **Files & Folders**: `kebab-case` → `create-form.use-case.ts`, `use-cases/`
- **Functions**: `camelCase` → `createFormUseCase`, `handleSubmit`
- **Classes, Interfaces, Types**: `PascalCase` → `CreateFormRequest`, `FormService`

### Files
- **Use-cases**: `{verb-noun}.use-case.ts` → `create-form.use-case.ts`
- **Actions**: `{verb-noun}.action.ts` → `create-form.action.ts`
- **Hooks**: `use-{feature-name}.hook.ts` → `use-form-data.hook.ts`
- **Components**: `{feature-name}-{purpose}.tsx` → `form-card.tsx`

### Functions
- **Use-cases**: `{verbNoun}UseCase` → `createFormUseCase`
- **Actions**: `{verbNoun}Action` → `createFormAction`
- **Hooks**: `use{FeatureName}` → `useFormData`

### Types
- **Requests**: `{VerbNoun}Request` → `CreateFormRequest`
- **Results**: `{VerbNoun}Result` → `CreateFormResult`
- **Queries**: `{VerbNoun}Query` → `GetFormQuery`

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

## Guidelines

1. **Start with use-case** - Write business logic first
2. **Keep actions thin** - Simple wrappers around use-cases
3. **Co-locate related code** - Keep use-case items together
4. **Use feature exports** - Import from `features/{name}/index.ts`
5. **Test business logic** - Focus unit tests on use-cases

## Examples

### Small Feature
```
features/notifications/
├── use-cases/send-notification/
└── use-cases/list-notifications/
```

### Large Feature
```
features/forms/
├── use-cases/create-form/
├── use-cases/update-form/
├── use-cases/delete-form/
├── use-cases/publish-form/
└── ...
```

For detailed architecture explanation, see [vertical-slice-architecture.md](./docs/vertical-slice-architecture.md).
