import figma from "@figma/code-connect"

// Page Product — Design System Component
// Figma node: 348:15147
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15147", {
  example: () => (
    <section className="page-section page-product">
          <div className="product-image">
            <img src={product.imageUrl} alt={product.name} />
          </div>
          <div className="product-info">
            <h2>{product.name}</h2>
            <span className="price">₹{product.price}</span>
            <p>{product.description}</p>
            <button className="btn btn-primary">Add to Cart</button>
          </div>
        </section>
  ),
})
