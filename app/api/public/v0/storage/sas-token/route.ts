import { submitFormAction } from "@/features/public-form/application/actions/submit-form.action";
import { generateSASUrl } from "@/features/storage/infrastructure/storage-service";
import { ApiResult, SubmissionData } from "@/lib/endatix-api";

const DEFAULT_USER_FILES_CONTAINER_NAME = "user-files";

export async function POST(request: Request) {
  const data = await request.json();
  const { formId, fileName, formLocale } = data;
  let submissionId = data.submissionId;

  if (!formId) {
    return Response.json({ error: "Form ID is required" }, { status: 400 });
  }

  if (!fileName) {
    return Response.json({ error: "File name is required" }, { status: 400 });
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
    const containerName =
      process.env.USER_FILES_STORAGE_CONTAINER_NAME ??
      DEFAULT_USER_FILES_CONTAINER_NAME;
    const sasToken = await generateSASUrl({
      fileName,
      containerName,
      folderPath: `s/${formId}/${submissionId}`,
    });

    return Response.json({
      sasToken,
      submissionId,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
