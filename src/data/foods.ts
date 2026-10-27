/**
 * A small built-in list of common foods for quick adding.
 * Values per typical portion. Later this is replaced by a food database
 * (e.g. Open Food Facts) plus barcode scanning and AI photo recognition.
 */
export type QuickFood = { name: string; kcal: number; protein: number; carbs: number; fat: number };

export const QUICK_FOODS: QuickFood[] = [
  { name: 'Oatmeal (60 g) with milk', kcal: 330, protein: 13, carbs: 48, fat: 9 },
  { name: 'Greek yogurt (200 g)', kcal: 190, protein: 20, carbs: 8, fat: 8 },
  { name: 'Banana', kcal: 105, protein: 1, carbs: 27, fat: 0 },
  { name: '3 eggs', kcal: 215, protein: 19, carbs: 1, fat: 15 },
  { name: 'Chicken breast (150 g)', kcal: 250, protein: 46, carbs: 0, fat: 5 },
  { name: 'Rice, cooked (200 g)', kcal: 260, protein: 5, carbs: 57, fat: 1 },
  { name: 'Whey protein shake', kcal: 120, protein: 24, carbs: 3, fat: 2 },
  { name: 'Salmon fillet (125 g)', kcal: 260, protein: 25, carbs: 0, fat: 17 },
  { name: 'Whole-grain bread (2 slices)', kcal: 180, protein: 8, carbs: 30, fat: 2 },
  { name: 'Peanut butter (20 g)', kcal: 120, protein: 5, carbs: 3, fat: 10 },
];
