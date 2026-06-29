import React from "react";
import { Image as ImageIcon, Briefcase, Eye, ShieldAlert, Sparkles } from "lucide-react";
import { Article } from "../types";
import SafeImage from "./SafeImage";

interface ImagesViewProps {
  articles: Article[];
  onSelectArticle: (articleId: string) => void;
}

export default function ImagesView({ articles, onSelectArticle }: ImagesViewProps) {
  // Extract articles that have featured images or image prompts
  const imageArticles = articles.filter(a => a.featured_image || a.artifacts.image_prompt);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E2D9]">
        <h2 className="text-3xl font-serif italic text-[#2D2926] tracking-tight">
          Creative Asset Portfolio
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-serif italic">
          Evaluate generated images alongside creative briefs, AI prompts, and editorial quality ratings.
        </p>
      </div>

      {imageArticles.length === 0 ? (
        <div className="bg-white rounded border border-[#E5E2D9] p-12 text-center text-slate-400 text-xs font-serif italic">
          No generated images available in the current sandbox scope yet. Draft articles to trigger visual generators!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {imageArticles.map((article) => (
            <div key={article.id} className="bg-white rounded border border-[#E5E2D9] shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              {/* Image box */}
              <div className="relative h-56 bg-[#F8F7F3]">
                {article.featured_image ? (
                  <SafeImage
                    src={article.featured_image}
                    alt={article.title}
                    fallbackLabel={article.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-serif italic">
                    <ImageIcon className="h-8 w-8 text-slate-300 mb-1" />
                    Pending Generation
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-[#1A1A1A]/85 backdrop-blur-sm text-white text-[10px] px-2.5 py-0.5 rounded font-mono">
                  Article: #{article.id}
                </div>
              </div>

              {/* Descriptions & Prompt panel */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-white">
                <div className="space-y-3">
                  <h3 className="text-base font-serif font-bold text-[#2D2926] leading-snug line-clamp-1">
                    {article.title}
                  </h3>

                  <div className="space-y-2 border-t border-[#E5E2D9] pt-3">
                    {/* Creative brief */}
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[#E27D60] font-mono block mb-0.5">Creative Direction Brief</span>
                      <p className="text-xs text-[#2D2926] line-clamp-2 font-serif italic">
                        {article.artifacts.image_brief || "Creative brief pending."}
                      </p>
                    </div>

                    {/* Image prompt */}
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 font-mono block mb-0.5">Generative AI Model Prompt</span>
                      <p className="text-[10px] font-mono text-slate-500 bg-[#F8F7F3] p-2 rounded border border-[#E5E2D9]/60 line-clamp-2">
                        {article.artifacts.image_prompt || "Model prompt pending."}
                      </p>
                    </div>

                    {/* Quality review */}
                    {article.artifacts.image_quality_review && (
                      <div className="bg-emerald-500/5 border border-emerald-500/15 p-2.5 rounded">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-800 font-mono block mb-1">Staging Quality Review</span>
                        <p className="text-[10px] text-slate-600 line-clamp-2 italic font-serif">
                          {article.artifacts.image_quality_review}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onSelectArticle(article.id)}
                  className="w-full py-2 bg-[#F8F7F3] hover:bg-[#F8F7F3]/80 border border-[#E5E2D9] rounded text-xs font-bold uppercase tracking-wider text-[#E27D60] hover:text-[#e27d60]/85 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Eye className="h-3.5 w-3.5 text-[#E27D60]" />
                  Inspect Article & Visuals
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
