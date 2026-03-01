import figma from "@figma/code-connect"

// Button Group — Design System Component
// Figma node: 2072:9432
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=2072-9432", {
  example: () => (
    <div className="btn-group">
          <button className="btn btn-primary">Add to Cart</button>
          <button className="btn btn-secondary">Details</button>
        </div>
  ),
})
