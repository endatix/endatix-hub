# PostHog Server Client Usage Examples

This document provides examples of how to use the simplified PostHog server client implementation in the Next.js App Router.

## Basic Server Action Usage

```typescript
// app/actions/submit-form.ts
import { trackServerEvent } from '@/hub/features/analytics/posthog';

export async function submitForm(formData: FormData) {
  // Process form...
  
  // Track the event
  await trackServerEvent(
    'user_123', // User's distinct ID
    'form_submitted', 
    {
      form_id: 'contact_form',
      success: true
    }
  );
  
  // Return result...
}
```

## Direct Client Usage with Automatic Shutdown

This approach is useful when you need to perform multiple operations with the PostHog client.

```typescript
// app/api/process-data/route.ts
import { withPostHog } from '@/hub/features/analytics/posthog/posthog-server';
import { getDefaultPostHogConfig } from '@/hub/features/analytics/posthog/config';

export async function POST(request: Request) {
  const userId = 'user_123';
  const data = await request.json();
  
  // Use withPostHog to handle client creation and shutdown
  const result = await withPostHog(getDefaultPostHogConfig(), async (client) => {
    // Check if user has a feature flag enabled
    const isFeatureEnabled = await client.isFeatureEnabled('new-feature', userId);
    
    // Track an event
    client.capture({
      distinctId: userId,
      event: 'api_call',
      properties: {
        endpoint: '/api/process-data',
        feature_enabled: isFeatureEnabled
      }
    });
    
    // Get all feature flags
    const allFlags = await client.getAllFlags(userId);
    
    // Return processed result
    return {
      success: true,
      featureEnabled: isFeatureEnabled,
      flags: allFlags
    };
  });
  
  return Response.json(result || { success: false });
}
```

## Manual Client Usage

For more advanced scenarios, you can use the client directly. Remember to handle shutdown manually.

```typescript
// app/api/process-batch/route.ts
import { getServerPostHogClient } from '@/hub/features/analytics/posthog';

export async function POST(request: Request) {
  const client = getServerPostHogClient();
  
  if (!client) {
    return Response.json({ success: false, error: 'Analytics client unavailable' });
  }
  
  try {
    const { users } = await request.json();
    
    // Process batch of users
    for (const user of users) {
      // Track events for each user
      client.capture({
        distinctId: user.id,
        event: 'batch_processed',
        properties: {
          user_type: user.type,
          process_time: new Date().toISOString()
        }
      });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error processing batch:', error);
    return Response.json({ success: false, error: 'Processing failed' });
  } finally {
    // Important: Always shut down the client when done
    await client.shutdown();
  }
}
```

## Usage in a Server Component

```tsx
// app/dashboard/page.tsx
import { getServerFeatureFlags } from '@/hub/features/analytics/posthog';
import { getUserId } from '@/lib/auth';

export default async function DashboardPage() {
  const userId = await getUserId();
  
  // Get feature flags for the user
  const featureFlags = await getServerFeatureFlags(userId);
  
  // Track page view
  await trackServerEvent(userId, 'page_view', {
    page: 'dashboard',
    has_new_features: !!featureFlags['new-dashboard']
  });
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {featureFlags['new-dashboard'] && (
        <NewDashboardFeature />
      )}
      
      {/* Other dashboard content */}
    </div>
  );
}
```

## Best Practices

1. **Use the `withPostHog` helper** when possible - it handles client lifecycle automatically
2. **Always call `shutdown()`** when using the client directly to ensure events are sent
3. **Add error handling** to gracefully handle network or other issues
4. **Use meaningful distinct IDs** for users (anonymous or authenticated)
5. **Add context to events** such as timestamps, page info, and other relevant metadata 