import figma from "@figma/code-connect"

// Card — Design System Component
// Figma node: 2142:11380
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=2142-11380", {
  example: () => (
    <div className="card">
          <img className="card-image" src={product.imageUrl} alt={product.name} />
          <div className="card-body">
            <h3 className="card-title">{product.name}</h3>
            <p className="card-price">₹{product.price}</p>
          </div>
        </div>
  ),
})
