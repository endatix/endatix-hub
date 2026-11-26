import { revalidatePath } from "next/cache";
import type { ApiResult } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import type { MovableKind } from "./move-to-folder";

export function finishFolderMove(update: ApiResult<void>, kind: MovableKind) {
  const message = `Failed to move ${kind}`;
  const result = toResult(update, {
    mapData: (): void => undefined,
    fallbackMessage: message,
    logMessage: message,
    loggerName: `folders.move-${kind}`,
  });
  if (Result.isSuccess(result)) {
    for (const path of [
      "/folders",
      "/forms",
      "/forms/folders",
      "/forms/templates",
    ])
      revalidatePath(path);
  }
  return result;
}
