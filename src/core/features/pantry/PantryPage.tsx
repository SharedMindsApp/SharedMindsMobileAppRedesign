import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PantryWidget } from '../../../components/fridge-canvas/widgets/PantryWidget';
import { GroceryListWidget } from '../../../components/fridge-canvas/widgets/GroceryListWidget';
import { useCoreData } from '../../data/CoreDataContext';
import { PantryAnalyticsPanel } from './PantryAnalyticsPanel';
import { PantryBudgetPanel } from './PantryBudgetPanel';
import { PantryScanPage } from './PantryScanPage';
import { Package, BarChart2, ScanSearch, ShoppingCart, Wallet } from 'lucide-react';

const PANTRY_TABS = [
  { key: 'inventory', label: 'Inventory', path: '/pantry', icon: Package },
  { key: 'shopping', label: 'Shopping', path: '/pantry/shopping', icon: ShoppingCart },
  { key: 'analytics', label: 'Analytics', path: '/pantry/analytics', icon: BarChart2 },
  { key: 'budget', label: 'Budget', path: '/pantry/budget', icon: Wallet },
  { key: 'scan', label: 'Scan', path: '/pantry/scan', icon: ScanSearch },
] as const;

export function PantryPage() {
  const {
    state: { activeSpaceId, spaces },
  } = useCoreData();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSpace = spaces.find((space) => space.id === activeSpaceId) || spaces[0] || null;
  const activeTab = useMemo<'inventory' | 'shopping' | 'analytics' | 'budget' | 'scan'>(() => {
    if (location.pathname.startsWith('/pantry/shopping')) return 'shopping';
    if (location.pathname.startsWith('/pantry/analytics')) return 'analytics';
    if (location.pathname.startsWith('/pantry/budget')) return 'budget';
    if (location.pathname.startsWith('/pantry/scan')) return 'scan';
    return 'inventory';
  }, [location.pathname]);

  if (!activeSpace?.id) {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.6rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-md">
          <p className="text-sm font-medium text-slate-600">Waiting for your Pantry space to load.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-5 sm:space-y-7 overscroll-contain"
      style={{ touchAction: 'pan-y pinch-zoom' }}
    >
      <div className="sticky top-0 z-30 -mx-3 border-b border-slate-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.84))] px-3 pb-3 pt-1 backdrop-blur-md sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0">
        <div className="rounded-[1.6rem] border border-slate-200/70 bg-white/88 p-2 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.32)] backdrop-blur-md">
          <div className="hidden sm:flex flex-wrap items-center gap-1">
            {PANTRY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    isActive
                      ? 'bg-white text-[var(--color-accent,#005bc4)] shadow-md'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
            }}
          >
            {PANTRY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => navigate(tab.path)}
                  aria-label={tab.label}
                  className={`flex h-11 shrink-0 items-center rounded-2xl border text-sm font-bold transition-all ${
                    isActive
                      ? 'min-w-[8.5rem] justify-start gap-2.5 border-[var(--color-accent,#005bc4)] bg-white px-4 text-[var(--color-accent,#005bc4)] shadow-md'
                      : 'w-11 justify-center border-slate-200/80 bg-white/70 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  <Icon size={18} />
                  {isActive && <span>{tab.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab === 'shopping' ? (
        <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-300">
          <div className="rounded-[28px] border border-teal-200/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(240,249,255,0.94))] px-5 py-5 sm:px-6 shadow-[0_20px_60px_-35px_rgba(13,148,136,0.45)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700/75">
                  Pantry Shopping
                </p>
                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                  Keep the refill list next to the stock room
                </h2>
                <p className="max-w-2xl text-sm text-slate-600 sm:text-[15px]">
                  Capture what needs topping up, check items off while you shop, then move them straight into Pantry when they come home.
                </p>
              </div>
            </div>
          </div>

          <GroceryListWidget
            householdId={activeSpace.id}
            viewMode="large"
            key={`shopping-${activeSpace.id}`}
          />
        </div>
      ) : activeTab === 'analytics' ? (
        <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-300">
          <PantryAnalyticsPanel
            spaceId={activeSpace.id}
            spaceName={activeSpace.name}
          />
        </div>
      ) : activeTab === 'budget' ? (
        <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-300">
          <PantryBudgetPanel
            spaceId={activeSpace.id}
            spaceName={activeSpace.name}
          />
        </div>
      ) : activeTab === 'scan' ? (
        <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-300">
          <PantryScanPage
            spaceId={activeSpace.id}
            spaceName={activeSpace.name}
          />
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-300">
          <PantryWidget householdId={activeSpace.id} viewMode="large" key={`widget-${activeSpace.id}`} />
        </div>
      )}
    </div>
  );
}
