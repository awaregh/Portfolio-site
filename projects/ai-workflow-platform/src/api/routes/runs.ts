import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '../../lib/prisma';
import { getLogger } from '../../lib/logger';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { authenticate } from '../middleware/auth';
import { PaginatedResponse, ApiResponse } from '../../types';

const router = Router();
const logger = getLogger().child({ module: 'runs' });

router.use(authenticate);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /:id - get run detail with steps
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenantId!;

    const run = await prisma.workflowRun.findFirst({
      where: { id: String(req.params.id), tenantId },
      include: {
        steps: {
          orderBy: { startedAt: 'asc' },
          select: {
            id: true,
            stepKey: true,
            type: true,
            status: true,
            input: true,
            output: true,
            error: true,
            startedAt: true,
            completedAt: true,
            retryCount: true,
          },
        },
        workflow: {
          select: { id: true, name: true, version: true },
        },
      },
    });

    if (!run) {
      throw new NotFoundError('WorkflowRun', String(req.params.id));
    }

    res.json({ success: true, data: run });
  } catch (err) {
    next(err);
  }
});

// GET /:id/events - get run events (for polling)
router.get('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const prisma = getPrisma();
    const tenantId = req.tenantId!;

    // Verify run belongs to tenant
    const run = await prisma.workflowRun.findFirst({
      where: { id: String(req.params.id), tenantId },
      select: { id: true },
    });

    if (!run) {
      throw new NotFoundError('WorkflowRun', String(req.params.id));
    }

    const sinceParam = req.query.since as string | undefined;
    const since = sinceParam ? new Date(sinceParam) : undefined;

    const whereClause: any = { runId: String(req.params.id) };
    if (since && !isNaN(since.getTime())) {
      whereClause.timestamp = { gt: since };
    }

    const [events, total] = await Promise.all([
      prisma.workflowEvent.findMany({
        where: whereClause,
        orderBy: { timestamp: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.workflowEvent.count({ where: whereClause }),
    ]);

    const response: PaginatedResponse<(typeof events)[number]> = {
      data: events,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    res.json({ success: true, ...response });
  } catch (err) {
    next(err);
  }
});

// POST /:id/cancel - cancel a running workflow
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenantId!;

    const run = await prisma.workflowRun.findFirst({
      where: { id: String(req.params.id), tenantId },
    });

    if (!run) {
      throw new NotFoundError('WorkflowRun', String(req.params.id));
    }

    if (run.status !== 'PENDING' && run.status !== 'RUNNING') {
      throw new ValidationError(`Cannot cancel run with status: ${run.status}`);
    }

    const updatedRun = await prisma.$transaction(async (tx) => {
      // Cancel the run
      const updated = await tx.workflowRun.update({
        where: { id: String(req.params.id) },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          error: 'Cancelled by user',
        },
      });

      // Mark pending/running steps as skipped
      await tx.workflowStep.updateMany({
        where: {
          runId: String(req.params.id),
          status: { in: ['PENDING', 'RUNNING'] },
        },
        data: {
          status: 'SKIPPED',
          completedAt: new Date(),
        },
      });

      // Record cancellation event
      await tx.workflowEvent.create({
        data: {
          runId: String(req.params.id),
          type: 'run.cancelled',
          payload: { cancelledBy: req.user!.userId },
        },
      });

      return updated;
    });

    logger.info({ runId: String(req.params.id), tenantId }, 'Workflow run cancelled');

    const response: ApiResponse = { success: true, data: updatedRun };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
