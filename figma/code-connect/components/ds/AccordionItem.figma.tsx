import figma from "@figma/code-connect"

// Accordion Item — Design System Component
// Figma node: 7753:4634
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=7753-4634", {
  example: () => (
    <details className="accordion-item" open={isOpen}>
          <summary className="accordion-header" onClick={() => toggle()}>
            <span>{title}</span>
            <span className="accordion-chevron" />
          </summary>
          <div className="accordion-content">{children}</div>
        </details>
  ),
})
