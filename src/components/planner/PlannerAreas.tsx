import { PlannerShell } from './PlannerShell';

export function PlannerAreas() {
  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Life Areas</h1>
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center">
          <p className="text-gray-600">
            Life Areas view will organize your planning by life domains.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Coming soon: area-based organization of existing tasks and goals.
          </p>
        </div>
      </div>
    </PlannerShell>
  );
}
