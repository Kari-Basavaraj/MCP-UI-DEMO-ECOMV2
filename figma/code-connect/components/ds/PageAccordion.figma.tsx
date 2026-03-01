import figma from "@figma/code-connect"

// Page Accordion — Design System Component
// Figma node: 348:13173
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-13173", {
  example: () => (
    <section className="page-section page-accordion">
          <h2>{title}</h2>
          {items.map(item => (
            <details key={item.id} className="accordion-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
  ),
})
