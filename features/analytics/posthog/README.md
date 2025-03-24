# PostHog Analytics Integration

This module provides a comprehensive integration with PostHog for analytics tracking in our Next.js application.

## Features

- Client-side event tracking
- Automatic page view tracking
- User identification with email for logged-in users
- Anonymous user tracking with persistent IDs
- Standardized event tracking utilities
- React hooks for easier component integration
- Form tracking utilities
- Error tracking
- Centralized initialization logic that's safe to use across your application

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
   import { getSession } from '@/features/auth';
   
   export default async function RootLayout({ children }) {
     // Get user session for identification
     const session = await getSession();
     
     return (
       <PostHogProvider session={session}>
         {children}
       </PostHogProvider>
     );
   }
   ```

   With custom config (optional):
   ```tsx
   import { PostHogProvider, createPostHogConfig } from '@/hub/features/analytics/posthog';
   import { getSession } from '@/features/auth';

   export default async function RootLayout({ children }) {
     // Get user session for identification
     const session = await getSession();
     
     const posthogConfig = createPostHogConfig({
       debug: true, // Override specific options
       uiHost: "https://custom-posthog-ui.example.com" // Custom UI host
     });

     return (
       <PostHogProvider config={posthogConfig} session={session}>
         {children}
       </PostHogProvider>
     );
   }
   ```

## Architecture

The PostHog integration follows these key design principles:

1. **Centralized Initialization**: PostHog is initialized only once, regardless of how many times the initialization function is called. This prevents duplicate initialization issues.

2. **Provider-based Integration**: The primary method of using PostHog is through the `PostHogProvider`, which handles initialization and core functionality.

3. **Standalone Utility Support**: For non-React contexts or custom usage scenarios, the client exports utility functions that can safely initialize PostHog when needed.

4. **Safe Feature Detection**: All methods check for the presence of PostHog before attempting operations, providing graceful fallbacks.

5. **User Identity Management**: The system uses email addresses as identifiers for logged-in users and generates persistent anonymous IDs for non-logged in users.

## User Identification

The system handles user identification with the following approach:

1. **Logged-in users**: Identified by their email address
2. **Anonymous users**: Assigned a persistent anonymous ID stored in localStorage
3. **Multi-user handling**: When different users log in on the same device, the system ensures proper identity separation

You can use the identity hooks directly in your components:

```tsx
import { useIdentify, useSessionIdentity } from '@/hub/features/analytics/posthog';

// For automatic session-based identity handling:
function MyComponent({ session }) {
  // This will automatically handle identity based on session
  useSessionIdentity(session);
  
  return <div>My Component</div>;
}

// For manual identity management:
function AnotherComponent() {
  const { identifyLoggedInUser } = useIdentify();
  
  const handleLogin = (email) => {
    // Identify user after login
    identifyLoggedInUser(email);
  };
  
  return <div>Another Component</div>;
}
```

## Usage Examples

### Using the Provider (Recommended)

```tsx
// In your app layout.tsx
import { PostHogProvider } from '@/hub/features/analytics/posthog';
import { getSession } from '@/features/auth';

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <PostHogProvider session={session}>
      {children}
    </PostHogProvider>
  );
}
```

### Using Hooks (Within Provider Context)

```tsx
import { usePostHog } from 'posthog-js/react';
import { useIdentify } from '@/hub/features/analytics/posthog';

function MyComponent() {
  const posthog = usePostHog();
  const { identifyLoggedInUser } = useIdentify();
  
  const handleClick = () => {
    posthog?.capture('button_clicked', { button_id: 'login_button' });
  };
  
  const handleLogin = (email) => {
    identifyLoggedInUser(email);
  };
  
  return <button onClick={handleClick}>Login</button>;
}
```

### Direct Utility Usage (Without Provider)

For scenarios where you need to use PostHog outside of the React component tree:

```typescript
// In any client-side code
import { trackEvent, isFeatureEnabled } from '@/hub/features/analytics/posthog/client/client';
import { createPostHogConfig } from '@/hub/features/analytics/posthog/shared/config';

// Get configuration
const config = createPostHogConfig();

// Track an event (will initialize PostHog if needed)
trackEvent('button_clicked', { button_id: 'checkout' }, config);

// Check a feature flag (will initialize PostHog if needed)
const isEnabled = isFeatureEnabled('new-feature', false, config);
```

## Best Practices

1. **Use the Provider when possible**: The PostHogProvider handles initialization and provides context for all hooks.

2. **Always pass session data**: Always pass the user session to the PostHogProvider for proper user identification.

3. **For non-React contexts**: Use the utility functions with configuration to ensure proper initialization.

4. **Avoid manual initialization**: Let the system handle PostHog initialization; just use the tracking functions.

5. **Use standardized events**: Prefer using the provided utilities over custom event tracking to ensure consistency.

6. **Include relevant context**: Always include relevant contextual information with events.

7. **Respect user privacy**: Never track personal identifiable information (PII) unless explicitly allowed.

8. **Performance**: Be mindful of the number of events tracked to avoid performance issues.

9. **Error handling**: Always handle errors gracefully in tracking code to prevent app errors.

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