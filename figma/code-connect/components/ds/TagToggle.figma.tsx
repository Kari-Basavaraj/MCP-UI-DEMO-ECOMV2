import figma from "@figma/code-connect"

// Tag Toggle — Design System Component
// Figma node: 157:10316
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=157-10316", {
  example: () => (
    <button
          className={`tag tag-toggle ${isActive ? "tag-active" : ""}`}
          onClick={() => onToggle(category)}
        >
          {category}
        </button>
  ),
})
