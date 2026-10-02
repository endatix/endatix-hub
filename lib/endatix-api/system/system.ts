import type { EndatixApi } from "../endatix-api";

/** `GET /system/version`: a release has `version`; any other build has `branch` and `commit`. */
export type ProductVersion = {
  readonly version: string | null;
  readonly branch: string | null;
  readonly commit: string | null;
};

/** Installation-level reads: version now, license and similar later. */
export default class System {
  constructor(private readonly endatix: EndatixApi) {}

  getVersion() {
    return this.endatix.get<ProductVersion>("/system/version");
  }
}
