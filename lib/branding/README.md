# Branding (`lib/branding`)

The effective brand of a request: the deployment's **brand pack** over the built-in Endatix
brand. It lives in `lib/`, not `features/`, because `components/` reads it.

## Brand pack (operators)

A brand pack is a folder with `brand.json` and the files it names. Mount it read-only into the
Hub (and the API), point `ENDATIX_BRAND_DIR` at it, and turn on the `white-labeling` flag:
`FLAG_WHITE_LABELING=true` (Helm `whiteLabeling.enabled: true`) with environment flags, or the
`white-labeling` flag in PostHog when the Hub uses PostHog flags (`FLAG_PROVIDER=posthog` and a
project token). The same image serves either brand, with no rebuild.

```json
{
  "version": 1,
  "name": "Example Forms",
  "legalName": "Example Ltd.",
  "assets": {
    "logo": { "light": "logo-light.svg", "dark": "logo-dark.svg" },
    "icon": "icon.svg",
    "ogImage": "og.jpg"
  },
  "tokens": {
    "color": {
      "primary": { "$type": "color", "$value": "#0b6b5d" },
      "primary-on-dark": { "$type": "color", "$value": "#4fd1b8" }
    }
  },
  "links": { "website": "https://example.com" }
}
```

- Only `version` and `name` are required. A pack never shows Endatix's name or links: the
  name stands in for the legal name and the personas ("<name> AI Assistant", "<name> Bot"), and
  a link the pack leaves out is hidden. Files left out keep the built-in artwork. The full
  shape is [`brand.schema.json`](brand.schema.json); `fixtures/` holds the shared examples.
- Colours: hex, `rgb()`, `hsl()` or `oklch()`, as CSS reads them (comma `hsl()` needs `%` on
  saturation and lightness; there is no `oklcha()`), at most 64 characters including spaces: the
  limit the API applies to tenant brand overrides. `primary-on-dark` is optional; without it the
  dark-mode accent is derived from `primary`.
- Files: relative paths inside the folder, made of plain names (no `.`, `..`, empty or
  dot-first segments), of type `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp` or `.ico`.
