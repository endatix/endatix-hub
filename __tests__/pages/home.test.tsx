import { expect, describe, it } from "vitest";
import HomePage from "@/app/(main)/page";

describe("Home Page", () => {
  it("redirects to /forms", () => {
    expect(() => HomePage()).toThrow();
  });
});
