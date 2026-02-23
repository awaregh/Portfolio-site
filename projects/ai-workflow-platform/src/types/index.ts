import { z } from 'zod';

// ── Step Types ──────────────────────────────────────────────────────
export const StepType = {
  AI_COMPLETION: 'AI_COMPLETION',
  HTTP_REQUEST: 'HTTP_REQUEST',
  CONDITION: 'CONDITION',
  TRANSFORM: 'TRANSFORM',
  DELAY: 'DELAY',
  WEBHOOK: 'WEBHOOK',
} as const;

export type StepType = (typeof StepType)[keyof typeof StepType];

// ── Run Status ──────────────────────────────────────────────────────
export const RunStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

// ── Step Status ─────────────────────────────────────────────────────
export const StepStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const;

export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

// ── Workflow Node ───────────────────────────────────────────────────
export interface WorkflowNodeConfig {
  // AI_COMPLETION
  model?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  temperature?: number;
  maxTokens?: number;
  // HTTP_REQUEST
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  // CONDITION
  expression?: string;
  trueBranch?: string;
  falseBranch?: string;
  // TRANSFORM
  template?: Record<string, unknown>;
  // DELAY
  delayMs?: number;
  // WEBHOOK
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface WorkflowNode {
  id: string;
  type: StepType;
  config: WorkflowNodeConfig;
  next: string[];
}

export interface WorkflowEdge {
  from: string;
  to: string;
}

export interface WorkflowMetadata {
  name: string;
  version: number;
  description?: string;
}

export interface WorkflowDefinition {
  metadata: WorkflowMetadata;
  nodes: Record<string, WorkflowNode>;
  edges: WorkflowEdge[];
  entrypoint: string;
}

// ── Zod Schemas for Validation ──────────────────────────────────────
export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['AI_COMPLETION', 'HTTP_REQUEST', 'CONDITION', 'TRANSFORM', 'DELAY', 'WEBHOOK']),
  config: z.record(z.unknown()),
  next: z.array(z.string()),
});

export const workflowDefinitionSchema = z.object({
  metadata: z.object({
    name: z.string().min(1),
    version: z.number().int().positive(),
    description: z.string().optional(),
  }),
  nodes: z.record(workflowNodeSchema),
  edges: z.array(
    z.object({
      from: z.string().min(1),
      to: z.string().min(1),
    }),
  ),
  entrypoint: z.string().min(1),
});

// ── JWT Payload ─────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

// ── Express Request Augmentation ────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}

// ── API Response Types ──────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ── Worker Job Types ────────────────────────────────────────────────
export interface StepJobData {
  runId: string;
  stepKey: string;
  tenantId: string;
  attempt: number;
}

export interface StepJobResult {
  stepKey: string;
  status: StepStatus;
  output?: unknown;
  error?: string;
}

// ── WebSocket Event Types ───────────────────────────────────────────
export interface WsEvent {
  type: 'run.started' | 'run.completed' | 'run.failed' | 'step.started' | 'step.completed' | 'step.failed' | 'run.cancelled';
  runId: string;
  stepKey?: string;
  data?: unknown;
  timestamp: string;
}

// ── Step Execution Context ──────────────────────────────────────────
export interface StepContext {
  input: Record<string, unknown>;
  steps: Record<string, { output: unknown; status: string }>;
  env: Record<string, string>;
}
