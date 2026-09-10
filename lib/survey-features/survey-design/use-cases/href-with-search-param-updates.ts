/**
 * Same-origin path+search+hash after applying search-param updates, or `null`
 * when the query would not change. Empty / null values delete the key.
 */
export function hrefWithSearchParamUpdates(
  currentHref: string,
  updates: Record<string, string | null>,
): string | null {
  const url = new URL(currentHref);
  const before = url.searchParams.toString();

  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      url.searchParams.delete(key);
      continue;
    }

    url.searchParams.set(key, value);
  }

  if (url.searchParams.toString() === before) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
