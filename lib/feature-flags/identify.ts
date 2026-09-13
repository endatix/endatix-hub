import { getSession } from "@/features/auth";
import { dedupe } from "flags/next";

export interface FlagEntities {
  distinctId: string;
}

export const identify = dedupe(async (): Promise<FlagEntities> => {
  const session = await getSession();
  return {
    distinctId: session.username || "anonymous",
  };
});
