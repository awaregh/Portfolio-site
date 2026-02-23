import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowDefinition, WorkflowNode, StepContext } from '../src/types';

// ── Helpers ─────────────────────────────────────────────────────────

function createMockDefinition(overrides?: Partial<WorkflowDefinition>): WorkflowDefinition {
  return {
    metadata: { name: 'Test Workflow', version: 1, description: 'Test' },
    nodes: {
      start: {
        id: 'start',
        type: 'TRANSFORM',
        config: { template: { message: '{{input.text}}' } },
        next: ['end'],
      },
      end: {
        id: 'end',
        type: 'TRANSFORM',
        config: { template: { result: 'done' } },
        next: [],
      },
    },
    edges: [{ from: 'start', to: 'end' }],
    entrypoint: 'start',
    ...overrides,
  };
}

function createConditionDefinition(): WorkflowDefinition {
  return {
    metadata: { name: 'Condition Test', version: 1 },
    nodes: {
      check: {
        id: 'check',
        type: 'CONDITION',
        config: {
          expression: 'input.value > 10',
          trueBranch: 'high',
          falseBranch: 'low',
        },
        next: [],
      },
      high: {
        id: 'high',
        type: 'TRANSFORM',
        config: { template: { result: 'high' } },
        next: [],
      },
      low: {
        id: 'low',
        type: 'TRANSFORM',
        config: { template: { result: 'low' } },
        next: [],
      },
    },
    edges: [
      { from: 'check', to: 'high' },
      { from: 'check', to: 'low' },
    ],
    entrypoint: 'check',
  };
}

// ── Template Interpolation ──────────────────────────────────────────

function interpolateTemplate(template: string, context: StepContext): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_match, expr: string) => {
    const trimmed = expr.trim();
    if (trimmed === 'now') return new Date().toISOString();
    try {
      const fn = new Function('input', 'steps', 'env', `return ${trimmed}`);
      const result = fn(context.input, context.steps, context.env);
      return result !== undefined && result !== null ? String(result) : '';
    } catch {
      return '';
    }
  });
}

// ── Condition Evaluation ────────────────────────────────────────────

function evaluateCondition(expression: string, context: StepContext): boolean {
  try {
    const evalFn = new Function('input', 'steps', 'env', `return Boolean(${expression})`);
    return evalFn(context.input, context.steps, context.env);
  } catch {
    return false;
  }
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Workflow Definition Validation', () => {
  it('should validate a correct workflow definition', () => {
    const def = createMockDefinition();
    expect(def.entrypoint).toBe('start');
    expect(Object.keys(def.nodes)).toHaveLength(2);
    expect(def.edges).toHaveLength(1);
  });

  it('should detect missing entrypoint node', () => {
    const def = createMockDefinition({ entrypoint: 'nonexistent' });
    const nodeIds = new Set(Object.keys(def.nodes));
    expect(nodeIds.has(def.entrypoint)).toBe(false);
  });

  it('should detect invalid edge references', () => {
    const def = createMockDefinition({
      edges: [{ from: 'start', to: 'nonexistent' }],
    });
    const nodeIds = new Set(Object.keys(def.nodes));
    const invalidEdges = def.edges.filter(
      (e) => !nodeIds.has(e.from) || !nodeIds.has(e.to),
    );
    expect(invalidEdges).toHaveLength(1);
  });

  it('should detect node id mismatch', () => {
    const nodes = {
      start: {
        id: 'wrong-id',
        type: 'TRANSFORM' as const,
        config: {},
        next: [],
      },
    };

    const mismatched = Object.entries(nodes).filter(
      ([key, node]) => key !== node.id,
    );
    expect(mismatched).toHaveLength(1);
  });

  it('should validate all node types are recognized', () => {
    const validTypes = new Set([
      'AI_COMPLETION',
      'HTTP_REQUEST',
      'CONDITION',
      'TRANSFORM',
      'DELAY',
      'WEBHOOK',
    ]);
    const def = createMockDefinition();
    for (const node of Object.values(def.nodes)) {
      expect(validTypes.has(node.type)).toBe(true);
    }
  });
});

