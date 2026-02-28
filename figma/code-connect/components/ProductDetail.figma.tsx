import figma from "@figma/code-connect"

figma.connect("https://www.figma.com/design/p3SdnPiT3DYRtOu2CZs97P/MCPUI-DS-V1?node-id=3068-13922", {
  example: () => (
    <ProductDetailWidget
      product={product}
      onAddToCart={(productId, size, qty) => addToCart(productId, size, qty)}
      onAddToWishlist={(productId) => addToWishlist(productId)}
    />
  ),
})
