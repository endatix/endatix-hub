# Global Application Providers

This directory contains provider components that wrap the entire application to provide various global functionalities.

## Components

- **GlobalProvider**: Combines all application-wide providers into a single component
- **ThemeProvider**: Manages theme settings using next-themes
- **AnalyticsProvider**: Configures PostHog analytics tracking

## Usage

To use these providers in your application, update your root layout:

```tsx
// app/layout.tsx
import { GlobalProvider } from '@/hub/components/providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GlobalProvider
          defaultTheme="system"
          enableSystem={true}
          themeAttribute="data-theme"
        >
          {children}
        </GlobalProvider>
      </body>
    </html>
  );
}
```

## Configuration

### Theme Provider Options

- `themeAttribute`: Attribute that holds the theme value (default: "data-theme")
- `defaultTheme`: Default theme to use (default: "system")
- `enableSystem`: Enable system theme detection (default: true)
- `disableTransitionOnChange`: Disable CSS transitions when changing themes (default: false)

### Analytics Provider

The analytics provider automatically configures PostHog based on environment variables. It will only enable tracking if the required environment variables are present. 