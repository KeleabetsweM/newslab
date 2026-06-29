import React, { useState, useEffect } from "react";
import { 
  Globe, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  History, 
  Send, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Loader2,
  FileText
} from "lucide-react";
import { supabase } from "../lib/supabaseBrowser";
import { callFunction } from "../lib/clientApi";
import { Article, PublicArticle, PublicPublishLog } from "../types";
import SafeImage from "./SafeImage";

interface MzansiLiveViewProps {
  articles: Article[];
  onRefresh: () => Promise<void>;
  onSelectArticle: (articleId: string) => void;
}

export default function MzansiLiveView({
  articles,
  onRefresh,
  onSelectArticle
}: MzansiLiveViewProps) {
  const [publicArticles, setPublicArticles] = useState<PublicArticle[]>([]);
  const [publishLogs, setPublishLogs] = useState<PublicPublishLog[]>([]);
  const [isFetchingPublicState, setIsFetchingPublicState] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch state specifically for Mzansi Live Beta tables
  const fetchPublicState = async () => {
    try {
      setIsFetchingPublicState(true);
      // Fetch public articles
      const { data: pubData, error: pubErr } = await supabase
        .from("public_articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (pubErr) throw pubErr;
      setPublicArticles(pubData || []);

      // Fetch publish logs
      const { data: logData, error: logErr } = await supabase
        .from("public_publish_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (logErr) throw logErr;
      setPublishLogs(logData || []);
    } catch (err) {
      console.error("Error fetching public state:", err);
      showToast("Failed to fetch Mzansi Mashup tables.", "error");
    } finally {
      setIsFetchingPublicState(false);
    }
  };

  useEffect(() => {
    fetchPublicState();
  }, [articles]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Perform publishing bridge trigger via Netlify function
  const handlePublish = async (articleId: string) => {
    try {
      setActionLoading(articleId);
      const res = await callFunction<{ success: boolean; message: string }>("publish-to-mzansi", {
        articleId,
        action: "publish"
      });
      if (res.success) {
        showToast("Article published to Mzansi Mashup!", "success");
        await Promise.all([onRefresh(), fetchPublicState()]);
      } else {
        showToast(res.message || "Failed to publish.", "error");
      }
    } catch (err: any) {
      console.error("Publishing error:", err);
      showToast(err.message || "Publishing request failed.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Perform unpublishing action via Netlify function
  const handleUnpublish = async (articleId: string) => {
    try {
      setActionLoading(`unpublish-${articleId}`);
      const res = await callFunction<{ success: boolean; message: string }>("publish-to-mzansi", {
        articleId,
        action: "unpublish"
      });
      if (res.success) {
        showToast("Article unpublished from Mzansi Mashup.", "success");
        await Promise.all([onRefresh(), fetchPublicState()]);
      } else {
        showToast(res.message || "Failed to unpublish.", "error");
      }
    } catch (err: any) {
      console.error("Unpublishing error:", err);
      showToast(err.message || "Unpublishing request failed.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter approved sandbox articles from sandbox library
  const approvedSandboxArticles = articles.filter(a => a.status === "approved_sandbox");

  return (
    <div className="space-y-8 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 transform translate-y-0 ${
            toastMessage.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E5E2D9]">
        <div>
          <h2 className="text-3xl font-serif italic text-[#2D2926] tracking-tight flex items-center gap-2">
            <Globe className="h-8 w-8 text-[#E27D60] animate-pulse" />
            Mzansi Mashup Live Beta
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-serif italic">
            Publishing Bridge console: Wire Newsroom Lab articles to the public beta website.
          </p>
        </div>
        <button
          onClick={fetchPublicState}
          disabled={isFetchingPublicState}
          className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E2D9] rounded bg-white text-slate-600 hover:text-[#E27D60] hover:bg-[#F8F7F3] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetchingPublicState ? 'animate-spin' : ''}`} />
          Refresh Console
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E2D9] p-5 rounded shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Live Public Articles</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-serif font-bold text-[#2D2926]">
              {publicArticles.filter(a => a.public_status === 'published').length}
            </p>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Active</span>
          </div>
        </div>
        <div className="bg-white border border-[#E5E2D9] p-5 rounded shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Unpublished Drafts</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-serif font-bold text-[#2D2926]">
              {publicArticles.filter(a => a.public_status === 'unpublished').length}
            </p>
            <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">Withdrawn</span>
          </div>
        </div>
        <div className="bg-white border border-[#E5E2D9] p-5 rounded shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Approved Sandbox Pool</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-serif font-bold text-[#2D2926]">{approvedSandboxArticles.length}</p>
            <span className="text-xs text-[#E27D60] font-bold bg-[#E27D60]/10 px-2 py-0.5 rounded">Ready</span>
          </div>
        </div>
        <div className="bg-white border border-[#E5E2D9] p-5 rounded shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Bridge Auto-Publish</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-lg font-serif font-bold text-[#2D2926]">
              {process.env.NEXT_PUBLIC_MZANSI_AUTO_PUBLISH_ENABLED === "true" || process.env.MZANSI_AUTO_PUBLISH_ENABLED === "true" ? "ENABLED" : "DISABLED"}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              process.env.NEXT_PUBLIC_MZANSI_AUTO_PUBLISH_ENABLED === "true" || process.env.MZANSI_AUTO_PUBLISH_ENABLED === "true"
                ? "bg-emerald-50 text-emerald-600" 
                : "bg-slate-100 text-slate-500"
            }`}>
              Gate Control
            </span>
          </div>
        </div>
      </div>

      {/* Main Bridge Console Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Workspace: Ready for Bridge */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-[#E5E2D9]">
            <h3 className="text-lg font-serif font-bold text-[#2D2926]">
              Staged Sandbox Pool ({approvedSandboxArticles.length})
            </h3>
            <p className="text-xs text-slate-400">Articles that successfully finished editorial stages and can be bridged.</p>
          </div>

          {approvedSandboxArticles.length === 0 ? (
            <div className="bg-white border border-[#E5E2D9] rounded p-8 text-center text-slate-400 text-xs font-serif italic">
              No articles are currently in the approved sandbox pool.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {approvedSandboxArticles.map((article) => {
                const isPublishedPublicly = publicArticles.some(
                  (pa) => pa.article_id === article.id && pa.public_status === "published"
                );
                const isLoadingForThis = actionLoading === article.id;

                return (
                  <div key={article.id} className="bg-white border border-[#E5E2D9] p-4 rounded shadow-sm flex items-start gap-4 justify-between transition hover:shadow">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono text-slate-400">#{article.id.slice(0, 8)}</span>
                        <span className="text-[9px] uppercase font-bold text-[#E27D60] bg-[#E27D60]/10 px-2 py-0.5 rounded border border-[#E27D60]/20 tracking-wider font-mono">
                          {article.journalist_id}
                        </span>
                        {isPublishedPublicly && (
                          <span className="text-[9px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 tracking-wider font-mono flex items-center gap-1">
                            <CheckCircle className="h-2.5 w-2.5" />
                            Live on Mashup
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-serif font-bold text-[#2D2926] mt-1.5 truncate">
                        {article.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 italic font-serif mt-0.5">
                        "{article.topic}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onSelectArticle(article.id)}
                        title="View Sandbox Article"
                        className="p-1.5 border border-[#E5E2D9] rounded hover:text-[#E27D60] hover:bg-[#F8F7F3] transition"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePublish(article.id)}
                        disabled={isLoadingForThis}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono shadow-sm transition flex items-center gap-1.5 ${
                          isPublishedPublicly 
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200" 
                            : "bg-[#E27D60] hover:bg-[#E27D60]/90 text-white"
                        }`}
                      >
                        {isLoadingForThis ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        {isPublishedPublicly ? "Update/Sync" : "Publish to Mzansi"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Workspace: Live on Mzansi Mashup */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-[#E5E2D9]">
            <h3 className="text-lg font-serif font-bold text-[#2D2926]">
              Live on Mzansi Mashup ({publicArticles.length})
            </h3>
            <p className="text-xs text-slate-400">Public articles fetched from the `public_articles` table.</p>
          </div>

          {publicArticles.length === 0 ? (
            <div className="bg-white border border-[#E5E2D9] rounded p-8 text-center text-slate-400 text-xs font-serif italic">
              No articles are currently live on the Mzansi Mashup site.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {publicArticles.map((pubArticle) => {
                const isLive = pubArticle.public_status === "published";
                const isUnpublishing = actionLoading === `unpublish-${pubArticle.article_id}`;

                return (
                  <div key={pubArticle.id} className="bg-white border border-[#E5E2D9] p-4 rounded shadow-sm flex items-start gap-4 justify-between transition hover:shadow">
                    <div className="flex gap-3 items-center min-w-0 flex-1">
                      <img 
                        src={pubArticle.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=80&h=80&fit=crop"}
                        alt={pubArticle.title}
                        className="w-12 h-12 object-cover rounded border border-[#E5E2D9] flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-mono text-slate-400">/{pubArticle.slug}</span>
                          <span className="text-[9px] uppercase font-bold text-[#E27D60] bg-[#E27D60]/10 px-1.5 py-0.2 rounded font-mono">
                            {pubArticle.category}
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded font-mono border ${
                            isLive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {pubArticle.public_status}
                          </span>
                        </div>
                        <h4 className="text-sm font-serif font-bold text-[#2D2926] mt-1 truncate">
                          {pubArticle.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Published: {pubArticle.published_at ? new Date(pubArticle.published_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isLive ? (
                        <button
                          onClick={() => handleUnpublish(pubArticle.article_id)}
                          disabled={isUnpublishing}
                          className="px-2.5 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider font-mono transition flex items-center gap-1"
                        >
                          {isUnpublishing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          Withdraw
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePublish(pubArticle.article_id)}
                          disabled={actionLoading === pubArticle.article_id}
                          className="px-2.5 py-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider font-mono transition flex items-center gap-1"
                        >
                          {actionLoading === pubArticle.article_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          Republish
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Bottom Section: Publishing activity & Audit logs */}
      <div className="bg-white border border-[#E5E2D9] rounded shadow-sm p-6 space-y-4">
        <div className="pb-2 border-b border-[#E5E2D9] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-serif font-bold text-[#2D2926] flex items-center gap-2">
              <History className="h-5 w-5 text-slate-500" />
              Publishing Audit Trail
            </h3>
            <p className="text-xs text-slate-400">Log history of automated and manual bridge operations.</p>
          </div>
          <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
            Last 20 Runs
          </span>
        </div>

        {publishLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-serif italic">
            No bridge operations have been logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-[#E5E2D9] text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                  <th className="py-2.5 font-medium">Timestamp</th>
                  <th className="py-2.5 font-medium">Article ID</th>
                  <th className="py-2.5 font-medium">Journalist</th>
                  <th className="py-2.5 font-medium">Action</th>
                  <th className="py-2.5 font-medium">Result</th>
                  <th className="py-2.5 font-medium">Details / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8F7F3]">
                {publishLogs.map((log) => {
                  const isSuccess = log.status === 'success';
                  const isSkipped = log.status === 'skipped';
                  const isFailed = log.status === 'failed';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 font-mono text-[10px] text-slate-400">
                        {log.article_id ? log.article_id.slice(0, 8) : 'N/A'}
                      </td>
                      <td className="py-3 font-bold text-slate-600">
                        {log.journalist_id || 'system'}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className="bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                          isSuccess 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : isSkipped
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
                          {isSuccess && <CheckCircle className="h-2.5 w-2.5 text-emerald-600" />}
                          {isSkipped && <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />}
                          {isFailed && <XCircle className="h-2.5 w-2.5 text-rose-600" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 max-w-xs truncate" title={log.reason || ''}>
                        {log.reason || 'Operation executed successfully.'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
