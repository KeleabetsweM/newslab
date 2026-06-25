const links = [
  ['/', 'Dashboard'],
  ['/articles', 'Articles'],
  ['/images', 'Images'],
  ['/memory', 'Memory'],
  ['/approvals', 'Approvals'],
  ['/journalist', 'Journalist'],
  ['/settings', 'Settings']
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">NL</div>
        <div>
          Newsroom Lab
          <div className="small">Phase 0 Sandbox</div>
        </div>
      </div>
      <nav className="nav">
        {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        <a href="/login">Login</a>
      </nav>
      <div className="hr" />
      <p className="small">Private monitoring lab. No WordPress publishing is enabled in Phase 0.</p>
    </aside>
  );
}
