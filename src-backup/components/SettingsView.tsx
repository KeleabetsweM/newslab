import React, { useState, useEffect } from "react";
import { Settings, Save, RotateCcw, Bot, ShieldCheck, CheckCircle } from "lucide-react";

interface SettingsViewProps {
  onResetDatabase: () => Promise<void>;
  telegramConfig: {
    bot_token: string;
    chat_id: string;
    is_active: boolean;
  };
  onSaveTelegramConfig: (token: string, chatId: string, active: boolean) => Promise<void>;
}

export default function SettingsView({
  onResetDatabase,
  telegramConfig,
  onSaveTelegramConfig
}: SettingsViewProps) {
  const [token, setToken] = useState(telegramConfig.bot_token);
  const [chatId, setChatId] = useState(telegramConfig.chat_id);
  const [isActive, setIsActive] = useState(telegramConfig.is_active);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setToken(telegramConfig.bot_token);
    setChatId(telegramConfig.chat_id);
    setIsActive(telegramConfig.is_active);
  }, [telegramConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSaveTelegramConfig(token, chatId, isActive);
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset the private sandbox database? This will restore original articles and memories, and wipe custom logs.")) {
      setIsResetting(true);
      await onResetDatabase();
      setIsResetting(false);
    }
  };

  return (
    <div class="space-y-6 font-sans">
      {/* Header */}
      <div class="pb-4 border-b border-[#E5E2D9]">
        <h2 class="text-3xl font-serif italic text-[#2D2926] tracking-tight">
          Sandbox Laboratory Settings
        </h2>
        <p class="text-xs text-slate-500 mt-1 font-serif italic">
          Configure external Telegram channel bots and sandbox execution limits.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Telegram Parameters */}
        <div class="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} class="bg-white p-6 rounded border border-[#E5E2D9] shadow-sm space-y-5">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
              <Bot class="h-4.5 w-4.5 text-[#E27D60]" />
              Telegram Channel Integration
            </h3>

            <p class="text-xs text-slate-600 leading-relaxed font-serif">
              If active, newly created articles will be dispatched directly to your private Telegram channel with inline reaction buttons. Leave empty or unselected to run fully inside our embedded desktop mockup widget.
            </p>

            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="e.g. 123456789:ABCdefGhI..."
                    class="w-full text-xs bg-[#F8F7F3] border border-[#E5E2D9] rounded px-3 py-2.5 text-[#2D2926] placeholder-slate-400 focus:outline-none focus:border-[#E27D60] focus:bg-white transition-all"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                    Telegram Channel/Chat ID
                  </label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="e.g. -100123456789"
                    class="w-full text-xs bg-[#F8F7F3] border border-[#E5E2D9] rounded px-3 py-2.5 text-[#2D2926] placeholder-slate-400 focus:outline-none focus:border-[#E27D60] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  class="h-4 w-4 text-[#E27D60] border-[#E5E2D9] rounded focus:ring-[#E27D60]"
                />
                <label htmlFor="isActive" class="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Enable active Telegram messaging channel
                </label>
              </div>
            </div>

            <div class="flex items-center justify-between border-t border-[#E5E2D9] pt-4">
              {showSuccess ? (
                <span class="text-xs font-bold text-emerald-600 flex items-center gap-1 font-mono uppercase tracking-wider">
                  <CheckCircle class="h-4 w-4" />
                  Bot parameters saved!
                </span>
              ) : (
                <span></span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                class="flex items-center gap-1.5 px-4 py-2 bg-[#E27D60] hover:bg-[#E27D60]/90 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors disabled:opacity-50 shadow-sm"
              >
                <Save class="h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save Bot Parameters"}
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Admin utilities */}
        <div class="space-y-6">
          <div class="bg-white p-5 rounded border border-[#E5E2D9] shadow-sm space-y-4">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] font-mono flex items-center gap-1.5">
              <RotateCcw class="h-4 w-4 text-slate-500" />
              Staging Database Reset
            </h3>
            
            <p class="text-xs text-slate-500 leading-relaxed font-serif italic">
              Wipe all custom created drafts, memory candidates, and operation logs. Restores the database back to initial seed conditions.
            </p>

            <button
              onClick={handleReset}
              disabled={isResetting}
              class="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200/40 text-rose-700 rounded text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {isResetting ? "Rebuilding seeds..." : "Reset Sandbox Database"}
            </button>
          </div>

          <div class="bg-[#E27D60]/5 p-4 rounded border border-[#E27D60]/20 flex gap-3 items-start">
            <ShieldCheck class="h-5 w-5 text-[#E27D60] flex-shrink-0 mt-0.5" />
            <div class="space-y-1 text-xs">
              <span class="font-bold text-[#E27D60] text-[10px] uppercase tracking-widest font-mono block">Phase 0 Guidelines</span>
              <p class="text-slate-600 leading-relaxed font-serif">
                Phase 0 is dedicated entirely to learning and calibration. This system does not support public publishing to make sure you can securely inspect Anika Patel's output profiles without legal, brand, or public risk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
