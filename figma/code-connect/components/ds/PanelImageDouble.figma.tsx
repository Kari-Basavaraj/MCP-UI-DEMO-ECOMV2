import figma from "@figma/code-connect"

// Panel Image Double — Design System Component
// Figma node: 348:13470
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-13470", {
  example: () => (
    <section className="panel panel-image-double">
          <div className="panel-media">
            <img src={image1Url} alt={title1} />
          </div>
          <div className="panel-media">
            <img src={image2Url} alt={title2} />
          </div>
        </section>
  ),
})
