import { z } from "zod";

const MIN_LENGTH = 8;

export const PasswordSchema = z
  .string()
  .min(MIN_LENGTH, {
    error: `Password must be at least ${MIN_LENGTH} characters`,
  })
  .refine((password) => /[A-Z]/.test(password), {
    error: "Password must contain at least one uppercase letter",
  })
  .refine((password) => /[a-z]/.test(password), {
    error: "Password must contain at least one lowercase letter",
  })
  .refine((password) => /[0-9]/.test(password), {
    error: "Password must contain at least one number",
  })
  .refine((password) => /[!@#$%^&*]/.test(password), {
    error: "Password must contain at least one special character",
  });

export const ForgotPasswordRequestSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
});

export const ResetPasswordRequestSchema = z
  .object({
    email: z.email({ error: "Please enter a valid email." }).trim(),
    resetCode: z.string().trim(),
    newPassword: PasswordSchema,
    confirmPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
