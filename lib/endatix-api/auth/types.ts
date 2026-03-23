import z from "zod";

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
