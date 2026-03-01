import figma from "@figma/code-connect"

figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=5014-1632", {
  example: () => (
    <SearchBarWidget
      onSearch={(query) => searchProducts(query)}
      onSelectProduct={(productId) => getProductDetail(productId)}
      onTagSearch={(tag) => searchProducts(tag)}
    />
  ),
})
