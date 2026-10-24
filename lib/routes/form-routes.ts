import type { Route } from "next";
import type { AudiencePeopleTestFilter } from "@/lib/endatix-api/audience/types";

const formPath = (formId: string, ...segments: string[]) =>
  `/forms/${[formId, ...segments].map((segment) => encodeURIComponent(segment)).join("/")}`;

// `Route` is a Next template literal; a path with a query is not one.
const withQuery = (path: string, query: string) =>
  (query ? `${path}?${query}` : path) as Route;

type AudienceQuery =
  /** Real or Test narrows the list (`?test=`); leave it out, or All, for everyone. */
  | { test?: AudiencePeopleTestFilter }
  /** A list query the Audience page already validated (`audienceListSearch`), used as given. */
  | { search: string };

function audienceSearch(query: AudienceQuery): string {
  if ("search" in query) return query.search;
  const { test } = query;
  if (!test || test === "all") return "";
  return new URLSearchParams({ test }).toString();
}

type PreviewAsQuery = {
  /** The audience member id to preview as. */
  member?: string;
  /** Part of an identifier, to find any participant. */
  search?: string;
};

function previewAsSearch({ member, search }: PreviewAsQuery): string {
  const query = new URLSearchParams();
  if (member) query.set("member", member);
  const q = search?.trim();
  if (q) query.set("q", q);
  return query.toString();
}

/**
 * The one owner of a form's Hub URLs that features link to across slices. It sits in `lib/` so
 * the Test inspector and Submission Details can link to a participant without importing
 * `features/audience`, which already imports `features/public-form`.
 */
export const formRoutes = Object.freeze({
  audience(formId: string, query: AudienceQuery = {}): Route {
    return withQuery(formPath(formId, "audience"), audienceSearch(query));
  },
  previewAs(formId: string, query: PreviewAsQuery = {}): Route {
    return withQuery(
      formPath(formId, "audience", "preview-as"),
      previewAsSearch(query),
    );
  },
  participant(formId: string, memberId: string): Route {
    return formPath(formId, "audience", "participants", memberId) as Route;
  },
  submission(formId: string, submissionId: string): Route {
    return formPath(formId, "submissions", submissionId) as Route;
  },
});
