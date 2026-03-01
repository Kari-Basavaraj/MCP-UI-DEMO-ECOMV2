import figma from "@figma/code-connect"

// Avatar — Design System Component
// Figma node: 9762:1103
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-1103", {
  example: () => (
    <div className="avatar avatar-md">
          <img src={user.avatarUrl} alt={user.name} />
        </div>
  ),
})
