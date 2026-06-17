import { createAuthorizationService } from "./application/authorization-service.factory";

export * from "./domain/permissions";
export * from "./domain/authorization-result";
export * from "./domain/system-roles";
export { createAuthorizationService as authorization };
