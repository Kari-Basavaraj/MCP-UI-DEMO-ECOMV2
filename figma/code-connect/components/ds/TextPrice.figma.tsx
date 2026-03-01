import figma from "@figma/code-connect"

// Text Price — Design System Component
// Figma node: 1443:10386
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=1443-10386", {
  example: () => (
    <div className="text-price">
          {originalPrice && (
            <span className="price-original">₹{originalPrice.toLocaleString()}</span>
          )}
          <span className="price-current">₹{price.toLocaleString()}</span>
          {discount && <span className="price-discount">{discount}% off</span>}
        </div>
  ),
})
