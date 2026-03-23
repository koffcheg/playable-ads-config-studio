export type ApiErrorResponse = {
  status: "error";
  code: string;
  message: string;
  details?: unknown;
};

export function buildErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponse {
  return {
    status: "error",
    code,
    message,
    ...(details !== undefined ? { details } : {})
  };
}
