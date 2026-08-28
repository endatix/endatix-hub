import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ApiResult, EndatixApi, ERROR_CODE } from "@/lib/endatix-api";
import { ErrorType, Kind } from "@/lib/result";
import type { Theme } from "@/lib/endatix-api/themes/types";
import { createThemeAction } from "../create-theme/create-theme.action";
import { deleteThemeAction } from "../delete-theme/delete-theme.action";
import { getThemesAction } from "../list-themes/list-themes.action";
import { updateFormThemeAction } from "../update-form-theme/update-form-theme.action";
import { updateThemeAction } from "../update-theme/update-theme.action";

const telemetryLoggerMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: {
    error: telemetryLoggerMock.error,
  },
}));

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();

  return {
    ...actual,
    EndatixApi: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const sampleTheme: Theme = {
  id: "theme-1",
  name: "Brand",
  jsonData: '{"themeName":"Brand"}',
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

describe("theme actions", () => {
  const create = vi.fn();
  const listAll = vi.fn();
  const partialUpdate = vi.fn();
  const deleteTheme = vi.fn();
  const updateForm = vi.fn();
  const requireHubAccess = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      accessToken: "token",
    } as never);
    vi.mocked(authorization).mockResolvedValue({
      requireHubAccess,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        themes: {
          create,
          listAll,
          partialUpdate,
          delete: deleteTheme,
        },
        forms: {
          update: updateForm,
        },
      } as never;
    });
  });

  describe("createThemeAction", () => {
    it("rejects a blank themeName without calling the API", async () => {
      const result = await createThemeAction({ themeName: "  " } as never);

      expect(create).not.toHaveBeenCalled();
      expect(EndatixApi).not.toHaveBeenCalled();
      expect(result.kind).toBe(Kind.Error);
      if (result.kind !== Kind.Error) {
        return;
      }

      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe("Theme name is required");
    });

    it("rejects the reserved name default without calling the API", async () => {
      const result = await createThemeAction({
        themeName: " Default ",
      } as never);

      expect(create).not.toHaveBeenCalled();
      expect(EndatixApi).not.toHaveBeenCalled();
      expect(result.kind).toBe(Kind.Error);
      if (result.kind !== Kind.Error) {
        return;
      }

      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toContain("reserved");
    });

    it("posts trimmed name and serialized theme JSON", async () => {
      create.mockResolvedValue(ApiResult.success(sampleTheme));
      const theme = { themeName: "  Brand  ", cssVariables: { "--x": "1" } };

      const result = await createThemeAction(theme as never);

      expect(requireHubAccess).toHaveBeenCalledTimes(1);
      expect(EndatixApi).toHaveBeenCalledWith("token");
      expect(create).toHaveBeenCalledWith({
        name: "Brand",
        jsonData: JSON.stringify(theme),
      });
      expect(result.kind).toBe(Kind.Success);
      if (result.kind !== Kind.Success) {
        return;
      }

      expect(result.value).toEqual({
        id: sampleTheme.id,
        name: sampleTheme.name,
        jsonData: sampleTheme.jsonData,
      });
    });

    it("maps API errors through toResult", async () => {
      create.mockResolvedValue(
        ApiResult.httpStatusError(403, undefined, undefined, {
          statusCode: 403,
          endpoint: "/themes",
          method: "POST",
        }),
      );

      const result = await createThemeAction({
        themeName: "Brand",
      } as never);

      expect(result.kind).toBe(Kind.Error);
      if (result.kind !== Kind.Error) {
        return;
      }

      expect(result.errorCode).toBe(ERROR_CODE.ACCESS_FORBIDDEN);
      expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
    });
  });

  describe("getThemesAction", () => {
    it("drains every page via listAll", async () => {
      listAll.mockResolvedValue(ApiResult.success([sampleTheme]));

      const result = await getThemesAction();

      expect(listAll).toHaveBeenCalledTimes(1);
      expect(listAll).toHaveBeenCalledWith();
      expect(result.kind).toBe(Kind.Success);
      if (result.kind !== Kind.Success) {
        return;
      }

      expect(result.value).toEqual([sampleTheme]);
    });

    it("returns a failure when listAll fails", async () => {
      listAll.mockResolvedValue(
        ApiResult.httpStatusError(500, undefined, undefined, {
          statusCode: 500,
          endpoint: "/themes",
          method: "GET",
        }),
      );

      const result = await getThemesAction();

      expect(result.kind).toBe(Kind.Error);
      if (result.kind !== Kind.Error) {
        return;
      }

      expect(result.message).toBeDefined();
    });
  });

  describe("updateThemeAction", () => {
    it("patches jsonData for the given theme id", async () => {
      partialUpdate.mockResolvedValue(ApiResult.success(sampleTheme));
      const theme = { themeName: "Brand", cssVariables: {} };

      const result = await updateThemeAction({
        themeId: "theme-1",
        theme: theme as never,
      });

      expect(partialUpdate).toHaveBeenCalledWith("theme-1", {
        jsonData: JSON.stringify(theme),
      });
      expect(result.kind).toBe(Kind.Success);
      if (result.kind !== Kind.Success) {
        return;
      }

      expect(result.value.id).toBe("theme-1");
      expect(result.value.jsonData).toBe(sampleTheme.jsonData);
    });
  });

  describe("deleteThemeAction", () => {
    it("returns the theme id when delete succeeds", async () => {
      deleteTheme.mockResolvedValue(ApiResult.success(undefined));

      const result = await deleteThemeAction("theme-1");

      expect(deleteTheme).toHaveBeenCalledWith("theme-1");
      expect(result.kind).toBe(Kind.Success);
      if (result.kind !== Kind.Success) {
        return;
      }

      expect(result.value).toBe("theme-1");
    });
  });

  describe("updateFormThemeAction", () => {
    it("maps API errors through toResult", async () => {
      updateForm.mockResolvedValue(
        ApiResult.httpStatusError(403, undefined, undefined, {
          statusCode: 403,
          endpoint: "/forms/1",
          method: "PUT",
        }),
      );

      const result = await updateFormThemeAction({
        formId: "1",
        themeId: "theme-1",
      });

      expect(result.kind).toBe(Kind.Error);
      if (result.kind !== Kind.Error) {
        return;
      }

      expect(result.errorCode).toBe(ERROR_CODE.ACCESS_FORBIDDEN);
      expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
    });
  });
});
