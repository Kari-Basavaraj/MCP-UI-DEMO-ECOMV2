import figma from "@figma/code-connect"

// Tooltip — Design System Component
// Figma node: 315:32700
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=315-32700", {
  example: () => (
    <div className="tooltip-wrapper">
          <button className="btn btn-ghost" aria-describedby="tooltip-1">
            Info
          </button>
          <div className="tooltip" id="tooltip-1" role="tooltip">
            {tooltipText}
          </div>
        </div>
  ),
})
