import React, { useState } from "react";
import { 
  Sparkles, 
  Send, 
  CheckCircle, 
  Clock, 
  BrainCircuit, 
  Activity, 
  RotateCcw, 
  FileEdit,
  ArrowRight
} from "lucide-react";
import { Article, Journalist, AgentLog, JournalistMemory } from "../types";

interface DashboardViewProps {
  articles: Article[];
  journalist: Journalist | null;
  logs: AgentLog[];
  memories: JournalistMemory[];
  onTriggerBrainstorm: (topic?: string) => Promise<void>;
  onSelectArticle: (articleId: string) => void;
  onResetDatabase: () => Promise<void>;
}

export default function DashboardView({
  articles,
  journalist,
  logs,
  memories,
  onTriggerBrainstorm,
  onSelectArticle,
  onResetDatabase
}: DashboardViewProps) {
  const [customTopic, setCustomTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const stats = {
    total: articles.length,
    approved: articles.filter((a) => a.status === "approved_sandbox").length,
    pending: articles.filter((a) => a.status === "awaiting_admin_review").length,
    inProgress: articles.filter((a) => 
      !["approved_sandbox", "awaiting_admin_review", "rejected"].includes(a.status)
    ).length,
    totalMemories: memories.length,
    approvedMemories: memories.filter(m => m.status === "approved").length,
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    await onTriggerBrainstorm(customTopic ? customTopic : undefined);
    setCustomTopic("");
    setIsGenerating(false);
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to restore the private sandbox to its default seeds? All current custom drafts and memories will be refreshed.")) {
      setIsResetting(true);
      await onResetDatabase();
      setIsResetting(false);
    }
  };

  return (
    <div class="space-y-6 font-sans">
      {/* Upper Dashboard Header */}
      <div class="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
        <div>
          <h2 class="text-3xl font-serif italic text-[#2D2926] tracking-tight">
            Newsroom Laboratory
          </h2>
          <p class="text-xs text-slate-500 mt-1 font-serif italic">
            Phase 0 Private Sandbox: Monitor, audit, and evaluate Anika Patel’s 7-day test run.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={isResetting}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E5E2D9] bg-white text-[#2D2926] hover:bg-slate-50 transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50 shadow-sm"
          >
            <RotateCcw class={`h-3.5 w-3.5 text-[#E27D60] ${isResetting ? 'animate-spin' : ''}`} />
            Reset Sandbox Seeds
          </button>
        </div>
      </div>

      {/* Analytics Bento Grid */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div class="bg-white p-4 rounded border border-[#E5E2D9] shadow-sm flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Approved Sandbox</span>
            <h3 class="text-3xl font-serif font-bold text-[#2D2926]">{stats.approved}</h3>
          </div>
          <div class="h-10 w-10 rounded bg-[#E27D60]/10 text-[#E27D60] flex items-center justify-center">
            <CheckCircle class="h-5 w-5" />
          </div>
        </div>

        {/* Stat 2 */}
        <div class="bg-white p-4 rounded border border-[#E5E2D9] shadow-sm flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Awaiting Admin</span>
            <h3 class="text-3xl font-serif font-bold text-[#2D2926]">{stats.pending}</h3>
          </div>
          <div class="h-10 w-10 rounded bg-[#E8A87C]/10 text-[#E8A87C] flex items-center justify-center">
            <Clock class="h-5 w-5" />
          </div>
        </div>

        {/* Stat 3 */}
        <div class="bg-white p-4 rounded border border-[#E5E2D9] shadow-sm flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Active Pipelines</span>
            <h3 class="text-3xl font-serif font-bold text-[#2D2926]">{stats.inProgress}</h3>
          </div>
          <div class="h-10 w-10 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Activity class="h-5 w-5 animate-pulse" />
          </div>
        </div>

        {/* Stat 4 */}
        <div class="bg-white p-4 rounded border border-[#E5E2D9] shadow-sm flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Active Memories</span>
            <h3 class="text-3xl font-serif font-bold text-[#2D2926]">{stats.approvedMemories} <span class="text-slate-300 text-sm font-normal">/ {stats.totalMemories}</span></h3>
          </div>
          <div class="h-10 w-10 rounded bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <BrainCircuit class="h-5 w-5" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Trigger Panel & Active Journalist summary */}
        <div class="lg:col-span-2 space-y-6">
          {/* Brainstorm Trigger panel */}
          <div class="bg-white p-6 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="text-lg font-serif font-bold text-[#2D2926]">
                  Trigger Article Lifecycle
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Allow Anika Patel to brainstorm an idea automatically, or provide a specific local topic manually.
                </p>
              </div>
              <Sparkles class="h-5 w-5 text-[#E27D60]" />
            </div>

            <form onSubmit={handleGenerate} class="space-y-3">
              <div class="relative">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g., Pretoria National Botanical Gardens Family Picnic (Leave blank for AI suggest)"
                  disabled={isGenerating}
                  class="w-full text-xs bg-[#F8F7F3] border border-[#E5E2D9] rounded pl-4 pr-32 py-3 text-[#2D2926] placeholder-slate-400 focus:outline-none focus:border-[#E27D60] focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isGenerating}
                  class="absolute right-2 top-2 h-8 px-4 rounded bg-[#E27D60] hover:bg-[#E27D60]/90 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <span class="flex items-center gap-1">
                      <span class="h-2 w-2 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                      Structuring...
                    </span>
                  ) : (
                    <>
                      Brainstorm
                      <Send class="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Drafts List */}
          <div class="bg-white rounded border border-[#E5E2D9] shadow-sm overflow-hidden">
            <div class="p-5 border-b border-[#E5E2D9] flex items-center justify-between bg-[#F8F7F3]/40">
              <div>
                <h3 class="text-base font-serif font-bold text-[#2D2926]">Active Sandbox Publications</h3>
                <p class="text-xs text-slate-500">Recently drafted, reviewed, or approved sandbox articles.</p>
              </div>
            </div>

            <div class="divide-y divide-[#E5E2D9]">
              {articles.length === 0 ? (
                <div class="p-8 text-center text-slate-400 text-xs font-serif italic">
                  No articles created yet. Submit a topic above to initiate Anika's generation pipeline!
                </div>
              ) : (
                articles.slice(0, 4).map((article) => (
                  <div key={article.id} class="p-4 hover:bg-[#F8F7F3]/40 transition-colors flex items-center justify-between">
                    <div class="flex items-center gap-4 min-w-0">
                      <img
                        src={article.featured_image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=150&h=150&fit=crop"}
                        alt={article.title}
                        class="w-12 h-12 rounded object-cover border border-[#E5E2D9]"
                        referrerPolicy="no-referrer"
                      />
                      <div class="min-w-0">
                        <h4 class="text-sm font-serif font-bold text-[#2D2926] truncate max-w-md">
                          {article.title}
                        </h4>
                        <div class="flex items-center gap-2 mt-1">
                          <span class="text-[10px] text-slate-400 font-mono">#{article.id}</span>
                          <span class="text-[10px] text-[#E5E2D9]">•</span>
                          <span class="text-xs text-slate-500 truncate font-serif italic">{article.topic}</span>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-3">
                      <span class={`text-[9px] px-2 py-0.5 rounded font-mono border uppercase tracking-wider font-semibold ${
                        article.status === "approved_sandbox" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
                        article.status === "awaiting_admin_review" ? "bg-[#E27D60]/10 text-[#E27D60] border-[#E27D60]/20" :
                        article.status === "revision_requested" ? "bg-blue-500/10 text-blue-700 border-blue-500/20" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {article.status.replace("_", " ")}
                      </span>
                      <button
                        onClick={() => onSelectArticle(article.id)}
                        class="p-1.5 rounded border border-[#E5E2D9] bg-white text-slate-500 hover:text-[#E27D60] hover:border-[#E27D60]/40 transition-all shadow-sm"
                      >
                        <ArrowRight class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: Ticker Feed / Audit Trail */}
        <div class="space-y-6">
          {/* Anika Overview */}
          {journalist && (
            <div class="bg-white p-5 rounded border border-[#E5E2D9] shadow-sm space-y-4">
              <div class="flex items-center gap-3.5">
                <img
                  src={journalist.avatar}
                  alt={journalist.name}
                  class="w-12 h-12 rounded-full object-cover border-2 border-[#E27D60]"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 class="text-sm font-bold font-serif text-[#2D2926]">{journalist.name}</h4>
                  <p class="text-[11px] text-[#E27D60] font-bold font-mono tracking-wider uppercase">{journalist.role}</p>
                </div>
              </div>

              <div class="border-t border-[#E5E2D9] pt-3 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400 font-serif">Primary Beat:</span>
                  <span class="font-bold text-[#2D2926] text-[11px] truncate max-w-[150px] font-serif italic">{journalist.sections[0]}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400 font-serif">Tone Alignment:</span>
                  <span class="font-bold text-[#E27D60] text-[11px] uppercase tracking-wider font-mono">Sensory & Warm</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400 font-serif">Local Grounding:</span>
                  <span class="font-mono text-slate-500 text-[10px]">What's on in Mzansi</span>
                </div>
              </div>
            </div>
          )}

          {/* Live Agent Logs */}
          <div class="bg-white p-5 rounded border border-[#E5E2D9] shadow-sm flex flex-col h-[320px] space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-[#E5E2D9]">
              <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono">
                Agent Action Log
              </h3>
              <span class="flex h-2 w-2 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E27D60] opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-[#E27D60]"></span>
              </span>
            </div>

            <div class="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {logs.length === 0 ? (
                <div class="h-full flex items-center justify-center text-xs text-slate-400 text-center font-serif italic">
                  No execution logs compiled yet. Initiate the pipeline to view real-time operations.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} class="text-xs space-y-1">
                    <div class="flex items-center justify-between">
                      <span class={`font-mono text-[9px] px-1.5 py-0.25 rounded uppercase tracking-wider font-semibold ${
                        log.action_type.includes("error") ? "bg-rose-100 text-rose-700" :
                        log.action_type.includes("memory") ? "bg-indigo-100 text-indigo-700" :
                        log.action_type.includes("telegram") ? "bg-[#E27D60]/10 text-[#E27D60]" :
                        "bg-[#F8F7F3] text-slate-700 border border-[#E5E2D9]/60"
                      }`}>
                        {log.action_type.replace("_", " ")}
                      </span>
                      <span class="text-[9px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p class="text-slate-600 leading-normal pl-0.5 font-sans">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
