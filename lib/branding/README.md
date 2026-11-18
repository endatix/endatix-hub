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

- Only `version` and `name` are required; anything left out keeps the built-in value. The full
  shape is [`brand.schema.json`](brand.schema.json); `fixtures/` holds the shared examples.
- Colours: hex, `rgb()`, `hsl()` or `oklch()`. `primary-on-dark` is optional; without it the
  dark-mode accent is derived from `primary`.
- Files: relative paths inside the folder, made of plain names (no `.`, `..`, empty or
  dot-first segments), of type `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp` or `.ico`.
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
  it does. Without a pack both fall back to exactly `bg-primary/90` and `ring-ring/50`.
  - `--primary-hover` (`bg-primary-hover`): the default `Button` and the default link `Badge`.
  - `--focus-ring` (`ring-focus-ring`, `outline-focus-ring`): every element's base outline
    (`app/globals.css`), and the focus ring of `Button`, `Badge`, `Input`, `Textarea`, `Select`,
    `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `Tabs`, `Accordion`, `ScrollArea`,
    `LinkTabs`, `StatCard`, the faceted filter, the open-card surface and the preview-as
    participant picker.

## `/brand/*`

`app/brand/[...path]/route.ts` serves the deployment brand without sign-in:

| Path | Response |
| --- | --- |
| `/brand/brand.css` | the brand stylesheet (empty for the built-in brand) |
| `/brand/icon`, `/brand/logo-light`, `/brand/logo-dark` | a redirect to the current file, for code that cannot read the brand (a client root such as `global-error.tsx`) |
| `/brand/<file>` | a file `brand.json` names, and nothing else in the folder |

Pack file URLs carry `?v=<fingerprint>`, which changes with the pack; an old `?v=` redirects
to the current one. Responses are `private`: under PostHog the flag can differ per user.

## Code

| Import | For |
| --- | --- |
| `getBrand()` from `@/lib/branding/server` | Server Components. Pass the result to `AppProvider` as `brand`. |
| `RESPONDENT_BRAND_DEFERRED` from `@/lib/branding/server` | `/share` and `/embed` layouts: respondent pages stay on the built-in brand for now. |
| `brandRouteResponse()` from `@/lib/branding/server` | the `/brand/*` route only |
| `useBrand()` from `@/lib/branding/client` | Client Components under `AppProvider` |
| `type Brand` | either side |

Everything else in the folder is internal. `AppProvider` mounts the brand provider, which
renders the stylesheet as a `<style>` ahead of the content, so the first paint already has
the accent. It is not hoisted: React keeps a hoisted style after a refresh to another brand.

The zod schema in `schema.ts` is canonical. After changing it, run `pnpm brand:schema` to
rewrite `brand.schema.json`; a test fails while the two differ. The API keeps a copy of that
file and of `fixtures/`.
