import { PlannerShell } from '../PlannerShell';
import { Shield } from 'lucide-react';

export function ProtectionAndInsurance() {
  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Protection & Insurance</h1>
          <p className="text-slate-600">Coverage, adequacy, and peace of mind</p>
        </div>

        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Insurance tracking coming soon</h3>
          <p className="text-slate-600 mb-4">Manage policies, coverage, and renewal dates</p>
        </div>
      </div>
    </PlannerShell>
  );
}
