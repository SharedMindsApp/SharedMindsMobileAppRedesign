import { Target } from 'lucide-react';

export function GuardrailsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Target size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Guardrails</h1>
            <p className="text-sm text-gray-500">Household safety and boundaries</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900 font-medium mb-2">Coming Soon</p>
          <p className="text-blue-700 text-sm">
            Guardrails Home – Domain and Project Overview Coming Soon.
          </p>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p>
            This feature will help you set up safety boundaries and guidelines for your household,
            ensuring everyone stays aligned with shared values and expectations.
          </p>
        </div>
      </div>
    </div>
  );
}
