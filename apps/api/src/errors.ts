export type ErrorCode =
  | "payment_required"
  | "payment_invalid"
  | "payment_insufficient"
  | "payment_replay"
  | "payment_unavailable"
  | "session_required"
  | "session_expired"
  | "budget_exceeded"
  | "rate_limited"
  | "unauthorized"
  | "forbidden"
  | "channel_not_bound"
  | "otp_required"
  | "otp_invalid"
  | "not_found"
  | "conflict"
  | "validation_error"
  | "payload_too_large"
  | "unsupported_media_type"
  | "ssrf_blocked"
  | "upstream_timeout"
  | "upstream_error"
  | "inbox_full"
  | "storage_unavailable"
  | "internal_error";

const HTTP: Record<ErrorCode, number> = {
  payment_required: 402,
  payment_invalid: 402,
  payment_insufficient: 402,
  payment_replay: 409,
  payment_unavailable: 503,
  session_required: 401,
  session_expired: 401,
  budget_exceeded: 403,
  rate_limited: 429,
  unauthorized: 401,
  forbidden: 403,
  channel_not_bound: 409,
  otp_required: 401,
  otp_invalid: 401,
  not_found: 404,
  conflict: 409,
  validation_error: 400,
  payload_too_large: 413,
  unsupported_media_type: 415,
  ssrf_blocked: 400,
  upstream_timeout: 504,
  upstream_error: 502,
  inbox_full: 429,
  storage_unavailable: 503,
  internal_error: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = HTTP[code];
    this.details = details;
  }
}

export function errorBody(
  err: AppError,
  requestId: string,
): { error: { code: ErrorCode; message: string; request_id: string; details?: Record<string, unknown> } } {
  return {
    error: {
      code: err.code,
      message: err.message,
      request_id: requestId,
      ...(err.details ? { details: err.details } : {}),
    },
  };
}
