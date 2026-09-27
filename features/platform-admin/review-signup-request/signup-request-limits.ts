// Mirrors `Signup.TenantNameMaxLength` / `Signup.RejectionCommentMaxLength`
// (src/Endatix.SaaS.Management/Domain/Signup.cs), so the inputs stop where the API would.
export const WORKSPACE_NAME_MAX_LENGTH = 100;
export const REJECTION_REASON_MAX_LENGTH = 2000;
