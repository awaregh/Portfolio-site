"use client";

import { useState, useEffect } from "react";

type StepStatus = "pending" | "running" | "done" | "error";

interface WorkflowStep {
  id: string;
  label: string;
  type: "trigger" | "ai" | "action" | "condition";
  status: StepStatus;
  output?: string;
}

const WORKFLOWS = [
  {
    id: "lead-qualify",
    name: "Lead Qualification",
    description: "Score and route inbound leads with AI",
    steps: [
      { id: "s1", label: "Webhook: New Lead", type: "trigger" as const, status: "pending" as StepStatus },
      { id: "s2", label: "GPT-4: Qualify Lead", type: "ai" as const, status: "pending" as StepStatus },
      { id: "s3", label: "Condition: Score ≥ 75?", type: "condition" as const, status: "pending" as StepStatus },
      { id: "s4", label: "Action: Notify Sales", type: "action" as const, status: "pending" as StepStatus },
    ],
  },
  {
    id: "support-triage",
    name: "Support Triage",
    description: "Classify and assign support tickets automatically",
    steps: [
      { id: "s1", label: "Trigger: New Ticket", type: "trigger" as const, status: "pending" as StepStatus },
      { id: "s2", label: "GPT-4: Classify Issue", type: "ai" as const, status: "pending" as StepStatus },
      { id: "s3", label: "Action: Assign Team", type: "action" as const, status: "pending" as StepStatus },
      { id: "s4", label: "Action: Send Confirmation", type: "action" as const, status: "pending" as StepStatus },
    ],
  },
  {
    id: "content-pipeline",
    name: "Content Pipeline",
    description: "Draft, review, and publish content with AI assistance",
    steps: [
      { id: "s1", label: "Trigger: Topic Submitted", type: "trigger" as const, status: "pending" as StepStatus },
      { id: "s2", label: "GPT-4: Draft Article", type: "ai" as const, status: "pending" as StepStatus },
      { id: "s3", label: "GPT-4: SEO Review", type: "ai" as const, status: "pending" as StepStatus },
      { id: "s4", label: "Action: Publish to CMS", type: "action" as const, status: "pending" as StepStatus },
    ],
  },
];

const STEP_OUTPUTS: Record<string, string[]> = {
  "lead-qualify-s2": ['{"score": 88, "intent": "high", "company_size": "enterprise"}'],
  "lead-qualify-s3": ["Score 88 ≥ 75 → true branch"],
  "lead-qualify-s4": ["Slack: #sales-pipeline notified · CRM record created"],
  "support-triage-s2": ['{"category": "billing", "priority": "high", "language": "en"}'],
  "support-triage-s3": ["Assigned to billing-team · ticket #4821"],
  "support-triage-s4": ["Email sent to customer@example.com"],
  "content-pipeline-s2": ["Draft complete · 1,240 words · reading time 5 min"],
  "content-pipeline-s3": ["SEO score 91/100 · 3 suggestions applied"],
  "content-pipeline-s4": ["Published to cms.example.com/blog/ai-trends-2025"],
};

const TYPE_COLORS: Record<WorkflowStep["type"], string> = {
  trigger: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  ai: "bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/20",
  action: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
  condition: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
};

