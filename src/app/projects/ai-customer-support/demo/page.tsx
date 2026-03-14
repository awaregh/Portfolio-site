"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  confidence?: number;
}

const KNOWLEDGE_BASE = [
  "How do I reset my password?",
  "What payment methods do you accept?",
  "How do I cancel my subscription?",
  "Where can I find my invoice?",
  "How do I add team members?",
];

const RESPONSES: Record<string, { text: string; sources: string[]; confidence: number }> = {
  "reset": {
    text: "To reset your password, go to the login page and click **Forgot Password**. Enter your email address and we'll send a reset link within 2 minutes. The link expires after 24 hours.",
    sources: ["docs/account/password-reset.md", "help/faq.md#security"],
    confidence: 0.97,
  },
  "payment": {
    text: "We accept Visa, Mastercard, American Express, and PayPal. For annual plans, we also support bank transfers (ACH/SEPA). Invoices are generated automatically and emailed to your billing address.",
    sources: ["docs/billing/payment-methods.md"],
    confidence: 0.94,
  },
  "cancel": {
    text: "To cancel your subscription, go to **Settings → Billing → Cancel Plan**. Your account remains active until the end of your current billing period. You can export your data at any time before cancellation.",
    sources: ["docs/billing/cancellation.md", "help/faq.md#billing"],
    confidence: 0.96,
  },
  "invoice": {
    text: "Invoices are available under **Settings → Billing → Invoices**. You can download PDF copies of all past invoices. They're also emailed automatically on each billing cycle.",
    sources: ["docs/billing/invoices.md"],
    confidence: 0.95,
  },
  "team": {
    text: "To add team members, go to **Settings → Team** and click **Invite Member**. Enter their email address and select a role (Admin, Editor, or Viewer). They'll receive an invite email with a 7-day expiry.",
    sources: ["docs/team/inviting-members.md", "docs/team/roles.md"],
    confidence: 0.98,
  },
  "default": {
    text: "I don't have specific information about that in our knowledge base. I'd recommend checking our documentation at docs.example.com or reaching out to support@example.com for further assistance.",
    sources: [],
    confidence: 0.42,
  },
};

function getResponse(query: string) {
  const q = query.toLowerCase();
  if (q.includes("password") || q.includes("reset")) return RESPONSES["reset"];
  if (q.includes("payment") || q.includes("card") || q.includes("pay")) return RESPONSES["payment"];
  if (q.includes("cancel") || q.includes("subscription")) return RESPONSES["cancel"];
  if (q.includes("invoice") || q.includes("receipt") || q.includes("billing")) return RESPONSES["invoice"];
  if (q.includes("team") || q.includes("member") || q.includes("invite") || q.includes("add user")) return RESPONSES["team"];
  return RESPONSES["default"];
}

export default function AICustomerSupportDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "Hi! I'm an AI support assistant powered by RAG. I have access to the product knowledge base and can answer questions with source citations. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const query = text ?? input.trim();
    if (!query || thinking) return;
    setInput("");
    const userMsg: Message = { id: Date.now(), role: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

    const resp = getResponse(query);
    const botMsg: Message = {
      id: Date.now() + 1,
      role: "assistant",
      text: resp.text,
      sources: resp.sources,
      confidence: resp.confidence,
    };
    setMessages((prev) => [...prev, botMsg]);
    setThinking(false);
    inputRef.current?.focus();
  }

  function escapeHtml(str: string) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderText(text: string) {
    const safe = escapeHtml(text);
    return safe.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong class="text-[#1a2f45]">${m}</strong>`);
  }

  return (
    <div className="min-h-screen pt-24 pb-24 px-6 bg-[#f0f7ff]">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/projects/ai-customer-support"
          className="inline-flex items-center gap-2 text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors mb-8 group"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:-translate-x-0.5">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to case study
        </Link>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3d9bd4]/10 text-[#3d9bd4] text-xs font-medium border border-[#3d9bd4]/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3d9bd4] animate-pulse" />
            Interactive Demo
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1a2f45] mb-3">
            AI Customer Support Platform
          </h1>
          <p className="text-[#57789a] text-sm leading-relaxed max-w-xl">
            Chat with an AI agent backed by a simulated RAG pipeline. Try the suggested questions or ask your own.
          </p>
        </div>

        {/* Suggested questions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {KNOWLEDGE_BASE.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={thinking}
              className="px-3 py-1.5 rounded-full text-xs text-[#57789a] border border-[rgba(61,155,212,0.14)] hover:border-[rgba(61,155,212,0.28)] hover:text-[#1a2f45] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat window */}
        <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[rgba(61,155,212,0.10)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3d9bd4]/20 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="6" r="3" stroke="#3d9bd4" strokeWidth="1.5" />
                <path d="M2 13c0-3 2-5 6-5s6 2 6 5" stroke="#3d9bd4" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-[#1a2f45]">Support AI</div>
              <div className="flex items-center gap-1.5 text-xs text-[#57789a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                Online · RAG pipeline active
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="p-5 space-y-4 max-h-[420px] overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                  msg.role === "assistant" ? "bg-[#3d9bd4]/20 text-[#3d9bd4]" : "bg-[rgba(61,155,212,0.14)] text-[#57789a]"
                }`}>
                  {msg.role === "assistant" ? "AI" : "U"}
                </div>
                <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#3d9bd4] text-white rounded-br-sm"
                      : "bg-[#f8fbff] border border-[rgba(61,155,212,0.10)] text-[#c8c8c8] rounded-bl-sm"
                  }`}>
                    <span dangerouslySetInnerHTML={{ __html: renderText(msg.text) }} />
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src) => (
                        <span key={src} className="px-2 py-0.5 text-xs rounded bg-[rgba(61,155,212,0.06)] text-[#57789a] border border-[rgba(61,155,212,0.10)] font-mono">
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.confidence !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-[#57789a]">
                      <div className="w-16 h-1 rounded-full bg-[rgba(61,155,212,0.10)] overflow-hidden">
                        <div className="h-full rounded-full bg-[#3d9bd4]" style={{ width: `${msg.confidence * 100}%` }} />
                      </div>
                      <span>{Math.round(msg.confidence * 100)}% confidence</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#3d9bd4]/20 flex items-center justify-center flex-shrink-0 text-xs font-medium text-[#3d9bd4]">AI</div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-[#f8fbff] border border-[rgba(61,155,212,0.10)]">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#57789a] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t border-[rgba(61,155,212,0.10)]">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex items-center gap-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={thinking}
                placeholder="Ask a support question…"
                className="flex-1 bg-[#f0f7ff] border border-[rgba(61,155,212,0.14)] rounded-xl px-4 py-2.5 text-sm text-[#1a2f45] placeholder-[#57789a] outline-none focus:border-[#3d9bd4]/50 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="w-9 h-9 rounded-xl bg-[#3d9bd4] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#2880b5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8h12M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
