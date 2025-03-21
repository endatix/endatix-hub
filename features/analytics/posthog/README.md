# PostHog Analytics Integration

This module provides a comprehensive integration with PostHog for analytics tracking in our Next.js application.

## Features

- Client-side event tracking
- Automatic page view tracking
- User identification and session management
- Standardized event tracking utilities
- React hooks for easier component integration
- Form tracking utilities
- Error tracking

## Setup

1. Set the following environment variables:
   ```
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_api_key
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # or your custom host
   NEXT_PUBLIC_POSTHOG_UI_HOST=https://app.posthog.com  # (optional) for linking to PostHog UI
   ```

2. Add the PostHog provider to your app:
   ```tsx
   // In your app layout.tsx
   import { PostHogProvider } from '@/hub/features/analytics/posthog';

   export default function RootLayout({ children }) {
     return (
       <PostHogProvider>
         {children}
       </PostHogProvider>
     );
   }
   ```

   With custom config (optional):
   ```tsx
   import { PostHogProvider, createPostHogConfig } from '@/hub/features/analytics/posthog';

   export default function RootLayout({ children }) {
     const posthogConfig = createPostHogConfig({
       debug: true, // Override specific options
       uiHost: "https://custom-posthog-ui.example.com" // Custom UI host
     });

     return (
       <PostHogProvider config={posthogConfig}>
         {children}
       </PostHogProvider>
     );
   }
   ```

## Usage

### Basic Event Tracking

```tsx
import { usePostHog } from '@/hub/features/analytics/posthog';

function MyComponent() {
  const posthog = usePostHog();
  
  const handleClick = () => {
    posthog?.capture('button_clicked', { button_id: 'login_button' });
  };
  
  return <button onClick={handleClick}>Login</button>;
}
```

### Utility Hooks

```tsx
import { useTrackEvent } from '@/hub/features/analytics/posthog';

function MyComponent() {
  const { trackInteraction, trackFeatureUsage } = useTrackEvent();
  
  const handleClick = () => {
    trackInteraction('button', 'submit_button', 'click', {
      page: 'checkout',
      section: 'payment'
    });
    
    // Track feature usage
    trackFeatureUsage('chat', 'open', {
      source: 'sidebar'
    });
  };
  
  return <button onClick={handleClick}>Submit</button>;
}
```

### Form Tracking

```tsx
import { useTrackForms } from '@/hub/features/analytics/posthog';

function CheckoutForm() {
  const { trackView, createSubmitHandler } = useTrackForms({
    formId: 'checkout_form',
    formName: 'Checkout Form',
    trackStartEnabled: true,
    trackCompletion: true
  });
  
  // Track form view on component mount
  useEffect(() => {
    trackView();
  }, [trackView]);
  
  const handleSubmit = createSubmitHandler(async (data) => {
    // Handle form submission...
    await submitOrder(data);
  });
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Implementation Details

- Uses the official PostHog JavaScript client (`posthog-js`) for client-side tracking
- Uses the official PostHog React integration (`posthog-js/react`) for React components
- Includes custom hooks and utilities for standardized event tracking
- Automatically tracks page views via the PostHogPageView component
- Provides user identification utilities for connecting anonymous and logged-in users

## Event Categories

We use standardized event categories for consistency:

- `form` - Form interactions and submissions
- `navigation` - Page navigation and routing
- `interaction` - User interactions (clicks, inputs, etc.)
- `error` - Error tracking
- `system` - System events
- `api` - API calls
- `feature` - Feature usage
- `auth` - Authentication events

## Best Practices

1. **Use standardized events**: Prefer using the provided utilities over custom event tracking to ensure consistency.

2. **Include relevant context**: Always include relevant contextual information with events.

3. **Respect user privacy**: Never track personal identifiable information (PII) unless explicitly allowed.

4. **Performance**: Be mindful of the number of events tracked to avoid performance issues.

5. **Error handling**: Always handle errors gracefully in tracking code to prevent app errors.

## Custom Event Tracking Guidelines

When tracking custom events, follow these naming and property conventions:

1. Event names should be snake_case and descriptive
2. Use the appropriate event category prefix 
3. Include timestamp and context where appropriate
4. For user actions, include the element type and identifier
5. For form events, include form identifier and success status

Example:
```tsx
trackEvent('form_submit', {
  form_id: 'registration_form',
  success: true,
  time_to_complete_ms: 45000,
  timestamp: new Date().toISOString()
});
```