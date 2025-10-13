import { submitFormAction } from "@/features/public-form/application/actions/submit-form.action";
import { generateSASUrl } from "@/features/storage/infrastructure/storage-service";
import { ApiResult, SubmissionData } from "@/lib/endatix-api";

const DEFAULT_USER_FILES_CONTAINER_NAME = "user-files";

interface SASTokenRequest {
  formId: string;
  fileNames: string[];
  formLocale: string;
  submissionId: string;
}

interface SASTokenResponse {
  sasTokens: Record<string, string>;
  submissionId: string;
}

export async function POST(request: Request): Promise<Response> {
  const data: SASTokenRequest = await request.json();
  const { formId, fileNames, formLocale } = data;
  let submissionId = data.submissionId;

  if (!formId) {
    return Response.json({ error: "Form ID is required" }, { status: 400 });
  }

  if (!Array.isArray(fileNames) || fileNames.length === 0) {
    return Response.json({ error: "File names are required" }, { status: 400 });
  }

  // TODO: Extract this to a use case
  if (!submissionId) {
    const submissionData: SubmissionData = {
      isComplete: false,
      jsonData: JSON.stringify({}),
      metadata: JSON.stringify({
        reasonCreated: "Generate submissionId for sas token generation",
        ...(formLocale ? { language: formLocale } : {}),
      }),
    };
    const initialSubmissionResult = await submitFormAction(
      formId,
      submissionData,
    );

    if (ApiResult.isError(initialSubmissionResult)) {
      return Response.json(
        { error: initialSubmissionResult.error.message },
        { status: 400 },
      );
    }

    submissionId = initialSubmissionResult.data.submissionId;
  }

  try {
    const sasTokens: Record<string, string> = {};

    const containerName =
      process.env.USER_FILES_STORAGE_CONTAINER_NAME ??
      DEFAULT_USER_FILES_CONTAINER_NAME;

    for (const fileName of fileNames) {
      const sasToken = await generateSASUrl({
        containerName,
        folderPath: `s/${formId}/${submissionId}`,
        fileName,
      });
      sasTokens[fileName] = sasToken;
    }

    const sasTokenResponse: SASTokenResponse = {
      sasTokens,
      submissionId,
    };
    return Response.json(sasTokenResponse);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
