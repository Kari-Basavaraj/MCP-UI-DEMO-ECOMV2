import figma from "@figma/code-connect"

figma.connect("https://www.figma.com/design/p3SdnPiT3DYRtOu2CZs97P/MCPUI-DS-V1?node-id=3068-14037", {
  example: () => (
    <PriceTagWidget
      product={product}
    />
  ),
})
