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
      ["relative path", '<img src="/api/auth/logout">'],
      ["scheme-less", '<img src="api/auth/logout">'],
      ["empty", '<img src="">'],
      ["missing", "<img>"],
      ["javascript", '<img src="javascript:alert(1)">'],
      ["entity-encoded javascript", '<img src="&#106;avascript:alert(1)">'],
      ["whitespace-led relative", '<img src="  /api/auth/logout">'],
    ])("drops the whole image for a %s source", (_name, input) => {
      expect(inlineRich(input)).not.toContain("<img");
    });

    it("keeps a mixed-case https source", () => {
      expect(inlineRich('<img src="HTTPS://example.com/a.png">')).toContain(
        "<img",
      );
    });

    it("drops srcset", () => {
      expect(
        inlineRich(
          '<img src="https://example.com/a.png" srcset="https://evil.example/b.png 2x">',
        ),
      ).not.toContain("srcset");
    });

    it("keeps only width and height styles on an image", () => {
      const result = inlineRich(
        '<img src="https://example.com/a.png" style="width:100%; max-width:100px; height:auto; position:fixed; color:red">',
      );

      expect(result).toContain("width:100%");
      expect(result).toContain("height:auto");
      expect(result).not.toMatch(/max-width|position|color/);
    });
  });

  it.each([
    ["width:99999px", "99999px"],
    ["width:100px !important", "important"],
    ["max-width:100px;height:10vh", "vh"],
    ["width:9999px;max-width:9999px;height:9999px;max-height:9999px", "max-"],
    ["max-width:9999px !/**/important", "9999"],
    ["width:100px !/**/important", "100px"],
  ])("drops an unbounded or forced size style %s", (style, forbidden) => {
    expect(
      inlineRich(`<img src="https://example.com/a.png" style="${style}">`),
    ).not.toContain(forbidden);
  });

  it("drops width and height attributes on an image", () => {
    const result = inlineRich(
      '<img src="https://example.com/a.png" width="99999" height="99999">',
    );

    expect(result).not.toMatch(/width=|height=/);
  });

  describe("links", () => {
    it.each([
      ["_top target", '<a href="https://example.com" target="_top">x</a>'],
      ["_self target", '<a href="https://example.com" target="_self">x</a>'],
      ["upper-case scheme", '<a href="HTTPS://example.com">x</a>'],
      ["mailto", '<a href="mailto:a@example.com" rel="opener">x</a>'],
    ])("forces a new tab and noopener for a %s", (_name, input) => {
      const result = inlineRich(input);

      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).not.toMatch(/_top|_self|"opener"/);
    });

    it("drops a javascript href", () => {
      expect(inlineRich('<a href="JaVaScRiPt:alert(1)">x</a>')).not.toMatch(
        /javascript/i,
      );
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
