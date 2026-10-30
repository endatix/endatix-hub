import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Audience } from "../audience";

const FORM_ID = "1525035735390879744";

function audienceWith(methods: Partial<Record<string, unknown>>) {
  return new Audience(methods as unknown as EndatixApi);
}

describe("Audience filtered links", () => {
  it("previews the links a search would send, trimmed into the query", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        ApiResult.success({ matching: 12, withoutLink: 7, cap: 5000 }),
      );

    const result = await audienceWith({ get }).previewLinks(FORM_ID, " acme ");

    expect(get).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/links/preview?search=acme`,
    );
    expect(result.success && result.data).toEqual({
      matching: 12,
      withoutLink: 7,
      cap: 5000,
    });
  });

  it("previews every real participant when the search is blank", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        ApiResult.success({ matching: 3, withoutLink: 3, cap: 5000 }),
      );

    await audienceWith({ get }).previewLinks(FORM_ID, "  ");

    expect(get).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/links/preview`,
    );
  });

  it("issues a batch for the search and keeps each identifier and string id", async () => {
    const post = vi.fn().mockResolvedValue(
      ApiResult.success({
        matching: 2,
        issued: [
          { membershipId: 31, identifier: "a@acme.test", token: "t1" },
          { membershipId: "32", identifier: "b@acme.test", token: "t2" },
        ],
      }),
    );

    const result = await audienceWith({ post }).issueLinkBatch(
      FORM_ID,
      " acme ",
    );

    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/links/batches`,
      { filter: { search: "acme" } },
    );
    expect(result.success && result.data).toEqual({
      matching: 2,
      issued: [
        { membershipId: "31", identifier: "a@acme.test", token: "t1" },
        { membershipId: "32", identifier: "b@acme.test", token: "t2" },
      ],
    });
  });

  it("sends an empty body for a blank search, which means every real participant", async () => {
    const post = vi
      .fn()
      .mockResolvedValue(ApiResult.success({ matching: 0, issued: [] }));

    await audienceWith({ post }).issueLinkBatch(FORM_ID, "");

    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/links/batches`,
      {},
    );
  });

  it("refuses a form id that is not an Endatix id, without a call", async () => {
    const get = vi.fn();
    const post = vi.fn();

    const preview = await audienceWith({ get }).previewLinks("abc", "");
    const batch = await audienceWith({ post }).issueLinkBatch("abc", "");

    expect(preview.success).toBe(false);
    expect(batch.success).toBe(false);
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});
