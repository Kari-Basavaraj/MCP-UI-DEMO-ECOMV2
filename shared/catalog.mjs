export const products = [
  { id: 1, name: "Nike Air Max 90", category: "Footwear", price: 4999, originalPrice: 6499, image: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400&h=400&fit=crop&q=80", description: "Lightweight running shoes with Air Max cushioning for all-day comfort and style." },
  { id: 2, name: "Classic Crew T-Shirt", category: "Clothing", price: 1999, originalPrice: 2499, image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop&q=80", description: "Premium cotton crew neck tee with a relaxed fit. Soft, breathable, and built to last." },
  { id: 3, name: "Sport Flex Cap", category: "Accessories", price: 999, originalPrice: 1299, image: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=400&h=400&fit=crop&q=80", description: "Adjustable sports cap with moisture-wicking sweatband for active lifestyles." },
  { id: 4, name: "Urban Bomber Jacket", category: "Clothing", price: 3999, originalPrice: 4999, image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop&q=80", description: "Modern bomber jacket with premium zip closure, ribbed cuffs, and satin lining." },
  { id: 5, name: "Ultra Boost Sneakers", category: "Footwear", price: 5999, originalPrice: 7499, image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop&q=80", description: "Energy-returning Boost cushioning for responsive comfort on every run." },
  { id: 6, name: "Chronograph Watch", category: "Accessories", price: 2999, originalPrice: 3999, image: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=400&h=400&fit=crop&q=80", description: "Precision chronograph with stainless steel case and genuine leather strap." },
  { id: 7, name: "Trail Utility Backpack", category: "Accessories", price: 1999, originalPrice: 2499, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&q=80", description: "Durable 30L backpack with padded laptop sleeve and weather-resistant shell." },
  { id: 8, name: "Flex Training Shorts", category: "Clothing", price: 1499, originalPrice: 1899, image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop&q=80", description: "Lightweight training shorts with 4-way stretch fabric and zippered pockets." },
];

const catalogCategories = Array.from(new Set(products.map((product) => product.category)));

export const categories = ["All", ...catalogCategories];

const catalog = {
  products,
  categories,
};

export default catalog;
