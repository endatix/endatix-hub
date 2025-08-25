import { z } from "zod";
import { PasswordSchema } from "../types";

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().nonempty(),
    newPassword: PasswordSchema,
    confirmPassword: z.string().nonempty(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
