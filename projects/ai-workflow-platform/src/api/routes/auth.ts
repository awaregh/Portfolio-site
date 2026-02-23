import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getPrisma } from '../../lib/prisma';
import { getConfig } from '../../lib/config';
import { getLogger } from '../../lib/logger';
import { AuthError, ValidationError, ConflictError } from '../../lib/errors';
import { JwtPayload, ApiResponse } from '../../types';

const router = Router();
const logger = getLogger().child({ module: 'auth' });

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  tenantName: z.string().min(1, 'Organization name is required'),
  tenantSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function generateToken(payload: JwtPayload): string {
  const config = getConfig();
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);
    const prisma = getPrisma();

    // Check for existing user or tenant
    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const existingTenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } });
    if (existingTenant) {
      throw new ConflictError('An organization with this slug already exists');
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: body.tenantName,
          slug: body.tenantSlug,
          plan: 'FREE',
          settings: {},
        },
      });

      const user = await tx.user.create({
        data: {
          email: body.email,
          passwordHash,
          name: body.name,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    const tokenPayload: JwtPayload = {
      userId: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email,
      role: result.user.role,
    };

    const token = generateToken(tokenPayload);

    logger.info({ userId: result.user.id, tenantId: result.tenant.id }, 'User registered');

    const response: ApiResponse = {
      success: true,
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          plan: result.tenant.plan,
        },
      },
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { tenant: true },
    });

    if (!user) {
      throw new AuthError('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordValid) {
      throw new AuthError('Invalid email or password');
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(tokenPayload);

    logger.info({ userId: user.id, tenantId: user.tenantId }, 'User logged in');

    const response: ApiResponse = {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
        },
      },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
