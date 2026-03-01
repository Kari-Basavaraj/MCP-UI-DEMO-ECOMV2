import figma from "@figma/code-connect"

// Text Link List — Design System Component
// Figma node: 322:9321
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=322-9321", {
  example: () => (
    <ul className="link-list">
          {links.map(link => (
            <li key={link.href}>
              <a href={link.href} className="text-link">{link.label}</a>
            </li>
          ))}
        </ul>
  ),
})
