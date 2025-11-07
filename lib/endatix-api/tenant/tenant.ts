import { EndatixApi } from "../endatix-api";
import type { TenantSettings } from "./types";

export default class Tenant {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Get tenant settings
   * @returns The tenant settings for the current tenant
   */
  async getSettings() {
    return this.endatix.get<TenantSettings>("/tenant-settings");
  }
}
