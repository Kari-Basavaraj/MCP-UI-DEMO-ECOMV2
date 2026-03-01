import figma from "@figma/code-connect"

// Text Content Heading — Design System Component
// Figma node: 2153:7834
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=2153-7834", {
  example: () => (
    <div className="text-content">
          <h2 className="heading">{heading}</h2>
          <p className="subheading">{description}</p>
        </div>
  ),
})
