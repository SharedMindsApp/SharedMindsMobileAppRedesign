/**
 * Food Emoji Mapping
 * 
 * Maps food items to appropriate emojis based on name and category.
 * Used to automatically assign emojis when creating food items.
 */

/**
 * Get emoji for a food item based on its name and category
 */
export function getFoodEmoji(name: string, category?: string | null): string | null {
  const nameLower = name.toLowerCase().trim();
  
  // Category-based emojis (if category is provided)
  if (category) {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('dairy') || categoryLower.includes('egg')) return '🥛';
    if (categoryLower.includes('produce') || categoryLower.includes('fruit') || categoryLower.includes('vegetable')) return '🥬';
    if (categoryLower.includes('meat') || categoryLower.includes('seafood') || categoryLower.includes('protein')) return '🥩';
    if (categoryLower.includes('bakery') || categoryLower.includes('bread')) return '🍞';
    if (categoryLower.includes('beverage') || categoryLower.includes('drink')) return '🥤';
    if (categoryLower.includes('snack')) return '🍿';
    if (categoryLower.includes('frozen')) return '🧊';
    if (categoryLower.includes('condiment') || categoryLower.includes('sauce')) return '🧂';
  }
  
  // Specific food item mappings (more specific matches first)
  const emojiMap: Record<string, string> = {
    // Dairy & Eggs
    'milk': '🥛',
    'eggs': '🥚',
    'butter': '🧈',
    'cheese': '🧀',
    'yogurt': '🥛',
    'greek yogurt': '🥛',
    'sour cream': '🥛',
    'cream cheese': '🧀',
    'cottage cheese': '🧀',
    'heavy cream': '🥛',
    'whipping cream': '🥛',
    
    // Produce - Fruits
    'banana': '🍌',
    'bananas': '🍌',
    'apple': '🍎',
    'apples': '🍎',
    'orange': '🍊',
    'oranges': '🍊',
    'lemon': '🍋',
    'lemons': '🍋',
    'lime': '🍋',
    'limes': '🍋',
    'strawberry': '🍓',
    'strawberries': '🍓',
    'blueberry': '🫐',
    'blueberries': '🫐',
    'grape': '🍇',
    'grapes': '🍇',
    'watermelon': '🍉',
    'pineapple': '🍍',
    'mango': '🥭',
    'mangoes': '🥭',
    'peach': '🍑',
    'peaches': '🍑',
    'pear': '🍐',
    'pears': '🍐',
    'cherry': '🍒',
    'cherries': '🍒',
    'avocado': '🥑',
    'avocados': '🥑',
    'coconut': '🥥',
    'kiwi': '🥝',
    'kiwis': '🥝',
    
    // Produce - Vegetables
    'lettuce': '🥬',
    'tomato': '🍅',
    'tomatoes': '🍅',
    'carrot': '🥕',
    'carrots': '🥕',
    'onion': '🧅',
    'onions': '🧅',
    'potato': '🥔',
    'potatoes': '🥔',
    'broccoli': '🥦',
    'spinach': '🥬',
    'bell pepper': '🫑',
    'bell peppers': '🫑',
    'pepper': '🫑',
    'peppers': '🫑',
    'cucumber': '🥒',
    'cucumbers': '🥒',
    'celery': '🥬',
    'garlic': '🧄',
    'corn': '🌽',
    'mushroom': '🍄',
    'mushrooms': '🍄',
    'peas': '🫛',
    'green beans': '🫛',
    'asparagus': '🫛',
    'zucchini': '🥒',
    'eggplant': '🍆',
    'cabbage': '🥬',
    'cauliflower': '🥦',
    
    // Meat & Seafood
    'chicken': '🍗',
    'chicken breast': '🍗',
    'chicken thighs': '🍗',
    'ground beef': '🥩',
    'beef': '🥩',
    'steak': '🥩',
    'pork': '🥩',
    'pork chops': '🥩',
    'bacon': '🥓',
    'sausage': '🌭',
    'ham': '🍖',
    'turkey': '🦃',
    'ground turkey': '🦃',
    'salmon': '🐟',
    'tuna': '🐟',
    'shrimp': '🦐',
    'fish': '🐟',
    'cod': '🐟',
    'tilapia': '🐟',
    'crab': '🦀',
    'lobster': '🦞',
    'oyster': '🦪',
    'oysters': '🦪',
    
    // Bakery
    'bread': '🍞',
    'bagel': '🥯',
    'bagels': '🥯',
    'tortilla': '🫓',
    'tortillas': '🫓',
    'english muffin': '🍞',
    'english muffins': '🍞',
    'croissant': '🥐',
    'croissants': '🥐',
    'muffin': '🧁',
    'muffins': '🧁',
    'donut': '🍩',
    'donuts': '🍩',
    
    // Pantry Staples
    'rice': '🍚',
    'pasta': '🍝',
    'spaghetti': '🍝',
    'noodles': '🍜',
    'flour': '🌾',
    'sugar': '🍬',
    'salt': '🧂',
    'pepper': '🫑',
    'black pepper': '🫑',
    'olive oil': '🫒',
    'vegetable oil': '🫒',
    'vinegar': '🍶',
    'soy sauce': '🍶',
    'canned tomatoes': '🥫',
    'canned beans': '🥫',
    'beans': '🫘',
    'chicken broth': '🍲',
    'beef broth': '🍲',
    'vegetable broth': '🍲',
    'broth': '🍲',
    'stock': '🍲',
    
    // Snacks
    'crackers': '🍘',
    'chips': '🍟',
    'nuts': '🥜',
    'almonds': '🥜',
    'peanuts': '🥜',
    'walnuts': '🥜',
    'peanut butter': '🥜',
    'jam': '🍯',
    'jelly': '🍯',
    'honey': '🍯',
    'granola bar': '🍫',
    'granola bars': '🍫',
    'popcorn': '🍿',
    'chocolate': '🍫',
    'cookies': '🍪',
    'cookie': '🍪',
    
    // Beverages
    'coffee': '☕',
    'tea': '🍵',
    'juice': '🧃',
    'orange juice': '🧃',
    'apple juice': '🧃',
    'soda': '🥤',
    'water': '💧',
    'beer': '🍺',
    'wine': '🍷',
    'champagne': '🍾',
    
    // Frozen
    'frozen vegetables': '🧊',
    'frozen fruit': '🧊',
    'ice cream': '🍦',
    'frozen pizza': '🍕',
    'frozen chicken': '🍗',
    'frozen berries': '🧊',
    
    // Condiments & Sauces
    'ketchup': '🍅',
    'mustard': '🟡',
    'mayonnaise': '🥄',
    'mayo': '🥄',
    'hot sauce': '🌶️',
    'bbq sauce': '🍖',
    'salad dressing': '🥗',
    'worcestershire sauce': '🍶',
    'ranch': '🥗',
    'ranch dressing': '🥗',
  };
  
  // Check exact matches first
  if (emojiMap[nameLower]) {
    return emojiMap[nameLower];
  }
  
  // Check partial matches (for compound names)
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return emoji;
    }
  }
  
  // Category-based fallbacks
  if (category) {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('dairy') || categoryLower.includes('egg')) return '🥛';
    if (categoryLower.includes('produce') || categoryLower.includes('fruit') || categoryLower.includes('vegetable')) return '🥬';
    if (categoryLower.includes('meat') || categoryLower.includes('seafood')) return '🥩';
    if (categoryLower.includes('bakery') || categoryLower.includes('bread')) return '🍞';
    if (categoryLower.includes('beverage') || categoryLower.includes('drink')) return '🥤';
    if (categoryLower.includes('snack')) return '🍿';
    if (categoryLower.includes('frozen')) return '🧊';
    if (categoryLower.includes('condiment') || categoryLower.includes('sauce')) return '🧂';
    if (categoryLower.includes('pantry') || categoryLower.includes('staple')) return '🥫';
  }
  
  // Default fallback
  return null;
}
