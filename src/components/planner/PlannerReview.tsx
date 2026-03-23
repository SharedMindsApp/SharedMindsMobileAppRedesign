import { PlannerShell } from './PlannerShell';

export function PlannerReview() {
  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Review</h1>
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center">
          <p className="text-gray-600">
            Review mode will help you reflect on what you've accomplished.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Coming soon: weekly and monthly reviews with existing activity data.
          </p>
        </div>
      </div>
    </PlannerShell>
  );
}
