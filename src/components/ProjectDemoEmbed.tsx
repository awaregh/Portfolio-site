"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const DEMO_COMPONENTS: Record<string, React.ComponentType> = {
  "fraud-detection": dynamic(() => import("./demos/FraudDetectionEmbed")),
  "ai-workflow-platform": dynamic(() => import("./demos/AIWorkflowPlatformEmbed")),
  "saas-website-builder": dynamic(() => import("./demos/SaasWebsiteBuilderEmbed")),
  "ai-customer-support": dynamic(() => import("./demos/AICustomerSupportEmbed")),
  "real-time-data-pipeline": dynamic(() => import("./demos/RealTimePipelineEmbed")),
  "distributed-rate-limiter": dynamic(() => import("./demos/DistributedRateLimiterEmbed")),
  "schema-evolution": dynamic(() => import("./demos/SchemaEvolutionEmbed")),
  "change-data-pipeline": dynamic(() => import("./demos/ChangeDataPipelineEmbed")),
  "retrieval-experiment-platform": dynamic(() => import("./demos/RetrievalExperimentEmbed")),
  "designing-idempotent-apis": dynamic(() => import("./demos/IdempotentAPIsEmbed")),
  "hallucination-mitigation": dynamic(() => import("./demos/HallucinationMitigationEmbed")),
  "failure-recovery-patterns": dynamic(() => import("./demos/FailureRecoveryEmbed")),
  "llm-gateway": dynamic(() => import("./demos/LLMGatewayEmbed")),
  "config-service": dynamic(() => import("./demos/ConfigServiceEmbed")),
  "iac-maintainability-study": dynamic(() => import("./demos/IaCMaintainabilityEmbed")),
};

const DEMO_DESCRIPTIONS: Record<string, string> = {
  "fraud-detection": "Select a transaction scenario and press Score Transaction to see the LightGBM model evaluate fraud risk in real time.",
  "ai-workflow-platform": "Select a workflow template, then press Run to watch each step execute in real time.",
  "saas-website-builder": "Pick a template, name your site, and hit Publish to simulate the full build pipeline.",
  "ai-customer-support": "Chat with an AI agent backed by a simulated RAG pipeline. Try the suggested questions or ask your own.",
  "real-time-data-pipeline": "Start the pipeline to see events streaming in real time through Kafka consumer workers to downstream sinks.",
  "distributed-rate-limiter": "Select a rate-limit policy and fire requests to see real-time allow/reject decisions.",
  "schema-evolution": "Choose a migration scenario and run it to see backward-compatible schema changes applied step by step.",
  "change-data-pipeline": "Start the CDC pipeline to watch database mutations stream into the event log and sync across consumers.",
  "retrieval-experiment-platform": "Submit a query and compare chunking strategies side-by-side using Precision@K and nDCG metrics.",
  "designing-idempotent-apis": "Submit a payment twice with the same idempotency key to see deduplication in action.",
  "hallucination-mitigation": "Ask questions and compare raw LLM output against guardrail-enforced answers with citation verification.",
  "failure-recovery-patterns": "Inject failures to trip circuit breakers, then watch recovery through half-open probes.",
  "llm-gateway": "Route requests across multiple LLM providers and compare cost, latency, and availability strategies.",
  "config-service": "Edit feature flags and config values, publish to all environments, and inspect the audit trail.",
  "iac-maintainability-study": "Run Terraform drift detection across modules to see which resources have drifted from desired state.",
};

interface ProjectDemoEmbedProps {
  slug: string;
}

export default function ProjectDemoEmbed({ slug }: ProjectDemoEmbedProps) {
  const DemoComponent = DEMO_COMPONENTS[slug];
  if (!DemoComponent) return null;

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3d9bd4]/10 text-[#3d9bd4] text-xs font-medium border border-[#3d9bd4]/20 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3d9bd4] animate-pulse" />
            Interactive Demo
          </div>
          {DEMO_DESCRIPTIONS[slug] && (
            <p className="text-[#57789a] text-sm leading-relaxed max-w-xl">
              {DEMO_DESCRIPTIONS[slug]}
            </p>
          )}
        </div>
        <Link
          href={`/projects/${slug}/demo`}
          className="flex-shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs text-[#57789a] hover:text-[#1a2f45] transition-colors"
        >
          Open full screen
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
      <DemoComponent />
    </div>
  );
}
