import figma from "@figma/code-connect"

// Card Grid Testimonials — Design System Component
// Figma node: 348:13347
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-13347", {
  example: () => (
    <section className="card-grid card-grid-testimonials">
          <div className="grid grid-cols-3">
            {testimonials.map(t => (
              <div key={t.id} className="card testimonial-card">
                <blockquote>{t.quote}</blockquote>
                <cite>{t.author}, {t.role}</cite>
              </div>
            ))}
          </div>
        </section>
  ),
})
