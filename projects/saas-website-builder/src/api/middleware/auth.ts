import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../lib/config";
import { UnauthorizedError, ForbiddenError } from "../../lib/errors";
import { AuthPayload } from "../../types";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid Authorization header");
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthPayload;

    if (!payload.userId || !payload.tenantId) {
      throw new UnauthorizedError("Invalid token payload");
    }

    req.auth = payload;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid or expired token"));
      return;
    }
    next(error);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError());
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(new ForbiddenError(`Required role: ${roles.join(" or ")}`));
      return;
    }

    next();
  };
}
