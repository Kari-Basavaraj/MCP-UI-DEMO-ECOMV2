import figma from "@figma/code-connect"

// Button — Design System Component
// Figma node: 4185:3778
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=4185-3778", {
  example: () => (
    <button
          className="btn btn-primary"
          data-action="add-to-cart"
        >
          Add to Cart
        </button>
  ),
})
