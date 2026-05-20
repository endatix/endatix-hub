/**
 * PublicForm policy action strings ReBAC (resource based access control).
 * Not Hub RBAC (role based access control)
 * Used when gating form/submission access on public pages.
 */
export const PublicFormPermissions = Object.freeze({
  Form: {
    View: "form.view",
    FileView: "form.file.view",
    FileUpload: "form.file.upload",
    FileDelete: "form.file.delete",
  },
  Submission: {
    Create: "submission.create",
    FileView: "submission.file.view",
    FileUpload: "submission.file.upload",
    FileDelete: "submission.file.delete",
  },
});
