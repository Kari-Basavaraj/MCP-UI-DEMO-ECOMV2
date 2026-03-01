import figma from "@figma/code-connect"

// Radio Field — Design System Component
// Figma node: 9762:1412
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-1412", {
  example: () => (
    <fieldset className="field-radio-group">
          <legend className="field-label">{groupLabel}</legend>
          {options.map(opt => (
            <label key={opt.value} className="field-radio">
              <input
                type="radio"
                name={groupName}
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
              />
              <span className="radio-indicator" />
              <span className="radio-label">{opt.label}</span>
            </label>
          ))}
        </fieldset>
  ),
})
