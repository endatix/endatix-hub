import { describe, expect, it } from "vitest";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result } from "@/lib/result";
import { mapPublicPdfExportLoadError } from "../map-public-pdf-export-load-error";

describe("mapPublicPdfExportLoadError", () => {
  it("maps network_error to 502 instead of 404", async () => {
    // Arrange
    const error = Result.error(
      "Network error. Failed to connect to the Endatix API.",
      "fetch failed",
      ERROR_CODE.NETWORK_ERROR,
    );
    if (!Result.isError(error)) {
      throw new Error("expected error result");
    }

    // Act
    const response = mapPublicPdfExportLoadError(error);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(502);
    expect(body.detail).toBe("Failed to load submission from the Endatix API.");
    expect(body.errorCode).toBe(ERROR_CODE.NETWORK_ERROR);
  });

  it("maps expired token codes to 401", async () => {
    // Arrange
    const error = Result.error(
      "Token expired",
      undefined,
      ERROR_CODE.TOKEN_EXPIRED,
    );
    if (!Result.isError(error)) {
      throw new Error("expected error result");
    }

    // Act
    const response = mapPublicPdfExportLoadError(error);

    // Assert
    expect(response.status).toBe(401);
  });

  it("maps unknown missing submission to 404", async () => {
    // Arrange
    const error = Result.error("Submission was not found");
    if (!Result.isError(error)) {
      throw new Error("expected error result");
    }

    // Act
    const response = mapPublicPdfExportLoadError(error);

    // Assert
    expect(response.status).toBe(404);
  });
});
