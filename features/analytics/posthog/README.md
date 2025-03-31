# PostHog Analytics Integration

Analytics tracking for Next.js applications using PostHog, with support for both client and server-side tracking.

## Features

- **Client-Side Tracking**
  - React hooks for component integration
  - Automatic page view tracking
  - Event and exception tracking
  - Feature flag support
  - User identification management

- **Server-Side Tracking**
  - Event tracking from server components and actions
  - Exception tracking for server-side errors
  - Feature flag checking on the server
  - Type-safe interfaces

- **Cross-Environment Support**
  - Consistent API patterns for client and server
  - Error handling and exception tracking
  - Feature flag checking
  - Type-safe interfaces

## Setup

1. Environment variables:
   ```
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_api_key
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   NEXT_PUBLIC_POSTHOG_UI_HOST=https://app.posthog.com  # optional
   ```

2. Add PostHog provider to your root layout:
   ```tsx
   // In app/layout.tsx
   import { PostHogProvider } from '@/features/analytics/posthog';
   import { getSession } from '@/features/auth';
   
   export default async function RootLayout({ children }) {
     const session = await getSession();
     
     return (
       <html lang="en">
         <body>
           <PostHogProvider session={session}>
             {children}
           </PostHogProvider>
         </body>
       </html>
     );
   }
   ```

3. Add page view tracking (optional):
   ```tsx
   // In a client layout component
   "use client";
   import { PostHogPageView } from '@/features/analytics/posthog';
   
   export default function ClientLayout({ children }) {
     return (
       <>
         <PostHogPageView />
         {children}
       </>
     );
   }
   ```

## Client-Side Usage

### Event Tracking with Hooks

```tsx
"use client";
import { useTrackEvent } from '@/features/analytics/posthog';

function CheckoutButton() {
  const { trackEvent } = useTrackEvent();
  
  const handleCheckout = () => {
    // Perform checkout logic
    trackEvent('checkout_started', {
      cart_value: 99.99,
      items_count: 3
    });
  };
  
  return <button onClick={handleCheckout}>Checkout</button>;
}
```

### Feature Flag Checking

```tsx
"use client";
import { useFeatureFlag } from '@/features/analytics/posthog';

function NewFeature() {
  const isEnabled = useFeatureFlag('new-checkout-flow');
  
  if (!isEnabled) {
    return null;
  }
  
  return <div>New Checkout Experience</div>;
}
```

### Exception Tracking

```tsx
"use client";
import { useTrackEvent } from '@/features/analytics/posthog';

function DataComponent() {
  const { trackException } = useTrackEvent();
  
  const fetchData = async () => {
    try {
      const data = await fetchFromAPI();
      return data;
    } catch (error) {
      trackException(error, {
        operation: 'data_fetch',
        component: 'DataComponent'
      });
      // Handle error appropriately
    }
  };
  
  // Component implementation
}
```

## Server-Side Usage

### Tracking in Server Components/Actions

```tsx
// In a server component or server action
import { trackEvent, trackException, isFeatureEnabled } from '@/features/analytics/posthog/server';

export async function processForm(formData: FormData) {
  try {
    // Check if a feature flag is enabled
    const isEnabled = await isFeatureEnabled('advanced-features', false);
    
    // Process form data
    const result = await saveToDatabase(formData);
    
    // Track successful submission
    await trackEvent('form_submitted', {
      form_id: formData.get('id')?.toString(),
      success: true,
      feature_enabled: isEnabled
    });
    
    return result;
  } catch (error) {
    // Track exception
    await trackException(error, {
      form_id: formData.get('id')?.toString(),
      error_type: 'form_processing_error'
    });
    
    throw error;
  }
}
```

## Non-React Context Usage

For utilities, classes and other non-React code:

```typescript
// In a utility class or function
import { trackException } from '@/features/analytics/posthog/client';

export class SubmissionQueue {
  process() {
    try {
      // Processing logic
    } catch (error) {
      // Track exception in non-React context
      trackException(error, {
        queue_length: this.items.length,
        error_type: 'queue_processing_error'
      });
      
      // Handle error appropriately
    }
  }
}
```

## Architecture

### Components

- **Client Hooks**: React hooks for client components
- **Client Utilities**: Direct functions for non-React code
- **Server Module**: Server-side tracking functions
- **Shared Types**: Common types and interfaces

### Key Interfaces

- **Client-Side**:
  - `useTrackEvent()`: Main hook for event tracking
  - `useFeatureFlag(key)`: Hook for feature flag checking
  - `trackException()`: Direct function for error tracking
  
- **Server-Side**:
  - `trackEvent()`: Track events from server
  - `trackException()`: Track exceptions from server
  - `isFeatureEnabled()`: Check feature flags on server

## Error Handling

Our error tracking supports different types of errors:

```typescript
// Error objects
trackException(new Error('Something went wrong'));

// String messages
trackException('Failed to load data');

// With additional context
trackException(error, {
  component: 'UserProfile',
  user_id: user.id,
  operation: 'profile_update'
});
```

## Best Practices

1. **Use the Right Tools for the Context**:
   - In React components: Use hooks (`useTrackEvent`, `useFeatureFlag`)
   - In non-React code: Use direct functions (`trackException`)
   - On the server: Import from `/server` module

2. **Follow Event Naming Conventions**:
   - Use snake_case for event names (`checkout_completed`, `form_submit`)
   - Be consistent with property naming

3. **Include Contextual Data**:
   - For errors: Include component, operation, and identifiers
   - For events: Include relevant business data and context

4. **Handle Errors Gracefully**:
   - Always wrap tracking in try-catch to prevent app crashes
   - Use error tracking to improve application reliability