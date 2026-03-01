import figma from "@figma/code-connect"

// Page Product Results — Design System Component
// Figma node: 348:13517
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-13517", {
  example: () => (
    <section className="page-section page-results">
          <div className="results-header">
            <h2>{title}</h2>
            <span>{totalResults} results</span>
          </div>
          <div className="grid grid-cols-4">
            {products.map(p => (
              <div key={p.id} className="card">
                <img src={p.imageUrl} alt={p.name} />
                <h3>{p.name}</h3>
                <span>₹{p.price}</span>
              </div>
            ))}
          </div>
        </section>
  ),
})
