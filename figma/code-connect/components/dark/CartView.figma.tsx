import figma from "@figma/code-connect"

figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=5014-1643", {
  example: () => (
    <CartViewWidget
      cart={cart}
      onRemoveItem={(productId) => removeFromCart(productId)}
      onCheckout={() => checkout()}
      onContinueShopping={() => getProducts()}
    />
  ),
})
