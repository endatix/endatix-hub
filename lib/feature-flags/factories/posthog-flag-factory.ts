import { flag } from "flags/next";
import { createPostHogAdapter, type PostHogEntities } from "@flags-sdk/posthog";
import type { FlagFactory, FlagDefinition } from "./flag-factory.interface";
import {
  readPublicEndatixEnv,
  resolvePostHogNodeHost,
} from "@/features/config/client-endatix-config";
import { identify } from "../identify";

/** Stands in for `defaultValue` so a PostHog miss stays distinguishable from a real payload. */
const PAYLOAD_MISS = Symbol("posthog.payload.miss");

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

    return flag<T, PostHogEntities>({
      key: definition.key,
      adapter: usePayload ? this.payloadAdapter(definition) : this.adapter,
      defaultValue: definition.defaultValue,
      identify,
    });
  }

  /**
   * `parsePayload` may only ever see raw PostHog JSON. The v1 adapter substitutes
   * `defaultValue` inside its own `decide()`, so parsing the flag's result would hand the
   * parser Hub's typed default whenever PostHog omits the flag — transforming it, or
   * throwing. Passing a sentinel default instead makes the miss detectable, and the real
   * default is returned untouched.
   *
   * No `adapterId`, so the SDK never batches these: each parser belongs to one definition,
   * and a shared id would route another flag's payload through it.
   */
  private payloadAdapter<T>(definition: FlagDefinition<T>) {
    const parse = definition.parsePayload;
    if (!parse) {
      return this.adapter.payload<T>();
    }

    const raw = this.adapter.payload<unknown>();
    return {
      decide: async (params: Parameters<typeof raw.decide>[0]) => {
        const payload = await raw.decide({
          ...params,
          defaultValue: PAYLOAD_MISS,
        });
        return payload === PAYLOAD_MISS
          ? definition.defaultValue
          : parse(payload);
      },
    };
  }
}
