"use client";

import { useState } from "react";

interface TerraformModule {
  id: string;
  name: string;
  resourceCount: number;
}

interface DriftedResource {
  address: string;
  plan: string;
  actual: string;
  attribute: string;
}

interface ModuleReport {
  moduleId: string;
  drifted: DriftedResource[];
  inSync: number;
}

const MODULES: TerraformModule[] = [
  { id: "vpc-networking", name: "vpc-networking",  resourceCount: 8 },
  { id: "eks-cluster",    name: "eks-cluster",     resourceCount: 14 },
  { id: "rds-postgres",   name: "rds-postgres",    resourceCount: 6 },
  { id: "iam-roles",      name: "iam-roles",       resourceCount: 12 },
];

const MODULE_DRIFT: Record<string, DriftedResource[]> = {
  "vpc-networking": [
    { address: "aws_vpc.main", attribute: "enable_dns_hostnames", plan: "true", actual: "false" },
    { address: "aws_security_group.egress", attribute: "description", plan: '"Managed by Terraform"', actual: '"manually edited"' },
  ],
  "eks-cluster": [
    { address: "aws_eks_cluster.main", attribute: "version", plan: '"1.29"', actual: '"1.28"' },
    { address: "aws_eks_node_group.workers", attribute: "desired_size", plan: "3", actual: "2" },
    { address: "aws_launch_template.workers", attribute: "instance_type", plan: '"t3.medium"', actual: '"t3.small"' },
  ],
  "rds-postgres": [
    { address: "aws_db_instance.primary", attribute: "backup_retention_period", plan: "7", actual: "3" },
  ],
  "iam-roles": [],
};

type CheckStep = "idle" | "init" | "refresh" | "detect" | "report" | "done";

const STEP_LABELS: Record<CheckStep, string> = {
  idle:    "Idle",
  init:    "Initializing…",
  refresh: "Refreshing state…",
  detect:  "Detecting changes…",
  report:  "Generating report…",
  done:    "Complete",
};

let checkCounter = 0;

