import figma from "@figma/code-connect"

// Card Grid Content List — Design System Component
// Figma node: 348:13407
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-13407", {
  example: () => (
    <section className="card-grid card-grid-content">
          <div className="section-header">
            <h2>{title}</h2>
          </div>
          <div className="grid grid-cols-3">
            {items.map(item => (
              <div key={item.id} className="card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>
  ),
})
