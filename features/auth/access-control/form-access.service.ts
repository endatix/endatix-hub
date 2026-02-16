import {
  FormAccessData,
  FormPermissions,
  SubmissionPermissions,
} from "./types";

export interface IFormAccessService {
  canViewForm(): boolean;
  canDesignForm(): boolean;
  canCreateSubmission(): boolean;
  canViewSubmission(): boolean;
  canEditSubmission(): boolean;
  canUploadFile(): boolean;
  canDeleteFile(): boolean;
  canViewFiles(): boolean;
  hasPermission(permission: string): boolean;
  getData(): FormAccessData;
}

export class FormAccessService implements IFormAccessService {
  constructor(private readonly data: FormAccessData) {}

  getData(): FormAccessData {
    return this.data;
  }

  // --- Form Level Checks ---

  public canViewForm(): boolean {
    return this.data.formPermissions.includes(FormPermissions.VIEW);
  }

  public canDesignForm(): boolean {
    return this.data.formPermissions.includes(FormPermissions.DESIGN);
  }

  // --- Submission Level Checks ---

  public canCreateSubmission(): boolean {
    return this.data.submissionPermissions.includes(
      SubmissionPermissions.CREATE,
    );
  }

  public canViewSubmission(): boolean {
    return this.data.submissionPermissions.includes(SubmissionPermissions.VIEW);
  }

  public canEditSubmission(): boolean {
    return this.data.submissionPermissions.includes(SubmissionPermissions.EDIT);
  }

  public canUploadFile(): boolean {
    return this.data.submissionPermissions.includes(
      SubmissionPermissions.UPLOAD_FILE,
    );
  }

  public canDeleteFile(): boolean {
    return this.data.submissionPermissions.includes(
      SubmissionPermissions.DELETE_FILE,
    );
  }

  public canViewFiles(): boolean {
    return this.data.submissionPermissions.includes(
      SubmissionPermissions.VIEW_FILES,
    );
  }

  /**
   * Generic check for dynamic scenarios
   */
  public hasPermission(permission: string): boolean {
    return (
      this.data.formPermissions.includes(permission) ||
      this.data.submissionPermissions.includes(permission)
    );
  }
}
