import figma from "@figma/code-connect"

// Footer — Design System Component
// Figma node: 321:11357
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=321-11357", {
  example: () => (
    <footer className="site-footer">
          <div className="footer-content">
            <div className="footer-brand">{brandName}</div>
            <nav className="footer-links">
              {links.map(link => (
                <a key={link.href} href={link.href}>{link.label}</a>
              ))}
            </nav>
          </div>
          <div className="footer-copyright">© {year} {brandName}</div>
        </footer>
  ),
})