export default function AIWorkflowPlatformEmbed() {
  const [selectedWorkflow, setSelectedWorkflow] = useState(WORKFLOWS[0]);
  const [steps, setSteps] = useState<WorkflowStep[]>(WORKFLOWS[0].steps);
  const [running, setRunning] = useState(false);
  const [runCount, setRunCount] = useState<Record<string, number>>({});

  useEffect(() => {
    setSteps(selectedWorkflow.steps.map((s) => ({ ...s, status: "pending", output: undefined })));
  }, [selectedWorkflow]);

  async function runWorkflow() {
    if (running) return;
    setRunning(true);
    setRunCount((prev) => ({ ...prev, [selectedWorkflow.id]: (prev[selectedWorkflow.id] || 0) + 1 }));
    const fresh = selectedWorkflow.steps.map((s) => ({ ...s, status: "pending" as StepStatus, output: undefined }));
    setSteps(fresh);

    for (let i = 0; i < fresh.length; i++) {
      await new Promise((r) => setTimeout(r, 200));
      setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, status: "running" } : s));
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
      const key = `${selectedWorkflow.id}-${fresh[i].id}`;
      const output = STEP_OUTPUTS[key];
      setSteps((prev) =>
        prev.map((s, idx) => idx === i ? { ...s, status: "done", output: output?.[0] } : s)
      );
    }
    setRunning(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Workflow selector */}
      <div className="lg:col-span-1 space-y-3">
        <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-4">Workflow Templates</p>
        {WORKFLOWS.map((wf) => (
          <button
            key={wf.id}
            onClick={() => { if (!running) setSelectedWorkflow(wf); }}
            className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
              selectedWorkflow.id === wf.id
                ? "border-[#3b82f6]/50 bg-[#3b82f6]/05"
                : "border-[rgba(255,255,255,0.08)] bg-[#111111] hover:border-[rgba(255,255,255,0.14)]"
            } ${running ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="text-sm font-medium text-[#ededed] mb-1">{wf.name}</div>
            <div className="text-xs text-[#888888]">{wf.description}</div>
            {runCount[wf.id] ? (
              <div className="text-xs text-[#3b82f6] mt-2">{runCount[wf.id]}× executed</div>
            ) : null}
          </button>
        ))}
      </div>

      {/* Workflow runner */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
            <div>
              <div className="text-sm font-semibold text-[#ededed]">{selectedWorkflow.name}</div>
              <div className="text-xs text-[#888888]">{selectedWorkflow.steps.length} steps</div>
            </div>
            <button
              onClick={runWorkflow}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M5 3l8 5-8 5V3z" fill="currentColor" />
                  </svg>
                  Run Workflow
                </>
              )}
            </button>
          </div>

          <div className="p-5 space-y-3">
            {steps.map((step, idx) => (
              <div key={step.id}>
                {idx > 0 && (
                  <div className="flex justify-center py-1">
                    <div className={`w-px h-4 ${step.status !== "pending" ? "bg-[#3b82f6]/40" : "bg-[rgba(255,255,255,0.08)]"} transition-colors duration-300`} />
                  </div>
                )}
                <div className={`rounded-lg border p-3.5 transition-all duration-300 ${
                  step.status === "running"
                    ? "border-[#3b82f6]/40 bg-[#3b82f6]/05"
                    : step.status === "done"
                    ? "border-[rgba(255,255,255,0.10)] bg-[#0f0f0f]"
                    : "border-[rgba(255,255,255,0.06)] bg-[#0a0a0a]"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                      {step.status === "running" && (
                        <svg className="animate-spin w-4 h-4 text-[#3b82f6]" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      {step.status === "done" && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="7" fill="#22c55e" fillOpacity="0.15" stroke="#22c55e" strokeWidth="1.5" />
                          <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {step.status === "pending" && (
                        <div className="w-4 h-4 rounded-full border border-[rgba(255,255,255,0.15)]" />
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${TYPE_COLORS[step.type]}`}>
                      {step.type}
                    </span>
                    <span className={`text-sm flex-1 ${step.status === "pending" ? "text-[#888888]" : "text-[#ededed]"}`}>
                      {step.label}
                    </span>
                  </div>
                  {step.output && (
                    <div className="mt-2.5 ml-8 px-3 py-2 rounded bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
                      <code className="text-xs text-[#93c5fd] font-mono">{step.output}</code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {steps.every((s) => s.status === "done") && steps.length > 0 && (
            <div className="px-5 pb-5">
              <div className="rounded-lg bg-[#22c55e]/08 border border-[#22c55e]/20 px-4 py-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#22c55e" fillOpacity="0.15" stroke="#22c55e" strokeWidth="1.5" />
                  <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-[#22c55e] font-medium">Workflow completed successfully</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
