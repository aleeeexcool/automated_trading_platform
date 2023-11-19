import { isDevMode } from "./isDevMode";

export enum ErrorType {
  Request = "request",
  RequestFormat = "requestFormat",
  Config = "config",
}

const errorIds = {
  [ErrorType.Request]: 0,
  [ErrorType.RequestFormat]: 1,
  [ErrorType.Config]: 2,
};

const errorStatuses = {
  [ErrorType.Request]: 400,
  [ErrorType.RequestFormat]: 400,
  [ErrorType.Config]: 500,
};

export interface ErrorInfo {
  type: ErrorType;
  message: any;
  provider?: string;
  debug?: {
    module?: string;
    method?: string;
  };
}

export const errorInfo = (params: ErrorInfo): string => {
  return JSON.stringify(
    {
      id: errorIds[params.type],
      type: params.type,
      statusCode: getStatusCode(params.message, params.type),
      message:
        typeof params.message === "string"
          ? params.message
          : params.message.message,
      ...(params.provider ? { provider: params.provider } : {}),
      ...(isDevMode && params.debug
        ? {
            debug: {
              ...(params.debug.module ? { module: params.debug.module } : {}),
              ...(params.debug.method ? { method: params.debug.method } : {}),
            },
          }
        : {}),
    },
    null,
    2
  );
};

export const errorInfoCombined = (errorInfoArr: string[]): string => {
  const res: string[] = [];
  for (const errorInfo of errorInfoArr) {
    res.push(JSON.parse(errorInfo));
  }

  return JSON.stringify(res, null, 2);
};

// TODO: fix this type
const getStatusCode = (error: any, type: ErrorType): number => {
  // if (isTooManyRequests(error)) return 429;
  // if (isInternalServerError(error)) return 500;
  // if (isTimeOutError(error)) return 408;
  // if (isBadGatewayError(error)) return 502;

  // return typeof error === "string"
  //   ? errorStatuses[type]
  //   : error.statusCode || errorStatuses[type];
};

export const getErrorStatusCode = (err: Error): number | undefined => {
  let errMessage = { statusCode: errorStatuses[ErrorType.Request] };
  try {
    errMessage = JSON.parse(err.message);
  } catch (err) {}

  return (
    Array.isArray(errMessage) ? errMessage[errMessage.length - 1] : errMessage
  ).statusCode;
};

