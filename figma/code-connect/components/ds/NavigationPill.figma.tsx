import figma from "@figma/code-connect"

// Navigation Pill — Design System Component
// Figma node: 7768:19970
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=7768-19970", {
  example: () => (
    <button className={`nav-pill ${isActive ? "nav-pill-active" : ""}`}>
          {label}
        </button>
  ),
})
