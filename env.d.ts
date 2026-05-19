declare namespace NodeJS {
  interface ProcessEnv {
    // Environment
    NODE_ENV: "development" | "production" | "test";
    REMOTE_IMAGE_HOSTNAMES?: string;
    ROBOTS_ALLOWED_DOMAINS?: string;
    ENDATIX_BASE_URL?: string;
    AI_API_BASE_URL?: string;

    // Experimental features
    ENDATIX_ENABLE_EXTENSIONS?: string;

    // Session
    SESSION_SECRET?: string;
    SESSION_MAX_AGE_IN_MINUTES?: string;

    // Auth Providers
    AUTH_KEYCLOAK_ENABLED?: string;
    AUTH_KEYCLOAK_CLIENT_ID?: string;
    AUTH_KEYCLOAK_CLIENT_SECRET?: string;
    AUTH_KEYCLOAK_ISSUER?: string;

    AUTH_GOOGLE_ENABLED?: string;
    AUTH_GOOGLE_CLIENT_ID?: string;
    AUTH_GOOGLE_CLIENT_SECRET?: string;

    // Data Collection
    NEXT_FORMS_COOKIE_NAME?: string;
    NEXT_FORMS_COOKIE_DURATION_DAYS?: string;

    // ReCaptcha
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY?: string;

    // Slack
    SLACK_CLIENT_ID?: string;
    SLACK_CLIENT_SECRET?: string;
    SLACK_REDIRECT_URI?: string;

    // Storage:General
    
    /** Set to `azure`, `s3`, or `none`. Required for storage registration (no credential-only auto mode). */
    STORAGE_PROVIDER?: string;
    USER_FILES_STORAGE_CONTAINER_NAME?: string;
    CONTENT_STORAGE_CONTAINER_NAME?: string;

    // Storage: S3-compatible (RustFS)
    S3_ENDPOINT?: string;
    S3_ACCESS_KEY_ID?: string;
    S3_SECRET_ACCESS_KEY?: string;
    S3_REGION?: string;
    S3_FORCE_PATH_STYLE?: string;
    S3_PUBLIC_BASE_URL?: string;
    S3_IS_PRIVATE?: string;
    S3_SAS_READ_EXPIRY_MINUTES?: string;
    S3_SAS_WRITE_EXPIRY_SECONDS?: string;

    // Storage:Azure
    AZURE_STORAGE_ACCOUNT_NAME?: string;
    AZURE_STORAGE_ACCOUNT_KEY?: string;
    AZURE_STORAGE_CUSTOM_DOMAIN?: string;
    AZURE_STORAGE_IS_PRIVATE?: string;
    AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES?: string;

    // Image Resize
    RESIZE_IMAGES?: string;
    RESIZE_IMAGES_WIDTH?: string;

    // Public
    NEXT_PUBLIC_SLK?: string;
    NEXT_PUBLIC_NAME?: string;

    // Telemetry
    OTEL_LOG_LEVEL?: string;
    APPLICATIONINSIGHTS_CONNECTION_STRING?: string;

    // PostHog
    NEXT_PUBLIC_POSTHOG_KEY?: string;
    NEXT_PUBLIC_POSTHOG_HOST?: string;
    NEXT_PUBLIC_POSTHOG_UI_HOST?: string;
    ENABLE_POSTHOG_ADAPTER?: string;

    // Build-time mirror from withEndatix (resolveEndatixSettings envPatch) — flags and hostnames only, never secrets
    ENDATIX_RESOLVED_STORAGE_VERSION?: string;
    ENDATIX_RESOLVED_STORAGE_PROVIDER?: string;
    ENDATIX_RESOLVED_AZURE_CREDENTIALS?: string;
    ENDATIX_RESOLVED_S3_CREDENTIALS?: string;
    ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES?: string;

    // Application settings
    NEXT_PUBLIC_IS_DEBUG_MODE?: string; // Application-level debug flag

    // Hub maintenance (see docs — proxy rewrite + /maintenance page)
    MAINTENANCE_MODE?: string;
    MAINTENANCE_RETRY_AFTER_SECONDS?: string;
    MAINTENANCE_BADGE_LABEL?: string;
    MAINTENANCE_TITLE?: string;
    MAINTENANCE_CARD_DESCRIPTION?: string;
    MAINTENANCE_BODY?: string;
    MAINTENANCE_FOOTER?: string;
    MAINTENANCE_METADATA_TITLE?: string;
    MAINTENANCE_METADATA_DESCRIPTION?: string;
  }
}
