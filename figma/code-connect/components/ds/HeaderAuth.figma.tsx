import figma from "@figma/code-connect"

// Header Auth — Design System Component
// Figma node: 18:9389
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=18-9389", {
  example: () => (
    <div className="header-auth">
          <button className="btn btn-ghost">Sign In</button>
          <button className="btn btn-primary">Sign Up</button>
        </div>
  ),
})
