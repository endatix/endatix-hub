import { EndatixApi } from "../endatix-api";
import { ForgotPasswordRequest, ResetPasswordRequest } from "./types";

export default class Account {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Forgot password
   * @param email - The email of the user to send the forgot password email to
   * @returns The response from the forgot password endpoint
   */
  async forgotPassword(request: ForgotPasswordRequest) {
    return this.endatix.post<void>("/auth/forgot-password", request, {
      requireAuth: false,
    });
  }

  /**
   * Reset password
   * @param email - The email of the user to send the forgot password email to
   * @param resetCode - The reset code to use to reset the password
   * @param newPassword - The new password to set
   * @returns The response from the reset password endpoint
   */
  async resetPassword(request: ResetPasswordRequest) {
    return this.endatix.post<void>("/auth/reset-password", request, {
      requireAuth: false,
    });
  }
}
