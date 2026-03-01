import figma from "@figma/code-connect"

// Dialog Body — Design System Component
// Figma node: 9762:696
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-696", {
  example: () => (
    <div className="dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog">
            <div className="dialog-header">
              <h2>{title}</h2>
              <button className="btn btn-ghost btn-icon" onClick={onClose}>×</button>
            </div>
            <div className="dialog-body">{children}</div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={onConfirm}>Confirm</button>
            </div>
          </div>
        </div>
  ),
})
