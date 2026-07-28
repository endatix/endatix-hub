/**
 * Toolbox icon: an item dropping into one of two category zones.
 *
 * Drawn the way SurveyJS draws its own `toolbox-*-24x24` icons: a 24x24
 * viewBox of solid-fill paths with no `fill`/`stroke` attributes, so the
 * Creator's `.svc-toolbox__item-icon { fill: ... }` rule tints it like the
 * built-ins (hover, disabled and pressed states included). An icon that sets
 * its own `stroke="currentColor"` renders black next to them instead.
 *
 * Zone outlines use the SurveyJS hole trick — an outer subpath followed by a
 * reversed inner subpath — rather than a stroked rect.
 */
export const DRAG_CATEGORIZE_SVG = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 1H3C2.45 1 2 1.45 2 2V4C2 4.55 2.45 5 3 5H10C10.55 5 11 4.55 11 4V2C11 1.45 10.55 1 10 1Z"></path>
  <path d="M7.5 6V8H9.5L6.5 11.5L3.5 8H5.5V6H7.5Z"></path>
  <path d="M11 13H2V22H11V13ZM9 20H4V15H9V20Z"></path>
  <path d="M22 13H13V22H22V13ZM20 20H15V15H20V20Z"></path>
</svg>
`.trim();
