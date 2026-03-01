import figma from "@figma/code-connect"

// Date Input Field — Design System Component
// Figma node: 4302:7505
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=4302-7505", {
  example: () => (
    <div className="field">
          <label className="field-label" htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            className="field-input field-date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
  ),
})