export default function IaCMaintainabilityEmbed() {
  const [selectedModuleId, setSelectedModuleId] = useState(MODULES[0].id);
  const [checkStep, setCheckStep] = useState<CheckStep>("idle");
  const [report, setReport] = useState<ModuleReport | null>(null);
  const [totalChecked, setTotalChecked] = useState(0);
  const [totalDrifted, setTotalDrifted] = useState(0);
  const [totalInSync, setTotalInSync] = useState(0);
  const [lastCheck, setLastCheck] = useState<string>("—");
  const [running, setRunning] = useState(false);

  const selectedModule = MODULES.find((m) => m.id === selectedModuleId)!;

  async function runDriftCheck() {
    if (running) return;
    setRunning(true);
    setReport(null);
    checkCounter++;

    const steps: CheckStep[] = ["init", "refresh", "detect", "report"];
    for (const step of steps) {
      setCheckStep(step);
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
    }

    const drifted = MODULE_DRIFT[selectedModuleId] ?? [];
    const selectedModule = MODULES.find((m) => m.id === selectedModuleId)!;
    const inSync = selectedModule.resourceCount - drifted.length;
    const result: ModuleReport = { moduleId: selectedModuleId, drifted, inSync };
    setReport(result);
    setCheckStep("done");

    setTotalChecked((n) => n + 1);
    setTotalDrifted((n) => n + drifted.length);
    setTotalInSync((n) => n + inSync);
    setLastCheck(new Date().toLocaleTimeString());
    setRunning(false);
  }

  const STEP_ORDER: CheckStep[] = ["init", "refresh", "detect", "report", "done"];

  function stepStatus(step: CheckStep): "done" | "running" | "pending" {
    if (checkStep === "idle") return "pending";
    const currentIdx = STEP_ORDER.indexOf(checkStep);
    const stepIdx = STEP_ORDER.indexOf(step);
    if (stepIdx < currentIdx) return "done";
    if (stepIdx === currentIdx && checkStep !== "done") return "running";
    return "pending";
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Modules Checked", value: totalChecked.toString() },
          { label: "Resources Drifted", value: totalDrifted.toString(), color: totalDrifted > 0 ? "#ef4444" : "#57789a" },
          { label: "Resources In Sync", value: totalInSync.toString(), color: "#22c55e" },
          { label: "Last Check", value: lastCheck },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-4">
            <div className="text-xs text-[#57789a] mb-1">{m.label}</div>
            <div className="text-lg font-semibold font-mono truncate" style={{ color: m.color || "#1a2f45" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: module selector + steps */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
            <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">Terraform Modules</p>
            <div className="space-y-2">
              {MODULES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { if (!running) { setSelectedModuleId(m.id); setReport(null); setCheckStep("idle"); } }}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                    selectedModuleId === m.id
                      ? "border-[#3d9bd4]/50 bg-[#3d9bd4]/05"
                      : "border-[rgba(61,155,212,0.10)] hover:border-[rgba(61,155,212,0.16)]"
                  } ${running ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <div className="text-xs font-mono font-semibold text-[#1a2f45]">{m.name}</div>
                  <div className="text-xs text-[#57789a] mt-0.5">{m.resourceCount} resources</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={runDriftCheck}
            disabled={running}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3d9bd4] text-white text-sm font-medium hover:bg-[#2880b5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {STEP_LABELS[checkStep]}
              </>
            ) : "Run Drift Check"}
          </button>

          {/* Step progress */}
          {checkStep !== "idle" && (
            <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-4">
              <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">terraform plan</p>
              <div className="space-y-2">
                {(["init", "refresh", "detect", "report"] as CheckStep[]).map((step) => {
                  const status = stepStatus(step);
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {status === "done" && (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" fill="#22c55e" fillOpacity="0.15" stroke="#22c55e" strokeWidth="1.5" />
                            <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {status === "running" && (
                          <svg className="animate-spin w-3.5 h-3.5 text-[#3d9bd4]" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        {status === "pending" && <div className="w-3 h-3 rounded-full border border-[rgba(61,155,212,0.20)]" />}
                      </div>
                      <span className={`text-xs font-mono ${status === "done" ? "text-[#1a2f45]" : status === "running" ? "text-[#3d9bd4]" : "text-[#57789a]"}`}>
                        {step === "init" ? "Initialize" : step === "refresh" ? "Refresh state" : step === "detect" ? "Detect changes" : "Generate report"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: drift report */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(61,155,212,0.10)] flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#1a2f45]">Drift Report</div>
                <div className="text-xs text-[#57789a] font-mono mt-0.5">{selectedModule.name}</div>
              </div>
              {report && (
                <div className="flex gap-3 text-xs">
                  <span className="text-[#ef4444]">{report.drifted.length} drifted</span>
                  <span className="text-[#22c55e]">{report.inSync} in sync</span>
                </div>
              )}
            </div>
            <div className="p-5">
              {!report && !running && (
                <div className="py-8 text-center text-sm text-[#57789a]">
                  Select a module and run drift check
                </div>
              )}
              {running && checkStep !== "done" && (
                <div className="py-8 text-center text-sm text-[#57789a]">
                  <svg className="animate-spin w-5 h-5 text-[#3d9bd4] mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {STEP_LABELS[checkStep]}
                </div>
              )}
              {report && (
                <div className="space-y-4">
                  {report.drifted.length === 0 ? (
                    <div className="rounded-lg border border-[#22c55e]/25 bg-[#22c55e]/05 px-5 py-4">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="7" fill="#22c55e" fillOpacity="0.15" stroke="#22c55e" strokeWidth="1.5" />
                          <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-sm text-[#22c55e] font-medium">No drift detected — all {report.inSync} resources in sync</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">Drifted Resources</p>
                        <div className="space-y-3">
                          {report.drifted.map((d, i) => (
                            <div key={i} className="rounded-lg border border-[#ef4444]/20 bg-[#f0f7ff] overflow-hidden">
                              <div className="px-4 py-2 border-b border-[rgba(61,155,212,0.10)] flex items-center justify-between">
                                <span className="text-xs font-mono text-[#1a2f45]">{d.address}</span>
                                <span className="text-xs text-[#ef4444]">drift detected</span>
                              </div>
                              <div className="px-4 py-2.5">
                                <div className="text-xs text-[#57789a] mb-2 font-mono">{d.attribute}</div>
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <div className="text-xs text-[#57789a] mb-1">plan</div>
                                    <code className="text-xs text-[#22c55e] font-mono">+ {d.plan}</code>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-[#57789a] mb-1">actual</div>
                                    <code className="text-xs text-[#ef4444] font-mono">- {d.actual}</code>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#22c55e]/15 bg-[#22c55e]/05 px-4 py-3">
                        <span className="text-sm text-[#22c55e]">✓ {report.inSync} resources in sync</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
