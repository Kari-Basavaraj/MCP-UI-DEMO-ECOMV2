import figma from "@figma/code-connect"

figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=3068-13922", {
  example: () => (
    <ProductDetailWidget
      product={product}
      onAddToCart={(productId, size, qty) => addToCart(productId, size, qty)}
      onAddToWishlist={(productId) => addToWishlist(productId)}
    />
  ),
})
