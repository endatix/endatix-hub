/** Reloads the current document (client only). Its own module so callers' tests can mock it. */
export function reloadPage(): void {
  window.location.reload();
}
