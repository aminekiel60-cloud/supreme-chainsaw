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
  /** Where the data came from */
  source: 'openfoodfacts' | 'community';
  /** False when the database knows the product but not its nutrition values */
  complete: boolean;
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
  const serving = Number(p.serving_quantity) > 0 ? Number(p.serving_quantity) : null;

  // Values per 100 g; fall back to per-serving values when that's all the label gives.
  const per100 = (key: string): number | null => {
    const v = Number(n[`${key}_100g`]);
    if (Number.isFinite(v) && n[`${key}_100g`] !== undefined && n[`${key}_100g`] !== '') return v;
    const sv = Number(n[`${key}_serving`]);
    if (serving && Number.isFinite(sv) && n[`${key}_serving`] !== undefined) return (sv / serving) * 100;
    return null;
  };
  const kj = per100('energy-kj') ?? per100('energy');
  const kcal = per100('energy-kcal') ?? (kj !== null ? kj / 4.184 : null);
  const protein = per100('proteins');
  const carbs = per100('carbohydrates');
  const fat = per100('fat');

  const name = [p.brands?.split(',')[0]?.trim(), p.product_name_nl || p.product_name_en || p.product_name]
    .filter(Boolean)
    .join(' ');

  return {
    barcode,
    name: name || `Product ${barcode}`,
    per100: {
      kcal: Math.round(kcal ?? 0),
      protein: round1(protein ?? 0),
      carbs: round1(carbs ?? 0),
      fat: round1(fat ?? 0),
    },
    servingGrams: serving,
    source: 'openfoodfacts',
    // Many products are in the database without a nutrition table yet.
    complete: kcal !== null && (kcal > 0 || [protein, carbs, fat].some((x) => (x ?? 0) > 0)),
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
