import zod from "zod";

export const SessionBridgeRequestSchema = zod.object({
  access_token: zod.string()
});

export type SessionBridgeRequest = zod.infer<typeof SessionBridgeRequestSchema>;

export const KeycloakTokenResponseSchema = zod.object({
  access_token: zod.string(),
  refresh_token: zod.string(),
  expires_in: zod.number(),
  refresh_expires_in: zod.number(),
  id_token: zod.string(),
  token_type: zod.string(),
  scope: zod.string(),
  session_state: zod.string(),
  issued_token_type: zod.string(),
});

export type KeycloakTokenResponse = zod.infer<
  typeof KeycloakTokenResponseSchema
>;

export const AuthTokenSchema = zod.object({
  id: zod.string(),
  email: zod.string().optional(),
  name: zod.string().optional(),
  picture: zod.string().optional(),
  access_token: zod.string(),
  refresh_token: zod.string(),
  provider: zod.string(),
  iat: zod.number(),
  expires_at: zod.date(),
});

export type AuthToken = zod.infer<typeof AuthTokenSchema>;