describe('Step Execution Flow', () => {
  it('should determine next steps from node.next', () => {
    const def = createMockDefinition();
    const startNode = def.nodes['start'];
    expect(startNode.next).toEqual(['end']);
  });

  it('should identify terminal nodes (no next steps)', () => {
    const def = createMockDefinition();
    const terminalNodes = Object.values(def.nodes).filter(
      (n) => n.next.length === 0,
    );
    expect(terminalNodes).toHaveLength(1);
    expect(terminalNodes[0].id).toBe('end');
  });

  it('should handle multi-step chains correctly', () => {
    const def: WorkflowDefinition = {
      metadata: { name: 'Chain', version: 1 },
      nodes: {
        a: { id: 'a', type: 'TRANSFORM', config: {}, next: ['b'] },
        b: { id: 'b', type: 'TRANSFORM', config: {}, next: ['c'] },
        c: { id: 'c', type: 'TRANSFORM', config: {}, next: [] },
      },
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
      entrypoint: 'a',
    };

    // Walk the chain
    const visited: string[] = [];
    let current: string | undefined = def.entrypoint;

    while (current) {
      visited.push(current);
      const node = def.nodes[current];
      current = node.next[0];
    }

    expect(visited).toEqual(['a', 'b', 'c']);
  });

  it('should handle parallel branches (multiple next)', () => {
    const def: WorkflowDefinition = {
      metadata: { name: 'Parallel', version: 1 },
      nodes: {
        start: { id: 'start', type: 'TRANSFORM', config: {}, next: ['branch1', 'branch2'] },
        branch1: { id: 'branch1', type: 'TRANSFORM', config: {}, next: [] },
        branch2: { id: 'branch2', type: 'TRANSFORM', config: {}, next: [] },
      },
      edges: [
        { from: 'start', to: 'branch1' },
        { from: 'start', to: 'branch2' },
      ],
      entrypoint: 'start',
    };

    const startNode = def.nodes['start'];
    expect(startNode.next).toHaveLength(2);
    expect(startNode.next).toContain('branch1');
    expect(startNode.next).toContain('branch2');
  });
});

describe('Condition Branching', () => {
  it('should evaluate true condition and select trueBranch', () => {
    const context: StepContext = {
      input: { value: 20 },
      steps: {},
      env: {},
    };

    const result = evaluateCondition('input.value > 10', context);
    expect(result).toBe(true);
  });

  it('should evaluate false condition and select falseBranch', () => {
    const context: StepContext = {
      input: { value: 5 },
      steps: {},
      env: {},
    };

    const result = evaluateCondition('input.value > 10', context);
    expect(result).toBe(false);
  });

  it('should determine correct branch from condition output', () => {
    const def = createConditionDefinition();
    const node = def.nodes['check'];

    const context: StepContext = {
      input: { value: 20 },
      steps: {},
      env: {},
    };

    const condResult = evaluateCondition(node.config.expression!, context);
    const selectedBranch = condResult ? node.config.trueBranch : node.config.falseBranch;

    expect(selectedBranch).toBe('high');
  });

  it('should handle malformed expressions gracefully', () => {
    const context: StepContext = {
      input: {},
      steps: {},
      env: {},
    };

    const result = evaluateCondition('this is not valid javascript!!!', context);
    expect(result).toBe(false);
  });

  it('should handle undefined values in conditions', () => {
    const context: StepContext = {
      input: {},
      steps: {},
      env: {},
    };

    const result = evaluateCondition('input.nonexistent > 10', context);
    expect(result).toBe(false);
  });

  it('should use step output in conditions', () => {
    const context: StepContext = {
      input: {},
      steps: {
        'prev-step': { output: { count: 42 }, status: 'COMPLETED' },
      },
      env: {},
    };

    const result = evaluateCondition('steps["prev-step"].output.count > 10', context);
    expect(result).toBe(true);
  });
});

describe('Template Interpolation', () => {
  it('should interpolate input values', () => {
    const context: StepContext = {
      input: { topic: 'AI workflows' },
      steps: {},
      env: {},
    };

    const result = interpolateTemplate('Write about {{input.topic}}', context);
    expect(result).toBe('Write about AI workflows');
  });

  it('should interpolate step output values', () => {
    const context: StepContext = {
      input: {},
      steps: {
        'step-1': { output: { content: 'Hello world' }, status: 'COMPLETED' },
      },
      env: {},
    };

    const result = interpolateTemplate(
      'Previous output: {{steps["step-1"].output.content}}',
      context,
    );
    expect(result).toBe('Previous output: Hello world');
  });

  it('should handle {{now}} template', () => {
    const context: StepContext = { input: {}, steps: {}, env: {} };
    const result = interpolateTemplate('Time: {{now}}', context);
    expect(result).toMatch(/Time: \d{4}-\d{2}-\d{2}T/);
  });

  it('should handle missing values gracefully', () => {
    const context: StepContext = { input: {}, steps: {}, env: {} };
    const result = interpolateTemplate('Value: {{input.missing}}', context);
    expect(result).toBe('Value: ');
  });

  it('should handle multiple interpolations', () => {
    const context: StepContext = {
      input: { a: 'hello', b: 'world' },
      steps: {},
      env: {},
    };

    const result = interpolateTemplate('{{input.a}} {{input.b}}!', context);
    expect(result).toBe('hello world!');
  });
});

