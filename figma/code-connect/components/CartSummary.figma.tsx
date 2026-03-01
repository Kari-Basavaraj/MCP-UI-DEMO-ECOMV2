import figma from "@figma/code-connect"

figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=3068-13956", {
  example: () => (
    <CartSummaryWidget
      cart={cart}
      onOpenCart={() => getCart()}
      onPlaceOrder={() => placeOrder()}
    />
  ),
})
