import figma from "@figma/code-connect"

// Hero Basic — Design System Component
// Figma node: 348:15896
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15896", {
  example: () => (
    <section className="hero hero-basic">
          <h1 className="hero-title">{title}</h1>
          <p className="hero-subtitle">{subtitle}</p>
        </section>
  ),
})
