/** PLATE CALCULATOR: which plates go on each side of the bar. */
import { router } from 'expo-router';

import { PlateCalc } from '@/components/PlateCalc';

export default function ToolsScreen() {
  return <PlateCalc weight={60} onClose={() => router.back()} />;
}
