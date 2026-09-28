type Success<T> = {
  kind: Kind.Success;
  value: T;
};

type ErrorSupport = {
  traceId?: string;
  statusCode?: number;
  problemTitle?: string;
  problemMediaType?: string;
};

type Error = {
  kind: Kind.Error;
  errorType: ErrorType;
  message: string;
  details?: string;
  errorCode?: string;
  traceId?: string;
  statusCode?: number;
  problemTitle?: string;
  problemMediaType?: string;
};

type Result<T> = Success<T> | Error;

enum Kind {
  Success,
  Error,
}

enum ErrorType {
  ValidationError,
  Error,
}

const Result = {
  success: <T>(value: T): Success<T> => ({
    kind: Kind.Success,
    value,
  }),

  error: <T>(
    message: string,
    details?: string,
    errorCode?: string,
    support?: ErrorSupport,
  ): Result<T> => ({
    kind: Kind.Error,
    errorType: ErrorType.Error,
    message,
    details,
    errorCode,
    traceId: support?.traceId,
    statusCode: support?.statusCode,
    problemTitle: support?.problemTitle,
    problemMediaType: support?.problemMediaType,
  }),

  validationError: <T>(
    message: string,
    details?: string,
    errorCode?: string,
    support?: ErrorSupport,
  ): Result<T> => ({
    kind: Kind.Error,
    errorType: ErrorType.ValidationError,
    message,
    details,
    errorCode,
    traceId: support?.traceId,
    statusCode: support?.statusCode,
    problemTitle: support?.problemTitle,
    problemMediaType: support?.problemMediaType,
  }),

  isSuccess: <T>(result: Result<T>): result is Success<T> =>
    result && result?.kind === Kind.Success,

  isError: <T>(result: Result<T>): result is Error =>
    result && result?.kind === Kind.Error,
};

export type { Result as ResultType, Success, Error, ErrorSupport };

export { Kind, ErrorType, Result };
