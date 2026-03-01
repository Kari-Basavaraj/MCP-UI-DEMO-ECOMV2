import figma from "@figma/code-connect"

// Switch Field — Design System Component
// Figma node: 9762:1902
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-1902", {
  example: () => (
    <label className="field-switch">
          <input
            type="checkbox"
            role="switch"
            checked={isOn}
            onChange={(e) => setIsOn(e.target.checked)}
          />
          <span className="switch-track">
            <span className="switch-thumb" />
          </span>
          <span className="switch-label">{label}</span>
        </label>
  ),
})
