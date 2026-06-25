import React, { useState } from "react";
import { Send, Shield, Smartphone, Smile, CircleAlert, Sparkles, Check, RefreshCw, X, MessageSquareReply } from "lucide-react";
import { Article, Journalist } from "../types";

interface TelegramSimulatorProps {
  articles: Article[];
  journalist: Journalist | null;
  onTelegramAction: (articleId: string, action: string, revisionText?: string) => Promise<void>;
  telegramConfig: {
    bot_token: string;
    chat_id: string;
    is_active: boolean;
  };
}

export default function TelegramSimulator({
  articles,
  journalist,
  onTelegramAction,
  telegramConfig
}: TelegramSimulatorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [revisionForId, setRevisionForId] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter articles that are in states relevant to Telegram Simulator (or all recent ones)
  const pendingArticles = articles.filter(
    (a) => a.status === "awaiting_admin_review" || a.status === "revision_requested" || a.status === "approved_sandbox" || a.status === "rejected"
  ).slice(0, 5); // show top 5 relevant

  const handleActionClick = async (articleId: string, action: string) => {
    if (action === "revision") {
      setRevisionForId(articleId);
      setRevisionText("");
      return;
    }

    setIsSubmitting(true);
    await onTelegramAction(articleId, action);
    setIsSubmitting(false);
  };

  const submitRevision = async (articleId: string) => {
    if (!revisionText.trim()) return;
    setIsSubmitting(true);
    await onTelegramAction(articleId, "revision", revisionText);
    setRevisionForId(null);
    setRevisionText("");
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "awaiting_admin_review":
        return { text: "Review Pending", bg: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
      case "approved_sandbox":
        return { text: "Approved to Sandbox", bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
      case "revision_requested":
        return { text: "Revision Requested", bg: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
      case "rejected":
        return { text: "Rejected", bg: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
      default:
        return { text: status, bg: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    }
  };

  return (
    <div class="w-80 bg-[#2D2926] border-l border-white/10 h-screen flex flex-col font-sans">
      {/* Device Header */}
      <div class="px-4 py-3 bg-[#1A1A1A] border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Smartphone class="h-4 w-4 text-[#E27D60]" />
          <h3 class="text-xs font-bold text-slate-200 tracking-wider font-serif italic uppercase">
            Telegram Simulator
          </h3>
        </div>
        {telegramConfig.is_active ? (
          <span class="flex items-center gap-1 text-[9px] bg-[#E27D60]/20 text-[#E27D60] border border-[#E27D60]/30 px-1.5 py-0.5 rounded font-mono font-bold">
            Real Bot Active
          </span>
        ) : (
          <span class="flex items-center gap-1 text-[9px] bg-white/10 text-white/80 border border-white/20 px-1.5 py-0.5 rounded font-mono font-bold">
            Sandbox Sim
          </span>
        )}
      </div>

      {/* Simulator Guidance */}
      <div class="p-3 bg-[#1A1A1A]/50 border-b border-white/10 text-[11px] text-white/60">
        <p class="leading-relaxed font-serif italic">
          Interact here to simulate telegram bot approvals. Changes will synchronize with Anika's memory candidate models instantly.
        </p>
      </div>

      {/* Chat Messages Log */}
      <div class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {pendingArticles.length === 0 ? (
          <div class="h-full flex flex-col items-center justify-center text-center p-4">
            <MessageSquareReply class="h-8 w-8 text-white/20 mb-2" />
            <p class="text-xs text-white/55 font-serif italic">
              No active publications in the review pipeline yet. Launch a brainstorm cycle to populate stories!
            </p>
          </div>
        ) : (
          pendingArticles.map((article) => {
            const statusConfig = getStatusBadge(article.status);
            return (
              <div key={article.id} class="space-y-2 border-b border-white/5 pb-4">
                {/* Status indicator */}
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-white/40 font-mono">#{article.id}</span>
                  <span class={`text-[9px] px-2 py-0.5 rounded border ${statusConfig.bg}`}>
                    {statusConfig.text}
                  </span>
                </div>

                {/* Message Bubble */}
                <div class="bg-[#3D3834] text-slate-200 rounded-2xl rounded-tl-none p-3 shadow-md max-w-[90%] border border-white/5">
                  <div class="flex items-center gap-1.5 mb-1 border-b border-white/5 pb-1">
                    <span class="font-bold text-xs text-[#E27D60]">Anika Patel (Editor)</span>
                    <span class="text-[9px] text-white/40">Bot Feed</span>
                  </div>
                  
                  <div class="space-y-1.5 text-xs pt-1">
                    <p class="font-semibold text-white leading-snug font-serif">
                      📢 Sandbox Publication Ready!
                    </p>
                    <p class="font-medium text-slate-300 font-serif">
                      Headline: <span class="italic text-[#E8A87C]">"{article.title}"</span>
                    </p>
                    <p class="text-slate-400 line-clamp-3">
                      Pitch: {article.artifacts.story_idea || "No idea prompt developed."}
                    </p>
                    {article.artifacts.image_prompt && (
                      <p class="text-[10px] text-white/50 bg-black/20 p-1 rounded font-mono truncate">
                        🎨 {article.artifacts.image_prompt}
                      </p>
                    )}
                  </div>
                </div>

                {/* Interactive Inline Buttons */}
                {article.status === "awaiting_admin_review" && (
                  <div class="grid grid-cols-2 gap-1.5 mt-2">
                    <button
                      onClick={() => handleActionClick(article.id, "approve")}
                      disabled={isSubmitting}
                      class="flex items-center justify-center gap-1 text-[11px] font-bold uppercase bg-[#E27D60] hover:bg-[#e27d60]/95 text-white py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      <Check class="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleActionClick(article.id, "revision")}
                      disabled={isSubmitting}
                      class="flex items-center justify-center gap-1 text-[11px] font-bold uppercase bg-white/10 hover:bg-white/20 text-white border border-white/15 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      <RefreshCw class="h-3 w-3 animate-spin-slow" />
                      Revision
                    </button>
                    <button
                      onClick={() => handleActionClick(article.id, "regenerate")}
                      disabled={isSubmitting}
                      class="flex items-center justify-center gap-1 text-[11px] font-bold uppercase bg-[#3D3834] hover:bg-[#3d3834]/80 text-white border border-white/10 py-1.5 rounded transition-colors disabled:opacity-50 col-span-2"
                    >
                      <Sparkles class="h-3 w-3 text-[#E27D60]" />
                      Regenerate Image
                    </button>
                    <button
                      onClick={() => handleActionClick(article.id, "reject")}
                      disabled={isSubmitting}
                      class="flex items-center justify-center gap-1 text-[11px] font-bold uppercase bg-red-950/20 hover:bg-red-950/40 text-red-300 border border-red-500/10 py-1.5 rounded transition-colors disabled:opacity-50 col-span-2"
                    >
                      <X class="h-3 w-3" />
                      Reject Draft
                    </button>
                  </div>
                )}

                {/* Revision Text Input Card */}
                {revisionForId === article.id && (
                  <div class="bg-[#1A1A1A] border border-white/10 rounded p-2.5 space-y-2 mt-2">
                    <label class="text-[10px] font-bold text-[#E27D60] uppercase tracking-wider block">
                      Revision Instructions
                    </label>
                    <textarea
                      value={revisionText}
                      onChange={(e) => setRevisionText(e.target.value)}
                      placeholder="e.g. Tone is slightly too cold. Add more sensory details about South African food..."
                      rows={2}
                      class="w-full text-xs bg-black/20 border border-white/10 rounded p-1.5 text-slate-200 placeholder-white/20 focus:outline-none focus:border-[#E27D60]"
                    />
                    <div class="flex gap-1 justify-end">
                      <button
                        onClick={() => setRevisionForId(null)}
                        class="text-[10px] text-white/60 hover:text-white px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => submitRevision(article.id)}
                        disabled={isSubmitting || !revisionText.trim()}
                        class="bg-[#E27D60] hover:bg-[#E27D60]/90 text-white font-bold text-[10px] px-2.5 py-1 rounded disabled:opacity-50"
                      >
                        Send Revision
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input Placeholder */}
      <div class="p-3 bg-[#1A1A1A] border-t border-white/10 flex items-center gap-2">
        <input
          type="text"
          disabled
          placeholder="Simulated Channel is read-only..."
          class="flex-1 bg-black/25 border border-white/10 rounded px-3 py-1.5 text-xs text-white/30 focus:outline-none"
        />
        <div class="p-1.5 bg-[#2D2926] rounded text-white/30">
          <Send class="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
