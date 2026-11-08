/**
 * Product lookup by barcode in Open Food Facts — a free, open food database
 * with millions of products (very good coverage in Belgium and the Netherlands).
 * https://world.openfoodfacts.org
 */

export type Product = {
  barcode: string;
  name: string;
  /** Per 100 g (or 100 ml) */
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  /** Grams in one serving, if the product lists it */
  servingGrams: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function lookupBarcode(barcode: string): Promise<Product | null> {
  const fields = 'product_name,product_name_nl,product_name_en,brands,nutriments,serving_quantity';
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`, {
    headers: { 'User-Agent': 'LockedIn/0.1 (Android app)' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;

  const p = json.product;
  const n = p.nutriments ?? {};
  const kcal = Number(n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0));
  const name = [p.brands?.split(',')[0]?.trim(), p.product_name_nl || p.product_name_en || p.product_name]
    .filter(Boolean)
    .join(' – ');

  return {
    barcode,
    name: name || `Product ${barcode}`,
    per100: {
      kcal: Math.round(kcal),
      protein: round1(Number(n.proteins_100g ?? 0)),
      carbs: round1(Number(n.carbohydrates_100g ?? 0)),
      fat: round1(Number(n.fat_100g ?? 0)),
    },
    servingGrams: Number(p.serving_quantity) > 0 ? Number(p.serving_quantity) : null,
  };
}

/** Nutrition for a portion of `grams`. */
export function portion(p: Product, grams: number) {
  const f = grams / 100;
  return {
    kcal: Math.round(p.per100.kcal * f),
    protein: round1(p.per100.protein * f),
    carbs: round1(p.per100.carbs * f),
    fat: round1(p.per100.fat * f),
  };
}
