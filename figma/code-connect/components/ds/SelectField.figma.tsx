import figma from "@figma/code-connect"

// Select Field — Design System Component
// Figma node: 2136:2336
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=2136-2336", {
  example: () => (
    <div className="field">
          <label className="field-label" htmlFor="size">Size</label>
          <select
            id="size"
            className="field-select"
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
          >
            <option value="">Select size</option>
            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
  ),
})
