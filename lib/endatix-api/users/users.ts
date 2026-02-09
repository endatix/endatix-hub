import type { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import type { UserListItem } from "./types";

export default class Users {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * List users for the current tenant.
   */
  async list(): Promise<ApiResult<UserListItem[]>> {
    return this.endatix.get<UserListItem[]>("/users");
  }
}
