# Global Application Providers

This directory contains provider components that wrap the entire application to provide various global functionalities.

## Components

- **AppProvider**: Main provider component that combines all application-wide providers
- **ThemeProvider**: Manages theme settings using next-themes
- **PostHogProvider**: Configures PostHog analytics tracking (imported from features/analytics)

## Usage

To use these providers in your application, update your root layout:

```tsx
// app/layout.tsx
import { AppProvider } from '@/hub/components/providers';
import { getSession } from '@/features/auth/server';

export default async function RootLayout({ children }) {
  // Optionally get the session for analytics user identification
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <AppProvider
          session={session}
          themeOptions={{
            attribute: "class",
            defaultTheme: "light",
            enableSystem: true
          }}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
```

## Configuration

### AppProvider Options

The AppProvider accepts several options to configure its behavior:

```tsx
interface AppProviderProps {
  children: ReactNode;
  session?: SessionData;               // User session data for analytics
  options?: AppProviderOptions;        // Feature toggles
  themeOptions?: ThemeOptions;         // Theme configuration
}

interface AppProviderOptions {
  enableTheme?: boolean;               // Enable/disable theme (default: true)
  enableAnalytics?: boolean;           // Enable/disable analytics (default: true)
}
```

### Theme Provider Options

- `attribute`: Attribute that holds the theme value (default: "class")
- `defaultTheme`: Default theme to use (default: "light")
- `enableSystem`: Enable system theme detection (default: true)
- `disableTransitionOnChange`: Disable CSS transitions when changing themes (default: true)

### Analytics Provider

The analytics provider automatically configures PostHog based on environment variables. The provider uses email as the identifier for logged-in users and maintains anonymous IDs for non-logged in users. 