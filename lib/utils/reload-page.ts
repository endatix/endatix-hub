/**
 * Reloads the current document. Tests mock this module: jsdom's `location.reload`
 * cannot be stubbed in a vm pool.
 */
export function reloadPage(): void {
  window.location.reload();
}
