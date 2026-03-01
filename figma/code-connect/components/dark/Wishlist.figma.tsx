import figma from "@figma/code-connect"

figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=5014-1657", {
  example: () => (
    <WishlistWidget
      wishlist={wishlist}
      onMoveToCart={(productId) => addToCart(productId)}
      onRemove={(productId) => removeFromWishlist(productId)}
    />
  ),
})
