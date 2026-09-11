import { describe, expect, it } from "vitest";
import { parseStoredTheme } from "../parse-stored-theme";

const hubTheme = (jsonData: string) => ({
  id: "9",
  name: "Brand",
  jsonData,
  createdAt: new Date(),
});

describe("parseStoredTheme", () => {
  it("maps Hub jsonData onto a StoredTheme keyed by name", () => {
    const theme = parseStoredTheme(
      hubTheme('{"themeName":"ignored","cssVariables":{}}'),
    );

    expect(theme).toMatchObject({
      id: "9",
      name: "Brand",
      themeName: "Brand",
    });
  });

  it("rejects JSON that is not a theme object", () => {
    expect(parseStoredTheme(hubTheme("null"))).toBeNull();
    expect(parseStoredTheme(hubTheme("[]"))).toBeNull();
    expect(parseStoredTheme(hubTheme('"plain"'))).toBeNull();
    expect(parseStoredTheme(hubTheme("{"))).toBeNull();
  });
});
