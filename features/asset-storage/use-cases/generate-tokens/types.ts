import { AuthorizationResult } from "@/features/auth";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { Session } from "next-auth";
import { NextRequest } from "next/server";

export type TokenContext<TRequest> = {
  request: NextRequest;
  data: TRequest;
  session: Session | null;
};

export type StorageContext = {
  containerName: string;
  folderPath: string;
};

export interface TokenStrategy<TRequest, TResponseExtras> {
  validate: (data: TRequest) => Result<boolean>;
  authorize: (ctx: TokenContext<TRequest>) => Promise<AuthorizationResult>;
  resolveStorage: (
    ctx: TokenContext<TRequest>,
  ) => Promise<ApiResult<StorageContext & { extra?: TResponseExtras }>>;
  getFileNames: (data: TRequest) => string[];
}
