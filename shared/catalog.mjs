export const products = [
  { id: 1, name: "Nike Shoes", category: "Footwear", price: 4999, image: "👟" },
  { id: 2, name: "Adidas T-Shirt", category: "Clothing", price: 1999, image: "👕" },
  { id: 3, name: "Puma Cap", category: "Accessories", price: 999, image: "🧢" },
  { id: 4, name: "Nike Jacket", category: "Clothing", price: 3999, image: "🧥" },
  { id: 5, name: "Adidas Sneakers", category: "Footwear", price: 5999, image: "👟" },
  { id: 6, name: "Puma Watch", category: "Accessories", price: 2999, image: "⌚" },
  { id: 7, name: "Nike Bag", category: "Accessories", price: 1999, image: "👜" },
  { id: 8, name: "Adidas Shorts", category: "Clothing", price: 1499, image: "🩳" },
];

const catalogCategories = Array.from(new Set(products.map((product) => product.category)));

export const categories = ["All", ...catalogCategories];

const catalog = {
  products,
  categories,
};

export default catalog;
