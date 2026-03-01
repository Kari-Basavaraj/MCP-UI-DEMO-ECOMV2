import figma from "@figma/code-connect"

// Header — Design System Component
// Figma node: 2287:22651
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=2287-22651", {
  example: () => (
    <header className="site-header">
          <div className="header-logo">{logoText}</div>
          <nav className="header-nav">
            {navItems.map(item => (
              <a key={item.href} href={item.href} className="header-link">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <button className="btn btn-ghost btn-icon" aria-label="Cart">🛒</button>
          </div>
        </header>
  ),
})
