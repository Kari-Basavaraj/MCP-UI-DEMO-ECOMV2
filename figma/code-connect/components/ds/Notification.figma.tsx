import figma from "@figma/code-connect"

// Notification — Design System Component
// Figma node: 124:8256
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=124-8256", {
  example: () => (
    <div className={`notification notification-${type}`} role="alert">
          <span className="notification-icon">{icon}</span>
          <span className="notification-message">{message}</span>
          <button className="notification-close" aria-label="Dismiss">×</button>
        </div>
  ),
})
