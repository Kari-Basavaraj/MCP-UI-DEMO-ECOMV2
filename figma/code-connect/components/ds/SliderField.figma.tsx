import figma from "@figma/code-connect"

// Slider Field — Design System Component
// Figma node: 589:17676
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=589-17676", {
  example: () => (
    <div className="field">
          <label className="field-label" htmlFor="qty">Quantity: {value}</label>
          <input
            id="qty"
            type="range"
            className="field-slider"
            min={min}
            max={max}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </div>
  ),
})
