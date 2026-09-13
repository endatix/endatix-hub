import { flag } from "flags/next";
import { createPostHogAdapter, type PostHogEntities } from "@flags-sdk/posthog";
import type { Identify } from "flags";
import type { FlagFactory, FlagDefinition } from "./flag-factory.interface";
import {
  readPublicEndatixEnv,
  resolvePostHogNodeHost,
} from "@/features/config/client-endatix-config";
import { identify } from "../identify";

/** Hub env + host default. Package `postHogAdapter` latches env on first decide. */
export class PostHogFlagFactory implements FlagFactory {
  private readonly adapter: ReturnType<typeof createPostHogAdapter>;

  constructor() {
    const { posthogKey, posthogHost } = readPublicEndatixEnv();
    this.adapter = createPostHogAdapter({
      postHogKey: posthogKey,
      postHogOptions: {
        host: resolvePostHogNodeHost(posthogHost),
        disableGeoip: true,
      },
    });
  }

  createFlag<T>(definition: FlagDefinition<T>): () => Promise<T> {
    const usePayload =
      typeof definition.defaultValue === "object" ||
      Boolean(definition.parsePayload);

    const evaluate = flag<T, PostHogEntities>({
      key: definition.key,
      adapter: usePayload ? this.adapter.payload : this.adapter,
      defaultValue: definition.defaultValue,
      identify: identify as Identify<PostHogEntities>,
    });

    const parse = definition.parsePayload;
    if (!parse) {
      return evaluate;
    }

    return async () => parse(await evaluate());
  }
}
