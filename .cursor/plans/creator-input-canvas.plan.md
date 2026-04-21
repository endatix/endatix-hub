# SurveyJS Creator: control surface vs content canvas

## Why inputs look different today

See prior analysis: [`endatix-creator-theme.ts`](../lib/themes/endatix-creator-theme.ts) maps `--sjs-special-background` → `var(--content-canvas)`, while property-grid controls use **layer** tokens (e.g. `--sjs-layer-1-background-400` → `var(--surface-container-low)`), so inputs and canvas are intentionally different tokens.

## Decision: no new global token (remap only)

**Chosen approach:** do **not** add a new variable in `globals.css`. Adjust only [`lib/themes/endatix-creator-theme.ts`](../lib/themes/endatix-creator-theme.ts) so Survey **layer** tokens used for property-grid controls resolve to an **existing** app token (e.g. `var(--content-canvas)` or `var(--surface-container-lowest)`), depending on the exact visual target.

### Implementation (when executing)

1. In **`endatix-creator-theme.ts`**, change **`--sjs-layer-1-background-400`** (and optionally **`--sjs-layer-2-background-*` / `--sjs-layer-3-background-*`**) from `var(--surface-container-low)` to the chosen existing token.
2. **Verify in light + dark** on form + template editors: property grid, dropdowns, segmented controls, search, sidebar if affected.
3. **Optional:** one line in [`DESIGN.md`](../DESIGN.md) noting Creator layer-400 maps to X for alignment with main canvas (only if you want docs parity).

### Note

If later you need a **Creator-only** surface that must diverge from `--surface-container-low` app-wide, you can still introduce a dedicated token then; not needed for the current “remap only” choice.

## Execution

Say **execute** (or “implement the plan”) when you want code changes applied.
