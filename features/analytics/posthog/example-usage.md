# PostHog Analytics Usage Examples

This document provides examples of how to use the PostHog integration in Next.js, covering both client and server-side tracking.

## Client-Side Tracking with React Hooks

### Event Tracking in React Components

```tsx
// In a client component
"use client";

import { useTrackEvent } from '@/features/analytics/posthog';

function MyComponent() {
  const { trackEvent, trackFeatureUsage, trackException } = useTrackEvent();
  
  // Standard event tracking
  const handleClick = () => {
    trackEvent('button_clicked', {
      button_id: 'submit_button',
      page: 'checkout'
    });
  };
  
  // Feature usage tracking
  const handleFeatureUse = () => {
    trackFeatureUsage('dashboard', 'filter_applied', {
      filter_type: 'date_range',
      date_from: '2023-01-01',
      date_to: '2023-01-31'
    });
  };
  
  // Form tracking
  const handleFormSubmit = (formId, success) => {
    trackFormSubmit(formId, success, 'Checkout Form', success ? null : 'Payment declined');
  };
  
  // Error tracking
  try {
    // Some code that might throw
  } catch (error) {
    trackException(error, {
      component: 'MyComponent',
      action: 'data_processing'
    });
  }
  
  return (
    <div>
      <button onClick={handleClick}>Submit</button>
      <button onClick={handleFeatureUse}>Apply Filter</button>
    </div>
  );
}
```

### Page View Tracking

```tsx
// In a layout or page component
"use client";

import { PostHogPageView } from '@/features/analytics/posthog';

export default function Layout({ children }) {
  return (
    <>
      {/* Add auto page view tracking */}
      <PostHogPageView 
        getPageProperties={(pathname, searchParams) => ({
          section: pathname.split('/')[1],
          has_query: searchParams.toString().length > 0
        })}
      />
      {children}
    </>
  );
}
```

### Feature Flag Checking

```tsx
"use client";

import { useFeatureFlag } from '@/features/analytics/posthog';

function FeatureComponent() {
  const isEnabled = useFeatureFlag('new-feature');
  
  if (!isEnabled) {
    return null;
  }
  
  return <div>New Feature UI</div>;
}
```

## Server-Side Tracking

```tsx
// In a server component or server action
import { trackEvent, trackException, isFeatureEnabled } from '@/features/analytics/posthog/server';

export async function serverAction(formData: FormData) {
  try {
    // Check if a feature flag is enabled on the server
    const isEnabled = await isFeatureEnabled('server-feature', false);
    
    // Process form data
    const result = await processData(formData);
    
    // Track successful operation
    await trackEvent('form_processed', {
      form_id: formData.get('id')?.toString(),
      success: true,
      feature_enabled: isEnabled
    });
    
    return result;
  } catch (error) {
    // Track error on the server
    await trackException(error, {
      operation: 'form_processing',
      form_id: formData.get('id')?.toString()
    });
    
    throw error;
  }
}
```

## Exception Tracking

### In React Components

```tsx
"use client";

import { useTrackEvent } from '@/features/analytics/posthog';

function ErrorProneComponent() {
  const { trackException } = useTrackEvent();
  
  const handleRiskyOperation = () => {
    try {
      // Risky operation
      performComplexOperation();
    } catch (error) {
      // Track the error with context
      trackException(error, {
        component: 'ErrorProneComponent',
        operation: 'complex_operation',
        user_triggered: true
      });
      
      // Show user-friendly message
      showErrorMessage("Something went wrong");
    }
  };
  
  return <button onClick={handleRiskyOperation}>Perform Operation</button>;
}
```

### In Non-React Contexts

```typescript
// In a utility or service
import { trackException } from '@/features/analytics/posthog/client';

export class DataProcessor {
  process(data) {
    try {
      // Process data
      return transformData(data);
    } catch (error) {
      // Track exception in non-React context
      trackException(error, {
        service: 'DataProcessor',
        data_size: data.length,
        error_type: 'processing_failure'
      });
      
      // Re-throw or handle as needed
      throw error;
    }
  }
}
```

### String Error Messages

```typescript
// Both Error objects and string messages are supported
import { trackException } from '@/features/analytics/posthog/client';

// With Error object
try {
  // Some operation
} catch (error) {
  trackException(error, { context: 'operation' });
}

// With string message
function handleMissingData() {
  trackException('Missing required data', { 
    severity: 'warning',
    feature: 'data_import'
  });
}
```

## Best Practices

1. **Use Hooks in React Components**: Use `useTrackEvent` and other hooks for React components
2. **Use Direct Functions for Non-React Code**: Use `trackException` and other direct functions for classes and utilities
3. **Include Contextual Data**: Always include relevant context with tracked events and errors
4. **Handle Errors Gracefully**: Track exceptions but ensure your app continues to function
5. **Use Server Module for Server-Side Tracking**: Import from `@/features/analytics/posthog/server` for server components and actions
6. **Use Standard Event Names**: Follow consistent naming conventions for events 