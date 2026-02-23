import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../../lib/config';
import { AuthError, TenantError } from '../../lib/errors';
import { JwtPayload } from '../../types';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const config = getConfig();

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    if (!decoded.userId || !decoded.tenantId) {
      throw new AuthError('Invalid token payload');
    }

    req.user = decoded;
    req.tenantId = decoded.tenantId;

    next();
  } catch (err) {
    if (err instanceof AuthError) {
      next(err);
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new AuthError('Invalid or expired token'));
    } else {
      next(new AuthError('Authentication failed'));
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new TenantError('Insufficient role permissions'));
    }

    next();
  };
}
