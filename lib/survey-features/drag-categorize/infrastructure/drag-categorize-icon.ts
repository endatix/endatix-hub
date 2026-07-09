/**
 * Toolbox icon: two category boxes with an item being dragged into one.
 * Uses currentColor so the Creator theme tints it like built-in icons.
 */
export const DRAG_CATEGORIZE_SVG = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
  <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/>
  <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/>
  <rect x="8" y="3" width="8" height="5" rx="1" fill="currentColor"/>
  <path d="M12 8v4m0 0-2-2m2 2 2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`.trim();
