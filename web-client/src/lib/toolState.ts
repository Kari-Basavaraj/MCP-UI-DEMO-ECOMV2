export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

export interface CartItem extends Product {
  cartId: number;
}

export interface ToolState {
  products: Product[];
  cart: CartItem[];
  activeView: 'products' | 'cart';
}

export interface ToolResult {
  state: ToolState;
  payload: Record<string, unknown>;
}

type ToolName =
  | 'search_products'
  | 'filter_products'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'get_cart'
  | 'get_products'
  | 'get_categories';

const toSearchable = (value: string) => value.toLowerCase();

export function applyToolAction(
  state: ToolState,
  toolName: ToolName,
  args: Record<string, unknown>,
  catalogProducts: Product[],
  categories: string[] = [],
  nowProvider: () => number = Date.now
): ToolResult {
  switch (toolName) {
    case 'search_products': {
      const rawQuery = String(args.query ?? '').trim();
      const query = toSearchable(rawQuery);
      const products = catalogProducts.filter(
        (product) =>
          toSearchable(product.name).includes(query) ||
          toSearchable(product.category).includes(query)
      );

      return {
        state: {
          ...state,
          products,
          activeView: 'products',
        },
        payload: {
          message: `Found ${products.length} product(s) matching "${rawQuery}"`,
          products,
        },
      };
    }

    case 'filter_products': {
      const category = String(args.category ?? 'All');
      const products = category === 'All'
        ? catalogProducts
        : catalogProducts.filter((product) => product.category === category);

      return {
        state: {
          ...state,
          products,
          activeView: 'products',
        },
        payload: {
          message: `Found ${products.length} product(s) in ${category}`,
          products,
        },
      };
    }

    case 'add_to_cart': {
      const productId = Number(args.productId);
      const product = catalogProducts.find((item) => item.id === productId);

      if (!product) {
        return {
          state,
          payload: {
            message: 'Product not found',
            cart: state.cart,
          },
        };
      }

      const nextCart: CartItem[] = [...state.cart, { ...product, cartId: nowProvider() }];

      return {
        state: {
          ...state,
          cart: nextCart,
        },
        payload: {
          message: `Added "${product.name}" to cart`,
          cart: nextCart,
        },
      };
    }

    case 'remove_from_cart': {
      const productId = Number(args.productId);
      const index = state.cart.findIndex((item) => item.id === productId);

      if (index === -1) {
        return {
          state,
          payload: {
            message: 'Product not found in cart',
            cart: state.cart,
          },
        };
      }

      const removed = state.cart[index];
      const nextCart = state.cart.filter((_, currentIndex) => currentIndex !== index);

      return {
        state: {
          ...state,
          cart: nextCart,
        },
        payload: {
          message: `Removed "${removed.name}" from cart`,
          cart: nextCart,
        },
      };
    }

    case 'get_cart': {
      const total = state.cart.reduce((sum, item) => sum + item.price, 0);

      return {
        state: {
          ...state,
          activeView: 'cart',
        },
        payload: {
          message: `You have ${state.cart.length} item(s) in cart. Total: ₹${total}`,
          cart: state.cart,
          total,
        },
      };
    }

    case 'get_products': {
      return {
        state: {
          ...state,
          products: catalogProducts,
          activeView: 'products',
        },
        payload: {
          message: 'Here are all available products',
          products: catalogProducts,
          categories,
        },
      };
    }

    case 'get_categories': {
      return {
        state,
        payload: {
          message: `Categories: ${categories.join(', ')}`,
          categories,
        },
      };
    }

    default:
      return {
        state,
        payload: {
          message: 'Unknown tool',
        },
      };
  }
}