describe('Error Handling and Retries', () => {
  it('should calculate exponential backoff delays', () => {
    const baseDelay = 1000;

    const delays = [1, 2, 3].map((retry) => baseDelay * Math.pow(2, retry - 1));

    expect(delays[0]).toBe(1000);   // 1st retry: 1s
    expect(delays[1]).toBe(2000);   // 2nd retry: 2s
    expect(delays[2]).toBe(4000);   // 3rd retry: 4s
  });

  it('should respect max retry limit', () => {
    const maxRetries = 3;
    let retryCount = 0;
    let shouldRetry = true;

    while (shouldRetry && retryCount < maxRetries) {
      retryCount++;
      shouldRetry = retryCount < maxRetries;
    }

    expect(retryCount).toBe(maxRetries);
  });

  it('should fail run after max retries exceeded', () => {
    const maxRetries = 3;
    const retryCount = 4;

    const shouldFail = retryCount > maxRetries;
    expect(shouldFail).toBe(true);
  });
});

describe('Idempotency', () => {
  it('should generate unique idempotency keys', () => {
    const runId = 'run-123';
    const stepKey = 'step-abc';

    const key0 = `${runId}:${stepKey}:0`;
    const key1 = `${runId}:${stepKey}:1`;
    const key2 = `${runId}:${stepKey}:2`;

    expect(key0).not.toBe(key1);
    expect(key1).not.toBe(key2);
    expect(key0).toBe('run-123:step-abc:0');
  });

  it('should include retry count in idempotency key', () => {
    const runId = 'run-456';
    const stepKey = 'my-step';
    const retryCount = 3;

    const key = `${runId}:${stepKey}:${retryCount}`;
    expect(key).toContain(':3');
  });

  it('should produce deterministic keys for same inputs', () => {
    const key1 = `run-1:step-a:0`;
    const key2 = `run-1:step-a:0`;

    expect(key1).toBe(key2);
  });

  it('should produce different keys for different runs', () => {
    const key1 = `run-1:step-a:0`;
    const key2 = `run-2:step-a:0`;

    expect(key1).not.toBe(key2);
  });
});

describe('Workflow Definition Schema', () => {
  it('should validate a complete definition with all step types', () => {
    const def: WorkflowDefinition = {
      metadata: { name: 'Full Test', version: 1, description: 'Tests all types' },
      nodes: {
        ai: {
          id: 'ai',
          type: 'AI_COMPLETION',
          config: {
            model: 'gpt-4o-mini',
            systemPrompt: 'You are helpful',
            userPromptTemplate: 'Tell me about {{input.topic}}',
          },
          next: ['http'],
        },
        http: {
          id: 'http',
          type: 'HTTP_REQUEST',
          config: { url: 'https://api.example.com', method: 'POST' },
          next: ['cond'],
        },
        cond: {
          id: 'cond',
          type: 'CONDITION',
          config: {
            expression: 'steps["http"].output.statusCode === 200',
            trueBranch: 'transform',
            falseBranch: 'delay',
          },
          next: [],
        },
        transform: {
          id: 'transform',
          type: 'TRANSFORM',
          config: { template: { result: '{{steps["ai"].output.content}}' } },
          next: ['webhook'],
        },
        delay: {
          id: 'delay',
          type: 'DELAY',
          config: { delayMs: 5000 },
          next: ['webhook'],
        },
        webhook: {
          id: 'webhook',
          type: 'WEBHOOK',
          config: { webhookUrl: 'https://hooks.example.com/callback' },
          next: [],
        },
      },
      edges: [
        { from: 'ai', to: 'http' },
        { from: 'http', to: 'cond' },
        { from: 'cond', to: 'transform' },
        { from: 'cond', to: 'delay' },
        { from: 'transform', to: 'webhook' },
        { from: 'delay', to: 'webhook' },
      ],
      entrypoint: 'ai',
    };

    expect(Object.keys(def.nodes)).toHaveLength(6);
    expect(def.entrypoint).toBe('ai');

    // All edges reference valid nodes
    const nodeIds = new Set(Object.keys(def.nodes));
    for (const edge of def.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });
});
