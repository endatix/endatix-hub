import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  DesignerRuntimeProvider,
  useDesignerRuntime,
  useOptionalDesignerRuntime,
  type DesignerRuntimeState,
} from "../designer-runtime.context";

function createWrapper(initialState: DesignerRuntimeState) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DesignerRuntimeProvider initialState={initialState}>
        {children}
      </DesignerRuntimeProvider>
    );
  };
}

describe("DesignerRuntimeProvider", () => {
  const initialState: DesignerRuntimeState = {
    formId: "form-1",
    submissionId: "sub-1",
  };

  it("exposes initial state on stateRef", () => {
    const { result } = renderHook(() => useDesignerRuntime(), {
      wrapper: createWrapper(initialState),
    });

    expect(result.current.stateRef.current).toEqual(initialState);
  });

  it("clones initial state so later mutations do not affect the ref seed", () => {
    const seed: DesignerRuntimeState = { formId: "form-1" };
    const { result } = renderHook(() => useDesignerRuntime(), {
      wrapper: createWrapper(seed),
    });

    seed.formId = "mutated";

    expect(result.current.stateRef.current.formId).toBe("form-1");
  });

  it("merges partial updates into stateRef via updateState", () => {
    const { result } = renderHook(() => useDesignerRuntime(), {
      wrapper: createWrapper(initialState),
    });

    act(() => {
      result.current.updateState({
        formAccessJwt: "jwt-1",
        formAccessJwtExpiresAtUtc: "2026-12-31T00:00:00Z",
      });
    });

    expect(result.current.stateRef.current).toEqual({
      ...initialState,
      formAccessJwt: "jwt-1",
      formAccessJwtExpiresAtUtc: "2026-12-31T00:00:00Z",
    });
  });

  it("keeps the same stateRef object across updates", () => {
    const { result } = renderHook(() => useDesignerRuntime(), {
      wrapper: createWrapper(initialState),
    });

    const refBefore = result.current.stateRef;

    act(() => {
      result.current.updateState({ templateId: "tpl-1" });
    });

    expect(result.current.stateRef).toBe(refBefore);
    expect(result.current.stateRef.current.templateId).toBe("tpl-1");
  });
});

describe("useDesignerRuntime", () => {
  it("throws when used outside DesignerRuntimeProvider", () => {
    expect(() => renderHook(() => useDesignerRuntime())).toThrow(
      "useDesignerRuntime must be used within a DesignerRuntimeProvider",
    );
  });
});

describe("useOptionalDesignerRuntime", () => {
  it("returns null when used outside DesignerRuntimeProvider", () => {
    const { result } = renderHook(() => useOptionalDesignerRuntime());

    expect(result.current).toBeNull();
  });

  it("returns context when used inside DesignerRuntimeProvider", () => {
    const { result } = renderHook(() => useOptionalDesignerRuntime(), {
      wrapper: createWrapper({ formId: "form-2" }),
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.stateRef.current.formId).toBe("form-2");
  });
});
