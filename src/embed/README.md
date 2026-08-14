# Embed SDK

This folder contains the source code for the Endatix Embed SDK - a lightweight JavaScript library that allows third-party websites to embed Endatix forms via iframe.

## Overview

The Embed SDK is a vanilla JavaScript library (no React/framework dependencies) that:
- Creates an iframe with the embedded form
- Handles communication between the iframe and parent window via `postMessage`
- Manages iframe resizing based on form content
- Supports delegated navigation (redirecting the parent window)

## File Structure

```
src/embed/
├── embed.ts               # Main SDK source code (TypeScript)
└── __tests__/             # Unit tests
scripts/build-embed.mjs    # Uses esbuild to bundle the SDK
esbuild.embed.config.js    # esbuild configuration for the embed SDK
```

## Build Output

The produced files are generated during build, so they are git-ignored. 

```
public/embed/v1/embed.js
public/embed/v1/embed.map.js
```

They build has ES2020 target and IIFE (Immediately Invoked Function Expression) format


## NPM Scripts

| Script | Description |
|--------|-------------|
| `pnpm build:embed` | Build the embed SDK once |
| `pnpm dev:embed` | Watch mode - rebuild on file changes |
| `pnpm dev` | Runs `predev` (builds embed) then starts Next.js dev server |
| `pnpm build` | Runs `prebuild` (builds embed) then builds Next.js app |

### Usage

```bash
# Build embed SDK
pnpm build:embed

# Watch mode for development
pnpm dev:embed

# Full dev server (includes embed build)
pnpm dev
```

## Integration with Next.js

The embed SDK is built **before** the Next.js dev server starts via the `predev` hook in `package.json`:

```json
{
  "scripts": {
    "predev": "node scripts/build-embed.mjs",
    "dev": "pnpm discover-questions && cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 next dev"
  }
}
```

## Usage on Third-Party Sites

```html
<script 
  src="https://your-endatix-instance.com/embed/v1/embed.js" 
  data-form-id="123456789"
  data-base-url="https://your-endatix-instance.com">
</script>
```

### Data Attributes

| Attribute | Description |
|-----------|-------------|
| `data-form-id` | The form ID to embed (required) |
| `data-base-url` | Override the default base URL (optional) |
| `data-token` | Access token for private forms (optional) |
| `data-prefill` | Pre-fill query string (optional) |
| `data-height-mode` | `auto` (default) or `fill` — see [Height Modes](#height-modes) below (optional) |

### Height Modes

By default (`auto`, or the attribute omitted entirely), the iframe height tracks the form's content only — this is unchanged.

Set `data-height-mode="fill"` to make the iframe fill its parent container's height when the form content is shorter, while still growing beyond the container when content is taller. The iframe never gets internal scrollbars in either mode.

```html
<div style="height: 800px;">
  <script
    src="https://your-endatix-instance.com/embed/v1/embed.js"
    data-form-id="123456789"
    data-height-mode="fill">
  </script>
</div>
```

**Requirements and caveats for `fill` mode:**

- The value is case-sensitive — only exactly `auto` or `fill` are recognized; anything else logs a console warning and falls back to `auto`.
- The wrapping element (or `document.body`, if the script isn't wrapped in anything) needs an **explicit** CSS height, e.g. `height: 800px`. A wrapper sized only with `min-height`, or with no height rule at all, does not give the iframe anything definite to fill against — in that case `fill` silently behaves exactly like `auto`.
- The script tag (and the container the SDK injects next to it) should be the only in-flow content inside that height-constrained wrapper. The fill calculation uses the wrapper's full height, not "space remaining below other children" — a heading or other sibling in the same wrapper will overflow rather than share the space. Give the embed its own wrapper if it needs to sit alongside other content.
- If the wrapper itself has `overflow: hidden`, a form that grows taller than the container will be clipped instead of extending the page. Fill mode's "grows when needed, no scrollbars" behavior depends on the wrapper allowing overflow.
- In a flex layout, a bare explicit height on the wrapper works when the flex item already resolves to a definite size (e.g. a sized flex container with default `align-items: stretch`). A flex parent sized only with `min-height`, or a `flex-direction: column` parent where the item has no `flex: 1`, may not reliably propagate a definite height — treat flex support as narrower than the plain block-level case.
- On the survey's completion ("thank you") screen specifically, its layout uses `100vh` internally, which resolves against the iframe's own (now filled) viewport — so the completion screen may report a slightly taller height than the in-progress form did in very tall containers. This is cosmetic and self-stabilizing, not a growth loop.

### Programmatic Usage

```javascript
window.EndatixEmbed.embedFormAt("123456789", {
  baseUrl: "https://your-endatix-instance.com",
  token: "optional-token",
  prefill: "name=John&email=john@example.com",
  heightMode: "fill" // "auto" (default) or "fill"
});
```

## PostMessage Events

The SDK communicates with the embedded iframe via `postMessage`:

### Outbound (Iframe → Parent)

| Event | Description |
|-------|-------------|
| `endatix:form-loaded` | Form has finished loading |
| `endatix:resize` | Form height changed (payload: `{ height: number }`) |
| `endatix:scroll` | User navigated to a new page |
| `endatix:form-complete` | Form submission completed |
| `endatix:navigate` | Form triggered a redirect (payload: `{ url: string }`) |

### Inbound (Parent → Iframe)

The parent site can send messages to the iframe using the same event names.

## Future: Monorepo with Turbopack

>[!Note]
>This build setup (esbuild + custom scripts) is a temporary solution. Once we migrate to a monorepo with Turborepo, we can:

1. Use Turborepo's `build` pipeline to automatically build the embed SDK
2. Leverage Turborepo's caching for faster builds
3. Eliminate the custom `predev`/`prebuild` hooks

After the migration, this file and the custom build scripts should be removed.
