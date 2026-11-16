# Branding (`lib/branding`)

The effective brand of a request: the deployment's **brand pack** over the built-in Endatix
brand. It lives in `lib/`, not `features/`, because `components/` reads it.

## Brand pack (operators)

A brand pack is a folder with `brand.json` and the files it names. Mount it read-only into the
Hub (and the API), point `ENDATIX_BRAND_DIR` at it, and turn on the `white-labeling` flag
(`FLAG_WHITE_LABELING=true`, or Helm `whiteLabeling.enabled: true`). The same image serves
either brand, with no rebuild.

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
- Files: relative paths inside the folder, of type `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`
  or `.ico`.
- Check a pack before rolling it out: `pnpm brand:validate <folder>`. It prints each problem
  with its field path, and warns when an accent fades into the page (WCAG 2.x 3:1).

What the Hub does with it:

- **At start**, while the flag may be on (`FLAG_WHITE_LABELING=true`, or PostHog flags, which
  are decided per request), an invalid mounted pack stops the Hub with the field paths in the
  error. With the env flag off the pack is ignored: a problem is logged and the Hub starts.
- **While running**, the pack is read again when `brand.json` or a file it names changes. A
  change that does not validate is logged and the last valid pack keeps serving.
- **Flag off, or no pack**: the built-in brand, and the page CSS is exactly what ships (no
  brand `<style>` is rendered).
- **The accent**: one colour derives `--primary`, `--primary-foreground` (always 4.5:1),
  `--ring`, `--endatix`, `--primary-dim`, `--sidebar-ring` and `--chart-1..5` for light and
  dark. Survey Creator follows, since it reads the computed CSS.

## `/brand/*`

`app/brand/[...path]/route.ts` serves the deployment brand without sign-in:

| Path | Response |
| --- | --- |
| `/brand/brand.css` | the brand stylesheet (empty for the built-in brand) |
| `/brand/icon`, `/brand/logo-light`, `/brand/logo-dark` | a redirect to the current file, for code that cannot read the brand (a client root such as `global-error.tsx`) |
| `/brand/<file>` | a file `brand.json` names, and nothing else in the folder |

Pack file URLs carry `?v=<fingerprint>`, which changes with the pack.

## Code

| Import | For |
| --- | --- |
| `getBrand()` from `@/lib/branding/server` | Server Components. Pass the result to `AppProvider` as `brand`. |
| `RESPONDENT_BRAND_DEFERRED` from `@/lib/branding/server` | `/share` and `/embed` layouts: respondent pages stay on the built-in brand for now. |
| `brandRouteResponse()` from `@/lib/branding/server` | the `/brand/*` route only |
| `useBrand()` from `@/lib/branding/client` | Client Components under `AppProvider` |
| `type Brand` | either side |

Everything else in the folder is internal. `AppProvider` mounts the brand provider, which
renders the stylesheet as a hoisted `<style>` so the first paint already has the accent.

The zod schema in `schema.ts` is canonical. After changing it, run `pnpm brand:schema` to
rewrite `brand.schema.json`; a test fails while the two differ. The API keeps a copy of that
file and of `fixtures/`.
