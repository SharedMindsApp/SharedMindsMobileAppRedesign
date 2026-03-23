import { useNavigate } from 'react-router-dom';
import { BarChart3, DollarSign, TrendingUp, PiggyBank, CreditCard, BookOpen, Shield, Wallet, Target } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

interface FeatureCard {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  route: string;
}

const features: FeatureCard[] = [
  {
    id: 'overview',
    icon: BarChart3,
    title: 'Financial Overview',
    description: 'High-level snapshot of your financial health',
    route: '/planner/finance/overview'
  },
  {
    id: 'income',
    icon: DollarSign,
    title: 'Income & Cash Flow',
    description: 'Track where your money comes from',
    route: '/planner/finance/income'
  },
  {
    id: 'expenses',
    icon: CreditCard,
    title: 'Spending & Expenses',
    description: 'High-level expense awareness',
    route: '/planner/finance/expenses'
  },
  {
    id: 'savings',
    icon: PiggyBank,
    title: 'Savings & Safety Nets',
    description: 'Build security and prepare for what matters',
    route: '/planner/finance/savings'
  },
  {
    id: 'investments',
    icon: TrendingUp,
    title: 'Investments & Assets',
    description: 'Long-term wealth building with clarity',
    route: '/planner/finance/investments'
  },
  {
    id: 'debts',
    icon: Wallet,
    title: 'Debts & Commitments',
    description: 'Manage obligations with clarity, not stress',
    route: '/planner/finance/debts'
  },
  {
    id: 'insurance',
    icon: Shield,
    title: 'Protection & Insurance',
    description: 'Coverage, adequacy, and peace of mind',
    route: '/planner/finance/insurance'
  },
  {
    id: 'retirement',
    icon: Target,
    title: 'Retirement & Long-term',
    description: 'Time-horizon thinking about what enough looks like',
    route: '/planner/finance/retirement'
  },
  {
    id: 'reflection',
    icon: BookOpen,
    title: 'Financial Reflection',
    description: 'Monthly and annual money reviews',
    route: '/planner/finance/reflection'
  }
];

export function PlannerFinance() {
  const navigate = useNavigate();

  const mobileFeatures: LifeAreaFeature[] = features.map(f => ({
    id: f.id,
    icon: f.icon,
    label: f.title,
    description: f.description,
    route: f.route,
  }));

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Finance & Wealth</h1>
          <p className="text-xs md:text-sm text-gray-500">Financial planning, security, and long-term wealth building</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={mobileFeatures} className="mb-4 md:mb-6" themeColor="emerald" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => navigate(feature.route)}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-100 hover:border-emerald-200 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">
                  {feature.title}
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
