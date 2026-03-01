import figma from "@figma/code-connect"

// Textarea Field — Design System Component
// Figma node: 9762:3088
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-3088", {
  example: () => (
    <div className="field">
          <label className="field-label" htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            className="field-textarea"
            rows={4}
            placeholder="Enter notes..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
  ),
})
