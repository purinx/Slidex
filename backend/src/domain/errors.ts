export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ErrorDetails;

  constructor(status: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: string, message: string, details?: ErrorDetails) {
  return new AppError(400, code, message, details);
}

export function notFound(code: string, message: string, details?: ErrorDetails) {
  return new AppError(404, code, message, details);
}

export function serverError(code: string, message: string, details?: ErrorDetails) {
  return new AppError(500, code, message, details);
}
