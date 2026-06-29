'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { callFunction } from "@/lib/clientApi";
import Sidebar from "@/components/Sidebar";
import TelegramSimulator from "@/components/TelegramSimulator";
import DashboardView from "@/components/DashboardView";
import ArticlesView from "@/components/ArticlesView";
import ArticleDetailView from "@/components/ArticleDetailView";
import ImagesView from "@/components/ImagesView";
import JournalistProfileView from "@/components/JournalistProfileView";
import MemoryView from "@/components/MemoryView";
import ApprovalsView from "@/components/ApprovalsView";
import SettingsView from "@/components/SettingsView";
import { Article, Journalist, AgentLog, JournalistMemory, Source } from "@/lib/types";

export default function App() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [detailedArticle, setDetailedArticle] = useState<Article | null>(null);
  
  // State from backend
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [memories, setMemories] = useState<JournalistMemory[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [schedulerRuns, setSchedulerRuns] = useState<any[]>([]);
  const [telegramConfig, setTelegramConfig] = useState({
    bot_token: "",
    chat_id: "",
    is_active: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJournalistId, setSelectedJournalistId] = useState<string>("all");

  const selectedJournalist =
    selectedJournalistId === "all"
      ? null
      : journalists.find((j) => j.id === selectedJournalistId) || null;

  // Authenticate user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
      if (!session) {
        router.push("/login");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecked(true);
      if (!session) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Fetch all initial configurations & states from Supabase
  const fetchState = async () => {
    if (!session) return;
    try {
      setError(null);

      // 1. Fetch journalists
      const { data: dataJ, error: errorJ } = await supabase
        .from('journalists')
        .select('*')
        .order('created_at', { ascending: true });
      if (errorJ) throw errorJ;

      // 2. Fetch articles
      const { data: dataA, error: errorA } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (errorA) throw errorA;

      // 3. Fetch memories
      const { data: dataM, error: errorM } = await supabase
        .from('journalist_memory')
        .select('*')
        .order('created_at', { ascending: false });
      if (errorM) throw errorM;

      // 4. Fetch logs
      const { data: dataL, error: errorL } = await supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (errorL) throw errorL;

      // 5. Fetch scheduler runs
      const { data: runsData, error: runsError } = await supabase
        .from('agent_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);
      if (runsError) throw runsError;
      setSchedulerRuns(runsData || []);

      // Map logs to UI schema
      const mappedLogs: AgentLog[] = (dataL || []).map((l: any) => {
        const article = (dataA || []).find((a: any) => a.id === l.article_id);
        const jId = article ? article.journalist_id : 'anika-patel';
        const jName = (dataJ || []).find((j: any) => j.id === jId)?.name || 'Anika Patel';
        return {
          id: l.id,
          timestamp: l.created_at,
          journalist_id: jId,
          article_id: l.article_id,
          action_type: l.action,
          message: typeof l.output === 'object' && l.output?.message 
            ? l.output.message 
            : typeof l.output === 'string'
              ? l.output
              : `${jName} performed ${l.action}`
        };
      });

      // Map journalists adding fallback avatar
      const mappedJ: Journalist[] = (dataJ || []).map((j: any) => {
        let avatar = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop';
        if (j.id === 'oliver-mbatha') {
          avatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop';
        } else if (j.id === 'zola-ndlovu') {
          avatar = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop';
        } else if (j.id !== 'anika-patel') {
          const avatars = [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop'
          ];
          let hash = 0;
          for (let i = 0; i < (j.name || '').length; i++) {
            hash = (j.name || '').charCodeAt(i) + ((hash << 5) - hash);
          }
          avatar = avatars[Math.abs(hash) % avatars.length];
        }
        return {
          ...j,
          avatar
        };
      });

      // Fetch active completed image jobs to map featured images
      const { data: imageJobs } = await supabase
        .from('image_jobs')
        .select('article_id, image_url, provider, created_at')
        .eq('generation_status', 'completed')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false });

      if (process.env.NODE_ENV === 'development') {
        console.log('Image jobs loaded:', imageJobs);
      }

      const imageMap: Record<string, string> = {};
      if (imageJobs) {
        imageJobs.forEach((job: any) => {
          if (job.article_id && job.image_url && !imageMap[job.article_id]) {
            imageMap[job.article_id] = job.image_url;
          }
        });
      }

      // Map articles
      const mappedA: Article[] = (dataA || []).map((a: any) => ({
        id: a.id,
        journalist_id: a.journalist_id,
        title: a.title || a.topic || 'Untitled Pitch',
        topic: a.topic,
        status: a.status as any,
        created_at: a.created_at,
        updated_at: a.updated_at,
        featured_image: imageMap[a.id] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
        artifacts: {} // Loaded dynamically on selection
      }));

      setJournalists(mappedJ);
      setArticles(mappedA);
      setMemories(dataM || []);
      setLogs(mappedLogs);

      // Load telegram config from browser localStorage or use dummy settings.
      // Since it's managed via env on the backend, we display active/disabled.
      const savedTelegram = localStorage.getItem('newsroom_telegram_sim') || '{"is_active":false}';
      setTelegramConfig(JSON.parse(savedTelegram));

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected system error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when session is set
  useEffect(() => {
    if (session) {
      fetchState();
    }
  }, [session]);

  // Fetch full details for the selected article
  const fetchArticleDetails = async (articleId: string) => {
    setDetailLoading(true);
    try {
      // 1. Fetch base article
      const { data: baseArticle, error: errorA } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();
      if (errorA) throw errorA;

      // 2. Fetch artifacts
      const { data: artifacts, error: errorArt } = await supabase
        .from('article_artifacts')
        .select('*')
        .eq('article_id', articleId);
      if (errorArt) throw errorArt;

      // 3. Fetch sources
      const { data: sources, error: errorSrc } = await supabase
        .from('sources')
        .select('*')
        .eq('article_id', articleId);
      if (errorSrc) throw errorSrc;

      // 4. Fetch image jobs & reviews
      const { data: imageJob } = await supabase
        .from('image_jobs')
        .select('*')
        .eq('article_id', articleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let imageReviewText = '';
      if (imageJob) {
        const { data: review } = await supabase
          .from('image_reviews')
          .select('*')
          .eq('image_job_id', imageJob.id)
          .maybeSingle();
        if (review) {
          imageReviewText = `RATING: ${review.relevance_score || 4}/5 | PASSED: ${review.approved ? 'YES' : 'NO'}\n\nReview comments:\n${review.notes || ''}`;
        }
      }

      // Map sources
      const mappedSources: Source[] = (sources || []).map((s: any) => ({
        name: s.title,
        url: s.url,
        status: s.reliability_score >= 0.8 ? 'verified' : 'unverified',
        notes: s.notes || ''
      }));

      // Assemble artifacts
      const artifactsObj: any = {
        source_list: mappedSources,
        generated_image: imageJob?.image_url || '',
        image_quality_review: imageReviewText
      };

      (artifacts || []).forEach((art: any) => {
        const type = art.artifact_type;
        let contentStr = '';
        
        if (typeof art.content === 'object' && art.content !== null) {
          contentStr = art.content.text || JSON.stringify(art.content);
        } else {
          contentStr = String(art.content);
        }

        // Map outline types to match frontend expectation
        if (type === 'outline') {
          artifactsObj.article_outline = contentStr;
        } else {
          artifactsObj[type] = contentStr;
        }
      });

      const fullArt: Article = {
        id: baseArticle.id,
        journalist_id: baseArticle.journalist_id,
        title: baseArticle.title || baseArticle.topic || 'Untitled Pitch',
        topic: baseArticle.topic,
        status: baseArticle.status as any,
        created_at: baseArticle.created_at,
        updated_at: baseArticle.updated_at,
        featured_image: imageJob?.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
        artifacts: artifactsObj
      };

      setDetailedArticle(fullArt);
    } catch (err) {
      console.error("Error fetching article details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Re-fetch article details when selectedArticleId or list state changes
  useEffect(() => {
    if (selectedArticleId) {
      fetchArticleDetails(selectedArticleId);
    } else {
      setDetailedArticle(null);
    }
  }, [selectedArticleId, articles]);

  // 1. Brainstorm / Pitch generation trigger
  const handleTriggerBrainstorm = async (topic?: string) => {
    try {
      setIsLoading(true);
      const result = await callFunction<{ article_id: string }>('create-article', { 
        topic: topic?.trim() || undefined,
        journalist_id: selectedJournalistId === "all" ? undefined : selectedJournalistId
      });
      await fetchState(); // reload
      setSelectedArticleId(result.article_id);
      setCurrentTab("article_detail");
    } catch (err: any) {
      alert(`Brainstorm failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Trigger individual step in the editorial pipeline
  const handleRunPipelineStep = async (articleId: string) => {
    try {
      setDetailLoading(true);
      await callFunction('run-pipeline-step', { id: articleId });
      await fetchState(); // reload
    } catch (err: any) {
      alert(`Transition failed: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  // 3. Submit Admin general feedback / revision desk text
  const handleSubmitFeedback = async (articleId: string, feedback: string, status?: string) => {
    try {
      setDetailLoading(true);
      if (status === 'approved_sandbox') {
        await callFunction('approve-article', { article_id: articleId, feedback });
      } else if (status === 'revision_requested') {
        await callFunction('request-revision', { article_id: articleId, feedback });
        await fetchState();

        // Auto-run pipeline step-by-step until we return to awaiting_admin_review
        let currentStatus = 'revision_requested';
        while (
          currentStatus !== 'awaiting_admin_review' && 
          currentStatus !== 'approved_sandbox' && 
          currentStatus !== 'rejected'
        ) {
          const res = await callFunction<{ status: string }>('run-pipeline-step', { id: articleId });
          currentStatus = res.status;
          await fetchState();
        }
      } else {
        const { error } = await supabase.from('admin_feedback').insert({
          article_id: articleId,
          feedback_type: 'general',
          feedback
        });
        if (error) throw error;
      }
      await fetchState();
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  // 4. Simulate Telegram bot button callbacks
  const handleTelegramAction = async (articleId: string, action: string, revisionText?: string) => {
    try {
      setDetailLoading(true);
      if (action === 'approve') {
        await callFunction('approve-article', { article_id: articleId, feedback: 'Approved via Telegram' });
      } else if (action === 'revision') {
        await callFunction('request-revision', { article_id: articleId, feedback: revisionText || 'Revision requested via Telegram' });
        await fetchState();

        // Auto-run pipeline step-by-step until we return to awaiting_admin_review
        let currentStatus = 'revision_requested';
        while (
          currentStatus !== 'awaiting_admin_review' && 
          currentStatus !== 'approved_sandbox' && 
          currentStatus !== 'rejected'
        ) {
          const res = await callFunction<{ status: string }>('run-pipeline-step', { id: articleId });
          currentStatus = res.status;
          await fetchState();
        }
      } else if (action === 'regenerate') {
        await callFunction('regenerate-image', { article_id: articleId, feedback: 'Regeneration requested via Telegram' });
      } else if (action === 'reject') {
        await callFunction('reject-article', { article_id: articleId, feedback: 'Rejected via Telegram' });
      }
      await fetchState();
    } catch (err: any) {
      alert(`Simulated Telegram action failed: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  // 5. Reset database
  const handleResetDatabase = async () => {
    try {
      setIsLoading(true);
      await callFunction('reset');
      setSelectedArticleId(null);
      setCurrentTab("dashboard");
      await fetchState();
    } catch (err: any) {
      alert(`Database reset failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Save Telegram bot configurations locally (since it is controlled via env)
  const handleSaveTelegramConfig = async (token: string, chatId: string, active: boolean) => {
    const config = { bot_token: token, chat_id: chatId, is_active: active };
    localStorage.setItem('newsroom_telegram_sim', JSON.stringify(config));
    setTelegramConfig(config);
    alert('Telegram simulator settings updated locally.');
  };

  // 7. Update memory status (candidate -> approved / rejected)
  const handleUpdateMemoryStatus = async (memoryId: string, status: "approved" | "rejected") => {
    try {
      await callFunction('update-memory', { memory_id: memoryId, action: status === 'approved' ? 'approve' : 'reject' });
      await fetchState();
    } catch (err: any) {
      alert(`Memory update failed: ${err.message}`);
    }
  };

  const handleSelectArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    setCurrentTab("article_detail");
  };

  const scopedArticles = selectedJournalistId === "all"
    ? articles
    : articles.filter(a => a.journalist_id === selectedJournalistId);

  const scopedMemories = selectedJournalistId === "all"
    ? memories
    : memories.filter(m => m.journalist_id === selectedJournalistId);

  const scopedLogs = selectedJournalistId === "all"
    ? logs
    : logs.filter(l => l.journalist_id === selectedJournalistId);

  const getActiveJournalist = () => {
    return selectedJournalistId === "all" ? null : (journalists.find(j => j.id === selectedJournalistId) || null);
  };

  const getPendingApprovalsCount = () => {
    return scopedArticles.filter(a => a.status === "awaiting_admin_review").length;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Render view depending on active tab
  const renderViewContent = () => {
    switch (currentTab) {
      case "dashboard":
        return (
          <DashboardView
            articles={scopedArticles}
            journalist={getActiveJournalist()}
            logs={scopedLogs}
            memories={scopedMemories}
            onTriggerBrainstorm={handleTriggerBrainstorm}
            onSelectArticle={handleSelectArticle}
            onResetDatabase={handleResetDatabase}
            schedulerRuns={schedulerRuns}
            onRefresh={fetchState}
          />
        );
      case "articles":
        return (
          <ArticlesView
            articles={scopedArticles}
            onSelectArticle={handleSelectArticle}
          />
        );
      case "article_detail":
        if (detailLoading && !detailedArticle) {
          return (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
              Loading article details and artifacts...
            </div>
          );
        }
        if (!detailedArticle) {
          return (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
              Select an article to view details and artifacts.
            </div>
          );
        }
        return (
          <ArticleDetailView
            article={detailedArticle}
            onBack={() => {
              setSelectedArticleId(null);
              setCurrentTab("articles");
            }}
            onRunPipelineStep={handleRunPipelineStep}
            onSubmitFeedback={handleSubmitFeedback}
            onTelegramAction={handleTelegramAction}
          />
        );
      case "images":
        return (
          <ImagesView
            articles={scopedArticles}
            onSelectArticle={handleSelectArticle}
          />
        );
      case "profile":
        return (
          <JournalistProfileView
            journalists={journalists}
            articles={scopedArticles}
            memories={scopedMemories}
            onRefresh={fetchState}
            onSelectArticle={handleSelectArticle}
            onUpdateMemoryStatus={handleUpdateMemoryStatus}
          />
        );
      case "memory":
        return (
          <MemoryView
            memories={scopedMemories}
            onUpdateMemoryStatus={handleUpdateMemoryStatus}
          />
        );
      case "approvals":
        return (
          <ApprovalsView
            articles={scopedArticles}
            onSelectArticle={handleSelectArticle}
            onTelegramAction={handleTelegramAction}
          />
        );
      case "settings":
        return (
          <SettingsView
            onResetDatabase={handleResetDatabase}
            telegramConfig={telegramConfig}
            onSaveTelegramConfig={handleSaveTelegramConfig}
          />
        );
      default:
        return (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
            Unknown view tab.
          </div>
        );
    }
  };

  if (!authChecked || isLoading) {
    return (
      <div id="loader-container" className="h-screen w-screen bg-[#fafbfb] flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 rounded-xl border-4 border-emerald-500 border-t-transparent animate-spin"></div>
        <div className="text-center">
          <p className="text-xs font-bold font-sans text-slate-800">Initializing Newsroom Lab</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Assembling Private Phase 0 Sandbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="app-container" className="flex h-screen w-screen overflow-hidden bg-[#FDFDFB] text-[#2D2926]">
      {/* 1. Sidebar Nav */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        journalist={getActiveJournalist()}
        pendingApprovalsCount={getPendingApprovalsCount()}
        onSignOut={handleSignOut}
      />

      {/* 2. Main Workspace */}
      <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full h-full space-y-6">
        {currentTab !== "settings" && currentTab !== "profile" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E2D9] shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[#E27D60] animate-pulse"></div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">Newsroom Context:</span>
              <div className="relative">
                <select
                  value={selectedJournalistId}
                  onChange={(e) => setSelectedJournalistId(e.target.value)}
                  className="appearance-none pr-8 pl-3 py-1.5 text-xs bg-[#F8F7F3] border border-[#E5E2D9] rounded font-bold text-[#2D2926] focus:outline-none focus:border-[#E27D60] shadow-sm transition-colors cursor-pointer"
                >
                  <option value="all">All Journalists (Newsroom-wide)</option>
                  {journalists.map((j) => (
                    <option key={j.id} value={j.id}>{j.name} ({j.role})</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#2D2926]">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {selectedJournalist ? (
              <div className="flex items-center gap-2 bg-[#F8F7F3] px-3 py-1 rounded-full border border-[#E5E2D9]">
                <img
                  src={selectedJournalist.avatar}
                  alt={selectedJournalist.name}
                  className="w-5 h-5 rounded-full object-cover border border-[#E27D60]"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-serif font-bold text-[#2D2926]">{selectedJournalist.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">|</span>
                <span className="text-[10px] text-[#E27D60] font-mono font-bold uppercase tracking-wider">{selectedJournalist.role}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                <div className="flex -space-x-1.5">
                  {journalists.slice(0, 3).map((j) => (
                    <img
                      key={j.id}
                      src={j.avatar}
                      alt={j.name}
                      className="w-5 h-5 rounded-full object-cover border border-white"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <span className="text-xs font-serif text-slate-600 font-bold">Newsroom Roster ({journalists.length} Active)</span>
              </div>
            )}
          </div>
        )}
        {renderViewContent()}
      </main>

      {/* 3. Telegram Simulator Overlay */}
      <TelegramSimulator
        articles={scopedArticles}
        journalist={getActiveJournalist()}
        journalists={journalists}
        onTelegramAction={handleTelegramAction}
        telegramConfig={telegramConfig}
      />
    </div>
  );
}
