import figma from "@figma/code-connect"

// Panel Image — Design System Component
// Figma node: 348:15098
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15098", {
  example: () => (
    <section className="panel panel-image">
          <img src={imageUrl} alt={title} className="panel-img" />
          <div className="panel-content">
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </section>
  ),
})
