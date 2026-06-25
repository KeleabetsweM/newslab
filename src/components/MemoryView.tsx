import React from "react";
import { BrainCircuit, Check, X, ShieldAlert, Sparkles, BookOpen, MessageSquareCode } from "lucide-react";
import { JournalistMemory, MemoryType } from "../types";

interface MemoryViewProps {
  memories: JournalistMemory[];
  onUpdateMemoryStatus: (memoryId: string, status: "approved" | "rejected") => Promise<void>;
}

export default function MemoryView({ memories, onUpdateMemoryStatus }: MemoryViewProps) {
  const candidates = memories.filter(m => m.status === "candidate");
  const approvedMemories = memories.filter(m => m.status === "approved");

  const getMemoryTypeBadge = (type: MemoryType) => {
    switch (type) {
      case "style_lesson":
        return "bg-blue-50/80 text-blue-800 border-blue-200/60";
      case "editorial_preference":
        return "bg-[#E27D60]/10 text-[#E27D60] border-[#E27D60]/20";
      case "image_preference":
        return "bg-amber-50 text-amber-800 border-amber-200/60";
      case "headline_preference":
        return "bg-purple-50 text-purple-800 border-purple-200/60";
      case "approved_pattern":
        return "bg-emerald-50 text-emerald-800 border-emerald-200/60";
      case "rejected_pattern":
        return "bg-rose-50 text-rose-800 border-rose-200/60";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E2D9]">
        <h2 className="text-3xl font-serif italic text-[#2D2926] tracking-tight">
          Journalist Memory Console
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-serif italic">
          Train Anika Patel incrementally. Evaluate and approve newly extracted style lessons and editorial preferences.
        </p>
      </div>

      {/* Memory Guidance warning box */}
      <div className="bg-[#E27D60]/5 p-4 rounded border border-[#E27D60]/20 flex gap-3 items-start">
        <ShieldAlert className="h-5 w-5 text-[#E27D60] flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-bold text-[#E27D60] text-[10px] uppercase tracking-widest font-mono block">Important Memory Protocol</span>
          <p className="text-slate-600 leading-relaxed font-serif">
            Memory represents stylistic lessons and editorial preferences, helping Anika improve tone, image direction, and phrasing over time. 
            <strong className="text-[#2D2926]"> Memory must never be treated as factual proof</strong>. Facts and locations always require verified, real sources.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Candidates Pipeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E2D9]">
            <h3 className="text-sm font-bold font-serif text-[#2D2926] flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-[#E27D60]" />
              Memory Candidate Pipeline
              <span className="bg-[#E27D60]/10 text-[#E27D60] border border-[#E27D60]/20 font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                {candidates.length} Pending
              </span>
            </h3>
          </div>

          {candidates.length === 0 ? (
            <div className="bg-white rounded border border-[#E5E2D9] p-8 text-center text-slate-400 text-xs font-serif italic">
              No memory candidates currently waiting in queue. Memories are auto-extracted from administrator feedback and approved articles.
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((mem) => (
                <div key={mem.id} className="bg-white border border-[#E5E2D9] p-4 rounded space-y-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${getMemoryTypeBadge(mem.memory_type)}`}>
                      {mem.memory_type.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Conf: {Math.round(mem.confidence_score * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-[#2D2926] leading-relaxed font-serif font-medium">
                    {mem.memory_content}
                  </p>

                  <div className="flex gap-2 justify-end border-t border-[#E5E2D9] pt-3">
                    <button
                      onClick={() => onUpdateMemoryStatus(mem.id, "rejected")}
                      className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Reject Candidate
                    </button>
                    <button
                      onClick={() => onUpdateMemoryStatus(mem.id, "approved")}
                      className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-[#E27D60] hover:bg-[#E27D60]/90 rounded transition-colors shadow-sm"
                    >
                      <Check className="h-3 w-3" />
                      Approve to Active Vault
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Approved Active Memory Vault */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E2D9]">
            <h3 className="text-sm font-bold font-serif text-[#2D2926] flex items-center gap-1.5">
              <BrainCircuit className="h-4.5 w-4.5 text-[#E27D60]" />
              Active Memory Vault
              <span className="bg-[#1A1A1A] text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                {approvedMemories.length} Active
              </span>
            </h3>
          </div>

          {approvedMemories.length === 0 ? (
            <div className="bg-white rounded border border-[#E5E2D9] p-8 text-center text-slate-400 text-xs font-serif italic">
              No memories approved in the generator pool. Approve candidates to align Anika's generation with lessons.
            </div>
          ) : (
            <div className="space-y-3">
              {approvedMemories.map((mem) => (
                <div key={mem.id} className="bg-[#F8F7F3] border border-[#E5E2D9] p-4 rounded space-y-2 flex items-start gap-3">
                  <div className="h-7 w-7 rounded bg-white border border-[#E5E2D9] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <BookOpen className="h-3.5 w-3.5 text-[#E27D60]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.25 rounded border uppercase tracking-widest ${getMemoryTypeBadge(mem.memory_type)}`}>
                        {mem.memory_type.replace("_", " ")}
                      </span>
                      {mem.last_used_at && (
                        <span className="text-[9px] text-slate-400 font-mono">
                          Used: {new Date(mem.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#2D2926] leading-normal font-serif italic">
                      {mem.memory_content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
