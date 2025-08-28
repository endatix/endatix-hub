import { AuthenticationRequest, AuthenticationResponse } from "@/features/auth";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../types";

export default class Auth {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Sign in
   * @param request - The request containing the email and password
   * @returns The response containing the access token and refresh token
   */
  async signIn(
    request: AuthenticationRequest,
  ): Promise<ApiResult<AuthenticationResponse>> {
    return this.endatix.post<AuthenticationResponse>("/auth/login", request, {
      requireAuth: false,
    });
  }
}
