import figma from "@figma/code-connect"

// Hero Image — Design System Component
// Figma node: 348:15970
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15970", {
  example: () => (
    <section className="hero hero-image">
          <div className="hero-content">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <button className="btn btn-primary btn-lg">{cta}</button>
          </div>
          <div className="hero-media">
            <img src={imageUrl} alt={title} />
          </div>
        </section>
  ),
})
