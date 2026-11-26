import "server-only";
import { cache } from "react";
import { EndatixApi } from "@/lib/endatix-api";

/** Page permissions and standing use the same snapshot for this render only. */
export const currentAuthorization = cache((token: string) =>
  new EndatixApi(token).auth.getAuthorizationData(),
);
