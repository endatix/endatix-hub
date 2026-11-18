import { describe, expect, it } from "vitest";
import { htmlSanitizer } from "../html-sanitizer";

const inlineRich = (html: string) =>
  htmlSanitizer.sanitize(html, htmlSanitizer.presets.inlineRich);

describe("htmlSanitizer inlineRich preset", () => {
  describe("blocks XSS vectors", () => {
    it.each([
      ["script tag", "<script>alert(1)</script>ACME", /<script|alert/],
      [
        "img onerror",
        '<img src="https://example.com/a.png" onerror="alert(1)">',
        /onerror|alert/,
      ],
      [
        "javascript: href",
        '<a href="javascript:alert(1)">x</a>',
        /javascript:/,
      ],
      [
        "javascript: img src",
        '<img src="javascript:alert(1)">',
        /javascript:|<img/,
      ],
      [
        "svg with onload",
        '<svg onload="alert(1)"><circle/></svg>',
        /<svg|onload/,
      ],
      ["iframe", '<iframe src="https://example.com"></iframe>', /<iframe/],
      [
        "style url()",
        '<img src="https://example.com/a.png" style="width:10px;background:url(https://evil.example/x)">',
        /url\(/,
      ],
      [
        "style expression",
        '<img src="https://example.com/a.png" style="width:expression(alert(1))">',
        /expression/,
      ],
      ["style on non-img", '<span style="color:red">x</span>', /style=/],
    ])("drops %s", (_name, input, forbidden) => {
      expect(inlineRich(input)).not.toMatch(forbidden);
    });
  });

  describe("image allow-list", () => {
    it("keeps an https image and forces lazy loading and no referrer", () => {
      const result = inlineRich(
        '<img src="https://cdn.example.com/acme.png" alt="ACME">',
      );

      expect(result).toContain('src="https://cdn.example.com/acme.png"');
      expect(result).toContain('loading="lazy"');
      expect(result).toContain('decoding="async"');
      expect(result).toContain('referrerpolicy="no-referrer"');
      expect(result).toContain('alt="ACME"');
    });

    it("keeps a read-token query string on a storage URL", () => {
      const src =
        "https://acme.blob.core.windows.net/content/logo.png?sv=1&amp;sig=abc";
      expect(inlineRich(`<img src="${src}">`)).toContain(src);
    });

    it.each([
      ["http", '<img src="http://example.com/a.png">'],
      ["data URI", '<img src="data:image/png;base64,iVBORw0KGgo=">'],
      ["protocol-relative", '<img src="//example.com/a.png">'],
    ])("drops an image from a %s source", (_name, input) => {
      expect(inlineRich(input)).not.toContain("src=");
    });

    it("drops srcset", () => {
      expect(
        inlineRich(
          '<img src="https://example.com/a.png" srcset="https://evil.example/b.png 2x">',
        ),
      ).not.toContain("srcset");
    });

    it("keeps only size styles on an image", () => {
      const result = inlineRich(
        '<img src="https://example.com/a.png" style="width:100%; max-width:100px; height:auto; position:fixed; color:red">',
      );

      expect(result).toContain("width:100%");
      expect(result).toContain("max-width:100px");
      expect(result).toContain("height:auto");
      expect(result).not.toContain("position");
      expect(result).not.toContain("color");
    });
  });

  it("unwraps block tags but keeps their text", () => {
    expect(inlineRich("<p>ACME <strong>Cola</strong></p>")).toBe(
      "ACME <strong>Cola</strong>",
    );
  });

  it("leaves the inline preset without images", () => {
    expect(
      htmlSanitizer.sanitizeInline('<img src="https://example.com/a.png">'),
    ).not.toContain("<img");
  });
});
