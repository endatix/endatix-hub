import { describe, expect, it } from "vitest";
import { htmlSanitizer } from "../html-sanitizer";
import { MAX_DATA_IMAGE_BASE64_LENGTH } from "../image-source-policy";
import { sanitizeInlineRichHtml } from "../inline-rich-html";

const policy = {
  allowedHosts: ["cdn.example.com"],
  ownOrigin: "https://hub.example.com",
};
const inlineRich = (html: string) => sanitizeInlineRichHtml(html, policy);

// Synthetic bytes with a JPEG signature, not a real picture.
const JPEG_BASE64 = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0,
]).toString("base64");

describe("sanitizeInlineRichHtml", () => {
  describe("blocks XSS vectors", () => {
    it.each([
      ["script tag", "<script>alert(1)</script>ACME", /<script|alert/],
      [
        "img onerror",
        '<img src="https://cdn.example.com/a.png" onerror="alert(1)">',
        /onerror|alert/,
      ],
      [
        "javascript: href",
        '<a href="javascript:alert(1)">x</a>',
        /javascript:|href/,
      ],
      [
        "mixed-case javascript: href",
        '<a href="JaVaScRiPt:alert(1)">x</a>',
        /javascript|href/i,
      ],
      [
        "javascript: img src",
        '<img src="javascript:alert(1)">',
        /javascript:|<img/,
      ],
      [
        "entity-encoded img src",
        '<img src="&#106;avascript:alert(1)">',
        /javascript|<img/,
      ],
      [
        "svg with onload",
        '<svg onload="alert(1)"><circle/></svg>',
        /<svg|onload/,
      ],
      ["iframe", '<iframe src="https://cdn.example.com"></iframe>', /<iframe/],
      [
        "forged link marker",
        '<img data-hub-link-href="javascript:alert(1)" data-hub-link-host="x">',
        /javascript|<a|<img/,
      ],
    ])("drops %s", (_name, input, forbidden) => {
      expect(inlineRich(input)).not.toMatch(forbidden);
    });
  });

  describe("images", () => {
    it("loads an allowed host lazily with no referrer", () => {
      const result = inlineRich(
        '<img src="https://cdn.example.com/acme.png" alt="ACME">',
      );

      expect(result).toContain('src="https://cdn.example.com/acme.png"');
      expect(result).toContain('loading="lazy"');
      expect(result).toContain('decoding="async"');
      expect(result).toContain('referrerpolicy="no-referrer"');
      expect(result).toContain('alt="ACME"');
    });

    it("shows another https host as a link with its hostname", () => {
      const result = inlineRich(
        '<img src="https://images.other.example/a.png?x=1&amp;y=2">',
      );

      expect(result).toBe(
        '<a href="https://images.other.example/a.png?x=1&amp;y=2" target="_blank" rel="noopener noreferrer">images.other.example</a>',
      );
    });

    it("keeps the text after a linked image", () => {
      expect(
        inlineRich('A <img src="https://other.example/a.png"> B <b>C</b>'),
      ).toMatch(/^A <a [^>]+>other\.example<\/a> B <b>C<\/b>$/);
    });

    it("keeps an inline jpeg", () => {
      const src = `data:image/jpeg;base64,${JPEG_BASE64}`;
      expect(inlineRich(`<img src="${src}">`)).toContain(`src="${src}"`);
    });

    it("shows a placeholder for an inline image over 100 KB", () => {
      const big = "A".repeat(MAX_DATA_IMAGE_BASE64_LENGTH + 4);
      const result = inlineRich(`x <img src="data:image/png;base64,${big}"> y`);

      expect(result).toBe(
        'x <span title="Image too large">[image too large]</span> y',
      );
    });

    it.each([
      ["svg data URI", "data:image/svg+xml;base64,PHN2Zz4="],
      [
        "data URI with junk after the base64",
        `data:image/png;base64,${JPEG_BASE64}#x`,
      ],
      ["own origin", "https://hub.example.com/api/auth/logout"],
      ["suffix trick", "https://cdn.example.com.attacker.test/a.png"],
      ["IPv6 literal", "https://[2001:db8::1]/a.png"],
      ["userinfo", "https://user:pw@cdn.example.com/a.png"],
      ["relative path", "/api/auth/logout"],
      ["http", "http://cdn.example.com/a.png"],
    ])("never loads an image from a %s", (_name, src) => {
      const result = inlineRich(`<img src="${src}">`);

      expect(result).not.toContain("<img");
      if (_name === "suffix trick") {
        expect(result).toContain(">cdn.example.com.attacker.test</a>");
      }
    });

    it("drops every author size on an image", () => {
      const result = inlineRich(
        '<img src="https://cdn.example.com/a.png" style="width:100%; max-width:9999px !/**/important" width="9999" height="9999">',
      );

      expect(result).toContain("<img");
      expect(result).not.toMatch(/style=|width=|height=/);
    });
  });

  describe("links", () => {
    it.each([
      ["_top target", '<a href="https://example.com" target="_top">x</a>'],
      ["upper-case scheme", '<a href="HTTPS://example.com">x</a>'],
      ["mailto", '<a href="mailto:a@example.com" rel="opener">x</a>'],
    ])("forces a new tab and noopener for a %s", (_name, input) => {
      const result = inlineRich(input);

      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).not.toMatch(/_top|"opener"/);
    });

    it.each([
      ["relative", '<a href="/forms/1">Forms</a>'],
      ["scheme-less", '<a href="forms/1">Forms</a>'],
      ["fragment", '<a href="#top">Forms</a>'],
    ])("turns a %s link into text", (_name, input) => {
      expect(inlineRich(input)).toBe("<span>Forms</span>");
    });
  });

  it("keeps b, i and br", () => {
    expect(inlineRich("<b>ACME</b><br><i>Cola</i>")).toBe(
      "<b>ACME</b><br /><i>Cola</i>",
    );
  });

  it("unwraps block tags but keeps their text", () => {
    expect(inlineRich("<p>ACME <strong>Cola</strong></p>")).toBe(
      "ACME <strong>Cola</strong>",
    );
  });

  it("loads no remote host without a policy", () => {
    expect(
      sanitizeInlineRichHtml('<img src="https://cdn.example.com/a.png">'),
    ).not.toContain("<img");
  });

  it("leaves the inline preset without images", () => {
    expect(
      htmlSanitizer.sanitizeInline('<img src="https://cdn.example.com/a.png">'),
    ).not.toContain("<img");
  });
});
