export interface RecipeIcon {
  id: string;
  label: string;
  icon: string;
}

export const RecipeIconLibrary: RecipeIcon[] = [
  { id: 'pasta', label: 'Pasta', icon: '🍝' },
  { id: 'salad', label: 'Salad', icon: '🥗' },
  { id: 'curry', label: 'Curry', icon: '🍛' },
  { id: 'sushi', label: 'Sushi', icon: '🍣' },
  { id: 'pizza', label: 'Pizza', icon: '🍕' },
  { id: 'burger', label: 'Burger', icon: '🍔' },
  { id: 'stew', label: 'Stew', icon: '🥘' },
  { id: 'dessert', label: 'Dessert', icon: '🧁' },
  { id: 'spicy', label: 'Spicy', icon: '🔥' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { id: 'lunch', label: 'Lunch', icon: '🥪' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
  { id: 'soup', label: 'Soup', icon: '🍲' },
  { id: 'seafood', label: 'Seafood', icon: '🦐' },
  { id: 'meat', label: 'Meat', icon: '🥩' },
  { id: 'chicken', label: 'Chicken', icon: '🍗' },
  { id: 'sandwich', label: 'Sandwich', icon: '🥙' },
  { id: 'taco', label: 'Taco', icon: '🌮' },
  { id: 'burrito', label: 'Burrito', icon: '🌯' },
  { id: 'noodles', label: 'Noodles', icon: '🍜' },
  { id: 'rice', label: 'Rice', icon: '🍚' },
  { id: 'bread', label: 'Bread', icon: '🥖' },
  { id: 'cake', label: 'Cake', icon: '🍰' },
  { id: 'cookie', label: 'Cookie', icon: '🍪' },
  { id: 'fruit', label: 'Fruit', icon: '🍎' },
  { id: 'smoothie', label: 'Smoothie', icon: '🥤' },
  { id: 'coffee', label: 'Coffee', icon: '☕' },
];

export function getRecipeIcon(iconName: string | null | undefined): string {
  if (!iconName) return '';

  const found = RecipeIconLibrary.find(item => item.id === iconName);
  return found ? found.icon : '';
}

export function getRecipeIconLabel(iconName: string | null | undefined): string {
  if (!iconName) return '';

  const found = RecipeIconLibrary.find(item => item.id === iconName);
  return found ? found.label : '';
}
