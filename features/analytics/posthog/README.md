# PostHog Analytics Integration

This module provides a comprehensive integration with PostHog for analytics tracking in our Next.js application.

## Features

- Client-side and server-side event tracking
- Automatic page view tracking
- User identification and session management
- Standardized event tracking utilities
- React hooks for easier component integration
- Form tracking utilities
- Error tracking

## Getting Started

### Basic Usage

1. The PostHog provider is already set up in the app layout
2. Track events using the provided utilities:

```tsx
import { trackEvent } from '@/hub/features/analytics/posthog';

// Track a simple event
trackEvent('button_clicked', { button_id: 'login_button' });
```

### React Hooks

```tsx
import { useTrackEvent } from '@/hub/features/analytics/posthog';

function MyComponent() {
  const { trackEvent, trackInteraction } = useTrackEvent();
  
  const handleClick = () => {
    trackInteraction('button', 'submit_button', 'click', {
      page: 'checkout',
      section: 'payment'
    });
    
    // Do other things...
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

### Server-Side Tracking

```tsx
import { trackServerEvent } from '@/hub/features/analytics/posthog';

// In a server action
export async function createOrder(data: OrderData) {
  // Process order...
  
  // Track the event
  await trackServerEvent(userId, 'order_created', {
    order_id: newOrder.id,
    total_amount: newOrder.total,
    items_count: newOrder.items.length
  });
  
  return newOrder;
}
```

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