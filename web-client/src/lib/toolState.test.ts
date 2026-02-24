import { describe, expect, it } from 'vitest';
import { applyToolAction, type CartItem, type ToolState } from './toolState.ts';

const baseState: ToolState = {
  products: [
    { id: 1, name: 'Nike Shoes', category: 'Footwear', price: 4999, image: '👟' },
    { id: 2, name: 'Puma Cap', category: 'Accessories', price: 999, image: '🧢' },
  ],
  cart: [],
  activeView: 'products',
};

describe('applyToolAction sync behavior', () => {
  it('keeps cart synchronized across sequential add_to_cart actions', () => {
    const addFirst = applyToolAction(baseState, 'add_to_cart', { productId: 1 }, baseState.products);
    const addSecond = applyToolAction(addFirst.state, 'add_to_cart', { productId: 2 }, baseState.products);

    expect(addSecond.state.cart).toHaveLength(2);
    expect(addSecond.state.cart.map((item: CartItem) => item.id)).toEqual([1, 2]);
  });

  it('updates products and active view for filter_products', () => {
    const result = applyToolAction(baseState, 'filter_products', { category: 'Accessories' }, baseState.products);

    expect(result.state.activeView).toBe('products');
    expect(result.state.products).toHaveLength(1);
    expect(result.state.products[0].category).toBe('Accessories');
  });

  it('returns cart summary and switches to cart view on get_cart', () => {
    const withItem = applyToolAction(baseState, 'add_to_cart', { productId: 1 }, baseState.products);
    const cartResult = applyToolAction(withItem.state, 'get_cart', {}, baseState.products);

    expect(cartResult.state.activeView).toBe('cart');
    expect(cartResult.payload.total).toBe(4999);
    expect(cartResult.payload.cart).toHaveLength(1);
  });
});
