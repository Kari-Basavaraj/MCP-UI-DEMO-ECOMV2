import figma from "@figma/code-connect"

// Text Content Title — Design System Component
// Figma node: 2153:7838
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=2153-7838", {
  example: () => (
    <div className="text-content">
          <span className="overline">{overline}</span>
          <h1 className="title">{title}</h1>
        </div>
  ),
})
