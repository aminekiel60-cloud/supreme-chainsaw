/** BODY WEIGHT: log your weight and see the trend. Same as Body, opened on weight. */
import { WeightPanel } from '@/components/BodyPanels';
import { FormScroll } from '@/components/FormScroll';

export default function BodyWeightScreen() {
  return (
    <FormScroll>
      <WeightPanel />
    </FormScroll>
  );
}
