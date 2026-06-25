import React, { useState } from "react";
import { 
  ArrowLeft, 
  Sparkles, 
  CheckCircle, 
  RefreshCw, 
  AlertTriangle, 
  Link as LinkIcon, 
  UserCheck, 
  BookOpen, 
  ShieldCheck, 
  FileText, 
  Image as ImageIcon,
  Check,
  X,
  MessageSquare,
  Activity,
  Award
} from "lucide-react";
import { Article, ArticleStatus } from "../types";

interface ArticleDetailViewProps {
  article: Article;
  onBack: () => void;
  onRunPipelineStep: (articleId: string) => Promise<void>;
  onSubmitFeedback: (articleId: string, feedback: string, status?: string) => Promise<void>;
  onTelegramAction: (articleId: string, action: string, revisionText?: string) => Promise<void>;
}

export default function ArticleDetailView({
  article,
  onBack,
  onRunPipelineStep,
  onSubmitFeedback,
  onTelegramAction
}: ArticleDetailViewProps) {
  const [activeArtifactTab, setActiveArtifactTab] = useState<"editorial" | "research" | "creative" | "audits">("editorial");
  const [feedbackText, setFeedbackText] = useState("");
  const [isStepping, setIsStepping] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const pipelineSteps: { status: ArticleStatus; label: string; desc: string }[] = [
    { status: "idea", label: "Story Pitch", desc: "Anika brainstorms or receives topic and drafts pitch" },
    { status: "researching", label: "Research & Sources", desc: "Compiles local factual data and lists real sources" },
    { status: "drafted", label: "Draft & Edit", desc: "Writes complete draft and edits for signature tone" },
    { status: "image_pending", label: "Creative Prompting", desc: "Designs visual brief and image prompt instructions" },
    { status: "image_review", label: "Asset Generation", desc: "Generates featured image and runs automated quality review" },
    { status: "fact_checking", label: "Fact-Check Audit", desc: "Verifies claims against sources to block hallucinations" },
    { status: "bias_review", label: "Guideline & Bias Review", desc: "Audits draft for inclusivity and editorial policy" },
    { status: "awaiting_admin_review", label: "Telegram Dispatch", desc: "Pushes article packet and action prompts to Telegram" },
  ];

  const getCurrentStepIndex = () => {
    return pipelineSteps.findIndex(step => step.status === article.status);
  };

  const handleNextStep = async () => {
    setIsStepping(true);
    await onRunPipelineStep(article.id);
    setIsStepping(false);
  };

  const handleFullPipeline = async () => {
    setIsStepping(true);
    // Loop through steps until we hit awaiting_admin_review
    let currentIdx = getCurrentStepIndex();
    while (currentIdx !== -1 && currentIdx < pipelineSteps.length - 1) {
      await onRunPipelineStep(article.id);
      currentIdx = currentIdx + 1;
    }
    setIsStepping(false);
  };

  const handleSendFeedback = async (type: "general" | "revision") => {
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    if (type === "revision") {
      await onSubmitFeedback(article.id, feedbackText, "revision_requested");
    } else {
      await onSubmitFeedback(article.id, feedbackText);
    }
    setFeedbackText("");
    setIsSubmittingFeedback(false);
  };

  const getStatusBadgeStyle = (status: ArticleStatus) => {
    switch (status) {
      case "approved_sandbox":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25";
      case "awaiting_admin_review":
        return "bg-[#E27D60]/10 text-[#E27D60] border-[#E27D60]/25 animate-pulse";
      case "revision_requested":
        return "bg-blue-500/10 text-blue-700 border-blue-500/25";
      case "rejected":
        return "bg-rose-500/10 text-rose-700 border-rose-500/25";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div class="space-y-6 font-sans">
      {/* Detail View Header */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E2D9] pb-5">
        <div class="flex items-center gap-3">
          <button
            onClick={onBack}
            class="p-2 rounded border border-[#E5E2D9] bg-white text-[#2D2926] hover:bg-[#F8F7F3] hover:text-[#E27D60] transition-all shadow-sm"
          >
            <ArrowLeft class="h-4 w-4" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400 font-mono">#{article.id}</span>
              <span class={`text-[9px] px-2 py-0.5 rounded border font-mono uppercase tracking-wider font-bold ${getStatusBadgeStyle(article.status)}`}>
                {article.status.replace("_", " ")}
              </span>
            </div>
            <h2 class="text-xl font-serif font-bold text-[#2D2926] truncate max-w-xl mt-1">
              {article.title}
            </h2>
          </div>
        </div>

        {/* Real-time Sandbox Label */}
        <div class="flex items-center gap-2 bg-[#1A1A1A] text-white px-3 py-1.5 rounded border border-white/10 text-xs font-mono">
          <span class="h-1.5 w-1.5 rounded-full bg-[#E27D60] animate-pulse"></span>
          <span>Phase 0: Staging Sandbox</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hand Sidebar: Pipeline Flow and Actions */}
        <div class="space-y-6">
          {/* Pipeline Controller card */}
          <div class="bg-white p-5 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center justify-between">
              Editorial Pipeline State
              <Activity class="h-3.5 w-3.5 text-[#E27D60]" />
            </h3>

            {/* Step-by-Step progress bar vertical */}
            <div class="space-y-4 relative pl-4 border-l border-[#E5E2D9]">
              {pipelineSteps.map((step, index) => {
                const currentIdx = getCurrentStepIndex();
                const isPassed = index < currentIdx || article.status === "approved_sandbox";
                const isCurrent = index === currentIdx && article.status !== "approved_sandbox";
                
                return (
                  <div key={step.status} class="relative space-y-0.5">
                    {/* Circle indicators */}
                    <span class={`absolute -left-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isPassed ? "bg-emerald-500 border-emerald-500 text-white" :
                      isCurrent ? "bg-white border-[#E27D60] text-[#E27D60]" :
                      "bg-white border-[#E5E2D9] text-slate-400"
                    }`}>
                      {isPassed && <Check class="h-2 w-2" />}
                    </span>

                    <h4 class={`text-xs font-bold leading-none ${isCurrent ? 'text-[#E27D60]' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </h4>
                    <p class="text-[10px] text-slate-500 leading-tight">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Run Pipeline CTA */}
            {article.status !== "approved_sandbox" && article.status !== "rejected" && article.status !== "awaiting_admin_review" && (
              <div class="pt-4 border-t border-[#E5E2D9] space-y-2">
                <button
                  onClick={handleNextStep}
                  disabled={isStepping}
                  class="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded bg-[#E27D60] hover:bg-[#E27D60]/90 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <Sparkles class="h-4 w-4" />
                  {isStepping ? "Processing Agent Phase..." : "Execute Next Phase"}
                </button>
                <button
                  onClick={handleFullPipeline}
                  disabled={isStepping}
                  class="w-full py-2 text-center border border-[#E5E2D9] hover:bg-[#F8F7F3] text-slate-600 font-bold text-xs uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                >
                  Run Full Sandbox Chain
                </button>
              </div>
            )}
          </div>

          {/* Feedback Desk & Revisions Panel */}
          <div class="bg-white p-5 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
              <MessageSquare class="h-3.5 w-3.5 text-[#E27D60]" />
              Administrative Feedback Desk
            </h3>

            <div class="space-y-2">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Log style lessons or structural guidance for Anika's memory candidate bank..."
                rows={3}
                disabled={isSubmittingFeedback}
                class="w-full text-xs bg-[#F8F7F3] border border-[#E5E2D9] rounded p-2.5 text-[#2D2926] placeholder-slate-400 focus:outline-none focus:border-[#E27D60] focus:bg-white transition-all disabled:opacity-50"
              />
              <div class="flex gap-2">
                <button
                  onClick={() => handleSendFeedback("general")}
                  disabled={isSubmittingFeedback || !feedbackText.trim()}
                  class="flex-1 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 text-[11px] font-bold rounded transition-colors disabled:opacity-50"
                >
                  Record Lesson
                </button>
                <button
                  onClick={() => handleSendFeedback("revision")}
                  disabled={isSubmittingFeedback || !feedbackText.trim()}
                  class="flex-1 py-1.5 bg-blue-500 text-white hover:bg-blue-600 text-[11px] font-bold rounded transition-colors disabled:opacity-50"
                >
                  Request Revision
                </button>
              </div>
            </div>

            {article.artifacts.admin_feedback && (
              <div class="bg-[#E27D60]/5 border border-[#E27D60]/10 p-3 rounded text-xs space-y-1">
                <span class="font-bold text-[#E27D60] text-[10px] uppercase tracking-wider block">Logged Feedback:</span>
                <p class="text-slate-600 italic">"{article.artifacts.admin_feedback}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Hand Workspace: Tabbed Artifact Explorer */}
        <div class="lg:col-span-2 bg-white rounded border border-[#E5E2D9] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {/* Artifact Navigation Tab header */}
          <div class="flex border-b border-[#E5E2D9] bg-[#F8F7F3]/40">
            <button
              onClick={() => setActiveArtifactTab("editorial")}
              class={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeArtifactTab === "editorial" 
                  ? "border-[#E27D60] text-[#E27D60] bg-white" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText class="h-3.5 w-3.5" />
              Editorial Copy
            </button>
            <button
              onClick={() => setActiveArtifactTab("research")}
              class={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeArtifactTab === "research" 
                  ? "border-[#E27D60] text-[#E27D60] bg-white" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookOpen class="h-3.5 w-3.5" />
              Research & Sources
            </button>
            <button
              onClick={() => setActiveArtifactTab("creative")}
              class={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeArtifactTab === "creative" 
                  ? "border-[#E27D60] text-[#E27D60] bg-white" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ImageIcon class="h-3.5 w-3.5" />
              Creative & Visuals
            </button>
            <button
              onClick={() => setActiveArtifactTab("audits")}
              class={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeArtifactTab === "audits" 
                  ? "border-[#E27D60] text-[#E27D60] bg-white" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheck class="h-3.5 w-3.5" />
              Quality Audits
            </button>
          </div>

          {/* Artifact Panel Contents */}
          <div class="p-6 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin bg-white">
            {activeArtifactTab === "editorial" && (
              <div class="space-y-6">
                {/* 1. Pitch / Idea */}
                <div class="space-y-2">
                  <h4 class="text-[10px] font-bold uppercase text-[#2D2926] tracking-widest font-mono">
                    Story Idea / Pitch
                  </h4>
                  <p class="text-sm text-[#2D2926] bg-[#F8F7F3] p-4 rounded border border-[#E5E2D9] leading-relaxed font-serif italic">
                    {article.artifacts.story_idea || "Phase not reached. Trigger pipeline to compile Story pitch."}
                  </p>
                </div>

                {/* 2. Outline */}
                {article.artifacts.article_outline && (
                  <div class="space-y-2">
                    <h4 class="text-[10px] font-bold uppercase text-[#2D2926] tracking-widest font-mono">
                      Article Outline Structuring
                    </h4>
                    <pre class="text-xs font-mono text-slate-600 bg-[#F8F7F3]/40 p-4 rounded border border-[#E5E2D9] whitespace-pre-wrap leading-relaxed">
                      {article.artifacts.article_outline}
                    </pre>
                  </div>
                )}

                {/* 3. Draft Copy */}
                {article.artifacts.draft_article && (
                  <div class="space-y-2">
                    <h4 class="text-[10px] font-bold uppercase text-[#2D2926] tracking-widest font-mono">
                      Sensory Draft Article
                    </h4>
                    <div class="text-sm text-[#2D2926] bg-[#F8F7F3]/20 p-5 rounded border border-[#E5E2D9] whitespace-pre-wrap leading-relaxed font-serif">
                      {article.artifacts.draft_article}
                    </div>
                  </div>
                )}

                {/* 4. Edited copy */}
                {article.artifacts.edited_article && (
                  <div class="space-y-2">
                    <h4 class="text-xs font-bold uppercase text-[#E27D60] tracking-widest font-mono flex items-center gap-1.5">
                      <Award class="h-4 w-4 text-[#E27D60]" />
                      Final Edited Copy (Tone Filter Applied)
                    </h4>
                    <div class="text-base text-[#2D2926] bg-[#E27D60]/5 p-5 rounded border border-[#E27D60]/20 whitespace-pre-wrap leading-relaxed font-serif">
                      {article.artifacts.edited_article}
                    </div>
                  </div>
                )}

                {/* 5. Sandbox approved version */}
                {article.status === "approved_sandbox" && (
                  <div class="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded space-y-2">
                    <h4 class="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <CheckCircle class="h-4 w-4 text-emerald-600" />
                      Approved Staging Build
                    </h4>
                    <p class="text-xs text-slate-700 leading-relaxed font-serif italic">
                      This post has successfully completed Phase 0 quality auditing and is safely stored inside approved_sandbox. It will not publish to live websites.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeArtifactTab === "research" && (
              <div class="space-y-6">
                {/* Research notes */}
                <div class="space-y-2">
                  <h4 class="text-[10px] font-bold uppercase text-[#2D2926] tracking-widest font-mono">
                    Compiled Research Notes
                  </h4>
                  <div class="text-xs text-slate-700 bg-[#F8F7F3]/40 p-4 rounded border border-[#E5E2D9] whitespace-pre-wrap leading-relaxed">
                    {article.artifacts.research_notes || "Phase not reached. Run pipeline to trigger South African local tourism research."}
                  </div>
                </div>

                {/* Source catalog list */}
                <div class="space-y-3">
                  <h4 class="text-[10px] font-bold uppercase text-[#2D2926] tracking-widest font-mono">
                    Verified Source Catalog
                  </h4>
                  {!article.artifacts.source_list || article.artifacts.source_list.length === 0 ? (
                    <p class="text-xs text-slate-400 italic font-serif">No sources audited yet.</p>
                  ) : (
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {article.artifacts.source_list.map((src, i) => (
                        <div key={i} class="bg-white border border-[#E5E2D9] p-4 rounded space-y-2 shadow-sm">
                          <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-[#2D2926] truncate max-w-[120px]">{src.name}</span>
                            <span class={`text-[9px] px-2 py-0.25 rounded font-mono uppercase tracking-wider font-semibold ${
                              src.status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {src.status}
                            </span>
                          </div>
                          <div class="flex items-center gap-1 text-[10px] text-[#E27D60] hover:underline">
                            <LinkIcon class="h-3 w-3" />
                            <a href={src.url} target="_blank" rel="noopener noreferrer" class="truncate">{src.url}</a>
                          </div>
                          <p class="text-[11px] text-slate-500 leading-tight border-t border-[#E5E2D9] pt-2 italic font-serif">
                            {src.notes}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeArtifactTab === "creative" && (
              <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Brief & Instructions */}
                  <div class="space-y-4">
                    <div class="space-y-2">
                      <h4 class="text-[10px] font-bold uppercase text-[#2D2926] tracking-widest font-mono">
                        Creative Brief for Visuals
                      </h4>
                      <p class="text-xs text-slate-700 bg-[#F8F7F3]/40 p-3.5 rounded border border-[#E5E2D9] leading-relaxed">
                        {article.artifacts.image_brief || "Creative brief pending."}
                      </p>
                    </div>

                    <div class="space-y-2">
                      <h4 class="text-[10px] font-bold uppercase text-[#2D2926] tracking-widest font-mono">
                        AI Image Model Prompt
                      </h4>
                      <p class="text-xs text-slate-700 bg-[#F8F7F3]/40 p-3.5 rounded border border-[#E5E2D9] leading-relaxed font-mono">
                        {article.artifacts.image_prompt || "AI Model instructions pending."}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Image Preview */}
                  <div class="space-y-4">
                    <h4 class="text-[10px] font-bold uppercase text-[#2D2926] tracking-widest font-mono">
                      Generated Featured Graphic Staging
                    </h4>
                    {article.featured_image ? (
                      <div class="space-y-2">
                        <div class="relative rounded border border-[#E5E2D9] overflow-hidden h-44 bg-slate-50 shadow-sm">
                          <img
                            src={article.featured_image}
                            alt="Staged"
                            class="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p class="text-[10px] text-slate-400 text-center leading-normal italic font-serif">
                          Staged asset preview (Phase 0 Sandbox). Real Imagen generation triggers if an active Paid Model Key is configured.
                        </p>
                      </div>
                    ) : (
                      <div class="h-44 rounded border border-dashed border-[#E5E2D9] bg-[#F8F7F3]/30 flex flex-col items-center justify-center text-xs text-slate-400 font-serif italic">
                        <ImageIcon class="h-6 w-6 text-slate-300 mb-1" />
                        Featured asset not built yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Review */}
                {article.artifacts.image_quality_review && (
                  <div class="space-y-2">
                    <h4 class="text-[10px] font-bold uppercase text-[#2D2926] tracking-widest font-mono">
                      Staging Quality Review Audit
                    </h4>
                    <pre class="text-xs text-slate-700 bg-[#F8F7F3]/40 p-4 rounded border border-[#E5E2D9] whitespace-pre-wrap leading-relaxed">
                      {article.artifacts.image_quality_review}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {activeArtifactTab === "audits" && (
              <div class="space-y-6">
                {/* 1. Fact check report */}
                <div class="space-y-2">
                  <h4 class="text-xs font-bold uppercase text-[#2D2926] tracking-widest font-mono flex items-center gap-1.5">
                    <ShieldCheck class="h-4 w-4 text-emerald-500" />
                    Fact-Check Audit Report
                  </h4>
                  {article.artifacts.fact_check_report ? (
                    <div class="text-xs text-slate-700 bg-[#F8F7F3]/40 p-4 rounded border border-[#E5E2D9] whitespace-pre-wrap leading-relaxed font-sans">
                      {article.artifacts.fact_check_report}
                    </div>
                  ) : (
                    <div class="p-8 text-center bg-[#F8F7F3]/20 rounded border border-[#E5E2D9] text-slate-400 text-xs font-serif italic">
                      Fact-check audit pending article draft execution.
                    </div>
                  )}
                </div>

                {/* 2. Bias review report */}
                <div class="space-y-2">
                  <h4 class="text-xs font-bold uppercase text-[#2D2926] tracking-widest font-mono flex items-center gap-1.5">
                    <AlertTriangle class="h-4 w-4 text-[#E27D60]" />
                    Sensitivities & Bias Audit Report
                  </h4>
                  {article.artifacts.bias_check_report ? (
                    <div class="text-xs text-slate-700 bg-[#F8F7F3]/40 p-4 rounded border border-[#E5E2D9] whitespace-pre-wrap leading-relaxed font-sans">
                      {article.artifacts.bias_check_report}
                    </div>
                  ) : (
                    <div class="p-8 text-center bg-[#F8F7F3]/20 rounded border border-[#E5E2D9] text-slate-400 text-xs font-serif italic">
                      Guideline bias auditing triggers concurrently with draft generation.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
