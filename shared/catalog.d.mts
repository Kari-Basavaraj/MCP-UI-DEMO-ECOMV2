export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

export const products: Product[];
export const categories: string[];

declare const catalog: {
  products: Product[];
  categories: string[];
};

export default catalog;
