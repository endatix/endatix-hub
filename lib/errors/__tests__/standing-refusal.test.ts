import { expect, it } from "vitest";
import { mapResponseToApiError } from "@/lib/endatix-api/shared/http-error-mapper";
import { toApiPageError } from "../page-error";

const action = {
  key: "profile.complete",
  scope: "user",
  resolverRoles: [],
  resolvePath: "/profile",
  blockNonResolvers: false,
  blockingFrom: null,
  severity: "blocking",
  canResolve: true,
};

async function readProblem(status: number, extensions: object) {
  const response = Response.json({ status, ...extensions }, { status });
  return toApiPageError(await mapResponseToApiError(response, {}));
}

it("preserves the projected actions on a standing refusal", async () => {
  // Act
  const error = await readProblem(403, {
    errorCode: "required_action",
    requiredActions: [action],
  });

  // Assert
  expect(error).toEqual({ kind: "required_action", actions: [action] });
});

it.each([
  [401, { errorCode: "required_action", requiredActions: [action] }, "auth"],
  [403, { requiredActions: [action] }, "forbidden"],
  [403, { errorCode: "required_action", requiredActions: [{}] }, "forbidden"],
  [503, { detail: "Required action status is unavailable. Try again." }, "api"],
] as const)(
  "keeps HTTP %i with %o on its normal error path",
  async (status, body, kind) => {
    expect(await readProblem(status, body)).toMatchObject({ kind });
  },
);
