import { EndatixApi } from "../endatix-api";
import {
  ApiResult,
  SignInRequest,
  SignInResponse,
} from "../types";

export default class Auth {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Sign in
   * @param request - The request containing the email and password
   * @returns The response containing the access token and refresh token
   */
  async signIn(
    request: SignInRequest,
  ): Promise<ApiResult<SignInResponse>> {
    return this.endatix.post<SignInResponse>("/auth/login", request, {
      requireAuth: false,
    });
  }
}
