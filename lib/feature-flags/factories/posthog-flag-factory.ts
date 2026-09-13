import { dedupe, flag } from "flags/next";
import { createPostHogAdapter, type PostHogEntities } from "@flags-sdk/posthog";
import type { Identify } from "flags";
import type { FlagFactory, FlagDefinition } from "./flag-factory.interface";
import {
  readPublicEndatixEnv,
  resolvePostHogNodeHost,
} from "@/features/config/client-endatix-config";
import { identify } from "../utils";

const postHogIdentify = dedupe(async (): Promise<PostHogEntities> => {
  const entities = await identify();
  return {
    distinctId: entities.distinctId,
  };
}) satisfies Identify<PostHogEntities>;

/**
 * Builds a v1 PostHog adapter from Hub runtime env (`POSTHOG_PROJECT_API_KEY`,
 * `POSTHOG_HOST`). Does not use the package default `postHogAdapter`, which
 * reads those names only at first decide and has no Hub host default.
 */
export class PostHogFlagFactory implements FlagFactory {
  private readonly adapter: ReturnType<typeof createPostHogAdapter>;

  constructor() {
    const { posthogKey, posthogHost } = readPublicEndatixEnv();
    this.adapter = createPostHogAdapter({
      postHogKey: posthogKey,
      postHogOptions: {
        host: resolvePostHogNodeHost(posthogHost),
        // Server IPs are not user locations; geo targeting must come from PostHog person
        // properties, not from where Hub happens to run.
        disableGeoip: true,
      },
    });
  }

  createFlag<T>(definition: FlagDefinition<T>): () => Promise<T> {
    const usePayload =
      typeof definition.defaultValue === "object" ||
      Boolean(definition.parsePayload);

    return flag<T, PostHogEntities>({
      key: definition.key,
      adapter: usePayload ? this.adapter.payload : this.adapter,
      defaultValue: definition.defaultValue,
      identify: postHogIdentify,
    });
  }
}
