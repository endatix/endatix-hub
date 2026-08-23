/** Server-safe Hub runtime snapshot for platform admin (no secrets). */
export type EnvironmentAdminSummary = {
  readonly apiUrl: string;
  readonly apiConfigured: boolean;
  readonly baseUrl: string | null;
  readonly prefix: string | null;
  readonly extensionsEnabled: boolean;
};
