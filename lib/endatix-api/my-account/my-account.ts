import { EndatixApi } from "../endatix-api";
import { ChangePasswordRequest } from "./types";

export default class MyAccount {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Change password
   * @param request - The request body
   * @returns The response from the change password endpoint
   */
  async changePassword(request: ChangePasswordRequest) {
    return this.endatix.post<void>("/my-account/change-password", request);
  }
}
