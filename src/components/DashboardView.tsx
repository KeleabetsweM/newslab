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
  ArrowRight,
  Calendar,
  Play,
  AlertCircle
} from "lucide-react";
import { Article, Journalist, AgentLog, JournalistMemory } from "../types";
import SafeImage from "./SafeImage";
import { callFunction } from "../lib/clientApi";

interface DashboardViewProps {
  articles: Article[];
  journalist: Journalist | null;
  logs: AgentLog[];
  memories: JournalistMemory[];
  onTriggerBrainstorm: (topic?: string) => Promise<void>;
  onSelectArticle: (articleId: string) => void;
  onResetDatabase: () => Promise<void>;
  schedulerRuns?: any[];
  onRefresh?: () => Promise<void>;
}

export default function DashboardView({
  articles,
  journalist,
  logs,
  memories,
  onTriggerBrainstorm,
  onSelectArticle,
  onResetDatabase,
  schedulerRuns = [],
  onRefresh
}: DashboardViewProps) {
  const [customTopic, setCustomTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [triggerSuccess, setTriggerSuccess] = useState<string | null>(null);

  const handleManualTrigger = async () => {
    setIsTriggering(true);
    setTriggerError(null);
    setTriggerSuccess(null);
    try {
      const res = await callFunction<any>("agent-scheduler");
      setTriggerSuccess(`Run complete. Processed ${res.jobs_processed || 0} jobs.`);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      console.error(err);
      setTriggerError(err.message || "Failed to execute scheduler run.");
    } finally {
      setIsTriggering(false);
    }
  };

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
    <div className="space-y-6 font-sans">
      {/* Upper Dashboard Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
        <div>
          <h2 className="text-3xl font-serif italic text-[#2D2926] tracking-tight">
            Newsroom Laboratory
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-serif italic">
            Phase 0 Private Sandbox: Monitor, audit, and evaluate {journalist ? `${journalist.name}’s` : "the newsroom’s"} sandbox execution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E5E2D9] bg-white text-[#2D2926] hover:bg-slate-50 transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50 shadow-sm"
          >
            <RotateCcw className={`h-3.5 w-3.5 text-[#E27D60] ${isResetting ? 'animate-spin' : ''}`} />
            Reset Sandbox Seeds
          </button>
        </div>
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white p-4 rounded border border-[#E5E2D9] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Approved Sandbox</span>
            <h3 className="text-3xl font-serif font-bold text-[#2D2926]">{stats.approved}</h3>
          </div>
          <div className="h-10 w-10 rounded bg-[#E27D60]/10 text-[#E27D60] flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-4 rounded border border-[#E5E2D9] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Awaiting Admin</span>
            <h3 className="text-3xl font-serif font-bold text-[#2D2926]">{stats.pending}</h3>
          </div>
          <div className="h-10 w-10 rounded bg-[#E8A87C]/10 text-[#E8A87C] flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-4 rounded border border-[#E5E2D9] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Active Pipelines</span>
            <h3 className="text-3xl font-serif font-bold text-[#2D2926]">{stats.inProgress}</h3>
          </div>
          <div className="h-10 w-10 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-4 rounded border border-[#E5E2D9] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Active Memories</span>
            <h3 className="text-3xl font-serif font-bold text-[#2D2926]">{stats.approvedMemories} <span className="text-slate-300 text-sm font-normal">/ {stats.totalMemories}</span></h3>
          </div>
          <div className="h-10 w-10 rounded bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <BrainCircuit className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Trigger Panel & Active Journalist summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brainstorm Trigger panel */}
          <div className="bg-white p-6 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#2D2926]">
                  Trigger Article Lifecycle
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allow Anika Patel to brainstorm an idea automatically, or provide a specific local topic manually.
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-[#E27D60]" />
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g., Pretoria National Botanical Gardens Family Picnic (Leave blank for AI suggest)"
                  disabled={isGenerating}
                  className="w-full text-xs bg-[#F8F7F3] border border-[#E5E2D9] rounded pl-4 pr-32 py-3 text-[#2D2926] placeholder-slate-400 focus:outline-none focus:border-[#E27D60] focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="absolute right-2 top-2 h-8 px-4 rounded bg-[#E27D60] hover:bg-[#E27D60]/90 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                      Structuring...
                    </span>
                  ) : (
                    <>
                      Brainstorm
                      <Send className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Drafts List */}
          <div className="bg-white rounded border border-[#E5E2D9] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E5E2D9] flex items-center justify-between bg-[#F8F7F3]/40">
              <div>
                <h3 className="text-base font-serif font-bold text-[#2D2926]">Active Sandbox Publications</h3>
                <p className="text-xs text-slate-500">Recently drafted, reviewed, or approved sandbox articles.</p>
              </div>
            </div>

            <div className="divide-y divide-[#E5E2D9]">
              {articles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-serif italic">
                  No articles created yet. Submit a topic above to initiate the journalist generation pipeline!
                </div>
              ) : (
                articles.slice(0, 4).map((article) => (
                  <div key={article.id} className="p-4 hover:bg-[#F8F7F3]/40 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <SafeImage
                        src={article.featured_image}
                        alt={article.title}
                        fallbackLabel={article.title}
                        className="w-12 h-12 rounded object-cover border border-[#E5E2D9]"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-serif font-bold text-[#2D2926] truncate max-w-md">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-mono">#{article.id}</span>
                          <span className="text-[10px] text-[#E5E2D9]">•</span>
                          <span className="text-xs text-slate-500 truncate font-serif italic">{article.topic}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono border uppercase tracking-wider font-semibold ${
                        article.status === "approved_sandbox" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
                        article.status === "awaiting_admin_review" ? "bg-[#E27D60]/10 text-[#E27D60] border-[#E27D60]/20" :
                        article.status === "revision_requested" ? "bg-blue-500/10 text-blue-700 border-blue-500/20" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {article.status.replace("_", " ")}
                      </span>
                      <button
                        onClick={() => onSelectArticle(article.id)}
                        className="p-1.5 rounded border border-[#E5E2D9] bg-white text-slate-500 hover:text-[#E27D60] hover:border-[#E27D60]/40 transition-all shadow-sm"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: Ticker Feed / Audit Trail */}
        <div className="space-y-6">
          {/* Anika Overview */}
          {journalist && (
            <div className="bg-white p-5 rounded border border-[#E5E2D9] shadow-sm space-y-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={journalist.avatar}
                  alt={journalist.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#E27D60]"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-sm font-bold font-serif text-[#2D2926]">{journalist.name}</h4>
                  <p className="text-[11px] text-[#E27D60] font-bold font-mono tracking-wider uppercase">{journalist.role}</p>
                </div>
              </div>

              <div className="border-t border-[#E5E2D9] pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-serif">Primary Beat:</span>
                  <span className="font-bold text-[#2D2926] text-[11px] truncate max-w-[150px] font-serif italic">{journalist.sections[0]}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-serif">Tone Alignment:</span>
                  <span className="font-bold text-[#E27D60] text-[11px] uppercase tracking-wider font-mono">Sensory & Warm</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-serif">Local Grounding:</span>
                  <span className="font-mono text-slate-500 text-[10px]">Mzansi Mashup</span>
                </div>
              </div>
            </div>
          )}

          {/* Scheduled Automation Card */}
          <div className="bg-white p-5 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E2D9]">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#E27D60]" />
                Scheduled Automation
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            {triggerError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[10px] flex items-start gap-1.5 font-serif">
                <AlertCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{triggerError}</span>
              </div>
            )}

            {triggerSuccess && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] flex items-start gap-1.5 font-serif">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{triggerSuccess}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-serif">Automation Cron:</span>
                <span className="font-mono text-slate-600 font-bold bg-slate-50 border border-[#E5E2D9]/40 px-1.5 py-0.5 rounded text-[10px]">@hourly (Netlify)</span>
              </div>

              <div className="text-[11px] font-serif text-slate-500 leading-normal bg-[#F8F7F3] p-3 rounded border border-[#E5E2D9]/60 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  <span>Recent Run Log</span>
                  <span>Jobs (Cr / Run)</span>
                </div>
                {schedulerRuns.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-1">No execution history recorded.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-0.5">
                    {schedulerRuns.map((run: any) => (
                      <div key={run.id} className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-slate-600 truncate max-w-[120px]" title={new Date(run.started_at).toLocaleString()}>
                          {new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({run.run_type})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#2D2926]">
                            {run.jobs_created}/{run.jobs_processed}
                          </span>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            run.status === "completed" ? "bg-emerald-500" :
                            run.status === "failed" ? "bg-rose-500" : "bg-amber-500 animate-pulse"
                          }`} title={run.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleManualTrigger}
                disabled={isTriggering}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#E27D60] hover:bg-[#E27D60]/90 disabled:opacity-50 rounded shadow-sm transition-colors"
              >
                <Play className={`h-3.5 w-3.5 ${isTriggering ? "animate-pulse" : ""}`} />
                {isTriggering ? "Triggering Run..." : "Trigger Scheduler Run"}
              </button>
            </div>
          </div>

          {/* Live Agent Logs */}
          <div className="bg-white p-5 rounded border border-[#E5E2D9] shadow-sm flex flex-col h-[320px] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E2D9]">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono">
                Agent Action Log
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E27D60] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E27D60]"></span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center font-serif italic">
                  No execution logs compiled yet. Initiate the pipeline to view real-time operations.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[9px] px-1.5 py-0.25 rounded uppercase tracking-wider font-semibold ${
                        log.action_type.includes("error") ? "bg-rose-100 text-rose-700" :
                        log.action_type.includes("memory") ? "bg-indigo-100 text-indigo-700" :
                        log.action_type.includes("telegram") ? "bg-[#E27D60]/10 text-[#E27D60]" :
                        "bg-[#F8F7F3] text-slate-700 border border-[#E5E2D9]/60"
                      }`}>
                        {log.action_type.replace("_", " ")}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-normal pl-0.5 font-sans">{log.message}</p>
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
