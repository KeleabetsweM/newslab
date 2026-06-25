import React from "react";
import { User, Globe, FileText, Sparkles, MessageCircleHeart, HelpCircle, ShieldAlert } from "lucide-react";
import { Journalist } from "../types";

interface JournalistProfileViewProps {
  journalist: Journalist | null;
}

export default function JournalistProfileView({ journalist }: JournalistProfileViewProps) {
  if (!journalist) {
    return (
      <div class="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
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
    <div class="space-y-6 font-sans">
      {/* Header */}
      <div class="pb-4 border-b border-[#E5E2D9]">
        <h2 class="text-3xl font-serif italic text-[#2D2926] tracking-tight">
          Active Journalist Profile
        </h2>
        <p class="text-xs text-slate-500 mt-1 font-serif italic">
          View Anika Patel’s creative persona, tone models, and 7-day sandbox targets.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Main Avatar & Role info */}
        <div class="bg-white p-6 rounded border border-[#E5E2D9] shadow-sm space-y-5 text-center">
          <div class="flex flex-col items-center space-y-3">
            <img
              src={journalist.avatar}
              alt={journalist.name}
              class="w-28 h-28 rounded-full object-cover border-4 border-[#E27D60] shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 class="text-lg font-serif font-bold text-[#2D2926]">{journalist.name}</h3>
              <p class="text-xs text-[#E27D60] font-bold uppercase tracking-wider font-mono mt-0.5">{journalist.role}</p>
            </div>
          </div>

          <div class="border-t border-[#E5E2D9] pt-4 space-y-3 text-left">
            <div class="flex items-center gap-2.5 text-xs">
              <Globe class="h-4 w-4 text-[#E27D60]" />
              <div>
                <span class="text-slate-400 block text-[9px] uppercase tracking-widest font-bold font-mono">Staged Portal</span>
                <a href={`http://${journalist.website}`} target="_blank" rel="noreferrer" class="text-[#2D2926] hover:underline font-bold font-serif italic">
                  {journalist.website}
                </a>
              </div>
            </div>

            <div class="flex items-center gap-2.5 text-xs">
              <FileText class="h-4 w-4 text-[#E27D60]" />
              <div>
                <span class="text-slate-400 block text-[9px] uppercase tracking-widest font-bold font-mono">Assigned Beats</span>
                <p class="text-[#2D2926] font-serif">
                  {journalist.sections.join(", ")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Personality Model and Tone Ratings */}
        <div class="lg:col-span-2 space-y-6">
          {/* Biography & Persona card */}
          <div class="bg-white p-6 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
              <Sparkles class="h-4 w-4 text-[#E27D60]" />
              Persona Blueprint: The Social Foodie
            </h3>
            
            <p class="text-sm text-[#2D2926] leading-relaxed font-serif">
              Anika is a passionate lifestyle and family editor based in Johannesburg. Her character focuses strictly on community events, local weekend markets, outdoor drives, family picnic spots, and rich street foods.
            </p>
            <div class="bg-[#E27D60]/5 p-4 rounded border border-[#E27D60]/20 space-y-1">
              <span class="font-bold text-[#E27D60] text-[10px] uppercase tracking-widest font-mono block">Signature Tone Guidelines</span>
              <p class="text-sm text-[#2D2926] italic font-serif">
                "{journalist.tone}"
              </p>
            </div>
          </div>

          {/* Tone Attributes Matrix */}
          <div class="bg-white p-6 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
              <MessageCircleHeart class="h-4 w-4 text-[#E27D60]" />
              Tone Model Metric Vector
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toneAttributes.map((attr) => (
                <div key={attr.label} class="p-4 border border-[#E5E2D9]/70 rounded bg-[#F8F7F3]/40 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#2D2926] font-mono uppercase tracking-wider">{attr.label}</span>
                    <span class="text-xs font-mono font-bold text-[#E27D60] bg-[#E27D60]/10 px-1.5 py-0.25 rounded border border-[#E27D60]/20">
                      {attr.rating}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 leading-tight font-serif italic">
                    {attr.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Zero Hallucination Constraints */}
          <div class="bg-rose-500/5 p-4 rounded border border-rose-500/10 flex gap-3 items-start">
            <ShieldAlert class="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div class="space-y-1 text-xs">
              <span class="font-bold text-rose-800 text-[10px] uppercase tracking-widest font-mono block">Zero Hallucination Mandates</span>
              <p class="text-slate-600 leading-relaxed font-serif">
                As a lifestyle editor under Phase 0, Anika must never invent attractions, dates, or vendor quotes. All claims must cross-reference verified digital listings. If references are unavailable, the system flags the article for physical source audits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
