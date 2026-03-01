import figma from "@figma/code-connect"

// Input Field — Design System Component
// Figma node: 2136:2263
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=2136-2263", {
  example: () => (
    <div className="field">
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="field-input"
            placeholder="Enter email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {error && <span className="field-error">{error}</span>}
        </div>
  ),
})
