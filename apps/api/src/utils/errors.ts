export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = "APP_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "External service error", details?: unknown) {
    super(message, 502, "EXTERNAL_SERVICE_ERROR", details);
    this.name = "ExternalServiceError";
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database operation failed", details?: unknown) {
    super(message, 500, "DATABASE_ERROR", details);
    this.name = "DatabaseError";
  }
}

export class ConfigurationError extends AppError {
  constructor(message = "Invalid configuration", details?: unknown) {
    super(message, 500, "CONFIGURATION_ERROR", details);
    this.name = "ConfigurationError";
  }
}
