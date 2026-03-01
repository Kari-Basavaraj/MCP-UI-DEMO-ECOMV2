import figma from "@figma/code-connect"

// Navigation Button — Design System Component
// Figma node: 515:5459
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=515-5459", {
  example: () => (
    <button className="nav-btn nav-btn-default">
          <span className="nav-btn-icon">{icon}</span>
          <span className="nav-btn-label">{label}</span>
        </button>
  ),
})
