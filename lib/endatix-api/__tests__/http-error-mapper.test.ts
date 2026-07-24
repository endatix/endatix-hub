import { describe, expect, it } from "vitest";
import { ApiErrorType, ERROR_CODE } from "../shared/api-result";
import { mapResponseToApiError } from "../shared/http-error-mapper";

describe("mapResponseToApiError", () => {
  it("maps 409 conflict problem details to ConflictError with readable message", async () => {
    const response = new Response(
      JSON.stringify({
        title: "There was a conflict.",
        status: 409,
        detail:
          "Next error(s) occurred:* A submission already exists for this user and form.\n",
      }),
      { status: 409, headers: { "Content-Type": "application/problem+json" } },
    );

    const result = await mapResponseToApiError(response, {
      endpoint: "/api/forms/1/submissions",
      method: "POST",
      statusCode: 409,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected error result");
    }

    expect(result.error.type).toBe(ApiErrorType.ConflictError);
    expect(result.error.errorCode).toBe(ERROR_CODE.CONFLICT);
    expect(result.error.message).toBe(
      "A submission already exists for this user and form.",
    );
    expect(result.error.details?.statusCode).toBe(409);
  });
});
