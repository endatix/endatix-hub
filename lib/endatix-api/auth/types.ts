import z from "zod";

export const SignInRequestSchema = z.object({
  email: z
    .string()
    .min(1)
    .email({ message: "Please enter a valid email." })
    .trim(),
  password: z.string().min(1, { message: "Please enter a password." }),
});

export type SignInRequest = z.infer<typeof SignInRequestSchema>;

export interface SignInResponse {
  email: string;
  accessToken: string;
  refreshToken: string;
}