- The pack is identity only. The API reads the same mounted pack, and the email sender lives in
  its email settings. A `links.support` `mailto:` link names the address emails show, so it must
  name one bare address (or a list, which keeps the API's built-in address). An `email` section
  from older packs is ignored by both apps, though an editor checking `brand.schema.json` flags it.
- Check a pack before rolling it out: `pnpm brand:validate <folder>`. It prints each problem
  with its field path, and warns when an accent fades into the page (WCAG 2.x 3:1).

What the Hub does with it:

- **At start**, while the flag may be on (`FLAG_WHITE_LABELING=true`, or PostHog flags, which
  are decided per request), an invalid mounted pack stops the Hub with the field paths in the
  error. Under PostHog flags, turning the flag off does not avoid this: fix the pack or remove
  the mount. With the environment flag off the pack is ignored: a problem is logged and the
  Hub starts.
- **While running**, the pack is read again when the folder, `brand.json` or a file it names
  changes. A change that does not validate is logged and the last valid `brand.json` keeps
  serving, with the files that are still in the folder: a file the rejected update removed
  answers 404.
- **Contrast**: an accent under WCAG 2.x 3:1 against its page is logged once per pack; the
  pack still applies.
- **Flag off, or no pack**: the built-in brand, and the page CSS is exactly what ships (no
  brand `<style>` is rendered).
- **The accent**: one colour derives `--primary`, `--primary-foreground` (always 4.5:1),
  `--ring`, `--endatix`, `--primary-dim`, `--sidebar-ring` and `--chart-1..5` for light and
  dark. Survey Creator follows, since it reads the computed CSS.
- **Hover and focus**: the pack also sets `--primary-hover` (label at 4.5:1 or more) and
  `--focus-ring` (3:1 or more on every surface in `FOCUS_SURFACES` in `palette.ts`: page, content
  canvas, sidebar, cards, muted/accent and the surface containers). Each starts from the
  built-in look, primary at 90% and ring at 50% over the page. A hover whose label would not
  read takes the same step the other way; a ring that would not read darkens or lightens until
  it does. Without a pack the hover falls back to exactly `bg-primary/90`, and `app/globals.css`
  declares `--focus-ring` in `:root` and `.dark` with what `derivePalette` gives the built-in
  colour (`palette.test.ts` checks both stay equal and reach 3:1).
  - `--primary-hover` (`bg-primary-hover`): the default `Button` and the default link `Badge`.
  - `--focus-ring` (`ring-focus-ring`, `outline-focus-ring`): every element's base outline
    (`app/globals.css`), and the focus ring of `Button`, `Badge`, `Input`, `Textarea`, `Select`,
    `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `Tabs`, `Accordion`, `ScrollArea`,
    `LinkTabs`, `StatCard`, the faceted filter, the open-card surface, the preview-as
    participant picker, the submission question finder and the folder card.
  - The destructive `Button` and `Badge` keep a red ring, `--destructive` at 100% (light) and 70%
    (dark), with a 2px page-coloured offset so it stands apart from the red fill.
    `__tests__/focus-indicators.test.ts` checks that every built-in `focus-visible:ring-<token>`
    class reaches 3:1 on every `FOCUS_SURFACES` entry.

## `/brand/*`

`app/brand/[...path]/route.ts` serves the deployment brand without sign-in:

| Path                                                   | Response                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `/brand/brand.css`                                     | the brand stylesheet (empty for the built-in brand)                                                            |
| `/brand/name`                                          | the brand name as plain text, for `global-error.tsx`'s title                                                   |
| `/brand/icon`, `/brand/logo-light`, `/brand/logo-dark` | a redirect to the current file, for code that cannot read the brand (a client root such as `global-error.tsx`) |
| `/brand/<file>`                                        | a file `brand.json` names, and nothing else in the folder                                                      |

Pack file URLs carry `?v=<fingerprint>`, which changes with the pack; an old `?v=` redirects
to the current one. Responses are `private`: under PostHog the flag can differ per user.

## Code

| Import                                                                     | For                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getBrand()` from `@/lib/branding/server`                                  | Server Components. Pass the result to `AppProvider` as `brand`.                                                                                                                                                                                             |
| `getRespondentBrand()` from `@/lib/branding/server`                        | `/share` and `/embed` layouts: the built-in look (`RESPONDENT_BRAND_DEFERRED`) with the deployment's `poweredBy`.                                                                                                                                           |
| `RESPONDENT_BRAND_DEFERRED` from `@/lib/branding/server`                   | the built-in brand that respondent pages keep for now; use `getRespondentBrand()` in a layout.                                                                                                                                                              |
| `brandLayoutMetadata(options?)` from `@/lib/branding/server`               | each root layout's `generateMetadata`: the brand name as title, application name, publisher and icon; `titleTemplate` gives the pages below `"<page> \| <name>"`, `socialImage` gives them the social image. Spread it first, then the layout's own fields. |
| `brandTitle({ page, builtIn? })` from `@/lib/branding/server`              | a title no template reaches (a root layout's own, share and embed): `"<page> \| <name>"` with a pack, `builtIn` without one                                                                                                                                 |
| `brandRouteResponse()` from `@/lib/branding/server`                        | the `/brand/*` route only                                                                                                                                                                                                                                   |
| `useBrand()` from `@/lib/branding/client`                                  | Client Components under `AppProvider`                                                                                                                                                                                                                       |
| `BrandLogo` from `@/lib/branding/client`                                   | the brand's logo (`variant="logo"`), icon (`"icon"`) or sidebar lockup (`"lockup"`), light and dark. Never hand-write the `dark:hidden` / `dark:block` image pair.                                                                                          |
| `brandAuthors(brand)`, `brandKeywords(brand)` from `@/lib/branding/server` | a page's `authors` and `keywords` metadata                                                                                                                                                                                                                  |
| `brandUrl(brand, key, builtInUrl)` from either side                        | a deep link into the brand's site: `builtInUrl` while the link is the built-in one, else the pack's link, or undefined (hide it)                                                                                                                            |
| `isPoweredByShown(brand, envShown)` from either side                       | the "Powered by" line: the pack's `poweredBy` wins, `ENDATIX_SHOW_POWERED_BY` is the fallback                                                                                                                                                               |
| `type Brand`                                                               | either side                                                                                                                                                                                                                                                 |

Metadata: root layouts own the brand, pages own their words. A page declares its `title` and
`description` (plain `export const metadata`, or `generateMetadata` when the words name the
brand) and imports nothing for the brand: Next merges in the layout's icon, application name
and publisher, fills its title into the layout's template, and, under a layout with
`socialImage`, gives it the social image with og:title and og:description taken from the page.
A page that sets its own `openGraph` replaces the layout's, image included, so leave it out.
Under `(auth)`, a title that must stand alone uses `title: { absolute: "…" }`. Layouts whose
title has another shape today use `brandTitle({ page: "Form", builtIn: "Endatix Form" })`: with no pack, or the
flag off, the title stays exactly as it was; with a pack it is `Form | <name>`.

`BrandLogo` keeps the built-in artwork for whatever the pack leaves out: a pack with only an
`icon` keeps the Endatix wordmark (named "Endatix Hub") on sign-in and in the expanded sidebar,
and a pack with only a `logo` keeps the paperclip in the collapsed sidebar. The built-in brand's
sidebar shows its icon and wordmark files apart, as it always has.

Everything else in the folder is internal. `AppProvider` mounts the brand provider, which
renders the stylesheet as a `<style>` ahead of the content, so the first paint already has
the accent. It is not hoisted: React keeps a hoisted style after a refresh to another brand.

The zod schema in `schema.ts` is canonical. After changing it, run `pnpm brand:schema` to
rewrite `brand.schema.json`; a test fails while the two differ. The API keeps a copy of that
file and of `fixtures/`.

## Copy

UI text names the product through the brand: `brand.name` ("Endatix Hub") in titles and
descriptions, `brand.shortName` ("Endatix") in running text ("About …", "the … API", "… Team"),
`brand.personas` for the assistant and the bot. With
no pack each gives the literal it replaced, so the Hub reads exactly as before.

ESLint's `no-restricted-syntax` rejects "Endatix", an endatix.com link or a github.com/endatix
link in a string, template, or JSX text outside this folder and tests. `productNameBaseline` in
`eslint/product-name-baseline.mjs` lists the files that still do, each with its reason; it only
shrinks, and `__tests__/lint/product-name-ratchet.test.ts` pins it. A built-in value used only while no pack applies
takes an `eslint-disable-next-line` with that reason.
