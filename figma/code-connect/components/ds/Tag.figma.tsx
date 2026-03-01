import figma from "@figma/code-connect"

// Tag — Design System Component
// Figma node: 56:8830
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=56-8830", {
  example: () => (
    <span className="tag tag-default">{category}</span>
  ),
})
