import figma from "@figma/code-connect"

// Hero Actions — Design System Component
// Figma node: 348:15901
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15901", {
  example: () => (
    <section className="hero hero-actions">
          <h1 className="hero-title">{title}</h1>
          <p className="hero-subtitle">{subtitle}</p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg">{primaryCta}</button>
            <button className="btn btn-secondary btn-lg">{secondaryCta}</button>
          </div>
        </section>
  ),
})
