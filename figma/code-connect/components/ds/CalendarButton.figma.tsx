import figma from "@figma/code-connect"

// Calendar Button — Design System Component
// Figma node: 4333:9359
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=4333-9359", {
  example: () => (
    <button
          className={`calendar-btn ${isSelected ? "calendar-selected" : ""} ${isToday ? "calendar-today" : ""}`}
          onClick={() => onSelectDate(date)}
        >
          {date.getDate()}
        </button>
  ),
})
