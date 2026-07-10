export class AppException extends Error {
  constructor(message, statusCode) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestException extends AppException {
  constructor(message = "Bad Request") {
    super(message, 400);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundException extends AppException {
  constructor(message = "Not Found") {
    super(message, 404);
  }
}

export class ConflictException extends AppException {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}