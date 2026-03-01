import figma from "@figma/code-connect"

// Text List — Design System Component
// Figma node: 480:6149
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=480-6149", {
  example: () => (
    <ul className="text-list">
          {items.map(item => (
            <li key={item} className="text-list-item">{item}</li>
          ))}
        </ul>
  ),
})
