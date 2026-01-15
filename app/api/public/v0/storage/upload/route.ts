
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { uploadUserFilesUseCase } from "@/features/storage/use-cases/upload-files/upload-user-files.use-case";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { headers } from "next/headers";

type UploadUserFilesResult = {
  success: boolean;
  submissionId: string;
  files: {
    name: string;
    url: string;
  }[];
};

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const formId = requestHeaders.get("edx-form-id") as string;
  let submissionId = requestHeaders.get("edx-submission-id") as string;
  const formLang = requestHeaders.get("edx-form-lang") as string | null;
  const formData = await request.formData();

  if (!formId) {
    return Response.json({ error: "Form ID is required" }, { status: 400 });
  }

  if (!submissionId) {
    const initialSubmissionResult = await createInitialSubmissionUseCase(
      formId,
      formLang,
      "Generate submissionId for image upload",
    );

    if (ApiResult.isError(initialSubmissionResult)) {
      return Response.json(
        { error: initialSubmissionResult.error.message },
        { status: 400 },
      );
    }

    submissionId = initialSubmissionResult.data.submissionId;
  }

  const files: { name: string; file: File }[] = [];
  for (const [filename, file] of formData.entries()) {
    if (!file || typeof file === "string") {
      return Response.json(
        { error: `Invalid file for ${filename}` },
        { status: 400 },
      );
    }

    files.push({
      name: filename,
      file: file as File,
    });
  }

  if (files.length === 0) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }

  const result = await uploadUserFilesUseCase({
    formId: formId,
    submissionId: submissionId,
    files: files,
  });

  if (Result.isError(result)) {
    return Response.json({ error: result.message }, { status: 400 });
  }

  const uploadUserFilesResult: UploadUserFilesResult = {
    success: true,
    submissionId: submissionId,
    files: result.value,
  };

  return Response.json(uploadUserFilesResult);
}
