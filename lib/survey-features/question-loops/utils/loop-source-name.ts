import { PANEL_SCOPE_PREFIX } from "../constants";

/**
 * A `loopSource` entry is either a bare question name (`"brands"`) or a
 * panel-scoped one (`"panel.brands"`). The panel-scoped form is what the
 * designer writes for a loop inside a dynamic panel, and it matches SurveyJS's
 * own `choicesFromQuestion` convention.
 */

/** True when the name explicitly targets the containing panel instance. */
export function isPanelScopedName(name: string): boolean {
  return typeof name === "string" && name.startsWith(PANEL_SCOPE_PREFIX);
}

/** `"panel.brands"` → `"brands"`; a bare name is returned unchanged. */
export function stripPanelScope(name: string): string {
  return isPanelScopedName(name) ? name.slice(PANEL_SCOPE_PREFIX.length) : name;
}

/** `"brands"` → `"panel.brands"`; an already-scoped name is returned unchanged. */
export function toPanelScopedName(name: string): string {
  return isPanelScopedName(name) ? name : `${PANEL_SCOPE_PREFIX}${name}`;
}

/**
 * Whether a value change to `changedName` could affect a loop declaring
 * `loopSource`.
 *
 * Both forms are compared on their bare name, because the events that carry a
 * changed name never carry the `panel.` prefix: `onDynamicPanelValueChanged`
 * reports the question's own name. **Scoping is the caller's job** — the nested
 * channel only consults loops that live in the panel the event came from, so
 * this deliberately does not try to tell a sibling `brands` apart from a
 * top-level one.
 */
export function matchesLoopSource(
  loopSource: readonly string[] | undefined,
  changedName: string,
): boolean {
  if (!Array.isArray(loopSource) || !changedName) {
    return false;
  }

  const changed = stripPanelScope(changedName);
  return loopSource.some((source) => stripPanelScope(source) === changed);
}
