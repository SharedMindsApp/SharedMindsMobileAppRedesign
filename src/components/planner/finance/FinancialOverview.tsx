import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, CreditCard, Shield } from 'lucide-react';
import { PlannerShell } from '../PlannerShell';
import {
  getIncomeSources,
  getExpenses,
  getSavingsGoals,
  getDebts,
  getInvestments,
  type IncomeSource,
  type Expense,
  type SavingsGoal,
  type Debt,
  type Investment
} from '../../../lib/financeService';

export function FinancialOverview() {
  const navigate = useNavigate();
  const [income, setIncome] = useState<IncomeSource[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [incomeData, expensesData, savingsData, debtsData, investmentsData] = await Promise.all([
        getIncomeSources(),
        getExpenses(),
        getSavingsGoals(),
        getDebts(),
        getInvestments()
      ]);
      setIncome(incomeData);
      setExpenses(expensesData);
      setSavings(savingsData);
      setDebts(debtsData);
      setInvestments(investmentsData);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalMonthlyIncome = income
    .filter(s => s.frequency === 'monthly')
    .reduce((sum, s) => sum + (s.actual_amount || s.expected_amount || 0), 0);

  const totalMonthlyExpenses = expenses
    .filter(e => e.frequency === 'monthly')
    .reduce((sum, e) => sum + e.amount, 0);

  const cashFlow = totalMonthlyIncome - totalMonthlyExpenses;

  const totalSavings = savings.reduce((sum, s) => sum + s.current_amount, 0);
  const totalSavingsTarget = savings.reduce((sum, s) => sum + s.target_amount, 0);

  const totalDebt = debts.reduce((sum, d) => sum + d.current_balance, 0);

  const totalInvestments = investments.reduce((sum, i) => sum + (i.estimated_value || 0), 0);

  const netWorth = totalSavings + totalInvestments - totalDebt;

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-7xl mx-auto p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Financial Overview</h1>
          <p className="text-slate-600">Your financial snapshot at a glance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Cash Flow Status */}
          <button
            onClick={() => navigate('/planner/finance/income')}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all text-left border border-slate-100 hover:border-emerald-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                {cashFlow >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-rose-600" />
                )}
              </div>
              <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                cashFlow >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {cashFlow >= 0 ? 'Positive' : 'Negative'}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Monthly Cash Flow</h3>
            <p className="text-2xl font-bold text-slate-900">${Math.abs(cashFlow).toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-2">Income - Expenses</p>
          </button>

          {/* Savings Progress */}
          <button
            onClick={() => navigate('/planner/finance/savings')}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all text-left border border-slate-100 hover:border-teal-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-teal-600" />
              </div>
              <div className="text-sm font-medium text-teal-700 px-3 py-1 rounded-full bg-teal-50">
                {totalSavingsTarget > 0 ? Math.round((totalSavings / totalSavingsTarget) * 100) : 0}%
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Savings Progress</h3>
            <p className="text-2xl font-bold text-slate-900">${totalSavings.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-2">of ${totalSavingsTarget.toLocaleString()} goal</p>
          </button>

          {/* Debt Status */}
          <button
            onClick={() => navigate('/planner/finance/debts')}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all text-left border border-slate-100 hover:border-amber-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-sm font-medium text-amber-700 px-3 py-1 rounded-full bg-amber-50">
                {debts.length} active
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Total Debt</h3>
            <p className="text-2xl font-bold text-slate-900">${totalDebt.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-2">Across all obligations</p>
          </button>

          {/* Investments */}
          <button
            onClick={() => navigate('/planner/finance/investments')}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all text-left border border-slate-100 hover:border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-sm font-medium text-blue-700 px-3 py-1 rounded-full bg-blue-50">
                {investments.length} assets
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Investments & Assets</h3>
            <p className="text-2xl font-bold text-slate-900">${totalInvestments.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-2">Current estimated value</p>
          </button>

          {/* Net Worth */}
          <button
            onClick={() => navigate('/planner/finance/overview')}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all text-left border border-slate-100 hover:border-slate-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-slate-600" />
              </div>
              <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                netWorth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                Net Worth
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Net Position</h3>
            <p className="text-2xl font-bold text-slate-900">${netWorth.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-2">Assets - Liabilities</p>
          </button>

          {/* Protection */}
          <button
            onClick={() => navigate('/planner/finance/insurance')}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all text-left border border-slate-100 hover:border-cyan-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center">
                <Shield className="w-6 h-6 text-cyan-600" />
              </div>
              <div className="text-sm font-medium text-cyan-700 px-3 py-1 rounded-full bg-cyan-50">
                Protected
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Insurance & Protection</h3>
            <p className="text-2xl font-bold text-slate-900">View Policies</p>
            <p className="text-sm text-slate-500 mt-2">Coverage and adequacy</p>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/planner/finance/income')}
              className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-emerald-50 transition-colors border border-slate-200"
            >
              Update Income
            </button>
            <button
              onClick={() => navigate('/planner/finance/expenses')}
              className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-emerald-50 transition-colors border border-slate-200"
            >
              Track Expenses
            </button>
            <button
              onClick={() => navigate('/planner/finance/savings')}
              className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-emerald-50 transition-colors border border-slate-200"
            >
              Update Savings
            </button>
            <button
              onClick={() => navigate('/planner/finance/reflection')}
              className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-emerald-50 transition-colors border border-slate-200"
            >
              Financial Reflection
            </button>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
