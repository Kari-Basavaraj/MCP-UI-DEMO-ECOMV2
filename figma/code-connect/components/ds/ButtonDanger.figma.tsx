import figma from "@figma/code-connect"

// Button Danger — Design System Component
// Figma node: 185:852
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=185-852", {
  example: () => (
    <button className="btn btn-danger" data-action="remove">
          Remove
        </button>
  ),
})
