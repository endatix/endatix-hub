import { describe, expect, it } from "vitest";
import {
  isPanelScopedName,
  matchesLoopSource,
  stripPanelScope,
  toPanelScopedName,
} from "../loop-source-name";

describe("loop source names", () => {
  it("recognises panel-scoped names", () => {
    expect(isPanelScopedName("panel.brands")).toBe(true);
    expect(isPanelScopedName("brands")).toBe(false);
    expect(isPanelScopedName("")).toBe(false);
  });

  it("strips and applies the panel scope idempotently", () => {
    expect(stripPanelScope("panel.brands")).toBe("brands");
    expect(stripPanelScope("brands")).toBe("brands");
    expect(toPanelScopedName("brands")).toBe("panel.brands");
    expect(toPanelScopedName("panel.brands")).toBe("panel.brands");
  });

  it("does not strip a name that merely contains the prefix", () => {
    expect(stripPanelScope("mypanel.brands")).toBe("mypanel.brands");
  });
});

describe("matchesLoopSource", () => {
  it("matches a bare stored source against a bare changed name", () => {
    expect(matchesLoopSource(["brands"], "brands")).toBe(true);
  });

  it("matches a panel-scoped stored source against the bare name events carry", () => {
    // onDynamicPanelValueChanged reports the question's own name, never "panel.x"
    expect(matchesLoopSource(["panel.brands"], "brands")).toBe(true);
  });

  it("matches when the changed name arrives scoped", () => {
    expect(matchesLoopSource(["brands"], "panel.brands")).toBe(true);
  });

  it("does not match a different question", () => {
    expect(matchesLoopSource(["panel.brands"], "models")).toBe(false);
  });

  it("handles missing or empty inputs", () => {
    expect(matchesLoopSource(undefined, "brands")).toBe(false);
    expect(matchesLoopSource([], "brands")).toBe(false);
    expect(matchesLoopSource(["brands"], "")).toBe(false);
  });

  it("matches any entry of a multi-source loop", () => {
    expect(matchesLoopSource(["panel.inner", "topLevel"], "topLevel")).toBe(true);
    expect(matchesLoopSource(["panel.inner", "topLevel"], "inner")).toBe(true);
  });
});
