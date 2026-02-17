import { NextRequest, NextResponse } from "next/server";
import { SubmissionTokenRequest, SubmissionTokenResponse } from "../../types";
import { executeTokenFlow } from "./generate-tokens";
import { submissionTokensStrategy } from "./submission-tokens.strategy";

export const submissionTokensHandler = (
  req: NextRequest,
): Promise<NextResponse> =>
  executeTokenFlow<SubmissionTokenRequest, SubmissionTokenResponse>(req, submissionTokensStrategy);

export type SubmissionTokensHandlers = Record<
  "POST",
  (request: NextRequest) => Promise<NextResponse>
>;

export const submissionTokensHandlers: SubmissionTokensHandlers = {
  POST: submissionTokensHandler,
};
