/** Server-only form-access API (uses next/headers via cookie gate resolution). */
export type {
  DesignerStorageScope,
  FormStorageAccess,
  FormStorageGateInput,
  FormStorageTokenType,
} from "./types";
export type {
  HubReadUrlsRequestBody,
  PublicReadUrlsRequestBody,
} from "./parse/parse-read-urls-body";
export { isFormStorageTokenType } from "./types";
export { PublicFormPermissions } from "./domain/public-form-permissions";
export {
  createFormStorageGateService,
  type FormStorageAuthorizeOptions,
  type FormStorageGateContext,
  type IFormStorageGateService,
} from "./authorize/form-storage-gate.factory";
export { authorizeFormStorageAccess } from "./authorize/authorize-form-storage-access";
export { assertStorageObjectAccess } from "./assert-path/assert-respondent-object-access";
export { assertDesignerObjectAccess } from "./assert-path/assert-designer-object-access";
export {
  parseHubReadUrlsBody,
  parsePublicReadUrlsBody,
} from "./parse/parse-read-urls-body";
export { resolveRespondentGate } from "./parse/resolve-respondent-gate";
export { resolveStorageGateInput } from "./parse/resolve-gate-from-request";
export type { ResolveStorageGateInputOptions } from "./parse/resolve-gate-from-request";
export {
  formAccessForbidden,
  isFormAccessForbiddenResult,
} from "./http/form-access-result";
export { mapGateResultToResponse } from "./http/map-gate-result-to-response";
