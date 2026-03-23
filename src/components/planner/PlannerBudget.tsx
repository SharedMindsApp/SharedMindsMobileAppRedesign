import { useNavigate } from 'react-router-dom';
import { BarChart3, CreditCard, FolderTree, Target, FileText } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

export function PlannerBudget() {
  const navigate = useNavigate();

  const features: LifeAreaFeature[] = [
    {
      id: 'overview',
      icon: BarChart3,
      label: 'Budget Overview',
      description: 'High-level snapshot of your budget and spending',
      route: '/planner/budget/overview',
    },
    {
      id: 'expenses',
      icon: CreditCard,
      label: 'Expenses',
      description: 'Track and categorize your expenses',
      route: '/planner/budget/expenses',
    },
    {
      id: 'categories',
      icon: FolderTree,
      label: 'Categories',
      description: 'Organize spending by category',
      route: '/planner/budget/categories',
    },
    {
      id: 'goals',
      icon: Target,
      label: 'Savings Goals',
      description: 'Set and track savings targets',
      route: '/planner/budget/goals',
    },
    {
      id: 'reports',
      icon: FileText,
      label: 'Reports',
      description: 'View detailed budget reports and insights',
      route: '/planner/budget/reports',
    },
  ];

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Budget</h1>
          <p className="text-xs md:text-sm text-gray-500">Expenses, savings, and budget tracking</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={features} className="mb-4 md:mb-6" themeColor="teal" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => navigate(feature.route!)}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-100 hover:border-teal-200 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-600 group-hover:from-teal-100 group-hover:to-emerald-100 transition-colors">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors">
                  {feature.label}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </PlannerShell>
  );
}
