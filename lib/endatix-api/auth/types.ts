import z from "zod";

export const SignInRequestSchema = z.object({
  email: z
    .string()
    .min(1)
    .email({ message: "Please enter a valid email." })
    .trim(),
  password: z.string().min(1, { message: "Please enter a password." }),
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
