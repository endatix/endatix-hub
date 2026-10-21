import type { Route } from "next";
import type { AudiencePeopleTestFilter } from "@/lib/endatix-api/audience/types";

const formPath = (formId: string, ...segments: string[]) =>
  `/forms/${[formId, ...segments].map(encodeURIComponent).join("/")}`;

type AudienceQuery = {
  /** Real or Test narrows the list (`?test=`); leave it out, or All, for everyone. */
  test?: AudiencePeopleTestFilter;
};

/**
 * The one owner of a form's Hub URLs that features link to across slices. It sits in `lib/` so
 * the Test inspector and Submission Details can link to a participant without importing
 * `features/audience`, which already imports `features/public-form`.
 */
export const formRoutes = Object.freeze({
  audience(formId: string, query: AudienceQuery = {}): Route {
    const path = formPath(formId, "audience");
    const filtered = query.test && query.test !== "all";
    return (filtered ? `${path}?test=${query.test}` : path) as Route;
  },
  participant(formId: string, memberId: string): Route {
    return formPath(formId, "audience", "participants", memberId) as Route;
  },
  submission(formId: string, submissionId: string): Route {
    return formPath(formId, "submissions", submissionId) as Route;
  },
});
