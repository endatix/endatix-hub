import sanitize, { IOptions } from "sanitize-html";
import {
  decideImageSource,
  EMPTY_IMAGE_SOURCE_POLICY,
  type ImageSourcePolicy,
} from "./image-source-policy";

/**
 * Inline rich text: the sanitizer for author text (question titles, the
 * definition's choice texts) shown on Submission Details. Never use it for
 * respondent answers: render those as plain text.
 *
 * - Inline tags only; block tags such as `<p>` are unwrapped, their text kept.
 * - Images follow `decideImageSource`: an allowed https host or a small inline
 *   raster image loads (lazy, no referrer); another https host becomes a link
 *   showing its hostname; an inline image over 100 KB becomes a placeholder;
 *   anything else is dropped. No author `style`, `width` or `height`: Hub
 *   sizes images (`RichText`).
 * - Links: https, mailto and tel only, always a new tab with
 *   `rel="noopener noreferrer"`; any other `href` (relative included) leaves
 *   its text.
 */
export function sanitizeInlineRichHtml(
  dirtyHtml: string,
  policy: ImageSourcePolicy = EMPTY_IMAGE_SOURCE_POLICY,
): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }
  const options = optionsFor(policy);
  const marked = sanitize(dirtyHtml, options);
  return sanitize(replaceImageMarkers(marked), options);
}

const INLINE_RICH_TAGS = [
  "a",
  "b",
  "br",
  "code",
  "del",
  "em",
  "i",
  "img",
  "ins",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
];

const LINK_HOST = "data-hub-link-host";
const LINK_HREF = "data-hub-link-href";
const TOO_LARGE = "data-hub-too-large";
const SAFE_HREF = /^(?:https:|mailto:|tel:)/i;

type Tag = { tagName: string; attribs: Record<string, string> };

const optionsByPolicy = new WeakMap<ImageSourcePolicy, IOptions>();

function optionsFor(policy: ImageSourcePolicy): IOptions {
  let options = optionsByPolicy.get(policy);
  if (!options) {
    options = buildOptions(policy);
    optionsByPolicy.set(policy, options);
  }
  return options;
}

const BASE_OPTIONS: IOptions = {
  allowedTags: INLINE_RICH_TAGS,
  allowedAttributes: {
    "*": ["role", "title"],
    a: ["href", "target", "rel", "title"],
    img: [
      "src",
      "alt",
      "title",
      "loading",
      "decoding",
      "referrerpolicy",
    ].concat(LINK_HREF, LINK_HOST, TOO_LARGE),
  },
  allowedSchemes: ["https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https", "data"] },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  nestingLimit: 3,
  exclusiveFilter: (frame) =>
    frame.tag === "img" &&
    !frame.attribs.src &&
    !frame.attribs[LINK_HREF] &&
    !frame.attribs[TOO_LARGE],
};

function buildOptions(policy: ImageSourcePolicy): IOptions {
  return {
    ...BASE_OPTIONS,
    transformTags: {
      a: enforceSafeLink,
      img: (tagName, attribs) => ({
        tagName,
        attribs: imageAttributes(attribs, policy),
      }),
    },
  };
}

/** Rebuilds an image from its decision alone; author attributes never pass through. */
function imageAttributes(
  attribs: Record<string, string>,
  policy: ImageSourcePolicy,
): Record<string, string> {
  const decision = decideImageSource(attribs.src, policy);
  switch (decision.kind) {
    case "keep":
      return loadingImage(decision.src, attribs.alt);
    case "link":
      return { [LINK_HREF]: decision.href, [LINK_HOST]: decision.host };
    case "too-large":
      return { [TOO_LARGE]: "true" };
    default:
      return {};
  }
}

function loadingImage(
  src: string,
  alt: string | undefined,
): Record<string, string> {
  return {
    src,
    ...(alt ? { alt } : {}),
    loading: "lazy",
    decoding: "async",
    referrerpolicy: "no-referrer",
  };
}

function enforceSafeLink(
  tagName: string,
  attribs: Record<string, string>,
): Tag {
  const href = (attribs.href ?? "").trim();
  if (!SAFE_HREF.test(href)) {
    return { tagName: "span", attribs: {} };
  }
  return {
    tagName,
    attribs: {
      href,
      ...(attribs.title ? { title: attribs.title } : {}),
      target: "_blank",
      rel: "noopener noreferrer",
    },
  };
}

// sanitize-html cannot turn a void <img> into an element with text, so the
// first pass marks the image and this step swaps the mark. The captured values
// are already attribute-escaped by sanitize-html, and the second pass
// sanitizes the result again.
const LINK_MARK = new RegExp(
  `<img ${LINK_HREF}="([^"]*)" ${LINK_HOST}="([^"]*)" />`,
  "g",
);
const TOO_LARGE_MARK = new RegExp(`<img ${TOO_LARGE}="true" />`, "g");

function replaceImageMarkers(html: string): string {
  return html
    .replace(LINK_MARK, '<a href="$1" title="Image on $2">$2</a>')
    .replace(
      TOO_LARGE_MARK,
      '<span title="Image too large">[image too large]</span>',
    );
}
