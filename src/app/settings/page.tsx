export default function SettingsPage() {
  return (
    <>
      <div className="header"><div><div className="kicker">Configuration</div><h1>Settings</h1><p>Phase 0 environment variables and safety switches.</p></div></div>
      <div className="card">
        <h2>Required variables</h2>
        <pre>{`NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS
AI_PROVIDER=openai | gemini | mock
OPENAI_API_KEY or GEMINI_API_KEY
IMAGE_PROVIDER=placeholder | openai
TELEGRAM_BOT_TOKEN
TELEGRAM_ADMIN_CHAT_ID
PUBLIC_BASE_URL`}</pre>
        <p className="small">Publishing to WordPress is deliberately disabled in Phase 0.</p>
      </div>
    </>
  );
}
