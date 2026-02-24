import { useState, useRef, useEffect, useCallback } from 'react';
import { type UIActionResult } from '@mcp-ui/client';
import catalog from '../../shared/catalog.js';

// Types
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

interface CartItem extends Product {
  cartId: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  resources?: Array<{
    uri: string;
    mimeType: string;
    content: string;
  }>;
}

// OpenRouter proxy configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
const CATALOG_PRODUCTS = (catalog as { products: Product[] }).products;
const CATALOG_CATEGORIES = (catalog as { categories: string[] }).categories;

const formatCatalogList = (items: Product[]) =>
  items
    .map((product) => `- ${product.name} (${product.category}, ₹${product.price})`)
    .join('\n');

const SYSTEM_PROMPT = `You are an e-commerce shopping assistant. You have access to the following tools:

1. search_products - Search for products by name or keyword
2. filter_products - Filter products by category (Footwear, Clothing, Accessories, All)
3. add_to_cart - Add a product to the shopping cart by product ID
4. remove_from_cart - Remove a product from the cart by product ID
5. get_cart - Get the current shopping cart contents
6. get_products - Get all available products
7. get_categories - Get all available categories

Available products:
${formatCatalogList(CATALOG_PRODUCTS)}

When the user asks to search, filter, or manage cart, use the appropriate tool.
After calling a tool, present the results in a friendly way.`;

const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products by name or keyword',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for product name' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'filter_products',
      description: 'Filter products by category',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Category to filter by', enum: CATALOG_CATEGORIES },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_cart',
      description: 'Add a product to the shopping cart',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'number', description: 'ID of the product to add' },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_cart',
      description: 'Remove a product from the shopping cart',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'number', description: 'ID of the product to remove' },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cart',
      description: 'Get the current shopping cart contents',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_products',
      description: 'Get all available products',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_categories',
      description: 'Get all available product categories',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

