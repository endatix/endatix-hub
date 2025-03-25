# PostHog Client-Side Usage Examples

This document provides examples of how to use the PostHog client implementation in the Next.js App Router.

## Client-Side Feature Usage Tracking

```typescript
// In a client component
import { trackFeatureUsage } from '@/features/analytics/posthog';

// Track feature usage
function handleClick() {
  trackFeatureUsage('dashboard', 'filter_applied', {
    filter_type: 'date_range',
    date_from: '2023-01-01',
    date_to: '2023-01-31'
  });
}
```

## Client-Side Event Tracking

```typescript
// Direct Client Usage with Auto-initialization
import { trackEvent, isFeatureEnabled, ensureInitialized } from '@/features/analytics/posthog/client/client';
import { createPostHogConfig } from '@/features/analytics/posthog/shared/config';

// Use in standalone utilities or non-React environments
export function trackCustomEvent(name: string, properties = {}) {
  const config = createPostHogConfig();
  
  // This will ensure PostHog is initialized if needed, or use the existing initialization
  trackEvent(name, properties, config);
}

// Check feature flags outside React components
export function checkFeatureFlag(key: string, defaultValue = false) {
  const config = createPostHogConfig();
  return isFeatureEnabled(key, defaultValue, config);
}

// For scenarios where you want to explicitly initialize PostHog
export function setupAnalytics() {
  const config = createPostHogConfig();
  // Will only initialize if not already initialized
  ensureInitialized(config);
}
```

## Best Practices

1. **Use the PostHogProvider** - It handles initialization automatically
2. **Add error handling** to gracefully handle network or other issues
3. **Use meaningful distinct IDs** for users (anonymous or authenticated)
4. **Add context to events** such as timestamps, page info, and other relevant metadata
5. **Prefer the PostHogProvider** for React applications - it handles initialization automatically
6. **For standalone utilities**, use the client with `ensureInitialized` for safe initialization 