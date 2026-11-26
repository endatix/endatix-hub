import { beforeEach, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { getActiveFormDefinition } from "@/services/api";
import { authorizeFormStorageAccess } from "@/features/form-access/server";
import { clientStorageConfig } from "../../../__tests__/test-storage-config";
import { resolvePublicReadUrls } from "../resolve-read-urls";

const { sign } = vi.hoisted(() => ({
  sign: vi.fn(() => Promise.resolve("signature")),
}));
vi.mock("@/services/api", () => ({ getActiveFormDefinition: vi.fn() }));
vi.mock("@/features/form-access/server", async (original) => ({
  ...(await original<typeof import("@/features/form-access/server")>()),
  authorizeFormStorageAccess: vi.fn(),
}));
vi.mock("@/features/asset-storage/storage-runtime", () => ({
  getActiveStorageProvider: () => ({
    isEnabled: () => true,
    generateReadTokenQuery: sign,
  }),
}));

const config = clientStorageConfig({ isPrivate: true });
const inherited = `https://${config.hostName}/content/t/2/logo.png`;
const catalogImage = `https://${config.hostName}/content/f/1/catalog.png`;
const catalog = [{ id: "a", photo: catalogImage }];
const jsonData = JSON.stringify({
  elements: [
    {
      type: "radiogroup",
      choices: [{ text: `<img src="${inherited}">`, value: "a" }],
    },
    {
      type: "imagepicker",
      choicesByUrl: {
        url: "https://example.invalid/catalog",
        imageLinkName: "photo",
      },
    },
  ],
});
const access = {
  formId: "1",
  isPublicForm: true,
  canViewFiles: true,
  canDeleteFiles: false,
  canUploadFiles: false,
};
const batch = {
  gate: { formId: "1" },
  clientConfig: config,
  urls: [inherited, catalogImage],
};

beforeEach(() => {
  vi.mocked(authorizeFormStorageAccess).mockResolvedValue(
    Result.success({ ...access, definitionJson: jsonData }),
  );
});

it("uses only referenced authored images from the gate's snapshot", async () => {
  // Act
  const result = await resolvePublicReadUrls({
    ...batch,
    richTextImages: true,
  });

  // Assert
  expect(result).toEqual(
    Result.success({
      resolved: {
        [inherited]: { url: `${inherited}?signature` },
        [catalogImage]: { error: expect.any(String) },
      },
    }),
  );
  expect(getActiveFormDefinition).not.toHaveBeenCalled();
  expect(sign).toHaveBeenCalledTimes(1);
});

it("keeps private images supplied by a native choice catalog on the normal read path", async () => {
  // Act
  const result = await resolvePublicReadUrls({
    ...batch,
    urls: catalog.map((choice) => choice.photo),
  });

  // Assert
  expect(result).toEqual(
    Result.success({
      resolved: { [catalogImage]: { url: `${catalogImage}?signature` } },
    }),
  );
  expect(getActiveFormDefinition).not.toHaveBeenCalled();
});

it("loads the active definition once per batch when the gate has no snapshot", async () => {
  // Arrange
  vi.mocked(authorizeFormStorageAccess).mockResolvedValue(Result.success(access));
  vi.mocked(getActiveFormDefinition).mockResolvedValue({
    id: "7", formId: access.formId, isActive: true, isDraft: false,
    createdAt: new Date(0), modifiedAt: new Date(0), jsonData,
  });

  // Act
  const result = await resolvePublicReadUrls({ ...batch, richTextImages: true });

  // Assert
  expect(getActiveFormDefinition).toHaveBeenCalledExactlyOnceWith(access.formId, true);
  expect(Result.isSuccess(result) && result.value.resolved[inherited]).toEqual({ url: `${inherited}?signature` });
});
