import figma from "@figma/code-connect"

figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=5007-4612", {
  example: () => (
    <CheckoutFormWidget
      cart={cart}
      onPlaceOrder={(formData) => placeOrder(formData)}
    />
  ),
})
