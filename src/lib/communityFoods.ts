/**
 * Community food database: products Locked in users added because the barcode
 * wasn't in Open Food Facts. Shared with everyone as soon as they're added;
 * a product disappears once 3 different users report it as wrong.
 */
import { lookupBarcode, type Product } from '@/data/openFoodFacts';
import { cloudEnabled, db } from './supabase';

type Row = {
  barcode: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_grams: number | null;
};

const toProduct = (r: Row): Product => ({
  barcode: r.barcode,
  name: r.name,
  per100: { kcal: Number(r.kcal), protein: Number(r.protein), carbs: Number(r.carbs), fat: Number(r.fat) },
  servingGrams: r.serving_grams ? Number(r.serving_grams) : null,
  source: 'community',
});

/** Look a barcode up: the Locked in community first, then Open Food Facts. */
export async function findProduct(barcode: string): Promise<Product | null> {
  if (cloudEnabled) {
    const { data } = await db()
      .from('community_foods')
      .select('barcode, name, kcal, protein, carbs, fat, serving_grams')
      .eq('barcode', barcode)
      .maybeSingle();
    if (data) return toProduct(data);
  }
  return lookupBarcode(barcode);
}

/** Share a missing product with all Locked in users. */
export async function addCommunityFood(p: Omit<Product, 'source'>): Promise<Product> {
  const { data: user } = await db().auth.getUser();
  const { error } = await db().from('community_foods').insert({
    barcode: p.barcode,
    name: p.name.trim(),
    kcal: p.per100.kcal,
    protein: p.per100.protein,
    carbs: p.per100.carbs,
    fat: p.per100.fat,
    serving_grams: p.servingGrams,
    created_by: user.user?.id,
  });
  if (error) {
    if (error.code === '23505') throw new Error('This product was reported as wrong by other users. Add it to your log by hand instead.');
    if (error.code === '23514') throw new Error('Please check the values: per 100 g, max 950 kcal and 100 g per macro.');
    throw new Error('Could not save the product. Check your connection and try again.');
  }
  return { ...p, source: 'community' };
}

/** Report a community product as wrong. */
export async function reportCommunityFood(barcode: string) {
  const { error } = await db().rpc('report_community_food', { p_barcode: barcode });
  if (error) throw new Error('Could not send the report. Try again later.');
}
