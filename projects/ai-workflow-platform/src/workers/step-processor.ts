import { getPrisma } from '../lib/prisma';
import { getLogger } from '../lib/logger';
import { WorkflowEngine } from '../services/workflow-engine';
import { wsService } from '../services/websocket';
import { StepJobData, WsEvent } from '../types';

const logger = getLogger().child({ module: 'step-processor' });

/**
 * Process a single workflow step job.
 * Checks idempotency, executes step, emits WebSocket events.
 */
export async function processStep(data: StepJobData): Promise<void> {
  const { runId, stepKey, tenantId } = data;
  const prisma = getPrisma();

  // ── Idempotency Check ─────────────────────────────────────────────
  const existingStep = await prisma.workflowStep.findFirst({
    where: { runId, stepKey },
  });

  if (!existingStep) {
    logger.warn({ runId, stepKey }, 'Step record not found, skipping');
    return;
  }

  if (existingStep.status === 'COMPLETED') {
    logger.info({ runId, stepKey }, 'Step already completed (idempotency), skipping');
    return;
  }

  if (existingStep.status === 'SKIPPED') {
    logger.info({ runId, stepKey }, 'Step was skipped, not processing');
    return;
  }

  // ── Check Run Status ──────────────────────────────────────────────
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    select: { status: true },
  });

  if (!run || run.status === 'CANCELLED' || run.status === 'FAILED') {
    logger.info({ runId, stepKey, runStatus: run?.status }, 'Run is no longer active, skipping step');
    return;
  }

  // ── Emit Step Started Event via WebSocket ─────────────────────────
  const startEvent: WsEvent = {
    type: 'step.started',
    runId,
    stepKey,
    data: { type: existingStep.type },
    timestamp: new Date().toISOString(),
  };
  wsService.broadcast(runId, startEvent);

  // ── Execute Step ──────────────────────────────────────────────────
  const engine = new WorkflowEngine();

  try {
    await engine.executeStep(runId, stepKey);

    // Emit step completed event
    const updatedStep = await prisma.workflowStep.findFirst({
      where: { runId, stepKey },
      select: { status: true, output: true },
    });

    if (updatedStep?.status === 'COMPLETED') {
      const completeEvent: WsEvent = {
        type: 'step.completed',
        runId,
        stepKey,
        data: { output: updatedStep.output },
        timestamp: new Date().toISOString(),
      };
      wsService.broadcast(runId, completeEvent);

      // Check if the entire run completed
      const updatedRun = await prisma.workflowRun.findUnique({
        where: { id: runId },
        select: { status: true, output: true },
      });

      if (updatedRun?.status === 'COMPLETED') {
        const runCompleteEvent: WsEvent = {
          type: 'run.completed',
          runId,
          data: { output: updatedRun.output },
          timestamp: new Date().toISOString(),
        };
        wsService.broadcast(runId, runCompleteEvent);
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ runId, stepKey, err: errorMessage }, 'Step execution failed');

    const failEvent: WsEvent = {
      type: 'step.failed',
      runId,
      stepKey,
      data: { error: errorMessage },
      timestamp: new Date().toISOString(),
    };
    wsService.broadcast(runId, failEvent);

    // Check if run failed
    const updatedRun = await prisma.workflowRun.findUnique({
      where: { id: runId },
      select: { status: true, error: true },
    });

    if (updatedRun?.status === 'FAILED') {
      const runFailEvent: WsEvent = {
        type: 'run.failed',
        runId,
        data: { error: updatedRun.error },
        timestamp: new Date().toISOString(),
      };
      wsService.broadcast(runId, runFailEvent);
    }
  }
}
