import { getDataListLocales } from "../get-data-lists.server";
import { DataListsLocaleFacet } from "./data-lists-list-toolbar";

/** Await locales and render the facet; intended for a Suspense boundary. */
export async function DataListsLocaleFilter() {
  const locales = await getDataListLocales();
  return <DataListsLocaleFacet locales={locales} />;
}
