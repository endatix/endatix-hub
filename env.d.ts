declare namespace NodeJS {
  interface ProcessEnv {
    // Environment
    NODE_ENV: "development" | "production" | "test";
    REMOTE_IMAGE_HOSTNAMES?: string;
    ROBOTS_ALLOWED_DOMAINS?: string;
    ENDATIX_BASE_URL?: string;
    AI_API_BASE_URL?: string;

    // Session
    SESSION_SECRET?: string;
    SESSION_MAX_AGE?: string;

    // Auth Providers
    KEYCLOAK_ENABLED?: string;
    KEYCLOAK_CLIENT_ID?: string;
    KEYCLOAK_CLIENT_SECRET?: string;
    KEYCLOAK_ISSUER?: string;
    KEYCLOAK_AUTHORIZATION_URL?: string;
    KEYCLOAK_TOKEN_URL?: string;
    KEYCLOAK_USERINFO_URL?: string;
    KEYCLOAK_SCOPE?: string;

    // Data Collection
    NEXT_FORMS_COOKIE_NAME?: string;
    NEXT_FORMS_COOKIE_DURATION_DAYS?: string;

    // ReCaptcha
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY?: string;

    // Slack
    SLACK_CLIENT_ID?: string;
    SLACK_CLIENT_SECRET?: string;
    SLACK_REDIRECT_URI?: string;

    // Storage
    AZURE_STORAGE_ACCOUNT_NAME?: string;
    AZURE_STORAGE_ACCOUNT_KEY?: string;
    USER_FILES_STORAGE_CONTAINER_NAME?: string;
    CONTENT_STORAGE_CONTAINER_NAME?: string;

    // Image Resize
    RESIZE_IMAGES?: string;
    RESIZE_IMAGES_WIDTH?: string;

    // Public
    NEXT_PUBLIC_SLK?: string;
    NEXT_PUBLIC_NAME?: string;

    // Telemetry
    OTEL_LOG_LEVEL?: boolean;
    APPLICATIONINSIGHTS_CONNECTION_STRING?: string;

    // PostHog
    NEXT_PUBLIC_POSTHOG_KEY?: string;
    NEXT_PUBLIC_POSTHOG_HOST?: string;
    NEXT_PUBLIC_POSTHOG_UI_HOST?: string;
    ENABLE_POSTHOG_ADAPTER?: string;
    // Application settings
    NEXT_PUBLIC_IS_DEBUG_MODE?: string; // Application-level debug flag
  }
}
