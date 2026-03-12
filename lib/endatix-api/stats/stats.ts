import { EndatixApi } from "../endatix-api";
import type { StorageDashboard } from "./types";

export default class Stats {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Get storage statistics dashboard
   * @returns The storage statistics for the current tenant
   */
  async getStorageStats() {
    return this.endatix.get<StorageDashboard>("/admin/storage");
  }
}
