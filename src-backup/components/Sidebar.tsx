import React from "react";
import { 
  LayoutDashboard, 
  FileText, 
  BrainCircuit, 
  CheckSquare, 
  Settings, 
  Image as ImageIcon, 
  User, 
  Send 
} from "lucide-react";
import { Journalist } from "../types";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  journalist: Journalist | null;
  pendingApprovalsCount: number;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  journalist, 
  pendingApprovalsCount 
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "articles", label: "Articles", icon: FileText },
    { id: "images", label: "Images Portfolio", icon: ImageIcon },
    { id: "memory", label: "Journalist Memory", icon: BrainCircuit },
    { id: "approvals", label: "Approvals Queue", icon: CheckSquare, badge: pendingApprovalsCount },
    { id: "profile", label: "Journalist Profile", icon: User },
    { id: "settings", label: "Sandbox Settings", icon: Settings },
  ];

  return (
    <aside id="sidebar-container" class="w-64 bg-[#1A1A1A] text-white flex flex-col h-screen border-r border-white/10">
      {/* Brand Header */}
      <div class="p-6 border-b border-white/10">
        <h1 class="text-xl font-serif italic tracking-tight text-white">
          Newsroom Lab
        </h1>
        <p class="text-[10px] uppercase tracking-widest text-white/40 mt-1 font-mono">
          Phase 0 Sandbox v0.1
        </p>
      </div>

      {/* Navigation */}
      <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              class={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive 
                  ? "bg-white/10 text-white border-l-4 border-[#E27D60] pl-2 rounded-l-none" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div class="flex items-center gap-3">
                <Icon class={`h-4 w-4 ${isActive ? "text-[#E27D60]" : "text-white/60"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span class="bg-[#E27D60] text-white font-bold text-[10px] px-2 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Journalist Profile Indicator */}
      {journalist && (
        <div class="p-4 border-t border-white/10 bg-[#111111]">
          <div class="flex items-center gap-3">
            <img
              src={journalist.avatar}
              alt={journalist.name}
              class="w-10 h-10 rounded-full border-2 border-[#E27D60] object-cover"
              referrerPolicy="no-referrer"
            />
            <div class="flex-1 min-w-0">
              <h4 class="text-xs font-semibold text-white truncate">
                {journalist.name}
              </h4>
              <p class="text-[10px] text-white/40 truncate">
                {journalist.role}
              </p>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="h-1.5 w-1.5 rounded-full bg-[#E27D60] animate-pulse"></span>
                <span class="text-[9px] text-[#E27D60] font-mono">Sandbox Live</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
