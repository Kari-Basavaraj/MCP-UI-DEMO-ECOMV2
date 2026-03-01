import figma from "@figma/code-connect"

// Card Grid Image — Design System Component
// Figma node: 348:14431
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-14431", {
  example: () => (
    <section className="card-grid card-grid-image">
          <div className="grid grid-cols-3">
            {products.map(p => (
              <div key={p.id} className="card">
                <img className="card-image" src={p.imageUrl} alt={p.name} />
                <div className="card-body">
                  <h3>{p.name}</h3>
                  <span className="price">₹{p.price}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
  ),
})
