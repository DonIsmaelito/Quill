
import { FormCompletionChart, FormTypeChart } from "./Charts";

export function ChartSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <FormCompletionChart />
      <FormTypeChart />
    </div>
  );
}
