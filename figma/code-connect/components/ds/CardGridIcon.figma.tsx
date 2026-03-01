import figma from "@figma/code-connect"

// Card Grid Icon — Design System Component
// Figma node: 348:13221
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-13221", {
  example: () => (
    <section className="card-grid card-grid-icon">
          <div className="grid grid-cols-3">
            {items.map(item => (
              <div key={item.id} className="card card-icon">
                <span className="card-icon-symbol">{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>
  ),
})
