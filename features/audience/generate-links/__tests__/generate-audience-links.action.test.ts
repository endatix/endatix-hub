import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { requireAudienceApi } from "../../shared/require-audience-api.server";
import {
  generateAudienceLinksAction,
  previewAudienceLinksAction,
} from "../generate-audience-links.action";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../shared/require-audience-api.server", () => ({
  requireAudienceApi: vi.fn(),
  checkAudienceApi: vi.fn(),
}));

const FORM_ID = "1525035735390879744";

const issueLinkBatch = vi.fn();
const previewLinks = vi.fn();
const generateLinks = vi.fn();
const listPeople = vi.fn();
const api = {
  audience: { issueLinkBatch, previewLinks, generateLinks, listPeople },
};

/** An API without the route answers a bare 404; its own 404s are problem+json. */
const missingRoute = () =>
  ApiResult.notFoundError("Not Found", { statusCode: 404 });
const formNotFound = () =>
  ApiResult.notFoundError("Form not found.", {
    statusCode: 404,
    problemMediaType: "application/problem+json",
  });

const NEEDS_NEWER_API =
  "Sending links to a filtered set needs a newer Endatix API.";

describe("generateAudienceLinksAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAudienceApi).mockResolvedValue(
      Result.success(api as never),
    );
  });

  it("issues one batch for the search, each link with its identifier, behind forms.edit", async () => {
    // Arrange
    issueLinkBatch.mockResolvedValue(
      ApiResult.success({
        matching: 2,
        issued: [
          { membershipId: "31", identifier: "a@acme.test", token: "t1" },
        ],
      }),
    );

    // Act
    const result = await generateAudienceLinksAction(FORM_ID, "acme");

    // Assert
    expect(requireAudienceApi).toHaveBeenCalledWith(Permissions.Forms.Edit);
    expect(issueLinkBatch).toHaveBeenCalledWith(FORM_ID, "acme");
    expect(listPeople).not.toHaveBeenCalled();
    expect(result).toEqual(
      Result.success([{ identifier: "a@acme.test", token: "t1" }]),
    );
  });

  it("keeps Generate for everyone on an older API when nothing is searched", async () => {
    // Arrange
    issueLinkBatch.mockResolvedValue(missingRoute());
    listPeople.mockResolvedValue(
      ApiResult.success({
        items: [{ membershipId: "31", identifier: "a@acme.test" }],
        hasNextPage: false,
      }),
    );
    generateLinks.mockResolvedValue(
      ApiResult.success([{ membershipId: "31", token: "t1" }]),
    );

    // Act
    const result = await generateAudienceLinksAction(FORM_ID, "");

    // Assert
    expect(generateLinks).toHaveBeenCalledWith(FORM_ID);
    expect(result).toEqual(
      Result.success([{ identifier: "a@acme.test", token: "t1" }]),
    );
  });

  it("says a search needs a newer API, and sends no one a link", async () => {
    // Arrange
    issueLinkBatch.mockResolvedValue(missingRoute());

    // Act
    const result = await generateAudienceLinksAction(FORM_ID, "acme");

    // Assert
    expect(generateLinks).not.toHaveBeenCalled();
    expect(Result.isError(result) && result.message).toBe(NEEDS_NEWER_API);
  });

  it("passes the API's own 404 through, without falling back", async () => {
    // Arrange
    issueLinkBatch.mockResolvedValue(formNotFound());

    // Act
    const result = await generateAudienceLinksAction(FORM_ID, "");

    // Assert
    expect(generateLinks).not.toHaveBeenCalled();
    expect(Result.isError(result) && result.message).toBe("Form not found.");
  });

  it("refuses a search longer than the people list takes, without a call", async () => {
    // Act
    const result = await generateAudienceLinksAction(FORM_ID, "x".repeat(257));

    // Assert
    expect(Result.isError(result)).toBe(true);
    expect(issueLinkBatch).not.toHaveBeenCalled();
  });
});

describe("previewAudienceLinksAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAudienceApi).mockResolvedValue(
      Result.success(api as never),
    );
  });

  it("returns the counts for the search", async () => {
    // Arrange
    previewLinks.mockResolvedValue(
      ApiResult.success({ matching: 12, withoutLink: 7, cap: 5000 }),
    );

    // Act
    const result = await previewAudienceLinksAction(FORM_ID, "acme");

    // Assert
    expect(previewLinks).toHaveBeenCalledWith(FORM_ID, "acme");
    expect(result).toEqual(
      Result.success({ matching: 12, withoutLink: 7, cap: 5000 }),
    );
  });

  it("returns null from an older API without the route", async () => {
    // Arrange
    previewLinks.mockResolvedValue(missingRoute());

    // Act
    const result = await previewAudienceLinksAction(FORM_ID, "acme");

    // Assert
    expect(result).toEqual(Result.success(null));
  });

  it("returns null when the answer leaves out the counts", async () => {
    // Arrange
    previewLinks.mockResolvedValue(ApiResult.success({ matching: 3 }));

    // Act
    const result = await previewAudienceLinksAction(FORM_ID, "");

    // Assert
    expect(result).toEqual(Result.success(null));
  });
});
