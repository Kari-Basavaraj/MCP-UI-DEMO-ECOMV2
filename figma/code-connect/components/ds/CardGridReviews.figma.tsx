import figma from "@figma/code-connect"

// Card Grid Reviews — Design System Component
// Figma node: 348:15213
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15213", {
  example: () => (
    <section className="card-grid card-grid-reviews">
          <div className="grid grid-cols-2">
            {reviews.map(r => (
              <div key={r.id} className="card review-card">
                <div className="review-stars">{"★".repeat(r.rating)}</div>
                <p>{r.text}</p>
                <span className="review-author">{r.author}</span>
              </div>
            ))}
          </div>
        </section>
  ),
})
