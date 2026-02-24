declare module '../../shared/catalog.mjs' {
  import type { Product } from '../lib/toolState';

  const catalog: {
    products: Product[];
    categories: string[];
  };

  export default catalog;
}
