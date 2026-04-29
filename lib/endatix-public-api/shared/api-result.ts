export enum PublicApiErrorType {
  NetworkError = 'NetworkError',
  ValidationError = 'ValidationError',
  AuthError = 'AuthError',
  ForbiddenError = 'ForbiddenError',
  NotFoundError = 'NotFoundError',
  ServerError = 'ServerError',
  UnknownError = 'UnknownError',
}

export interface PublicApiErrorDetails {
  statusCode?: number;
  endpoint?: string;
  method?: string;
  details?: string;
}

export type PublicApiSuccess<T> = {
  success: true;
  data: T;
};

export type PublicApiError = {
  success: false;
  error: {
    type: PublicApiErrorType;
    message: string;
    details?: PublicApiErrorDetails;
    fields?: Record<string, string[]>;
  };
};

export type PublicApiResult<T> = PublicApiSuccess<T> | PublicApiError;

export const PublicApiResult = {
  success: <T>(data: T): PublicApiSuccess<T> => ({ success: true, data }),

  error: <T>(
    type: PublicApiErrorType,
    message: string,
    details?: PublicApiErrorDetails,
    fields?: Record<string, string[]>,
  ): PublicApiResult<T> => ({
    success: false,
    error: { type, message, details, fields },
  }),

  isSuccess: <T>(result: PublicApiResult<T>): result is PublicApiSuccess<T> =>
    result.success,
};
