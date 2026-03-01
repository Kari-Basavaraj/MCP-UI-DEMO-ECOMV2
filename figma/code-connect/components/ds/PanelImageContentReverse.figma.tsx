import figma from "@figma/code-connect"

// Panel Image Content Reverse — Design System Component
// Figma node: 348:15101
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15101", {
  example: () => (
    <section className="panel panel-image-content panel-reverse">
          <div className="panel-body">
            <h2>{title}</h2>
            <p>{description}</p>
            <button className="btn btn-primary">{cta}</button>
          </div>
          <div className="panel-media">
            <img src={imageUrl} alt={title} />
          </div>
        </section>
  ),
})
