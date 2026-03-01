import figma from "@figma/code-connect"

// Navigation Button List — Design System Component
// Figma node: 524:503
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=524-503", {
  example: () => (
    <nav className="nav-btn-list">
          {items.map(item => (
            <button key={item.id} className="nav-btn nav-btn-default">
              {item.label}
            </button>
          ))}
        </nav>
  ),
})
