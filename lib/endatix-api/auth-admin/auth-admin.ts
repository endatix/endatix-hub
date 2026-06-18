import type { EndatixApi } from "../endatix-api";
import type { AuthSettings } from "./types";

export default class AuthAdmin {
  constructor(private readonly endatix: EndatixApi) {}

  async getSettings() {
    return this.endatix.get<AuthSettings>("/admin/auth/settings");
  }
}
