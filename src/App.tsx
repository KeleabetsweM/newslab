import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import TelegramSimulator from "./components/TelegramSimulator";
import DashboardView from "./components/DashboardView";
import ArticlesView from "./components/ArticlesView";
import ArticleDetailView from "./components/ArticleDetailView";
import ImagesView from "./components/ImagesView";
import JournalistProfileView from "./components/JournalistProfileView";
import MemoryView from "./components/MemoryView";
import ApprovalsView from "./components/ApprovalsView";
import SettingsView from "./components/SettingsView";
import { Article, Journalist, AgentLog, JournalistMemory } from "./types";
import { MessageSquareReply } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  
  // State from backend
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [memories, setMemories] = useState<JournalistMemory[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [telegramConfig, setTelegramConfig] = useState({
    bot_token: "",
    chat_id: "",
    is_active: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all initial configurations & states
  const fetchState = async () => {
    try {
      setError(null);
      const [resJ, resA, resM, resL, resT] = await Promise.all([
        fetch("/api/journalists"),
        fetch("/api/articles"),
        fetch("/api/memories"),
        fetch("/api/logs"),
        fetch("/api/telegram/config")
      ]);

      if (!resJ.ok || !resA.ok || !resM.ok || !resL.ok || !resT.ok) {
        throw new Error("Failed to load initial sandbox database states.");
      }

      const dataJ = await resJ.json();
      const dataA = await resA.json();
      const dataM = await resM.json();
      const dataL = await resL.json();
      const dataT = await resT.json();

      setJournalists(dataJ);
      setArticles(dataA);
      setMemories(dataM);
      setLogs(dataL);
      setTelegramConfig(dataT);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected system error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // 1. Brainstorm / Pitch generation trigger
  const handleTriggerBrainstorm = async (topic?: string) => {
    try {
      const response = await fetch("/api/articles/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, journalist_id: "anika-patel" })
      });

      if (!response.ok) throw new Error("Suggestion failed.");
      
      const newArticle = await response.json();
      await fetchState(); // reload state
      
      // Auto-navigate to the new article detail
      setSelectedArticleId(newArticle.id);
      setCurrentTab("article_detail");
    } catch (err: any) {
      alert(`Brainstorm failed: ${err.message}`);
    }
  };

  // 2. Trigger individual step in the editorial pipeline
  const handleRunPipelineStep = async (articleId: string) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/step`, {
        method: "POST"
      });

      if (!response.ok) throw new Error("Phase transition execution failed.");
      
      await fetchState(); // reload
    } catch (err: any) {
      alert(`Transition failed: ${err.message}`);
    }
  };

  // 3. Submit Admin general feedback / revision desk text
  const handleSubmitFeedback = async (articleId: string, feedback: string, status?: string) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, status })
      });

      if (!response.ok) throw new Error("Feedback logging failed.");
      
      await fetchState(); // reload
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`);
    }
  };

  // 4. Simulate Telegram bot button callbacks
  const handleTelegramAction = async (articleId: string, action: string, revisionText?: string) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/telegram-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, revisionText })
      });

      if (!response.ok) throw new Error("Telegram button callback execution failed.");
      
      await fetchState(); // reload
    } catch (err: any) {
      alert(`Simulated Telegram action failed: ${err.message}`);
    }
  };

  // 5. Reset database
  const handleResetDatabase = async () => {
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (!response.ok) throw new Error("Reset failed.");
      
      setSelectedArticleId(null);
      setCurrentTab("dashboard");
      await fetchState();
    } catch (err: any) {
      alert(`Database reset failed: ${err.message}`);
    }
  };

  // 6. Save real/simulated Telegram bot configurations
  const handleSaveTelegramConfig = async (token: string, chatId: string, active: boolean) => {
    try {
      const response = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: token, chat_id: chatId, is_active: active })
      });

      if (!response.ok) throw new Error("Configuration saving failed.");
      const updated = await response.json();
      setTelegramConfig(updated);
      await fetchState();
    } catch (err: any) {
      alert(`Saving telegram configuration failed: ${err.message}`);
    }
  };

  // 7. Update memory status (candidate -> approved / rejected)
  const handleUpdateMemoryStatus = async (memoryId: string, status: "approved" | "rejected") => {
    try {
      const response = await fetch(`/api/memories/${memoryId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error("Memory state update failed.");
      await fetchState();
    } catch (err: any) {
      alert(`Memory update failed: ${err.message}`);
    }
  };

  const handleSelectArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    setCurrentTab("article_detail");
  };

  const getActiveJournalist = () => {
    return journalists[0] || null;
  };

  const getSelectedArticle = () => {
    return articles.find(a => a.id === selectedArticleId) || null;
  };

  const getPendingApprovalsCount = () => {
    return articles.filter(a => a.status === "awaiting_admin_review").length;
  };

  // Render view depending on active tab
  const renderViewContent = () => {
    switch (currentTab) {
      case "dashboard":
        return (
          <DashboardView
            articles={articles}
            journalist={getActiveJournalist()}
            logs={logs}
            memories={memories}
            onTriggerBrainstorm={handleTriggerBrainstorm}
            onSelectArticle={handleSelectArticle}
            onResetDatabase={handleResetDatabase}
          />
        );
      case "articles":
        return (
          <ArticlesView
            articles={articles}
            onSelectArticle={handleSelectArticle}
          />
        );
      case "article_detail":
        const selectedArticle = getSelectedArticle();
        if (!selectedArticle) {
          return (
            <div class="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
              Select an article to view details and artifacts.
            </div>
          );
        }
        return (
          <ArticleDetailView
            article={selectedArticle}
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
            articles={articles}
            onSelectArticle={handleSelectArticle}
          />
        );
      case "profile":
        return <JournalistProfileView journalist={getActiveJournalist()} />;
      case "memory":
        return (
          <MemoryView
            memories={memories}
            onUpdateMemoryStatus={handleUpdateMemoryStatus}
          />
        );
      case "approvals":
        return (
          <ApprovalsView
            articles={articles}
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
          <div class="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
            Unknown view tab.
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div id="loader-container" class="h-screen w-screen bg-[#fafbfb] flex flex-col items-center justify-center space-y-4">
        <div class="h-10 w-10 rounded-xl border-4 border-emerald-500 border-t-transparent animate-spin"></div>
        <div class="text-center">
          <p class="text-xs font-bold font-display text-slate-800">Initializing Newsroom Lab</p>
          <p class="text-[10px] text-slate-400 font-mono mt-0.5">Assembling Private Phase 0 Sandbox...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="error-container" class="h-screen w-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div class="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xl">
          !
        </div>
        <div class="space-y-1 max-w-md">
          <h2 class="text-sm font-bold text-rose-950 font-display">System Boot Failure</h2>
          <p class="text-xs text-rose-700">{error}</p>
        </div>
        <button
          onClick={() => {
            setIsLoading(true);
            fetchState();
          }}
          class="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-lg hover:bg-rose-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div id="app-container" class="flex h-screen w-screen overflow-hidden bg-[#fafbfb]">
      {/* 1. Sidebar Nav */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        journalist={getActiveJournalist()}
        pendingApprovalsCount={getPendingApprovalsCount()}
      />

      {/* 2. Main Workspace */}
      <main class="flex-1 overflow-y-auto px-8 py-6 h-full scrollbar-thin">
        {renderViewContent()}
      </main>

      {/* 3. Telegram Simulator Overlay */}
      <TelegramSimulator
        articles={articles}
        journalist={getActiveJournalist()}
        onTelegramAction={handleTelegramAction}
        telegramConfig={telegramConfig}
      />
    </div>
  );
}
