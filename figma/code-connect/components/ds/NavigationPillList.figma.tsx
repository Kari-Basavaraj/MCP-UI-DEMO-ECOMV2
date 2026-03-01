import figma from "@figma/code-connect"

// Navigation Pill List — Design System Component
// Figma node: 2194:14984
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=2194-14984", {
  example: () => (
    <div className="nav-pill-list">
          {categories.map(cat => (
            <button
              key={cat}
              className={`nav-pill ${activeCategory === cat ? "nav-pill-active" : ""}`}
              onClick={() => onFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
  ),
})
