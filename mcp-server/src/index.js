import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startOpenRouterProxy } from "./openrouterProxy.js";
import { products, categories } from "../../shared/catalog.js";

// In-memory cart
let cart = [];

// Generate product list HTML for UI resource
function generateProductListHtml(productsToShow) {
  const productsHtml = productsToShow.map(product => `
    <div style="background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s;">
      <div style="font-size: 48px; text-align: center; margin-bottom: 12px;">${product.image}</div>
      <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #1a1a2e;">${product.name}</h3>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${product.category}</p>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 20px; font-weight: 600; color: #4361ee;">₹${product.price}</span>
        <button onclick="addToCart(${product.id})" style="background: #4361ee; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.2s;">Add to Cart</button>
      </div>
    </div>
  `).join('');

  return `
    <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <h2 style="margin: 0 0 24px 0; font-size: 24px; color: #1a1a2e;">Products</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
        ${productsHtml || '<p style="color: #666;">No products found</p>'}
      </div>
    </div>
  `;
}

// Generate cart HTML for UI resource
function generateCartHtml() {
  if (cart.length === 0) {
    return `
      <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2 style="margin: 0 0 24px 0; font-size: 24px; color: #1a1a2e;">Shopping Cart</h2>
        <p style="color: #666; text-align: center; padding: 40px;">Your cart is empty</p>
      </div>
    `;
  }

  const cartItemsHtml = cart.map(item => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fff; border-radius: 12px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 32px;">${item.image}</span>
        <div>
          <h4 style="margin: 0; font-size: 16px; color: #1a1a2e;">${item.name}</h4>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">₹${item.price}</p>
        </div>
      </div>
      <button onclick="removeFromCart(${item.id})" style="background: #ff6b6b; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500;">Remove</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return `
    <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <h2 style="margin: 0 0 24px 0; font-size: 24px; color: #1a1a2e;">Shopping Cart</h2>
      <div style="margin-bottom: 20px;">
        ${cartItemsHtml}
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 18px; font-weight: 600; color: #1a1a2e;">Total:</span>
        <span style="font-size: 24px; font-weight: 700; color: #4361ee;">₹${total}</span>
      </div>
    </div>
  `;
}

// Server capabilities
const server = new Server(
  {
    name: "ecommerce-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_products",
        description: "Search for products by name or keyword",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for product name",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "filter_products",
        description: "Filter products by category",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Category to filter by (Footwear, Clothing, Accessories, or All)",
              enum: categories,
            },
          },
          required: ["category"],
        },
      },
      {
        name: "add_to_cart",
        description: "Add a product to the shopping cart",
        inputSchema: {
          type: "object",
          properties: {
            productId: {
              type: "number",
              description: "ID of the product to add to cart",
            },
          },
          required: ["productId"],
        },
      },
      {
        name: "remove_from_cart",
        description: "Remove a product from the shopping cart",
        inputSchema: {
          type: "object",
          properties: {
            productId: {
              type: "number",
              description: "ID of the product to remove from cart",
            },
          },
          required: ["productId"],
        },
      },
      {
        name: "get_cart",
        description: "Get the current shopping cart contents",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_products",
        description: "Get all available products",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_categories",
        description: "Get all available product categories",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_products": {
        const query = args.query.toLowerCase();
        const results = products.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                products: results,
                message: `Found ${results.length} product(s) matching "${args.query}"`,
              }),
            },
            {
              type: "resource",
              resource: {
                uri: "ecommerce://products/list",
                mimeType: "text/html",
                text: generateProductListHtml(results),
              },
            },
          ],
        };
      }

      case "filter_products": {
        const category = args.category;
        const results =
          category === "All"
            ? products
            : products.filter((p) => p.category === category);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                products: results,
                message: `Found ${results.length} product(s) in ${category}`,
              }),
            },
            {
              type: "resource",
              resource: {
                uri: "ecommerce://products/list",
                mimeType: "text/html",
                text: generateProductListHtml(results),
              },
            },
          ],
        };
      }

      case "add_to_cart": {
        const product = products.find((p) => p.id === args.productId);
        if (!product) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ success: false, message: "Product not found" }),
              },
            ],
          };
        }

        const cartItem = { ...product, cartId: Date.now() };
        cart.push(cartItem);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Added "${product.name}" to cart`,
                cartCount: cart.length,
              }),
            },
            {
              type: "resource",
              resource: {
                uri: "ecommerce://cart/view",
                mimeType: "text/html",
                text: generateCartHtml(),
              },
            },
          ],
        };
      }

      case "remove_from_cart": {
        const index = cart.findIndex((item) => item.id === args.productId);
        if (index === -1) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ success: false, message: "Product not found in cart" }),
              },
            ],
          };
        }

        const removedItem = cart.splice(index, 1)[0];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Removed "${removedItem.name}" from cart`,
                cartCount: cart.length,
              }),
            },
            {
              type: "resource",
              resource: {
                uri: "ecommerce://cart/view",
                mimeType: "text/html",
                text: generateCartHtml(),
              },
            },
          ],
        };
      }

      case "get_cart": {
        const total = cart.reduce((sum, item) => sum + item.price, 0);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                cart: cart,
                total: total,
                count: cart.length,
              }),
            },
            {
              type: "resource",
              resource: {
                uri: "ecommerce://cart/view",
                mimeType: "text/html",
                text: generateCartHtml(),
              },
            },
          ],
        };
      }

      case "get_products": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                products: products,
                categories: categories,
              }),
            },
            {
              type: "resource",
              resource: {
                uri: "ecommerce://products/list",
                mimeType: "text/html",
                text: generateProductListHtml(products),
              },
            },
          ],
        };
      }

      case "get_categories": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                categories: categories,
              }),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Unknown tool" }),
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: error.message }),
        },
      ],
    };
  }
});

// Start the server
const apiPort = Number(process.env.API_PORT || process.env.PORT || 8787);
startOpenRouterProxy({ port: apiPort });

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("E-commerce MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
