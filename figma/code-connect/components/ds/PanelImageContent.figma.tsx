import figma from "@figma/code-connect"

// Panel Image Content — Design System Component
// Figma node: 348:13474
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-13474", {
  example: () => (
    <section className="panel panel-image-content">
          <div className="panel-media">
            <img src={imageUrl} alt={title} />
          </div>
          <div className="panel-body">
            <h2>{title}</h2>
            <p>{description}</p>
            <button className="btn btn-primary">{cta}</button>
          </div>
        </section>
  ),
})
