export type EndatixJwtProviderDetails = {
  signingKeyConfigured: boolean;
  reBacIssuer: string | null;
  formAccessTokenExpiryMinutes: number | null;
};

export type KeycloakProviderDetails = {
  clientId: string | null;
  clientSecretConfigured: boolean;
  roleMappingsConfigured: boolean;
  roleMappingCount: number;
  rolesPath: string | null;
  rejectDuplicateEmail: boolean;
};

export type AuthProviderSettings = {
  providerId: string;
  displayName: string;
  isRegistered: boolean;
  isEnabled: boolean;
  isActive: boolean;
  issuer: string | null;
  audiences: string[];
  accessExpiryMinutes: number | null;
  refreshExpiryDays: number | null;
  requireHttpsMetadata: boolean | null;
  endatixJwt: EndatixJwtProviderDetails | null;
  keycloak: KeycloakProviderDetails | null;
};

export type AuthSettings = {
  platformAdminRequiresLocalApproval: boolean;
  configurationErrors: string[];
  providers: AuthProviderSettings[];
};
