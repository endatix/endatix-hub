import { dedupe, flag } from "flags/next";
import { createPostHogAdapter, PostHogEntities } from "@flags-sdk/posthog";
import type { FlagFactory, FlagDefinition } from "./flag-factory.interface";
import { identify } from "../utils";
import { Identify } from "flags";

const postHogIdentify = dedupe(async (): Promise<PostHogEntities> => {
  const entities = await identify();
  return {
    distinctId: entities.distinctId,
  };
}) satisfies Identify<PostHogEntities>;

export class PostHogFlagFactory implements FlagFactory {
  private postHogAdapter: ReturnType<typeof createPostHogAdapter>;

  constructor() {
    this.postHogAdapter = createPostHogAdapter({
      postHogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      postHogOptions: {
        host: "https://us.i.posthog.com",
      },
    });
  }

  createFlag<T>(definition: FlagDefinition<T>): () => Promise<T> {
    // Complex objects (non-primitive types) use featureFlagPayload
    if (
      typeof definition.defaultValue === "object" ||
      definition.parsePayload
    ) {
      const parser =
        definition.parsePayload || ((payload: unknown) => payload as T);
      return flag<T, PostHogEntities>({
        key: definition.key,
        adapter: this.postHogAdapter.featureFlagPayload<T>(parser, {
          sendFeatureFlagEvents: true,
        }),
        defaultValue: definition.defaultValue,
        identify: postHogIdentify,
      });
    }

    // Boolean flags use isFeatureEnabled
    if (typeof definition.defaultValue === "boolean") {
      return flag<boolean, PostHogEntities>({
        key: definition.key,
        adapter: this.postHogAdapter.isFeatureEnabled({
          sendFeatureFlagEvents: true,
        }),
        defaultValue: definition.defaultValue,
        identify: postHogIdentify,
      }) as () => Promise<T>;
    }

    // Simple values use featureFlagValue
    return flag<string | boolean, PostHogEntities>({
      key: definition.key,
      adapter: this.postHogAdapter.featureFlagValue({
        sendFeatureFlagEvents: true,
      }),
      defaultValue: definition.defaultValue as string | boolean,
      identify: postHogIdentify,
    }) as () => Promise<T>;
  }
}
