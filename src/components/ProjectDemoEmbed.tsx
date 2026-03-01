"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const DEMO_COMPONENTS: Record<string, React.ComponentType> = {
  "ai-workflow-platform": dynamic(() => import("./demos/AIWorkflowPlatformEmbed")),
  "saas-website-builder": dynamic(() => import("./demos/SaasWebsiteBuilderEmbed")),
  "ai-customer-support": dynamic(() => import("./demos/AICustomerSupportEmbed")),
  "real-time-data-pipeline": dynamic(() => import("./demos/RealTimePipelineEmbed")),
  "distributed-rate-limiter": dynamic(() => import("./demos/DistributedRateLimiterEmbed")),
};

const DEMO_DESCRIPTIONS: Record<string, string> = {
  "ai-workflow-platform": "Select a workflow template, then press Run to watch each step execute in real time.",
  "saas-website-builder": "Pick a template, name your site, and hit Publish to simulate the full build pipeline.",
  "ai-customer-support": "Chat with an AI agent backed by a simulated RAG pipeline. Try the suggested questions or ask your own.",
  "real-time-data-pipeline": "Start the pipeline to see events streaming in real time through Kafka consumer workers to downstream sinks.",
  "distributed-rate-limiter": "Select a rate-limit policy and fire requests to see real-time allow/reject decisions.",
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-medium border border-[#3b82f6]/20 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
            Interactive Demo
          </div>
          {DEMO_DESCRIPTIONS[slug] && (
            <p className="text-[#888888] text-sm leading-relaxed max-w-xl">
              {DEMO_DESCRIPTIONS[slug]}
            </p>
          )}
        </div>
        <Link
          href={`/projects/${slug}/demo`}
          className="flex-shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-[#ededed] transition-colors"
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
