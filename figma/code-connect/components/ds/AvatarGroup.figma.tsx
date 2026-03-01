import figma from "@figma/code-connect"

// Avatar Group — Design System Component
// Figma node: 56:15608
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=56-15608", {
  example: () => (
    <div className="avatar-group">
          {users.slice(0, 3).map(u => (
            <div key={u.id} className="avatar avatar-sm">
              <img src={u.avatarUrl} alt={u.name} />
            </div>
          ))}
          {users.length > 3 && (
            <div className="avatar avatar-sm avatar-overflow">
              +{users.length - 3}
            </div>
          )}
        </div>
  ),
})
