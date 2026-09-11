# Feature Flags System

A hybrid feature flag system with PostHog integration and environment variable fallbacks, following the [Vercel flags pattern](https://flags-sdk.dev/) with **server-side evaluation only**.

## 🏗️ Architecture

The system uses a **factory pattern** with **fallback chain**: PostHog → Environment Variables → Default Values

```
lib/feature-flags/
├── factories/
│   ├── posthog-flag-factory.ts      # PostHog integration  
│   ├── environment-flag-factory.ts  # Environment variables
│   └── flag-factory-provider.ts     # Factory selector
├── flags.ts                         # Flag definitions
├── types.ts                         # TypeScript interfaces
└── utils.ts                         # Main flag() function
```

## 🎯 Flag Types

### Boolean Flags (Simple Feature Toggles)
```typescript
export const experimentalFeatures = flag({
  key: "experimental-features",
  defaultValue: false,
});

// Usage
const isEnabled = await experimentalFeatures(); // boolean
```

### String/Number Flags (Configuration Values)
```typescript
export const theme = flag({
  key: "theme",
  defaultValue: "light" as const,
});

// Usage  
const currentTheme = await theme(); // "light" | "dark"
```

### Object Flags (Complex Configuration)
```typescript
export const aiFeatures = flag<AIFeatures>({
  key: "ai-features",
  defaultValue: {
    enabled: false,
    assistant: { enabled: false, name: "Assistant" },
  },
  parsePayload: (payload) => payload as AIFeatures, // Optional custom parsing
});

// Usage
const ai = await aiFeatures(); // { enabled: boolean, assistant: {...} }
```

## 📊 PostHog Integration

### Automatic Adapter Selection
- **Boolean flags** → `isFeatureEnabled()` (tracks events ✅)
- **String/number flags** → `featureFlagValue()` (tracks events ✅)  
- **Object flags** → `featureFlagPayload()` (works but no event tracking ⚠️)

> ⚠️ **Note**: Object flags work perfectly but don't appear in PostHog's "Feature flag called" events due to payload-based evaluation. Use boolean flags if you need event tracking.

### Configuration
```bash
# Enable PostHog flags (optional)
ENABLE_POSTHOG_ADAPTER=true
ENDATIX_POSTHOG_KEY=your_posthog_key
```

## 🚀 Usage (Server-Side Only)

### Server Components
```typescript
import { aiFeatures, experimentalFeatures } from '@/lib/feature-flags';

export default async function MyComponent() {
  const ai = await aiFeatures();
  const experimental = await experimentalFeatures();
  
  return (
    <div>
      {ai.enabled && <AIFeatures assistant={ai.assistant} />}
      {experimental && <ExperimentalUI />}
    </div>
  );
}
```

### Server + Client Pattern
```typescript
// Server Component (evaluate flags)
export default async function ServerContainer() {
  const ai = await aiFeatures();
  return <ClientComponent aiFeatures={ai} />;
}

// Client Component (receive as props)
'use client';
export default function ClientComponent({ aiFeatures }: { aiFeatures: AIFeatures }) {
  return aiFeatures.enabled ? <AIChat /> : null;
}
```

## ⚙️ Environment Variables

```bash
# Boolean flags
FLAG_EXPERIMENTAL_FEATURES=true

# String flags  
FLAG_THEME=dark

# Object flags (JSON)
FLAG_AI_FEATURES='{"enabled":true,"assistant":{"enabled":true,"name":"FormBot"}}'
```

## 🔧 Adding New Flags

1. **Define in `flags.ts`**:
```typescript
export const myFeature = flag({
  key: "my-feature", 
  defaultValue: false,
});
```

2. **Use in components**:
```typescript
const isEnabled = await myFeature();
```

## 🎯 Best Practices

- ✅ **Server-side only**: Avoids layout shift and improves performance
- ✅ **Boolean for toggles**: Use for simple on/off features  
- ✅ **Objects for config**: Group related settings together
- ✅ **Meaningful defaults**: Always provide sensible fallbacks
- ❌ **No client hooks**: Use server evaluation + props pattern instead

## 🔄 How It Works

```typescript
// 1. On evaluation, factory decides: PostHog switch + key? PostHogFactory : EnvironmentFactory
// 2. PostHog flags: Vercel flag() with PostHog adapter
// 3. Environment flags: FLAG_* env vars with type conversion
```

For more details, see [Vercel flags documentation](https://flags-sdk.dev/).

## 🔧 Development

- **Local Development**: Uses environment variables and defaults
- **Staging**: Can use PostHog for testing targeting rules
- **Production**: Full PostHog integration with env var fallbacks

## 📚 Further Reading

- [Server-side vs Client-side Principles](https://flags-sdk.dev/principles/server-side-vs-client-side)
- [Precompute Pattern](https://flags-sdk.dev/principles/precompute)
- [Vercel Flags Examples](https://github.com/vercel/flags/tree/main/examples) 