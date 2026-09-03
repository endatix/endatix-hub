import z from "zod";
import { PasswordSchema } from "../account/types";

export const SignInRequestSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }),
  password: z.string().min(1, { error: "Please enter a password." }),
  returnUrl: z.string().optional(),
});

export type SignInRequest = z.infer<typeof SignInRequestSchema>;

export interface SignInResponse {
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  accessToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AssumeTenantRequest {
  tenantId: string;
}

export interface AssumeTenantResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  tenantSlug?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export interface PublicTenant {
  shortUrl: string;
  name: string;
  selfRegistrationEnabled: boolean;
  allowedAuthProviders: string[];
}

export const ActivateInviteRequestSchema = z
  .object({
    token: z.string().trim().min(1, { error: "Invite token is required." }),
    password: PasswordSchema,
    confirmPassword: z.string().trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ActivateInviteRequest = z.infer<typeof ActivateInviteRequestSchema>;

export const InviteDetailsRequestSchema = z.object({
  token: z.string().trim().min(1, { error: "Invite token is required." }),
});

export type InviteDetailsRequest = z.infer<typeof InviteDetailsRequestSchema>;

export interface InviteDetailsResponse {
  email: string;
}

export interface ActivateInviteResponse {
  success: boolean;
  message: string;
  email?: string;
}

export interface SendVerificationEmailRequest {
  email: string;
}

export interface AuthorizationData {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  isAdmin: boolean;
  cachedAt: string;
  expiresAt: string;
  eTag: string;
}
