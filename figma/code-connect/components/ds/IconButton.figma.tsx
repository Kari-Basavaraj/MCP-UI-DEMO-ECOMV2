import figma from "@figma/code-connect"

// Icon Button — Design System Component
// Figma node: 11:11508
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=11-11508", {
  example: () => (
    <button className="btn btn-ghost btn-icon" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
  ),
})
