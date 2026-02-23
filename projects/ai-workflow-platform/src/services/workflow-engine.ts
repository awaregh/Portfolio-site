import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../lib/prisma';
import { getRedis } from '../lib/redis';
import { getLogger } from '../lib/logger';
import { getConfig } from '../lib/config';
import { NotFoundError, ValidationError, AppError } from '../lib/errors';
import { AIService } from './ai-service';
import {
  WorkflowDefinition,
  WorkflowNode,
  StepContext,
  StepJobData,
  StepType,
} from '../types';

const logger = getLogger().child({ module: 'workflow-engine' });

export class WorkflowEngine {
  private queue: Queue;
  private aiService: AIService;

  constructor() {
    const redis = getRedis();
    this.queue = new Queue('workflow-steps', { connection: redis });
    this.aiService = new AIService();
  }

  /**
   * Start a new workflow run: create run record, initial step records, enqueue first step.
   */
  async startRun(workflowId: string, input: Record<string, unknown>, tenantId: string) {
    const prisma = getPrisma();

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, tenantId, isActive: true },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow', workflowId);
    }

    const definition = workflow.definition as unknown as WorkflowDefinition;

    if (!definition.entrypoint || !definition.nodes[definition.entrypoint]) {
      throw new ValidationError('Workflow definition has no valid entrypoint');
    }

    // Create run and initial step records in a transaction
    const run = await prisma.$transaction(async (tx) => {
      const newRun = await tx.workflowRun.create({
        data: {
          workflowId,
          tenantId,
          status: 'PENDING',
          input: input as any,
          startedAt: new Date(),
          currentStepId: definition.entrypoint,
        },
      });

      // Create step records for all nodes
      const stepRecords = Object.entries(definition.nodes).map(([key, node]) => ({
        runId: newRun.id,
        stepKey: key,
        type: node.type as any,
        status: key === definition.entrypoint ? ('PENDING' as const) : ('PENDING' as const),
        idempotencyKey: `${newRun.id}:${key}:0`,
      }));

      await tx.workflowStep.createMany({ data: stepRecords });

      // Record start event
      await tx.workflowEvent.create({
        data: {
          runId: newRun.id,
          type: 'run.started',
          payload: { input: input as any, workflowId, entrypoint: definition.entrypoint },
        },
      });

      return newRun;
    });

    // Update run status to RUNNING
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: 'RUNNING' },
    });

    // Enqueue the first step
    await this.enqueueStep(run.id, definition.entrypoint, tenantId, 0);

    logger.info({ runId: run.id, workflowId, entrypoint: definition.entrypoint }, 'Workflow run started');

    return prisma.workflowRun.findUniqueOrThrow({
      where: { id: run.id },
      include: { steps: true },
    });
  }

  /**
   * Execute a single step based on its type.
   */
  async executeStep(runId: string, stepKey: string): Promise<void> {
    const prisma = getPrisma();

    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        workflow: true,
        steps: true,
      },
    });

    if (!run) {
      throw new NotFoundError('WorkflowRun', runId);
    }

    if (run.status === 'CANCELLED') {
      logger.info({ runId, stepKey }, 'Skipping step — run is cancelled');
      return;
    }

    const definition = run.workflow.definition as unknown as WorkflowDefinition;
    const nodeDef = definition.nodes[stepKey];

    if (!nodeDef) {
      throw new ValidationError(`Step '${stepKey}' not found in workflow definition`);
    }

    const step = run.steps.find((s) => s.stepKey === stepKey);
    if (!step) {
      throw new NotFoundError('WorkflowStep', stepKey);
    }

    // Build step context
    const context = this.buildContext(run.input as Record<string, unknown>, run.steps);

    // Mark step as running
    await prisma.workflowStep.update({
      where: { id: step.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    await prisma.workflowRun.update({
      where: { id: runId },
      data: { currentStepId: stepKey },
    });

    // Record step start event
    await prisma.workflowEvent.create({
      data: {
        runId,
        stepId: step.id,
        type: 'step.started',
        payload: { stepKey, type: nodeDef.type },
      },
    });

    try {
      const output = await this.executeStepByType(nodeDef, context);
      await this.handleStepComplete(runId, stepKey, output);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.handleStepError(runId, stepKey, errorMessage);
    }
  }

  /**
   * Execute step logic based on node type.
   */
  private async executeStepByType(
    node: WorkflowNode,
    context: StepContext,
  ): Promise<unknown> {
    switch (node.type) {
      case 'AI_COMPLETION':
        return this.executeAICompletion(node, context);
      case 'HTTP_REQUEST':
        return this.executeHttpRequest(node, context);
      case 'CONDITION':
        return this.executeCondition(node, context);
      case 'TRANSFORM':
        return this.executeTransform(node, context);
      case 'DELAY':
        return this.executeDelay(node);
      case 'WEBHOOK':
        return this.executeWebhook(node, context);
      default:
        throw new ValidationError(`Unknown step type: ${node.type}`);
    }
  }

  private async executeAICompletion(
    node: WorkflowNode,
    context: StepContext,
  ): Promise<unknown> {
    const { systemPrompt, userPromptTemplate, model, temperature, maxTokens } = node.config;

    const userPrompt = this.interpolateTemplate(userPromptTemplate ?? '', context);

    const result = await this.aiService.complete(userPrompt, {
      systemPrompt: systemPrompt ?? 'You are a helpful assistant.',
      model: model ?? 'gpt-4o-mini',
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 2000,
    });

    return {
      content: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed,
    };
  }

  private async executeHttpRequest(
    node: WorkflowNode,
    context: StepContext,
  ): Promise<unknown> {
    const { url, method, headers, body } = node.config;

    if (!url) throw new ValidationError('HTTP_REQUEST step requires a url');

    const resolvedUrl = this.interpolateTemplate(url, context);
    const resolvedBody = body ? JSON.parse(this.interpolateTemplate(JSON.stringify(body), context)) : undefined;

    const response = await fetch(resolvedUrl, {
      method: (method ?? 'GET').toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      ...(resolvedBody && { body: JSON.stringify(resolvedBody) }),
    });

    const responseBody = await response.text();
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
    }

    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: parsedBody,
    };
  }

  private async executeCondition(
    node: WorkflowNode,
    context: StepContext,
  ): Promise<unknown> {
    const { expression } = node.config;
    if (!expression) throw new ValidationError('CONDITION step requires an expression');

    let result: boolean;
    try {
      // Safely evaluate condition against context
      const evalFn = new Function('input', 'steps', 'env', `return Boolean(${expression})`);
      result = evalFn(context.input, context.steps, context.env);
    } catch (err) {
      logger.warn({ expression, err }, 'Condition evaluation failed, defaulting to false');
      result = false;
    }

    return {
      conditionResult: result,
      expression,
      selectedBranch: result ? node.config.trueBranch : node.config.falseBranch,
    };
  }

  private async executeTransform(
    node: WorkflowNode,
    context: StepContext,
  ): Promise<unknown> {
    const { template } = node.config;
    if (!template) throw new ValidationError('TRANSFORM step requires a template');

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateTemplate(value, context);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private async executeDelay(node: WorkflowNode): Promise<unknown> {
    const delayMs = node.config.delayMs ?? 1000;
    await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 30000)));
    return { delayed: true, delayMs };
  }

  private async executeWebhook(
    node: WorkflowNode,
    context: StepContext,
  ): Promise<unknown> {
    const { webhookUrl } = node.config;
    if (!webhookUrl) throw new ValidationError('WEBHOOK step requires a webhookUrl');

    const resolvedUrl = this.interpolateTemplate(webhookUrl, context);

    const response = await fetch(resolvedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: context.input, steps: context.steps }),
    });

    return {
      statusCode: response.status,
      acknowledged: response.ok,
    };
  }

  /**
   * Handle successful step completion: update records, determine and enqueue next steps.
   */
  async handleStepComplete(runId: string, stepKey: string, output: unknown): Promise<void> {
    const prisma = getPrisma();

    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflow: true, steps: true },
    });

    if (!run) return;

    const step = run.steps.find((s) => s.stepKey === stepKey);
    if (!step) return;

    const definition = run.workflow.definition as unknown as WorkflowDefinition;
    const nodeDef = definition.nodes[stepKey];

    // Update step as completed
    await prisma.workflowStep.update({
      where: { id: step.id },
      data: {
        status: 'COMPLETED',
        output: (output ?? {}) as any,
        completedAt: new Date(),
      },
    });

    // Record step completion event
    await prisma.workflowEvent.create({
      data: {
        runId,
        stepId: step.id,
        type: 'step.completed',
        payload: { stepKey, output: output ?? {} },
      },
    });

    // Determine next steps
    let nextSteps: string[] = [];

    if (nodeDef.type === 'CONDITION') {
      const condOutput = output as { selectedBranch?: string } | null;
      if (condOutput?.selectedBranch) {
        nextSteps = [condOutput.selectedBranch];
      }
    } else {
      nextSteps = nodeDef.next ?? [];
    }

    if (nextSteps.length === 0) {
      // Check if all steps are done
      const updatedSteps = await prisma.workflowStep.findMany({
        where: { runId },
      });

      const allDone = updatedSteps.every(
        (s) => s.status === 'COMPLETED' || s.status === 'SKIPPED' || s.status === 'FAILED',
      );

      // Also check: no pending steps that should still run
      const pendingSteps = updatedSteps.filter((s) => s.status === 'PENDING');
      const reachableFromCompleted = this.getReachableSteps(definition, updatedSteps);

      if (allDone || (pendingSteps.length > 0 && !reachableFromCompleted.has(pendingSteps[0]?.stepKey))) {
        await this.completeRun(runId, output);
      }
    } else {
      // Enqueue next steps
      for (const nextKey of nextSteps) {
        if (definition.nodes[nextKey]) {
          await this.enqueueStep(runId, nextKey, run.tenantId, 0);
        }
      }
    }
  }

  /**
   * Handle step failure with retry logic.
   */
  async handleStepError(runId: string, stepKey: string, error: string): Promise<void> {
    const prisma = getPrisma();
    const config = getConfig();

    const step = await prisma.workflowStep.findFirst({
      where: { runId, stepKey },
    });

    if (!step) return;

    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
    });

    if (!run) return;

    const newRetryCount = step.retryCount + 1;
    const maxRetries = config.workflow.maxRetries;

    if (newRetryCount <= maxRetries) {
      // Retry with exponential backoff
      const delay = config.workflow.retryBaseDelayMs * Math.pow(2, newRetryCount - 1);

      await prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          retryCount: newRetryCount,
          status: 'PENDING',
          error,
          idempotencyKey: `${runId}:${stepKey}:${newRetryCount}`,
        },
      });

      await prisma.workflowEvent.create({
        data: {
          runId,
          stepId: step.id,
          type: 'step.retry',
          payload: { stepKey, error, retryCount: newRetryCount, delayMs: delay },
        },
      });

      logger.warn({ runId, stepKey, retryCount: newRetryCount, delay }, 'Step retrying');

      await this.enqueueStep(runId, stepKey, run.tenantId, delay);
    } else {
      // Max retries exceeded — fail the step and the run
      await prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          status: 'FAILED',
          error,
          completedAt: new Date(),
        },
      });

      await prisma.workflowEvent.create({
        data: {
          runId,
          stepId: step.id,
          type: 'step.failed',
          payload: { stepKey, error, retryCount: newRetryCount },
        },
      });

      await this.failRun(runId, `Step '${stepKey}' failed after ${maxRetries} retries: ${error}`);
    }
  }

  /**
   * Mark run as completed.
   */
  private async completeRun(runId: string, finalOutput: unknown): Promise<void> {
    const prisma = getPrisma();

    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        output: (finalOutput ?? {}) as any,
        completedAt: new Date(),
        currentStepId: null,
      },
    });

    await prisma.workflowEvent.create({
      data: {
        runId,
        type: 'run.completed',
        payload: { output: finalOutput ?? {} },
      },
    });

    logger.info({ runId }, 'Workflow run completed');
  }

  /**
   * Mark run as failed.
   */
  private async failRun(runId: string, error: string): Promise<void> {
    const prisma = getPrisma();

    // Skip pending steps
    await prisma.workflowStep.updateMany({
      where: { runId, status: 'PENDING' },
      data: { status: 'SKIPPED', completedAt: new Date() },
    });

    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        error,
        completedAt: new Date(),
        currentStepId: null,
      },
    });

    await prisma.workflowEvent.create({
      data: {
        runId,
        type: 'run.failed',
        payload: { error },
      },
    });

    logger.error({ runId, error }, 'Workflow run failed');
  }

  /**
   * Enqueue a step job to BullMQ.
   */
  private async enqueueStep(
    runId: string,
    stepKey: string,
    tenantId: string,
    delay: number,
  ): Promise<void> {
    const jobData: StepJobData = {
      runId,
      stepKey,
      tenantId,
      attempt: 0,
    };

    await this.queue.add('execute-step', jobData, {
      jobId: `${runId}:${stepKey}:${Date.now()}`,
      delay: delay > 0 ? delay : undefined,
      attempts: 1, // We handle retries ourselves
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    });

    logger.debug({ runId, stepKey, delay }, 'Step enqueued');
  }

  /**
   * Build execution context from run data and completed steps.
   */
  private buildContext(
    input: Record<string, unknown>,
    steps: Array<{ stepKey: string; output: unknown; status: string }>,
  ): StepContext {
    const stepsMap: Record<string, { output: unknown; status: string }> = {};

    for (const step of steps) {
      if (step.status === 'COMPLETED' && step.output) {
        stepsMap[step.stepKey] = {
          output: step.output,
          status: step.status,
        };
      }
    }

    return {
      input,
      steps: stepsMap,
      env: {},
    };
  }

  /**
   * Interpolate template strings with context values.
   * Supports {{input.field}}, {{steps["step-id"].output.field}}, {{now}}
   */
  private interpolateTemplate(template: string, context: StepContext): string {
    return template.replace(/\{\{(.+?)\}\}/g, (_match, expr: string) => {
      const trimmed = expr.trim();
      if (trimmed === 'now') {
        return new Date().toISOString();
      }

      try {
        const fn = new Function('input', 'steps', 'env', `return ${trimmed}`);
        const result = fn(context.input, context.steps, context.env);
        return result !== undefined && result !== null ? String(result) : '';
      } catch {
        return '';
      }
    });
  }

  /**
   * Get all reachable step keys from completed steps.
   */
  private getReachableSteps(
    definition: WorkflowDefinition,
    steps: Array<{ stepKey: string; status: string }>,
  ): Set<string> {
    const reachable = new Set<string>();
    const completed = new Set(steps.filter((s) => s.status === 'COMPLETED').map((s) => s.stepKey));

    for (const key of completed) {
      const node = definition.nodes[key];
      if (node) {
        for (const next of node.next) {
          reachable.add(next);
        }
      }
    }

    return reachable;
  }
}
