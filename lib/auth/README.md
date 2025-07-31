# Endatix Auth Configuration

This module provides a flexible authentication configuration system for Endatix applications.

## Features

- **Environment-based configuration**: Configure auth providers via environment variables
- **Programmatic configuration**: Use `withEndatix` wrapper for advanced customization
- **Extensible architecture**: Easy to add new auth providers
- **Sensible defaults**: Works out of the box with minimal configuration

## Quick Start

### Environment Variables (Recommended for simple deployments)

Set these environment variables to configure auth providers:

```bash
# Session Configuration
SESSION_SECRET=your-super-secret-key
SESSION_MAX_AGE=86400

# Keycloak Configuration (optional)
KEYCLOAK_ENABLED=true
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ISSUER=https://your-keycloak/auth/realms/your-realm
KEYCLOAK_SCOPE=openid email profile
```

### Programmatic Configuration (Advanced)

For more complex deployments, use the `withEndatix` wrapper:

```typescript
// next.config.ts
import { withEndatix } from './lib/auth/with-endatix';

const nextConfig = {
  // ... your Next.js config
};

const authConfig = {
  auth: {
    providers: {
      credentials: { enabled: true },
      keycloak: {
        enabled: true,
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        issuer: 'https://your-keycloak/auth/realms/your-realm',
        scope: 'openid email profile',
      },
    },
    session: {
      secret: 'your-secret',
      maxAge: 86400,
    },
  },
};

export default withEndatix(nextConfig, authConfig);
```

## Supported Auth Providers

### Credentials Provider
- **Status**: Always enabled as fallback
- **Configuration**: No additional configuration required
- **Use case**: Username/password authentication against Endatix API

### Keycloak Provider
- **Status**: Optional, enabled via `KEYCLOAK_ENABLED=true`
- **Required config**: `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ISSUER`
- **Use case**: SSO with Keycloak identity provider

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SESSION_SECRET` | Secret for session encryption | `'your-secret-key'` | Yes |
| `SESSION_MAX_AGE` | Session duration in seconds | `86400` (24h) | No |
| `KEYCLOAK_ENABLED` | Enable Keycloak provider | `false` | No |
| `KEYCLOAK_CLIENT_ID` | Keycloak client ID | - | If Keycloak enabled |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak client secret | - | If Keycloak enabled |
| `KEYCLOAK_ISSUER` | Keycloak issuer URL | - | If Keycloak enabled |
| `KEYCLOAK_SCOPE` | Keycloak scope | `'openid email profile'` | No |

## Architecture

The auth system is built with extensibility in mind:

```
lib/auth/
├── auth-config.ts          # Environment-based configuration
├── auth-provider-factory.ts # Dynamic provider creation
├── with-endatix.ts         # Next.js configuration wrapper
└── README.md              # This documentation
```

## Extending with Custom Providers

To add a new auth provider:

1. Create a new provider implementation in `features/auth/infrastructure/`
2. Register it in the `AuthProviderRouter`
3. Add configuration options to `auth-config.ts`
4. Update the factory in `auth-provider-factory.ts`

## Migration Guide

### From Hardcoded Auth Configuration

1. Remove hardcoded provider configuration from `auth.ts`
2. Set environment variables for your auth providers
3. The system will automatically detect and configure enabled providers

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  endatix-hub:
    build: .
    environment:
      - SESSION_SECRET=your-secret
      - KEYCLOAK_ENABLED=true
      - KEYCLOAK_CLIENT_ID=your-client-id
      - KEYCLOAK_CLIENT_SECRET=your-client-secret
      - KEYCLOAK_ISSUER=https://your-keycloak/auth/realms/your-realm
```

## Troubleshooting

### Keycloak not working
- Ensure `KEYCLOAK_ENABLED=true`
- Verify all required Keycloak environment variables are set
- Check Keycloak server logs for authentication errors

### Session issues
- Ensure `SESSION_SECRET` is set and unique
- Verify `SESSION_MAX_AGE` is a valid number

### Provider not loading
- Check environment variables are correctly set
- Verify provider is enabled in configuration
- Check browser console for authentication errors 