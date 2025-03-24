# PostHog Analytics Integration

Client-side analytics tracking for Next.js applications using PostHog.

## Features

- Client-side event tracking with automatic page views
- User identification (email for logged-in users, persistent IDs for anonymous users)
- React hooks for component integration
- Form and error tracking
- Feature flag support
- Safe initialization across your application

## Setup

1. Environment variables:
   ```
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_api_key
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   NEXT_PUBLIC_POSTHOG_UI_HOST=https://app.posthog.com  # optional
   ```

2. Add PostHog provider:
   ```tsx
   // In app layout.tsx
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

   With custom config (optional):
   ```tsx
   import { PostHogProvider, createPostHogConfig } from '@/hub/features/analytics/posthog';
   
   // Later in your component
   const posthogConfig = createPostHogConfig({
     debug: true,
     uiHost: "https://custom-posthog-ui.example.com"
   });

   <PostHogProvider config={posthogConfig} session={session}>
     {children}
   </PostHogProvider>
   ```

## Architecture

- **Centralized Initialization**: PostHog initializes only once
- **Provider-based Integration**: Primary usage through `PostHogProvider`
- **Standalone Utilities**: For non-React contexts
- **User Identity Management**: Email for logged-in users, persistent IDs for anonymous users

## Usage Examples

### Using Hooks (Within Provider)

```tsx
import { usePostHog } from 'posthog-js/react';
import { useIdentify, trackFeatureUsage } from '@/hub/features/analytics/posthog';

function MyComponent() {
  const posthog = usePostHog();
  const { identifyLoggedInUser } = useIdentify();
  
  const handleClick = () => {
    // Direct posthog usage
    posthog?.capture('button_clicked', { button_id: 'login_button' });
    
    // Or using utility function
    trackFeatureUsage('auth', 'login_attempt');
  };
  
  return <button onClick={handleClick}>Login</button>;
}
```

### User Identification

```tsx
import { useSessionIdentity, useIdentify } from '@/hub/features/analytics/posthog';

// Automatic identity handling with session:
function ProfileComponent({ session }) {
  useSessionIdentity(session);
  return <div>Profile Content</div>;
}

// Manual identity management:
function LoginComponent() {
  const { identifyLoggedInUser } = useIdentify();
  
  const handleLogin = async (credentials) => {
    const user = await loginUser(credentials);
    identifyLoggedInUser(user.email);
  };
  
  return <LoginForm onSubmit={handleLogin} />;
}
```

### Direct Utility Usage (Without Provider)

```typescript
import { 
  trackEvent, 
  isFeatureEnabled, 
  createPostHogConfig 
} from '@/hub/features/analytics/posthog';

// Get configuration
const config = createPostHogConfig();

// Track an event (will initialize PostHog if needed)
trackEvent('checkout_completed', { order_id: '12345' }, config);

// Check a feature flag
const isEnabled = isFeatureEnabled('new-checkout', false, config);
```

## Event Naming Conventions

- Use snake_case for event names
- Include category prefix (e.g., `auth_login`, `payment_completed`)
- For form events, include form identifier and outcome

Example:
```tsx
trackEvent('form_submit', {
  form_id: 'registration',
  success: true,
  time_to_complete_ms: 45000,
  timestamp: new Date().toISOString()
});
```

## Best Practices

- Use `PostHogProvider` for React applications
- Always pass session data for proper user identification
- Include relevant context with events (page, component, identifiers)
- Respect user privacy - no PII unless explicitly allowed
- Handle tracking errors gracefully to prevent app failures
- Use standardized events over custom formats for consistency