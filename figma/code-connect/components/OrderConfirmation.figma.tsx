import figma from "@figma/code-connect"

figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=5007-4615", {
  example: () => (
    <OrderConfirmationWidget
      order={order}
      onContinueShopping={() => getProducts()}
    />
  ),
})
