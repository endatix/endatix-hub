declare namespace NodeJS {
  interface ProcessEnv {
    // Environment
    NODE_ENV: "development" | "production" | "test";
    REMOTE_IMAGE_HOSTNAMES?: string;
    ROBOTS_ALLOWED_DOMAINS?: string;
    ENDATIX_BASE_URL?: string;
    ENDATIX_API_URL?: string;
    ENDATIX_API_PREFIX?: string;
    AI_API_BASE_URL?: string;

    // Experimental features
    ENDATIX_ENABLE_EXTENSIONS?: string;

    // Public, request-time client config. Projected to the browser by
    // `getClientEndatixConfig()` from `@/features/config/server` — deliberately NOT
    // `NEXT_PUBLIC_*`, which Next inlines into the client bundle at build time.
    ENDATIX_RECAPTCHA_SITE_KEY?: string;
    ENDATIX_POSTHOG_KEY?: string;
    ENDATIX_POSTHOG_HOST?: string;
    ENDATIX_POSTHOG_UI_HOST?: string;
    ENDATIX_IS_DEBUG_MODE?: string;
    ENDATIX_SUBMITTER_PRIMARY_FILTER_LABEL?: string;
    ENDATIX_SUBMITTER_GRID_PROFILE_FIELDS?: string;

    /**
     * SurveyJS Creator licence key. NOT part of the shared projection above: that object
     * is serialised into the HTML of every page mounting AppProvider, including the
     * anonymous public form routes. Read server-side and provided only to the
     * authenticated shell, via SurveyLicenseProvider.
     *
     * Perpetual: the embedded date governs eligibility for updates and support, not the
     * right to run, so an existing deployment keeps working. A new key is needed when
     * upgrading the SurveyJS packages beyond the window it covers — and replacing it must
     * be a config change, never an image rebuild.
     */
    ENDATIX_SURVEY_LICENSE_KEY?: string;

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
    /** @deprecated Build-time inlined. Use ENDATIX_RECAPTCHA_SITE_KEY. */
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY?: string;

    // Slack
    SLACK_CLIENT_ID?: string;
    SLACK_CLIENT_SECRET?: string;
    SLACK_REDIRECT_URI?: string;

    // Storage:General
    /** Set to `azure`, `s3`, or `none`. Required for storage registration (no credential-only auto mode). */
    STORAGE_PROVIDER?: string;
    /** Defaults to true. Set to "false" only for public storage. */
    STORAGE_IS_PRIVATE?: string;
    STORAGE_USER_FILES_CONTAINER_NAME?: string;
    STORAGE_CONTENT_FILES_CONTAINER_NAME?: string;

    // Storage: S3-compatible (RustFS)
    STORAGE_S3_ENDPOINT?: string;
    STORAGE_S3_ACCESS_KEY_ID?: string;
    STORAGE_S3_SECRET_ACCESS_KEY?: string;
    STORAGE_S3_REGION?: string;
    STORAGE_S3_FORCE_PATH_STYLE?: string;
    STORAGE_S3_READ_EXPIRY_MINUTES?: string;
    STORAGE_S3_WRITE_EXPIRY_SECONDS?: string;

    // Storage:Azure
    STORAGE_AZURE_ACCOUNT_NAME?: string;
    STORAGE_AZURE_ACCOUNT_KEY?: string;
    STORAGE_AZURE_ENDPOINT?: string;
    STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES?: string;
    STORAGE_AZURE_SAS_WRITE_EXPIRY_SECONDS?: string;

    // Storage:Azure legacy fallbacks
    AZURE_STORAGE_ACCOUNT_NAME?: string;
    AZURE_STORAGE_ACCOUNT_KEY?: string;
    AZURE_STORAGE_CUSTOM_DOMAIN?: string;
    AZURE_STORAGE_IS_PRIVATE?: string;
    AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES?: string;
    USER_FILES_STORAGE_CONTAINER_NAME?: string;
    CONTENT_STORAGE_CONTAINER_NAME?: string;

    // Image Resize
    RESIZE_IMAGES?: string;
    RESIZE_IMAGES_WIDTH?: string;

    // Public
    /** @deprecated Build-time inlined. Use ENDATIX_SURVEY_LICENSE_KEY. */
    NEXT_PUBLIC_SLK?: string;
    /** @deprecated Build-time inlined. Use ENDATIX_SUBMITTER_PRIMARY_FILTER_LABEL. */
    NEXT_PUBLIC_SUBMITTER_PRIMARY_FILTER_LABEL?: string;
    /** @deprecated Build-time inlined. Use ENDATIX_SUBMITTER_GRID_PROFILE_FIELDS. */
    NEXT_PUBLIC_SUBMITTER_GRID_PROFILE_FIELDS?: string;
    NEXT_PUBLIC_NAME?: string;

    // Telemetry
    OTEL_LOG_LEVEL?: string;
    OTEL_EXPORTER_OTLP_ENDPOINT?: string;
    APPLICATIONINSIGHTS_CONNECTION_STRING?: string;
    TELEMETRY_CONSOLE_FALLBACK?: string;

    // PostHog
    /** @deprecated Build-time inlined. Use ENDATIX_POSTHOG_KEY. */
    NEXT_PUBLIC_POSTHOG_KEY?: string;
    /** @deprecated Build-time inlined. Use ENDATIX_POSTHOG_HOST. */
    NEXT_PUBLIC_POSTHOG_HOST?: string;
    /** @deprecated Build-time inlined. Use ENDATIX_POSTHOG_UI_HOST. */
    NEXT_PUBLIC_POSTHOG_UI_HOST?: string;
    ENABLE_POSTHOG_ADAPTER?: string;

    // Build-time mirror from withEndatix (resolveEndatixSettings envPatch) — flags and hostnames only, never secrets
    ENDATIX_RESOLVED_STORAGE_VERSION?: string;
    ENDATIX_RESOLVED_STORAGE_PROVIDER?: string;
    ENDATIX_RESOLVED_AZURE_CREDENTIALS?: string;
    ENDATIX_RESOLVED_S3_CREDENTIALS?: string;
    ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES?: string;

    // Application settings
    /** @deprecated Build-time inlined. Use ENDATIX_IS_DEBUG_MODE. */
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
