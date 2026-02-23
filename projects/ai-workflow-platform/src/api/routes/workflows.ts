import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '../../lib/prisma';
import { getLogger } from '../../lib/logger';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { authenticate } from '../middleware/auth';
import { workflowDefinitionSchema, ApiResponse, PaginatedResponse, WorkflowDefinition } from '../../types';
import { WorkflowEngine } from '../../services/workflow-engine';

const router = Router();
const logger = getLogger().child({ module: 'workflows' });

router.use(authenticate);

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  definition: workflowDefinitionSchema,
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  definition: workflowDefinitionSchema.optional(),
  isActive: z.boolean().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function validateDefinitionGraph(definition: WorkflowDefinition): void {
  const nodeIds = new Set(Object.keys(definition.nodes));

  if (!nodeIds.has(definition.entrypoint)) {
    throw new ValidationError('Entrypoint node does not exist in nodes map');
  }

  for (const edge of definition.edges) {
    if (!nodeIds.has(edge.from)) {
      throw new ValidationError(`Edge references unknown source node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      throw new ValidationError(`Edge references unknown target node: ${edge.to}`);
    }
  }

  for (const [nodeId, node] of Object.entries(definition.nodes)) {
    if (node.id !== nodeId) {
      throw new ValidationError(`Node key '${nodeId}' does not match node.id '${node.id}'`);
    }
    for (const nextId of node.next) {
      if (!nodeIds.has(nextId)) {
        throw new ValidationError(`Node '${nodeId}' references unknown next node: ${nextId}`);
      }
    }
    if (node.type === 'CONDITION') {
      const cfg = node.config;
      if (cfg.trueBranch && !nodeIds.has(cfg.trueBranch)) {
        throw new ValidationError(`Condition node '${nodeId}' references unknown trueBranch: ${cfg.trueBranch}`);
      }
      if (cfg.falseBranch && !nodeIds.has(cfg.falseBranch)) {
        throw new ValidationError(`Condition node '${nodeId}' references unknown falseBranch: ${cfg.falseBranch}`);
      }
    }
  }
}

// GET / - list workflows (paginated)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const prisma = getPrisma();
    const tenantId = req.tenantId!;

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where: { tenantId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          version: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { runs: true } },
        },
      }),
      prisma.workflow.count({ where: { tenantId, isActive: true } }),
    ]);

    const response: PaginatedResponse<(typeof workflows)[number]> = {
      data: workflows,
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

// POST / - create workflow
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createWorkflowSchema.parse(req.body);
    const prisma = getPrisma();
    const tenantId = req.tenantId!;
    const userId = req.user!.userId;

    validateDefinitionGraph(body.definition as WorkflowDefinition);

    const workflow = await prisma.workflow.create({
      data: {
        name: body.name,
        description: body.description ?? '',
        tenantId,
        createdById: userId,
        definition: body.definition as any,
        version: 1,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    logger.info({ workflowId: workflow.id, tenantId }, 'Workflow created');

    const response: ApiResponse = { success: true, data: workflow };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /:id - get workflow detail
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenantId!;

    const workflow = await prisma.workflow.findFirst({
      where: { id: String(req.params.id), tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { runs: true } },
      },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow', String(req.params.id));
    }

    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// PUT /:id - update workflow
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateWorkflowSchema.parse(req.body);
    const prisma = getPrisma();
    const tenantId = req.tenantId!;

    const existing = await prisma.workflow.findFirst({
      where: { id: String(req.params.id), tenantId },
    });

    if (!existing) {
      throw new NotFoundError('Workflow', String(req.params.id));
    }

    if (body.definition) {
      validateDefinitionGraph(body.definition as WorkflowDefinition);
    }

    const workflow = await prisma.workflow.update({
      where: { id: String(req.params.id) },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.definition && {
          definition: body.definition as any,
          version: { increment: 1 },
        }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    logger.info({ workflowId: workflow.id, tenantId }, 'Workflow updated');
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - soft delete
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenantId!;

    const existing = await prisma.workflow.findFirst({
      where: { id: String(req.params.id), tenantId },
    });

    if (!existing) {
      throw new NotFoundError('Workflow', String(req.params.id));
    }

    await prisma.workflow.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
    });

    logger.info({ workflowId: String(req.params.id), tenantId }, 'Workflow soft deleted');
    res.json({ success: true, data: { id: String(req.params.id), deleted: true } });
  } catch (err) {
    next(err);
  }
});

// POST /:id/execute - trigger a workflow run
router.post('/:id/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenantId!;

    const workflow = await prisma.workflow.findFirst({
      where: { id: String(req.params.id), tenantId, isActive: true },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow', String(req.params.id));
    }

    const input = req.body.input ?? {};
    const engine = new WorkflowEngine();
    const run = await engine.startRun(workflow.id, input, tenantId);

    logger.info({ runId: run.id, workflowId: workflow.id, tenantId }, 'Workflow execution started');
    res.status(202).json({ success: true, data: run });
  } catch (err) {
    next(err);
  }
});

// GET /:id/runs - list runs for workflow (paginated)
router.get('/:id/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const prisma = getPrisma();
    const tenantId = req.tenantId!;

    // Verify workflow belongs to tenant
    const workflow = await prisma.workflow.findFirst({
      where: { id: String(req.params.id), tenantId },
      select: { id: true },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow', String(req.params.id));
    }

    const [runs, total] = await Promise.all([
      prisma.workflowRun.findMany({
        where: { workflowId: String(req.params.id), tenantId },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          status: true,
          input: true,
          output: true,
          startedAt: true,
          completedAt: true,
          error: true,
          currentStepId: true,
          _count: { select: { steps: true } },
        },
      }),
      prisma.workflowRun.count({ where: { workflowId: String(req.params.id), tenantId } }),
    ]);

    const response: PaginatedResponse<(typeof runs)[number]> = {
      data: runs,
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

export default router;
