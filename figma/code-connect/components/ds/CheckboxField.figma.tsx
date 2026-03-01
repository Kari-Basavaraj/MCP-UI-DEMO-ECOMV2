import figma from "@figma/code-connect"

// Checkbox Field — Design System Component
// Figma node: 9762:1441
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-1441", {
  example: () => (
    <label className="field-checkbox">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="checkbox-indicator" />
          <span className="checkbox-label">{label}</span>
        </label>
  ),
})
