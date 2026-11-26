"use client";

import { useEffect, useReducer, useState } from "react";
import { Result, toActionFailure } from "@/lib/result";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { listFoldersAction } from "../server";

export function usePickerFolders(load: boolean, initial?: Folder[]) {
  const [result, setResult] = useState<Result<Folder[]>>();
  const [attempt, retry] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    if (!load) {
      setResult(undefined);
      return;
    }
    return readChoices(setResult);
  }, [load, attempt]);
  const read = load ? result : undefined;
  const folders = read && Result.isSuccess(read) ? read.value : initial;
  const failure = read && Result.isError(read) ? read : undefined;
  return { folders, failure, retry };
}

function readChoices(apply: (value: Result<Folder[]>) => void) {
  let current = true;
  void listFoldersAction()
    .catch(toActionFailure<Folder[]>("Could not load folders."))
    .then((value) => {
      if (current) apply(value);
    });
  return () => {
    current = false;
  };
}
