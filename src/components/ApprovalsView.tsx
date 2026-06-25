import React from "react";
import { CheckSquare, ArrowRight, Eye, CheckCircle, RefreshCw, X } from "lucide-react";
import { Article } from "../types";

interface ApprovalsViewProps {
  articles: Article[];
  onSelectArticle: (articleId: string) => void;
  onTelegramAction: (articleId: string, action: string) => Promise<void>;
}

export default function ApprovalsView({
  articles,
  onSelectArticle,
  onTelegramAction
}: ApprovalsViewProps) {
  const pendingArticles = articles.filter(a => a.status === "awaiting_admin_review");

  return (
    <div class="space-y-6 font-sans">
      {/* Header */}
      <div class="pb-4 border-b border-[#E5E2D9]">
        <h2 class="text-3xl font-serif italic text-[#2D2926] tracking-tight">
          Admin Approvals Desk
        </h2>
        <p class="text-xs text-slate-500 mt-1 font-serif italic">
          Process staging builds ready for the Sandbox Staging database.
        </p>
      </div>

      {pendingArticles.length === 0 ? (
        <div class="bg-white rounded border border-[#E5E2D9] p-12 text-center text-slate-400 text-xs space-y-2 flex flex-col items-center font-serif italic">
          <CheckSquare class="h-8 w-8 text-[#E27D60]" />
          <p>The approvals desk is completely clear. No articles currently waiting for review!</p>
        </div>
      ) : (
        <div class="space-y-4">
          {pendingArticles.map((article) => (
            <div key={article.id} class="bg-white border border-[#E5E2D9] p-5 rounded shadow-sm flex flex-col md:flex-row gap-5 items-center justify-between">
              <div class="flex items-center gap-4 min-w-0 flex-1">
                <img
                  src={article.featured_image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=150&h=150&fit=crop"}
                  alt={article.title}
                  class="w-16 h-16 rounded object-cover border border-[#E5E2D9] flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div class="min-w-0 space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-slate-400">#{article.id}</span>
                    <span class="text-[9px] uppercase font-bold text-[#E27D60] bg-[#E27D60]/10 px-2 py-0.5 rounded border border-[#E27D60]/25 tracking-widest font-mono">
                      {article.topic}
                    </span>
                  </div>
                  <h3 class="text-base font-serif font-bold text-[#2D2926] leading-snug truncate">
                    {article.title}
                  </h3>
                  <p class="text-xs text-slate-500 line-clamp-1 italic font-serif">
                    "{article.artifacts.story_idea}"
                  </p>
                </div>
              </div>

              {/* Action desk */}
              <div class="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => onSelectArticle(article.id)}
                  class="px-3.5 py-1.5 border border-[#E5E2D9] text-slate-600 hover:text-[#E27D60] hover:bg-[#F8F7F3] font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-1 shadow-sm"
                >
                  Inspect Desk
                  <Eye class="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onTelegramAction(article.id, "approve")}
                  class="px-3.5 py-1.5 bg-[#E27D60] hover:bg-[#E27D60]/90 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle class="h-3.5 w-3.5" />
                  Approve Sandbox
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
