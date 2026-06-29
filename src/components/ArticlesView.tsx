import React, { useState } from "react";
import { Search, SlidersHorizontal, Calendar, Eye, Globe, Sparkles } from "lucide-react";
import { Article, ArticleStatus } from "../types";
import SafeImage from "./SafeImage";

interface ArticlesViewProps {
  articles: Article[];
  onSelectArticle: (articleId: string) => void;
}

export default function ArticlesView({ articles, onSelectArticle }: ArticlesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statuses = [
    { value: "all", label: "All Stories" },
    { value: "idea", label: "Ideas" },
    { value: "researching", label: "Researching" },
    { value: "drafted", label: "Drafted" },
    { value: "awaiting_admin_review", label: "Awaiting Admin" },
    { value: "approved_sandbox", label: "Approved Sandbox" },
    { value: "rejected", label: "Rejected" },
  ];

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.topic.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: ArticleStatus) => {
    switch (status) {
      case "approved_sandbox":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "awaiting_admin_review":
        return "bg-[#E27D60]/10 text-[#E27D60] border-[#E27D60]/20";
      case "revision_requested":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "rejected":
        return "bg-rose-500/10 text-rose-700 border-rose-500/20";
      case "idea":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-indigo-500/10 text-indigo-700 border-indigo-500/20";
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E2D9]">
        <h2 className="text-3xl font-serif italic text-[#2D2926] tracking-tight">
          Sandbox Articles Library
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-serif italic">
          Browse, inspect, and transition articles through Anika's multi-tier editorial pipeline.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded border border-[#E5E2D9] shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search articles by headline or topic..."
            className="w-full text-xs bg-[#F8F7F3] border border-[#E5E2D9] rounded pl-9 pr-4 py-2.5 text-[#2D2926] placeholder-slate-400 focus:outline-none focus:border-[#E27D60] focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all duration-150 ${
                statusFilter === s.value
                  ? "bg-[#E27D60] text-white border-[#E27D60] shadow-sm"
                  : "bg-[#F8F7F3] text-slate-600 border-[#E5E2D9] hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white rounded border border-[#E5E2D9] p-12 text-center text-slate-400 text-xs font-serif italic">
          No articles match your selection. Create a new article idea or reset seeds in the settings.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded border border-[#E5E2D9] shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all group duration-200"
            >
              {/* Card Image */}
              <div className="relative h-44 bg-[#F8F7F3] overflow-hidden">
                <SafeImage
                  src={article.featured_image}
                  alt={article.title}
                  fallbackLabel={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                
                <span className={`absolute top-3 right-3 text-[9px] px-2.5 py-0.75 rounded font-mono border uppercase tracking-wider font-bold ${getStatusStyle(article.status)} bg-white/95 backdrop-blur-sm shadow-sm`}>
                  {article.status.replace("_", " ")}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-[#E27D60] bg-[#E27D60]/5 px-2 py-0.5 rounded border border-[#E27D60]/10 font-bold uppercase tracking-wider">
                    {article.topic.split(" ").slice(0, 3).join(" ")}
                  </span>
                  
                  <h3 className="text-base font-serif font-bold text-[#2D2926] leading-snug line-clamp-2 hover:text-[#E27D60] transition-colors">
                    {article.title}
                  </h3>
                  
                  <p className="text-xs text-slate-500 line-clamp-3 font-sans">
                    {article.artifacts.story_idea || "Pitch outline under construction."}
                  </p>
                </div>

                <div className="border-t border-[#E5E2D9] pt-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
                    <Calendar className="h-3 w-3 text-[#E27D60]" />
                    <span>{new Date(article.created_at).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => onSelectArticle(article.id)}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#E27D60] hover:text-[#e27d60]/80 transition-colors group-hover:translate-x-0.5 transform duration-150"
                  >
                    Inspect
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
