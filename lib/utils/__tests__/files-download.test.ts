import {
  getFilenameFromContentDisposition,
  initiateFileDownload,
} from "@/lib/utils/files-download";
import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  vi,
  MockInstance,
} from "vitest";

describe("getFilenameFromContentDisposition", () => {
  function makeHeaders(headerValue?: string): Headers {
    return {
      get: (name: string) =>
        name.toLowerCase() === "content-disposition" && headerValue
          ? headerValue
          : "",
    } as unknown as Headers;
  }

  it("returns default filename if headers is undefined", () => {
    // Act
    const result = getFilenameFromContentDisposition(
      undefined as unknown as Headers,
      "default.txt",
    );

    // Assert
    expect(result).toBe("default.txt");
  });

  it("returns default filename if content-disposition is missing", () => {
    // Arrange
    const headers = makeHeaders();

    // Act
    const result = getFilenameFromContentDisposition(headers, "default.txt");

    // Assert
    expect(result).toBe("default.txt");
  });

  it("extracts filename from content-disposition header", () => {
    // Arrange
    const headers = makeHeaders('attachment; filename="test-file.pdf"');

    // Act
    const result = getFilenameFromContentDisposition(headers, "default.txt");

    // Assert
    expect(result).toBe("test-file.pdf");
  });

  it("extracts filename without quotes", () => {
    // Arrange
    const headers = makeHeaders("attachment; filename=test-file.pdf");

    // Act
    const result = getFilenameFromContentDisposition(headers, "default.txt");

    // Assert
    expect(result).toBe("test-file.pdf");
  });

  it("returns default filename if filename is not present", () => {
    // Arrange
    const headers = makeHeaders("attachment");

    // Act
    const result = getFilenameFromContentDisposition(headers, "default.txt");

    // Assert
    expect(result).toBe("default.txt");
  });
});

describe("initiateFileDownload", () => {
  let createObjectURLStub: ReturnType<typeof vi.fn>;
  let revokeObjectURLStub: ReturnType<typeof vi.fn>;
  let appendChildSpy: MockInstance;
  let removeChildSpy: MockInstance;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLStub = vi.fn().mockReturnValue("blob:url");
    revokeObjectURLStub = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLStub,
      revokeObjectURL: revokeObjectURLStub,
    });
    appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => document.createElement("div"));
    removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => document.createElement("div"));
    clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation(
      () =>
        ({
          setAttribute: vi.fn(),
          click: clickSpy,
        }) as unknown as HTMLAnchorElement,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing if blob or filename is missing", () => {
    // Act & Assert
    expect(
      initiateFileDownload(undefined as unknown as Blob, "file.txt"),
    ).toBeUndefined();
    expect(initiateFileDownload(new Blob(), "")).toBeUndefined();
  });

  it("creates a link, sets attributes, clicks, and cleans up", () => {
    // Arrange
    const blob = new Blob(["test"], { type: "text/plain" });

    // Act
    initiateFileDownload(blob, "file.txt");

    // Assert
    expect(createObjectURLStub).toHaveBeenCalledWith(blob);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLStub).toHaveBeenCalledWith("blob:url");
  });
});
