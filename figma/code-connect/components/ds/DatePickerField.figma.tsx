import figma from "@figma/code-connect"

// Date Picker Field — Design System Component
// Figma node: 4300:6892
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=4300-6892", {
  example: () => (
    <div className="field">
          <label className="field-label">Select Date</label>
          <div className="date-picker">
            <div className="date-picker-header">
              <button className="btn btn-ghost" onClick={prevMonth}>←</button>
              <span>{monthLabel}</span>
              <button className="btn btn-ghost" onClick={nextMonth}>→</button>
            </div>
            <div className="date-picker-grid">
              {days.map(d => (
                <button
                  key={d}
                  className={`date-cell ${selected === d ? "date-selected" : ""}`}
                  onClick={() => setSelected(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
  ),
})
