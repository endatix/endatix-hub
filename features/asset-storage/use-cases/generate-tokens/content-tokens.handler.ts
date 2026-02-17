import { NextRequest, NextResponse } from "next/server";
import { ContentTokenRequest, ContentUploadMetadata } from "../../types";
import { executeTokenFlow } from "./generate-tokens";
import { contentTokensStrategy } from "./content-tokens.strategy";

export const contentTokensHandler = (req: NextRequest): Promise<NextResponse> =>
  executeTokenFlow<ContentTokenRequest, ContentUploadMetadata>(
    req,
    contentTokensStrategy,
  );

export type ContentTokensHandlers = Record<
  "POST",
  (request: NextRequest) => Promise<NextResponse>
>;

export const contentTokensHandlers: ContentTokensHandlers = {
  POST: contentTokensHandler,
};
