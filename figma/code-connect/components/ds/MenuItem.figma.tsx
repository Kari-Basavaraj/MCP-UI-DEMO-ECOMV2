import figma from "@figma/code-connect"

// Menu Item — Design System Component
// Figma node: 9762:743
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-743", {
  example: () => (
    <button
          className={`menu-item ${isActive ? "menu-item-active" : ""}`}
          role="menuitem"
          onClick={() => onSelect(item)}
        >
          {item.icon && <span className="menu-item-icon">{item.icon}</span>}
          <span className="menu-item-label">{item.label}</span>
        </button>
  ),
})
