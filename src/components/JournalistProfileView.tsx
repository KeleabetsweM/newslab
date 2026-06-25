import React from "react";
import { User, Globe, FileText, Sparkles, MessageCircleHeart, HelpCircle, ShieldAlert } from "lucide-react";
import { Journalist } from "../types";

interface JournalistProfileViewProps {
  journalist: Journalist | null;
}

export default function JournalistProfileView({ journalist }: JournalistProfileViewProps) {
  if (!journalist) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
        No journalist profiles configured in the sandbox.
      </div>
    );
  }

  const toneAttributes = [
    { label: "Enthusiastic", rating: "95%", desc: "Drives community engagement with high-energy greetings" },
    { label: "Sensory-driven", rating: "90%", desc: "Features descriptive local foods, scents, and outdoor scenes" },
    { label: "Friendly & Inclusive", rating: "98%", desc: "Speaks with warm welcoming words for multigenerational families" },
    { label: "Helpful", rating: "88%", desc: "Always lists practical details (parking, kid safety, location hours)" }
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E2D9]">
        <h2 className="text-3xl font-serif italic text-[#2D2926] tracking-tight">
          Active Journalist Profile
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-serif italic">
          View Anika Patel’s creative persona, tone models, and 7-day sandbox targets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Main Avatar & Role info */}
        <div className="bg-white p-6 rounded border border-[#E5E2D9] shadow-sm space-y-5 text-center">
          <div className="flex flex-col items-center space-y-3">
            <img
              src={journalist.avatar}
              alt={journalist.name}
              className="w-28 h-28 rounded-full object-cover border-4 border-[#E27D60] shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2D2926]">{journalist.name}</h3>
              <p className="text-xs text-[#E27D60] font-bold uppercase tracking-wider font-mono mt-0.5">{journalist.role}</p>
            </div>
          </div>

          <div className="border-t border-[#E5E2D9] pt-4 space-y-3 text-left">
            <div className="flex items-center gap-2.5 text-xs">
              <Globe className="h-4 w-4 text-[#E27D60]" />
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-widest font-bold font-mono">Staged Portal</span>
                <a href={`http://${journalist.website}`} target="_blank" rel="noreferrer" className="text-[#2D2926] hover:underline font-bold font-serif italic">
                  {journalist.website}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <FileText className="h-4 w-4 text-[#E27D60]" />
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-widest font-bold font-mono">Assigned Beats</span>
                <p className="text-[#2D2926] font-serif">
                  {journalist.sections.join(", ")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Personality Model and Tone Ratings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Biography & Persona card */}
          <div className="bg-white p-6 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#E27D60]" />
              Persona Blueprint: The Social Foodie
            </h3>
            
            <p className="text-sm text-[#2D2926] leading-relaxed font-serif">
              Anika is a passionate lifestyle and family editor based in Johannesburg. Her character focuses strictly on community events, local weekend markets, outdoor drives, family picnic spots, and rich street foods.
            </p>
            <div className="bg-[#E27D60]/5 p-4 rounded border border-[#E27D60]/20 space-y-1">
              <span className="font-bold text-[#E27D60] text-[10px] uppercase tracking-widest font-mono block">Signature Tone Guidelines</span>
              <p className="text-sm text-[#2D2926] italic font-serif">
                "{journalist.tone}"
              </p>
            </div>
          </div>

          {/* Tone Attributes Matrix */}
          <div className="bg-white p-6 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
              <MessageCircleHeart className="h-4 w-4 text-[#E27D60]" />
              Tone Model Metric Vector
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toneAttributes.map((attr) => (
                <div key={attr.label} className="p-4 border border-[#E5E2D9]/70 rounded bg-[#F8F7F3]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D2926] font-mono uppercase tracking-wider">{attr.label}</span>
                    <span className="text-xs font-mono font-bold text-[#E27D60] bg-[#E27D60]/10 px-1.5 py-0.25 rounded border border-[#E27D60]/20">
                      {attr.rating}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-tight font-serif italic">
                    {attr.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Zero Hallucination Constraints */}
          <div className="bg-rose-500/5 p-4 rounded border border-rose-500/10 flex gap-3 items-start">
            <ShieldAlert className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-rose-800 text-[10px] uppercase tracking-widest font-mono block">Zero Hallucination Mandates</span>
              <p className="text-slate-600 leading-relaxed font-serif">
                As a lifestyle editor under Phase 0, Anika must never invent attractions, dates, or vendor quotes. All claims must cross-reference verified digital listings. If references are unavailable, the system flags the article for physical source audits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