function App() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'products' | 'cart'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Store last rendered resource HTML (used by MCP-UI postMessage)
  const [lastResourceHtml, setLastResourceHtml] = useState<string>('');
  // Use lastResourceHtml to show resource status in header
  const hasResource = lastResourceHtml.length > 0;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '👋 Welcome to MCP E-Commerce! I can help you:\n\n• Search for products by name\n• Filter products by category\n• Add items to your cart\n• View and manage your cart\n\nTry asking me something like "Show me Nike shoes" or "What clothing do you have?"',
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Handle sending messages to LLM
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call OpenRouter via local proxy with MCP tool support
      const response = await fetch(`${API_BASE_URL}/api/openrouter/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            ...messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: 'user',
              content: input,
            },
          ],
          tools: TOOL_DEFS,
          tool_choice: 'auto',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from API');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message;
      
      // Handle tool calls if any
      if (assistantMessage.tool_calls) {
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          // Execute tool via MCP server (simulated here)
          const toolResult = await executeMCPTool(toolName, toolArgs);
          
          // Add tool result to messages
          const toolResultMessage: Message = {
            id: (Date.now() + Math.random()).toString(),
            role: 'assistant',
            content: `Tool ${toolName} result: ${JSON.stringify(toolResult.message || toolResult)}`,
            timestamp: new Date(),
            resources: toolResult.resources || [],
          };
          
          setMessages((prev) => [...prev, toolResultMessage]);
          
          // Update local state based on tool
          if (toolName === 'add_to_cart' && toolResult.cart) {
            setCart(toolResult.cart);
          } else if (toolName === 'remove_from_cart' && toolResult.cart) {
            setCart(toolResult.cart);
          } else if (toolName === 'get_products' && toolResult.products) {
            setProducts(toolResult.products);
          }
          
          // Set resource HTML if present
          if (toolResult.resources && toolResult.resources.length > 0) {
            const htmlResource = toolResult.resources.find((r: any) => r.mimeType === 'text/html');
            if (htmlResource) {
              setLastResourceHtml(htmlResource.content);
            }
          }
        }
      } else {
        // Regular message without tool call
        const responseMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, responseMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback: simulate tool execution for demo
      const fallbackResponse = handleFallbackResponse(input);
      setMessages((prev) => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute MCP tool (simulated for demo)
  const executeMCPTool = async (toolName: string, args: any): Promise<any> => {
    let result: any = { message: '' };
    let resources: any[] = [];

    switch (toolName) {
      case 'search_products': {
        const query = args.query.toLowerCase();
        const filtered = CATALOG_PRODUCTS.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.category.toLowerCase().includes(query)
        );
        result = { 
          message: `Found ${filtered.length} product(s) matching "${args.query}"`,
          products: filtered 
        };
        setProducts(filtered);
        resources.push({
          uri: 'ecommerce://products/list',
          mimeType: 'text/html',
          content: generateProductListHtml(filtered),
        });
        setLastResourceHtml(generateProductListHtml(filtered));
        setActiveView('products');
        break;
      }
      case 'filter_products': {
        const category = args.category;
        const filtered = category === 'All' 
          ? CATALOG_PRODUCTS 
          : CATALOG_PRODUCTS.filter(p => p.category === category);
        result = { 
          message: `Found ${filtered.length} product(s) in ${category}`,
          products: filtered 
        };
        setProducts(filtered);
        resources.push({
          uri: 'ecommerce://products/list',
          mimeType: 'text/html',
          content: generateProductListHtml(filtered),
        });
        setLastResourceHtml(generateProductListHtml(filtered));
        setActiveView('products');
        break;
      }
      case 'add_to_cart': {
        const product = CATALOG_PRODUCTS.find(p => p.id === args.productId);
        if (product) {
          const newItem: CartItem = { ...product, cartId: Date.now() };
          const nextCart = [...cart, newItem];
          setCart(nextCart);
          result = { 
            message: `Added "${product.name}" to cart`,
            cart: nextCart
          };
        }
        break;
      }
      case 'remove_from_cart': {
        const index = cart.findIndex(item => item.id === args.productId);
        if (index >= 0) {
          const removed = cart[index];
          const newCart = cart.filter((_, i) => i !== index);
          setCart(newCart);
          result = { 
            message: `Removed "${removed.name}" from cart`,
            cart: newCart
          };
        }
        break;
      }
      case 'get_cart': {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        result = { 
          message: `You have ${cart.length} item(s) in cart. Total: ₹${total}`,
          cart: cart,
          total: total
        };
        resources.push({
          uri: 'ecommerce://cart/view',
          mimeType: 'text/html',
          content: generateCartHtml(cart),
        });
        setLastResourceHtml(generateCartHtml(cart));
        setActiveView('cart');
        break;
      }
      case 'get_products': {
        result = { 
          message: `Here are all available products`,
          products: CATALOG_PRODUCTS,
          categories: CATALOG_CATEGORIES
        };
        setProducts(CATALOG_PRODUCTS);
        resources.push({
          uri: 'ecommerce://products/list',
          mimeType: 'text/html',
          content: generateProductListHtml(CATALOG_PRODUCTS),
        });
        setLastResourceHtml(generateProductListHtml(CATALOG_PRODUCTS));
        setActiveView('products');
        break;
      }
      case 'get_categories': {
        result = { 
          message: `Categories: ${CATALOG_CATEGORIES.join(', ')}`,
          categories: CATALOG_CATEGORIES
        };
        break;
      }
    }

    return { ...result, resources };
  };

  // Handle fallback when API is not available
  const handleFallbackResponse = (userInput: string): Message => {
    const input = userInput.toLowerCase();
    
    // Search products
    if (input.includes('search') || input.includes('find') || input.includes('show')) {
      let filtered = CATALOG_PRODUCTS;
      
      // Filter by search query
      const searchMatch = input.match(/(?:search|find|show|looking for)\s+(?:me\s+)?(.+)/i);
      if (searchMatch) {
        const query = searchMatch[1].toLowerCase();
        filtered = CATALOG_PRODUCTS.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.category.toLowerCase().includes(query)
        );
      }
      
      // Filter by category
      if (input.includes('footwear') || input.includes('shoes') || input.includes('sneakers')) {
        filtered = filtered.filter(p => p.category === 'Footwear');
      } else if (input.includes('clothing') || input.includes('shirt') || input.includes('jacket')) {
        filtered = filtered.filter(p => p.category === 'Clothing');
      } else if (input.includes('accessories') || input.includes('cap') || input.includes('watch') || input.includes('bag')) {
        filtered = filtered.filter(p => p.category === 'Accessories');
      }
      
      setProducts(filtered);
      const html = generateProductListHtml(filtered);
      setLastResourceHtml(html);
      setActiveView('products');
      
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I found ${filtered.length} product(s) for you!`,
        timestamp: new Date(),
        resources: [{
          uri: 'ecommerce://products/list',
          mimeType: 'text/html',
          content: html,
        }],
      };
    }
    
    // Add to cart
    const addMatch = input.match(/add\s+(?:product\s+)?(?:id\s+)?(\d+)|add\s+(.+?)(?:\s+to|$)/i);
    if (addMatch && (input.includes('add') || input.includes('buy'))) {
      const productId = addMatch[1] ? parseInt(addMatch[1]) : null;
      const productName = addMatch[2] || '';
      
      let product: Product | undefined;
      if (productId) {
        product = CATALOG_PRODUCTS.find(p => p.id === productId);
      } else {
        product = CATALOG_PRODUCTS.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
      }
      
      if (product) {
        const newItem: CartItem = { ...product, cartId: Date.now() };
        setCart(prev => [...prev, newItem]);
        
        return {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Added "${product.name}" to your cart! You now have ${cart.length + 1} item(s).`,
          timestamp: new Date(),
        };
      }
    }
    
    // View cart
    if (input.includes('cart') || input.includes('checkout')) {
      const html = generateCartHtml(cart);
      setLastResourceHtml(html);
      setActiveView('cart');
      
      const total = cart.reduce((sum, item) => sum + item.price, 0);
      
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: cart.length === 0 
          ? 'Your cart is empty!' 
          : `You have ${cart.length} item(s) in your cart. Total: ₹${total}`,
        timestamp: new Date(),
        resources: [{
          uri: 'ecommerce://cart/view',
          mimeType: 'text/html',
          content: html,
        }],
      };
    }
    
    // Default response
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'I can help you search products, filter by category, add items to cart, and more! Try asking me something like "Show me shoes" or "What clothing do you have?"',
      timestamp: new Date(),
    };
  };

  // Generate product list HTML with MCP-UI postMessage protocol
  const generateProductListHtml = (productsToShow: Product[]): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          :root {
            --sds-color-background-default-default: #ffffff;
            --sds-color-background-default-secondary: #f5f5f5;
            --sds-color-text-default: #111111;
            --sds-color-text-subtle: #757575;
            --sds-color-border: #e6e6e6;
            --sds-color-background-brand-default: #111111;
            --sds-color-text-inverse: #ffffff;
            --sds-color-danger: #ec221f;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--sds-color-background-default-default); color: var(--sds-color-text-default); }
        </style>
      </head>
      <body>
        <div style="padding: 24px;">
          <h2 style="margin: 0 0 24px 0; font-size: 24px; color: var(--sds-color-text-default);">Products</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
            ${productsToShow.map(product => `
              <div style="background: var(--sds-color-background-default-default); border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--sds-color-border);">
                <div style="font-size: 48px; text-align: center; margin-bottom: 12px;">${product.image}</div>
                <h3 style="margin: 0 0 8px 0; font-size: 18px; color: var(--sds-color-text-default);">${product.name}</h3>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: var(--sds-color-text-subtle);">${product.category}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 20px; font-weight: 600; color: var(--sds-color-text-default);">₹${product.price}</span>
                  <button onclick="window.parent.postMessage({ type: 'tool', payload: { toolName: 'add_to_cart', params: { productId: ${product.id} } } }, '*')" style="background: var(--sds-color-background-brand-default); color: var(--sds-color-text-inverse); border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500;">Add to Cart</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Generate cart HTML with MCP-UI postMessage protocol
  const generateCartHtml = (cartItems: CartItem[]): string => {
    if (cartItems.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            :root {
              --sds-color-background-default-default: #ffffff;
              --sds-color-background-default-secondary: #f5f5f5;
              --sds-color-text-default: #111111;
              --sds-color-text-subtle: #757575;
              --sds-color-border: #e6e6e6;
              --sds-color-background-brand-default: #111111;
              --sds-color-text-inverse: #ffffff;
              --sds-color-danger: #ec221f;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--sds-color-background-default-default); color: var(--sds-color-text-default); }
          </style>
        </head>
        <body>
          <div style="padding: 24px; text-align: center;">
            <h2 style="margin: 0 0 24px 0; font-size: 24px; color: var(--sds-color-text-default);">Shopping Cart</h2>
            <p style="color: var(--sds-color-text-subtle); padding: 40px;">Your cart is empty</p>
          </div>
        </body>
        </html>
      `;
    }
    
    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          :root {
            --sds-color-background-default-default: #ffffff;
            --sds-color-background-default-secondary: #f5f5f5;
            --sds-color-text-default: #111111;
            --sds-color-text-subtle: #757575;
            --sds-color-border: #e6e6e6;
            --sds-color-background-brand-default: #111111;
            --sds-color-text-inverse: #ffffff;
            --sds-color-danger: #ec221f;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--sds-color-background-default-default); color: var(--sds-color-text-default); }
        </style>
      </head>
      <body>
        <div style="padding: 24px;">
          <h2 style="margin: 0 0 24px 0; font-size: 24px; color: var(--sds-color-text-default);">Shopping Cart</h2>
          <div style="margin-bottom: 20px;">
            ${cartItems.map(item => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--sds-color-background-default-secondary); border-radius: 12px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-size: 32px;">${item.image}</span>
                  <div>
                    <h4 style="margin: 0; font-size: 16px; color: var(--sds-color-text-default);">${item.name}</h4>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: var(--sds-color-text-subtle);">₹${item.price}</p>
                  </div>
                </div>
                <button onclick="window.parent.postMessage({ type: 'tool', payload: { toolName: 'remove_from_cart', params: { productId: ${item.id} } } }, '*')" style="background: var(--sds-color-danger); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">Remove</button>
              </div>
            `).join('')}
          </div>
          <div style="background: var(--sds-color-background-default-secondary); border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 18px; font-weight: 600; color: var(--sds-color-text-default);">Total:</span>
            <span style="font-size: 24px; font-weight: 700; color: var(--sds-color-text-default);">₹${total}</span>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Handle UI actions from MCP-UI rendered resources
  const handleUIAction = useCallback(async (action: UIActionResult) => {
    if (action.type === 'tool') {
      // Handle tool calls from UI
      const { toolName, params } = action.payload;
      const result = await executeMCPTool(toolName, params);
      const message: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        resources: result.resources || [],
      };
      setMessages(prev => [...prev, message]);
    } else if (action.type === 'notify') {
      // Show notification
      const message: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: action.payload.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, message]);
    }
  }, []);

  // Listen for postMessage events from MCP-UI iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if it's a UI action from our iframe
      if (event.data && event.data.type === 'tool') {
        handleUIAction(event.data as unknown as UIActionResult);
      } else if (event.data && event.data.type === 'notify') {
        handleUIAction(event.data as unknown as UIActionResult);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleUIAction]);

  // Handle adding to cart from UI
  const handleAddToCart = async (productId: number) => {
    const result = await executeMCPTool('add_to_cart', { productId });
    const message: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: result.message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  // Handle removing from cart from UI
  const handleRemoveFromCart = async (productId: number) => {
    const result = await executeMCPTool('remove_from_cart', { productId });
    const message: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: result.message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  // Filter products locally
  const baseProducts = products.length > 0 ? products : CATALOG_PRODUCTS;
  const filteredProducts = (searchQuery || selectedCategory !== 'All')
    ? baseProducts.filter(p =>
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : baseProducts;

  // Render
  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            🛒 MCP Store
          </div>
        </div>
        
        <div className="sidebar-nav">
          <div 
            className={`nav-item ${activeView === 'products' ? 'active' : ''}`}
            onClick={() => setActiveView('products')}
          >
            <span className="icon">📦</span>
            Products
          </div>
          <div 
            className={`nav-item ${activeView === 'cart' ? 'active' : ''}`}
            onClick={() => setActiveView('cart')}
          >
            <span className="icon">🛒</span>
            Cart
            {cart.length > 0 && (
              <span className="badge badge-primary">{cart.length}</span>
            )}
          </div>
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '8px' }}>
            Category Filter
          </p>
          <select 
            className="select" 
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              executeMCPTool('filter_products', { category: e.target.value });
            }}
            style={{ width: '100%' }}
          >
            {CATALOG_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-header">
          <h1 className="content-title">
            {activeView === 'products' ? '🛍️ Products' : '🛒 Shopping Cart'}
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              className="input"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  executeMCPTool('search_products', { query: searchQuery });
                }
              }}
              style={{ width: '250px' }}
            />
            <button 
              className="btn btn-primary"
              onClick={() => executeMCPTool('search_products', { query: searchQuery || 'all' })}
            >
              Search
            </button>
          </div>
        </div>

        <div className="content-body">
          {/* Render products or cart based on active view */}
          {activeView === 'products' ? (
            <div className="product-grid">
              {filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <h3 className="empty-state-title">No products found</h3>
                  <p className="empty-state-description">
                    Try adjusting your search or filter.
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div key={product.id} className="product-card">
                    <div className="product-image">{product.image}</div>
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-category">{product.category}</p>
                    <p className="product-price">₹{product.price}</p>
                    <div className="product-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleAddToCart(product.id)}
                        style={{ flex: 1 }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🛒</div>
                  <h3 className="empty-state-title">Your cart is empty</h3>
                  <p className="empty-state-description">
                    Add some products to get started!
                  </p>
                </div>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.cartId} className="cart-item">
                      <div className="cart-item-info">
                        <span className="cart-item-image">{item.image}</span>
                        <div className="cart-item-details">
                          <h4>{item.name}</h4>
                          <p>₹{item.price}</p>
                        </div>
                      </div>
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleRemoveFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="cart-total">
                    <span className="cart-total-label">Total:</span>
                    <span className="cart-total-amount">
                      ₹{cart.reduce((sum, item) => sum + item.price, 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="chat-container">
        <div className="chat-header">
          <span className="chat-title">💬 AI Assistant</span>
          {hasResource && <span style={{ fontSize: '10px', marginLeft: '8px', color: '#4caf50' }}>●</span>}
        </div>
        
        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-bubble">
                {message.content.split('\n').map((line, i) => (
                  <p key={i} style={{ margin: line ? '4px 0' : '8px 0' }}>
                    {line || '\u00A0'}
                  </p>
                ))}
              </div>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </span>
              
              {/* Render resources if any */}
              {message.resources && message.resources.length > 0 && (
                <div className="tool-result">
                  <div className="tool-result-title">UI Rendered</div>
                  <div 
                    className="resource-content"
                    dangerouslySetInnerHTML={{ 
                      __html: message.resources[0].content 
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="message assistant">
              <div className="message-bubble">
                <div className="loading">
                  <div className="loading-spinner"></div>
                  <span style={{ marginLeft: '12px' }}>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Ask me about products..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
            />
            <button 
              className="send-button"
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
