import { createAuthorizationService } from "./application/authorization-service.factory";

export * from "./domain/permissions";
export * from "./domain/authorization-result";
export { createAuthorizationService as authorization };
