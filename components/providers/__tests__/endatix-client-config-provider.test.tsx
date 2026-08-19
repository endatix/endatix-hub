import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  EndatixClientConfigProvider,
  useEndatixClientConfig,
} from "../endatix-client-config-provider";
import {
  getBrowserEndatixConfig,
  resetBrowserEndatixConfigForTests,
  toClientEndatixConfig,
} from "@/features/config/client-endatix-config";

function wrapper(value: { apiBaseUrl: string; extensionsEnabled: boolean }) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <EndatixClientConfigProvider value={value}>
        {children}
      </EndatixClientConfigProvider>
    );
  };
}

describe("EndatixClientConfigProvider", () => {
  afterEach(() => {
    resetBrowserEndatixConfigForTests();
  });

  it("projects only apiBaseUrl and extensionsEnabled into context and the browser getter", () => {
    const extra = {
      apiBaseUrl: "https://api.example.com/api",
      extensionsEnabled: true,
      secret: "do-not-leak",
    };

    const { result } = renderHook(() => useEndatixClientConfig(), {
      wrapper: wrapper(extra),
    });

    expect(result.current).toEqual({
      apiBaseUrl: "https://api.example.com/api",
      extensionsEnabled: true,
    });
    expect(result.current).not.toHaveProperty("secret");
    expect(getBrowserEndatixConfig()).toEqual(result.current);
  });

  it("keeps a stable context value when the parent rerenders with the same fields", () => {
    const seen: unknown[] = [];

    function Consumer() {
      seen.push(useEndatixClientConfig());
      return null;
    }

    const { rerender } = render(
      <EndatixClientConfigProvider
        value={{ apiBaseUrl: "https://a.example/api", extensionsEnabled: true }}
      >
        <Consumer />
      </EndatixClientConfigProvider>,
    );

    rerender(
      <EndatixClientConfigProvider
        value={{ apiBaseUrl: "https://a.example/api", extensionsEnabled: true }}
      >
        <Consumer />
      </EndatixClientConfigProvider>,
    );

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
  });

  it("treats non-boolean extensionsEnabled as off", () => {
    expect(
      toClientEndatixConfig({
        apiBaseUrl: "https://api.example.com/api",
        extensionsEnabled: "true" as unknown as boolean,
      }).extensionsEnabled,
    ).toBe(false);
  });
});
