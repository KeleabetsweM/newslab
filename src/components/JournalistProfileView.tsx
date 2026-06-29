import React, { useState, useEffect } from "react";
import { 
  User, 
  Globe, 
  FileText, 
  Sparkles, 
  MessageCircleHeart, 
  ShieldAlert, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Compass, 
  Activity, 
  AlertCircle,
  FileCheck,
  Brain,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  Save,
  RotateCcw
} from "lucide-react";
import { Journalist, Article, JournalistMemory } from "../types";
import { supabase } from "../lib/supabaseBrowser";

interface JournalistProfileViewProps {
  journalists: Journalist[];
  articles: Article[];
  memories: JournalistMemory[];
  onRefresh: () => Promise<void>;
  onSelectArticle: (articleId: string) => void;
  onUpdateMemoryStatus: (memoryId: string, status: "approved" | "rejected") => Promise<void>;
}

export default function JournalistProfileView({
  journalists,
  articles,
  memories,
  onRefresh,
  onSelectArticle,
  onUpdateMemoryStatus
}: JournalistProfileViewProps) {
  const [selectedJId, setSelectedJId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"persona" | "articles" | "memory" | "sources">("persona");
  
  // Edit & Create States
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formSections, setFormSections] = useState("");
  const [formPersonality, setFormPersonality] = useState("");
  const [formTone, setFormTone] = useState("");
  const [formRules, setFormRules] = useState("");

  // Selected Journalist's sources state
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // Default selection
  useEffect(() => {
    if (journalists.length > 0 && !selectedJId) {
      setSelectedJId(journalists[0].id);
    }
  }, [journalists, selectedJId]);

  const selectedJournalist = journalists.find(j => j.id === selectedJId) || null;

  // Fetch sources for selected journalist's articles
  useEffect(() => {
    async function fetchSources() {
      if (!selectedJournalist) {
        setSources([]);
        return;
      }
      setSourcesLoading(true);
      try {
        const jArticles = articles.filter(a => a.journalist_id === selectedJournalist.id);
        const articleIds = jArticles.map(a => a.id);

        if (articleIds.length === 0) {
          setSources([]);
          return;
        }

        const { data, error } = await supabase
          .from("sources")
          .select("*")
          .in("article_id", articleIds);

        if (error) throw error;
        setSources(data || []);
      } catch (err) {
        console.error("Error fetching journalist sources:", err);
      } finally {
        setSourcesLoading(false);
      }
    }

    fetchSources();
  }, [selectedJournalist, articles]);

  // Calculate status dynamically
  const getJournalistStatus = (j: Journalist) => {
    if (j.is_active === false) return "Paused";
    
    const hasPendingArticles = articles.some(
      a => a.journalist_id === j.id && a.status === "awaiting_admin_review"
    );
    const hasPendingMemories = memories.some(
      m => m.journalist_id === j.id && m.status === "candidate"
    );

    if (hasPendingArticles || hasPendingMemories) {
      return "Needs Review";
    }
    return "Active";
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Needs Review":
        return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
      case "Paused":
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  // Filter roster list
  const filteredJournalists = journalists.filter(j => {
    const nameMatch = j.name.toLowerCase().includes(searchQuery.toLowerCase());
    const roleMatch = j.role.toLowerCase().includes(searchQuery.toLowerCase());
    const websiteMatch = j.website.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || roleMatch || websiteMatch;
  });

  // Toggle Active Status
  const handleToggleActive = async (j: Journalist) => {
    try {
      const nextActive = !j.is_active;
      const { error } = await supabase
        .from("journalists")
        .update({ is_active: nextActive })
        .eq("id", j.id);

      if (error) throw error;
      await onRefresh();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Delete Journalist
  const handleDeleteJournalist = async (j: Journalist) => {
    const jArticlesCount = articles.filter(a => a.journalist_id === j.id).length;
    if (jArticlesCount > 0) {
      alert(`Cannot delete ${j.name} because they have ${jArticlesCount} articles in the database. Archive or delete their articles first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the journalist profile for ${j.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("journalists")
        .delete()
        .eq("id", j.id);

      if (error) throw error;
      setSelectedJId(null);
      await onRefresh();
    } catch (err: any) {
      alert(`Failed to delete profile: ${err.message}`);
    }
  };

  // Open Edit Mode
  const startEdit = () => {
    if (!selectedJournalist) return;
    setFormId(selectedJournalist.id);
    setFormName(selectedJournalist.name);
    setFormRole(selectedJournalist.role);
    setFormWebsite(selectedJournalist.website);
    setFormSections((selectedJournalist.sections || []).join(", "));
    setFormPersonality(selectedJournalist.personality || "");
    setFormTone(selectedJournalist.tone || "");
    setFormRules((selectedJournalist.rules || []).join("\n"));
    setFormError(null);
    setIsEditing(true);
    setIsCreating(false);
  };

  // Open Create Mode
  const startCreate = () => {
    setFormId("");
    setFormName("");
    setFormRole("");
    setFormWebsite("www.whatsoninmzansi.co.za");
    setFormSections("");
    setFormPersonality("");
    setFormTone("");
    setFormRules("Do not invent events, dates, or venues.\nAlways verify facts with references.\nMaintain a respectful and local tone.");
    setFormError(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  // Save Journalist Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRole.trim() || !formWebsite.trim() || !formTone.trim() || !formPersonality.trim()) {
      setFormError("Please fill in all required fields (Name, Role, Website, Tone, Persona Biography).");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const sectionsArray = formSections
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    
    const rulesArray = formRules
      .split("\n")
      .map(r => r.trim())
      .filter(Boolean);

    // Auto generate ID if creating
    const finalId = isCreating 
      ? (formId.trim() || formName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) 
      : formId;

    if (!finalId) {
      setFormError("Invalid ID slug.");
      setIsSaving(false);
      return;
    }

    const payload = {
      id: finalId,
      name: formName.trim(),
      role: formRole.trim(),
      website: formWebsite.trim(),
      sections: sectionsArray,
      personality: formPersonality.trim(),
      tone: formTone.trim(),
      rules: rulesArray,
      is_active: true
    };

    try {
      if (isCreating) {
        // Check for duplicate ID
        const { data: existing } = await supabase
          .from("journalists")
          .select("id")
          .eq("id", finalId)
          .maybeSingle();
        
        if (existing) {
          throw new Error(`A journalist profile with the ID/Slug "${finalId}" already exists. Please choose a unique name or slug.`);
        }

        const { error } = await supabase
          .from("journalists")
          .insert(payload);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("journalists")
          .update(payload)
          .eq("id", finalId);

        if (error) throw error;
      }

      setIsEditing(false);
      setIsCreating(false);
      setSelectedJId(finalId);
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to save journalist profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Tone attributes progress bar model helper
  const getToneAttributes = (toneText: string) => {
    const text = toneText.toLowerCase();
    return [
      { label: "Enthusiastic", rating: text.includes("enthusiastic") || text.includes("energetic") ? "95%" : "70%", desc: "Drives community engagement with high-energy greetings" },
      { label: "Sensory-driven", rating: text.includes("sensory") || text.includes("colloquial") ? "90%" : "65%", desc: "Features descriptive local foods, scents, and outdoor scenes" },
      { label: "Friendly & Inclusive", rating: text.includes("friendly") || text.includes("conversational") ? "98%" : "75%", desc: "Speaks with warm welcoming words for readers" },
      { label: "Helpful / Analytical", rating: text.includes("helpful") || text.includes("analytical") || text.includes("clear") ? "92%" : "70%", desc: "Lists practical details, statistics, and location details" }
    ];
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="pb-4 border-b border-[#E5E2D9] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif italic text-[#2D2926] tracking-tight">
            Newsroom Staff & Journalists
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-serif italic">
            Monitor, assign, and customize AI journalists. Approve memories, view sources, and review their sandbox portfolios.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#E27D60] hover:bg-[#E27D60]/90 rounded-lg shadow-sm transition-colors self-start md:self-center"
        >
          <Plus className="h-4 w-4" />
          Add AI Journalist
        </button>
      </div>

      {/* Main Roster Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Roster List */}
        <div className="xl:col-span-4 bg-white border border-[#E5E2D9] rounded-xl flex flex-col h-[700px] overflow-hidden shadow-sm">
          {/* Search bar */}
          <div className="p-4 border-b border-[#E5E2D9] bg-[#FDFDFB]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff roster..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#E5E2D9] rounded-lg text-xs bg-[#F8F7F3] focus:outline-none focus:ring-1 focus:ring-[#E27D60] focus:border-[#E27D60]"
              />
            </div>
          </div>

          {/* Journalist cards list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E2D9]/60">
            {filteredJournalists.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-serif italic">
                No journalists found matching "{searchQuery}"
              </div>
            ) : (
              filteredJournalists.map((j) => {
                const isActive = selectedJId === j.id;
                const status = getJournalistStatus(j);
                const jArticles = articles.filter(a => a.journalist_id === j.id);
                const jMemories = memories.filter(m => m.journalist_id === j.id);
                const approvedMemCount = jMemories.filter(m => m.status === "approved").length;
                const pendingReviewCount = jArticles.filter(a => a.status === "awaiting_admin_review").length;

                return (
                  <div
                    key={j.id}
                    onClick={() => {
                      setSelectedJId(j.id);
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className={`p-4 cursor-pointer transition-all duration-150 relative ${
                      isActive 
                        ? "bg-[#E27D60]/5 border-l-4 border-[#E27D60]" 
                        : "hover:bg-slate-50 border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar / Initials */}
                      {j.avatar ? (
                        <img
                          src={j.avatar}
                          alt={j.name}
                          className="w-12 h-12 rounded-full object-cover border border-[#E5E2D9]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#E27D60] text-white flex items-center justify-center font-bold text-sm">
                          {j.name.split(" ").map(n => n[0]).join("")}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-[#2D2926] truncate">
                            {j.name}
                          </h4>
                          <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-full ${getStatusBadgeStyles(status)}`}>
                            {status}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 font-serif italic truncate">
                          {j.role}
                        </p>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <Globe className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{j.website}</span>
                        </div>

                        {/* Beats */}
                        {j.sections && j.sections.length > 0 && (
                          <p className="text-[9px] text-[#E27D60] font-medium truncate pt-0.5">
                            {j.sections.join(" · ")}
                          </p>
                        )}

                        {/* Stats Summary */}
                        <div className="flex items-center gap-3 pt-2 text-[9px] font-mono text-slate-400 border-t border-slate-100 mt-2">
                          <span>Docs: <strong className="text-slate-600">{jArticles.length}</strong></span>
                          <span>Memory: <strong className="text-slate-600">{approvedMemCount}</strong></span>
                          {pendingReviewCount > 0 && (
                            <span className="text-rose-600 bg-rose-50 px-1 py-0.25 rounded font-bold">
                              {pendingReviewCount} Needs Review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Journalist Detail View OR Forms */}
        <div className="xl:col-span-8 bg-white border border-[#E5E2D9] rounded-xl min-h-[700px] flex flex-col overflow-hidden shadow-sm">
          
          {/* Mode 1: Creating/Editing Form */}
          {isCreating || isEditing ? (
            <form onSubmit={handleSaveForm} className="flex-1 flex flex-col h-full">
              {/* Form Header */}
              <div className="p-6 border-b border-[#E5E2D9] bg-[#FDFDFB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#2D2926]">
                    {isCreating ? "Deploy New AI Journalist" : `Configure ${formName}`}
                  </h3>
                  <p className="text-xs text-slate-500 italic mt-0.5 font-serif">
                    Define the editor role, persona guidelines, assigned beats, and hallucination guardrails.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setIsCreating(false);
                      setFormError(null);
                    }}
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 rounded border border-[#E5E2D9] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-[#E27D60] hover:bg-[#E27D60]/90 disabled:opacity-50 rounded shadow-sm transition-colors"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>

              {/* Form Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {formError && (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <p>{formError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Slug / Unique ID */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-[#2D2926] mb-1">
                      Unique ID Slug {isCreating && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. oliver-mbatha"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, ""))}
                      disabled={isEditing}
                      className="w-full p-2.5 border border-[#E5E2D9] rounded-lg text-xs bg-[#F8F7F3] disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-[#E27D60]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-serif">
                      Used internally as a slug. Can only contain letters, numbers, and dashes. Read-only once deployed.
                    </p>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-[#2D2926] mb-1">
                      Journalist Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Oliver Mbatha"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full p-2.5 border border-[#E5E2D9] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#E27D60]"
                      required
                    />
                  </div>

                  {/* Role Title */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-[#2D2926] mb-1">
                      Editorial Role / Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sports & Entertainment Editor"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full p-2.5 border border-[#E5E2D9] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#E27D60]"
                      required
                    />
                  </div>

                  {/* Staged Portal Website */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-[#2D2926] mb-1">
                      Assigned Website / Domain <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. www.whatsoninmzansi.co.za"
                      value={formWebsite}
                      onChange={(e) => setFormWebsite(e.target.value)}
                      className="w-full p-2.5 border border-[#E5E2D9] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#E27D60]"
                      required
                    />
                  </div>
                </div>

                {/* Assigned Beats */}
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-[#2D2926] mb-1">
                    Assigned Beats / Sections (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Food & Weekend Markets, Family & Kids Days Out"
                    value={formSections}
                    onChange={(e) => setFormSections(e.target.value)}
                    className="w-full p-2.5 border border-[#E5E2D9] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#E27D60]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-serif">
                    Separate beats/categories with commas.
                  </p>
                </div>

                {/* Biography / Persona */}
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-[#2D2926] mb-1">
                    Persona Blueprint / Biography <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    placeholder="Describe their background, focus, and what kind of topics they cover..."
                    value={formPersonality}
                    onChange={(e) => setFormPersonality(e.target.value)}
                    rows={4}
                    className="w-full p-2.5 border border-[#E5E2D9] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#E27D60]"
                    required
                  />
                </div>

                {/* Tone Description */}
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-[#2D2926] mb-1">
                    Signature Tone Guidelines <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    placeholder="Describe the tone (e.g. Friendly, inclusive, highly enthusiastic, sensory-driven, helpful, and warm.)"
                    value={formTone}
                    onChange={(e) => setFormTone(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 border border-[#E5E2D9] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#E27D60]"
                    required
                  />
                </div>

                {/* Zero Hallucination Rules */}
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-[#2D2926] mb-1">
                    Zero Hallucination Mandates / Rules (one per line)
                  </label>
                  <textarea
                    placeholder="Do not invent events or dates.&#10;Verify all location markers.&#10;Cite references explicitly."
                    value={formRules}
                    onChange={(e) => setFormRules(e.target.value)}
                    rows={5}
                    className="w-full p-2.5 border border-[#E5E2D9] rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#E27D60]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-serif">
                    Write each rule on a new line. These guide the journalist's content generation.
                  </p>
                </div>
              </div>
            </form>
          ) : selectedJournalist ? (
            /* Mode 2: Detailed View Panel */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Journalist Detail Header */}
              <div className="p-6 border-b border-[#E5E2D9] bg-[#FDFDFB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {selectedJournalist.avatar ? (
                    <img
                      src={selectedJournalist.avatar}
                      alt={selectedJournalist.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#E27D60]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#E27D60] text-white flex items-center justify-center font-bold text-xl border-2 border-[#E27D60]">
                      {selectedJournalist.name.split(" ").map(n => n[0]).join("")}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-serif font-bold text-[#2D2926]">
                        {selectedJournalist.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-full ${getStatusBadgeStyles(getJournalistStatus(selectedJournalist))}`}>
                        {getJournalistStatus(selectedJournalist)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-[#E27D60] font-bold uppercase tracking-wider font-mono mt-0.5">
                      {selectedJournalist.role}
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <a 
                        href={`http://${selectedJournalist.website}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-1 hover:underline text-[#2D2926] font-medium"
                      >
                        <Globe className="h-3.5 w-3.5 text-[#E27D60]" />
                        {selectedJournalist.website}
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Status Toggle */}
                  <button
                    onClick={() => handleToggleActive(selectedJournalist)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border rounded transition-colors ${
                      selectedJournalist.is_active
                        ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-[#E5E2D9]"
                        : "bg-[#E27D60]/10 hover:bg-[#E27D60]/15 text-[#E27D60] border-[#E27D60]/20"
                    }`}
                    title={selectedJournalist.is_active ? "Pause journalist pipeline" : "Activate journalist pipeline"}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    {selectedJournalist.is_active ? "Pause Agent" : "Resume Agent"}
                  </button>

                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white border border-[#E5E2D9] hover:bg-slate-50 text-slate-700 rounded transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                    Configure
                  </button>

                  {/* Disable delete for seeded Admin Patel */}
                  {selectedJournalist.id !== "anika-patel" && (
                    <button
                      onClick={() => handleDeleteJournalist(selectedJournalist)}
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      Decommission
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="px-6 border-b border-[#E5E2D9] bg-[#FDFDFB] flex gap-4">
                {(["persona", "articles", "memory", "sources"] as const).map((tab) => {
                  const label = tab === "persona" 
                    ? "Persona & Tone" 
                    : tab === "articles" 
                      ? `Articles (${articles.filter(a => a.journalist_id === selectedJournalist.id).length})` 
                      : tab === "memory"
                        ? `Memory (${memories.filter(m => m.journalist_id === selectedJournalist.id).length})`
                        : `Connected Sources (${sources.length})`;
                  
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all duration-150 ${
                        activeTab === tab
                          ? "border-[#E27D60] text-[#E27D60]"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Tab Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* TAB 1: Persona & Tone */}
                {activeTab === "persona" && (
                  <div className="space-y-6">
                    {/* Bio Persona Card */}
                    <div className="bg-white p-6 rounded-lg border border-[#E5E2D9] shadow-sm space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#E27D60]" />
                        Persona Blueprint
                      </h3>
                      
                      <p className="text-sm text-[#2D2926] leading-relaxed font-serif">
                        {selectedJournalist.personality || "No personality description set for this profile."}
                      </p>

                      <div className="bg-[#E27D60]/5 p-4 rounded border border-[#E27D60]/20 space-y-1">
                        <span className="font-bold text-[#E27D60] text-[10px] uppercase tracking-widest font-mono block">Signature Tone Guidelines</span>
                        <p className="text-sm text-[#2D2926] italic font-serif">
                          "{selectedJournalist.tone}"
                        </p>
                      </div>
                    </div>

                    {/* Tone Attribute Sliders */}
                    <div className="bg-white p-6 rounded-lg border border-[#E5E2D9] shadow-sm space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
                        <MessageCircleHeart className="h-4 w-4 text-[#E27D60]" />
                        Tone Model Metric Vector
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getToneAttributes(selectedJournalist.tone).map((attr) => (
                          <div key={attr.label} className="p-4 border border-[#E5E2D9]/70 rounded-lg bg-[#F8F7F3]/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#2D2926] font-mono uppercase tracking-wider">{attr.label}</span>
                              <span className="text-xs font-mono font-bold text-[#E27D60] bg-[#E27D60]/10 px-1.5 py-0.25 rounded border border-[#E27D60]/20">
                                {attr.rating}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div 
                                className="bg-[#E27D60] h-1.5 rounded-full" 
                                style={{ width: attr.rating }}
                              ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight font-serif italic pt-0.5">
                              {attr.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rules & Mandates */}
                    <div className="bg-rose-500/5 p-5 rounded-lg border border-rose-500/10 space-y-3">
                      <h4 className="font-bold text-rose-800 text-[10px] uppercase tracking-widest font-mono flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-rose-500" />
                        Zero Hallucination Mandates ({selectedJournalist.rules?.length || 0})
                      </h4>
                      <p className="text-slate-600 text-xs font-serif leading-relaxed">
                        These hardcoded instructions constrain the journalist pipeline to prevent generated fabrications.
                      </p>
                      
                      {selectedJournalist.rules && selectedJournalist.rules.length > 0 ? (
                        <ul className="space-y-1.5 text-xs text-[#2D2926] font-serif list-disc pl-5">
                          {selectedJournalist.rules.map((rule, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {rule}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No custom rules set.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: Articles List */}
                {activeTab === "articles" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold font-serif text-[#2D2926] pb-2 border-b border-[#E5E2D9]">
                      Articles Staged & Created
                    </h3>

                    {articles.filter(a => a.journalist_id === selectedJournalist.id).length === 0 ? (
                      <div className="bg-white rounded-lg border border-[#E5E2D9] p-8 text-center text-slate-400 text-xs font-serif italic">
                        This journalist has not created or proposed any articles yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#E5E2D9] font-mono text-[9px] uppercase tracking-wider text-slate-400">
                              <th className="py-2.5 font-bold">Article Details</th>
                              <th className="py-2.5 font-bold">Category</th>
                              <th className="py-2.5 font-bold">Status</th>
                              <th className="py-2.5 font-bold">Created At</th>
                              <th className="py-2.5 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {articles
                              .filter(a => a.journalist_id === selectedJournalist.id)
                              .map((art) => (
                                <tr key={art.id} className="hover:bg-slate-50">
                                  <td className="py-3 pr-4">
                                    <div className="font-serif font-bold text-[#2D2926] leading-tight">
                                      {art.title}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                                      Topic: {art.topic}
                                    </div>
                                  </td>
                                  <td className="py-3 text-slate-500 font-mono text-[10px]">
                                    {art.artifacts?.article_outline ? "Beats Outlined" : "Pitch Stage"}
                                  </td>
                                  <td className="py-3">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                                      art.status === "approved_sandbox"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : art.status === "awaiting_admin_review"
                                          ? "bg-rose-50 text-rose-700 border-rose-100"
                                          : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}>
                                      {art.status.replace("_", " ")}
                                    </span>
                                  </td>
                                  <td className="py-3 text-slate-400 font-mono text-[10px]">
                                    {new Date(art.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => onSelectArticle(art.id)}
                                      className="inline-flex items-center gap-0.5 text-[#E27D60] font-bold hover:underline"
                                    >
                                      Review
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Memory Vault */}
                {activeTab === "memory" && (
                  <div className="space-y-6">
                    {/* Candidate Pipeline */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-[#2D2926] flex items-center gap-1.5 pb-2 border-b border-[#E5E2D9]">
                        <Brain className="h-4.5 w-4.5 text-[#E27D60]" />
                        Memory Candidate Pipeline
                      </h3>
                      
                      {memories.filter(m => m.journalist_id === selectedJournalist.id && m.status === "candidate").length === 0 ? (
                        <div className="bg-white rounded-lg border border-[#E5E2D9] p-6 text-center text-slate-400 text-xs font-serif italic">
                          No pending memory candidates. Style lessons are extracted automatically as they draft articles.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {memories
                            .filter(m => m.journalist_id === selectedJournalist.id && m.status === "candidate")
                            .map((mem) => (
                              <div key={mem.id} className="bg-white border border-[#E5E2D9] p-4 rounded-lg space-y-3 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-200/60 uppercase tracking-widest">
                                    {mem.memory_type.replace("_", " ")}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Confidence: {Math.round(mem.confidence_score * 100)}%
                                  </span>
                                </div>
                                <p className="text-xs text-[#2D2926] leading-relaxed font-serif font-medium">
                                  {mem.memory_content}
                                </p>
                                <div className="flex gap-2 justify-end border-t border-[#E5E2D9] pt-3">
                                  <button
                                    onClick={() => onUpdateMemoryStatus(mem.id, "rejected")}
                                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => onUpdateMemoryStatus(mem.id, "approved")}
                                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white bg-[#E27D60] hover:bg-[#E27D60]/90 rounded transition-colors shadow-sm"
                                  >
                                    <Check className="h-3 w-3" />
                                    Approve
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Approved Memory Vault */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-[#2D2926] flex items-center gap-1.5 pb-2 border-b border-[#E5E2D9]">
                        <FileCheck className="h-4.5 w-4.5 text-[#E27D60]" />
                        Active Memory Vault
                      </h3>

                      {memories.filter(m => m.journalist_id === selectedJournalist.id && m.status === "approved").length === 0 ? (
                        <div className="bg-[#F8F7F3] rounded-lg border border-[#E5E2D9] p-6 text-center text-slate-400 text-xs font-serif italic">
                          No active approved memories yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {memories
                            .filter(m => m.journalist_id === selectedJournalist.id && m.status === "approved")
                            .map((mem) => (
                              <div key={mem.id} className="bg-[#F8F7F3]/70 border border-[#E5E2D9] p-4 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.25 rounded border bg-emerald-50 text-emerald-800 border-emerald-200/60 uppercase tracking-widest">
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
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: Connected Sources */}
                {activeTab === "sources" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold font-serif text-[#2D2926] pb-2 border-b border-[#E5E2D9]">
                      Source & Reference Directory
                    </h3>
                    
                    <p className="text-xs text-slate-500 font-serif leading-relaxed mb-4">
                      The list below aggregates every research source extracted from the articles authored by this journalist profile.
                    </p>

                    {sourcesLoading ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-serif italic">
                        Loading references...
                      </div>
                    ) : sources.length === 0 ? (
                      <div className="bg-white rounded-lg border border-[#E5E2D9] p-8 text-center text-slate-400 text-xs font-serif italic">
                        No external sources are currently linked to this journalist's articles.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {sources.map((src) => {
                          const associatedArticle = articles.find(a => a.id === src.article_id);
                          const reliability = parseFloat(src.reliability_score || "0");
                          const isVerified = reliability >= 0.8;

                          return (
                            <div key={src.id} className="bg-white border border-[#E5E2D9] p-4 rounded-lg shadow-sm hover:shadow-md transition-all space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <h4 className="text-xs font-serif font-bold text-[#2D2926] flex items-center gap-1">
                                  <LinkIcon className="h-3.5 w-3.5 text-[#E27D60]" />
                                  {src.title}
                                </h4>

                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 text-[8px] font-bold font-mono border rounded uppercase tracking-wider ${
                                    isVerified 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}>
                                    {isVerified ? `Verified (Conf: ${reliability * 100}%)` : `Review (Conf: ${reliability * 100}%)`}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-[#2D2926] font-serif bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed italic">
                                "{src.notes || "No context notes provided for this source reference."}"
                              </p>

                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                                <span>
                                  Article: <strong className="text-slate-600">{associatedArticle?.title || "Draft"}</strong>
                                </span>
                                <a 
                                  href={src.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[#E27D60] font-bold hover:underline flex items-center gap-0.5"
                                >
                                  Visit Reference URL
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Blank state (no journalists exist) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs font-serif italic">
              No journalist profiles found. Click "Add AI Journalist" above to get started.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
