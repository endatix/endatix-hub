// Named re-exports for faster compile and better tree-shaking (avoid export *)

// shared/api-result (ERROR_CODE re-exported from shared/error-codes below)
export {
  ApiErrorType,
  ApiResult,
  isNetworkError,
  isAuthError,
  isForbiddenError,
  isValidationError,
  isServerError,
  isNotFoundError,
  isRateLimitError,
  hasErrorCode,
  isRecaptchaError,
  isTokenInvalidError,
  isFormNotFoundError,
} from "./shared/api-result";
export type {
  ApiSuccess,
  ApiError,
  ApiErrorDetails,
} from "./shared/api-result";

// shared/error-codes
export {
  ERROR_CODES,
  ERROR_CODE,
  DEFAULT_ERROR_MESSAGE,
  getErrorMessage,
  getErrorMessageWithFallback,
  isKnownErrorCode,
} from "./shared/error-codes";
export type { ErrorCode } from "./shared/error-codes";

// auth/types
export {
  ActivateInviteRequestSchema,
  InviteDetailsRequestSchema,
  SignInRequestSchema,
} from "./auth/types";
export type {
  SignInRequest,
  SignInResponse,
  ActivateInviteRequest,
  ActivateInviteResponse,
  InviteDetailsRequest,
  InviteDetailsResponse,
  SendVerificationEmailRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  AssumeTenantRequest,
  AssumeTenantResponse,
  AuthorizationData,
} from "./auth/types";

// account/types
export {
  PasswordSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
} from "./account/types";
export type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "./account/types";

// my-account/types
export { ChangePasswordRequestSchema } from "./my-account/types";
export type { ChangePasswordRequest } from "./my-account/types";

// agents/types
export {
  AgentRequestSchema,
  TokenUsageSchema,
  DefineFormRequestSchema,
} from "./agents/types";
export type {
  Agent,
  CreateUpdateAgentRequestSchema,
  CreateAgentRequest,
  UpdateAgentRequest,
  Conversation,
  Message,
  MessageRole,
  TokenUsage,
  DefineFormRequest,
  DefineFormResponse,
} from "./agents/types";

// shared/types
export type {
  EntityId,
  JsonData,
  ApiEntity,
  ITenantOwned,
  IPagedRequest,
  SortDir,
  SortRequest,
  DateRangeFilter,
  AuditDateFilters,
  PaginationQuery,
  PagedResponse,
  BaseRequestOptions,
  FileUploadOptions,
  StatusResponse,
  BulkOperationResponse,
} from "./shared/types";

// submissions/types
export { SUBMISSION_STATUS } from "./submissions/types";
export type {
  SubmissionStatus,
  Submission,
  SubmissionFile,
  CreateSubmissionDto,
  UpdateSubmissionDto,
  UpdateSubmissionStatusDto,
  ExportSubmissionsDto,
  ExportFormat,
  ExportSubmissionsRequest,
  BooleanFilterValue,
  SubmissionReviewStatus,
  CreateSubmissionResponse,
  UpdateSubmissionResponse,
  GetSubmissionResponse,
  GetSubmissionsResponse,
  UpdateSubmissionStatusResponse,
  ExportSubmissionsResponse,
  SubmissionQuery,
  SubmissionData,
} from "./submissions/types";

// forms/types
export type { FormsListRequest } from "./forms/types";

// definitions/types
export type { DefinitionField } from "./definitions/types";

// users/types
export type {
  CreateUserRequestBody,
  ListUsersRequest,
  ReplaceRolesRequestBody,
  UserOperationResponse as MutateUserResponse,
  UserListItem,
  UserStatusFilter,
} from "./users/types";

// email/types
export type {
  EmailProviderInfo,
  EmailTemplateSummary,
  SendTestEmailRequest,
} from "./email/types";

// roles/types
export type {
  CreateRoleRequestBody,
  ListRolesRequest,
  PermissionListItem,
  RoleListItem,
  RoleOperationResponse as RoleMutationResponse,
  RoleTypeFilter,
  UpdateRoleRequestBody,
} from "./roles/types";
