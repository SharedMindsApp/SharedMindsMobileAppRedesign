import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivitySquare,
  BookOpenText,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  Grid2X2,
  Menu,
  MessageSquareHeart,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  coreNavItems,
  corePrimaryNavItems,
  coreSecondaryNavItems,
  type CoreNavItem,
} from '../coreData';
import { SpaceSwitcher } from './SpaceSwitcher';

const iconMap: Record<CoreNavItem['icon'], typeof Sparkles> = {
  today: Sparkles,
  projects: FolderKanban,
  tasks: ClipboardList,
  calendar: CalendarDays,
  checkins: MessageSquareHeart,
  journal: BookOpenText,
  reports: ActivitySquare,
  settings: Settings2,
};

/* Bottom nav: first 4 primary items + More */
const bottomTabItems = corePrimaryNavItems.slice(0, 4);
/* Items shown in "More" sheet: remaining primary + all secondary */
const moreSheetItems = [...corePrimaryNavItems.slice(4), ...coreSecondaryNavItems];

function stageTone(stage: CoreNavItem['stage']) {
  if (stage === 'Daily') return 'stitch-pill-tone--emerald';
  if (stage === 'Core') return 'stitch-pill-tone--sky';
  return 'stitch-pill-tone--neutral';
}

function RailLink({ item }: { item: CoreNavItem }) {
  const Icon = iconMap[item.icon];

  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) =>
        [
          'core-rail-link',
          isActive ? 'core-rail-link--active' : '',
        ].join(' ')
      }
    >
      <span className="core-rail-link__icon">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold stitch-text-primary">{item.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stageTone(item.stage)}`}>
            {item.stage}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-5 stitch-text-secondary">{item.blurb}</span>
      </span>
    </NavLink>
  );
}

/* ── Sheet navigation row for the More panel ──────────── */
function SheetNavRow({ item, onNavigate }: { item: CoreNavItem; onNavigate: () => void }) {
  const Icon = iconMap[item.icon];
  const location = useLocation();
  const isActive = location.pathname === item.to;

  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavigate}
      className={`core-sheet-nav-row ${isActive ? 'core-sheet-nav-row--active' : ''}`}
    >
      <span className="core-sheet-nav-row__icon">
        <Icon size={20} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{item.label}</span>
        <span className="block text-xs stitch-text-secondary mt-0.5 truncate">{item.blurb}</span>
      </span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${stageTone(item.stage)}`}>
        {item.stage}
      </span>
    </NavLink>
  );
}

export function CoreShell() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const currentPath = location.pathname === '/' ? '/today' : location.pathname;
  const currentItem = coreNavItems.find((item) => item.to === currentPath) ?? corePrimaryNavItems[0];
  const moreIsActive = moreSheetItems.some((item) => item.to === currentPath);

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    [],
  );

  /* Close panels on navigation */
  useEffect(() => {
    setMoreOpen(false);
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="core-app">
      {/* ── Fixed mobile header ──────────────────────── */}
      <header className="core-mobile-header">
        <button
          type="button"
          className="core-header-menu-btn"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={22} strokeWidth={1.75} />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h2 className="text-base font-semibold tracking-[-0.02em] stitch-headline truncate">
            {currentItem.label}
          </h2>
        </div>
        {/* Spacer to balance the menu button */}
        <div className="w-10" />
      </header>

      {/* ── Mobile sidebar drawer ────────────────────── */}
      {sidebarOpen && (
        <>
          <button
            type="button"
            className="core-mobile-sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="core-mobile-sidebar">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="core-brand-mark">SHAREDMINDS</p>
              <button
                type="button"
                className="core-header-menu-btn"
                aria-label="Close navigation"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <div className="px-3 py-2">
              <p className="stitch-overline text-[11px] font-bold uppercase tracking-[0.16em] mb-2 px-2">
                Main loop
              </p>
              <div className="space-y-1">
                {corePrimaryNavItems.map((item) => (
                  <SheetNavRow key={item.to} item={item} onNavigate={() => setSidebarOpen(false)} />
                ))}
              </div>
            </div>

            <div className="px-3 py-2">
              <p className="stitch-overline text-[11px] font-bold uppercase tracking-[0.16em] mb-2 px-2">
                Supporting views
              </p>
              <div className="space-y-1">
                {coreSecondaryNavItems.map((item) => (
                  <SheetNavRow key={item.to} item={item} onNavigate={() => setSidebarOpen(false)} />
                ))}
              </div>
            </div>
          </aside>
        </>
      )}

      <div className="core-shell">
        {/* ── Desktop sidebar (unchanged) ──────────────── */}
        <aside className="core-sidebar">
          <div className="core-panel core-brand-panel">
            <p className="core-brand-mark">SHAREDMINDS</p>
            <h1 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.04em] stitch-text-primary">
              SharedMinds
            </h1>
            <p className="mt-3 text-sm leading-6 stitch-text-secondary">
              Mobile-first support for staying on track yourself and selectively sharing life,
              plans, and calendars with the people you trust.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="core-pill core-pill--emerald">Personal space</span>
              <span className="core-pill core-pill--sky">Shared space ready</span>
            </div>
          </div>

          <div className="core-nav-block">
            <p className="core-overline">Main loop</p>
            <div className="mt-3 space-y-2">
              {corePrimaryNavItems.map((item) => (
                <RailLink key={item.to} item={item} />
              ))}
            </div>
          </div>

          <div className="core-nav-block">
            <p className="core-overline">Supporting views</p>
            <div className="mt-3 space-y-2">
              {coreSecondaryNavItems.map((item) => (
                <RailLink key={item.to} item={item} />
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main content area ──────────────────────────── */}
        <div className="min-w-0 flex-1">
          <SpaceSwitcher formattedDate={formattedDate} currentItemLabel={currentItem.label} />

          <main className="core-main core-main--native">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ── Bottom navigation (mobile) ─── 4 tabs + More ── */}
      <nav className="core-mobile-tabs" aria-label="Primary navigation">
        {bottomTabItems.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `core-mobile-tab ${isActive ? 'core-mobile-tab--active' : ''}`
              }
            >
              <span className="core-mobile-tab__icon">
                <Icon size={22} strokeWidth={1.75} />
              </span>
              <span className="core-mobile-tab__label">{item.shortLabel}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          className={`core-mobile-tab ${moreIsActive || moreOpen ? 'core-mobile-tab--active' : ''}`}
          onClick={() => setMoreOpen((open) => !open)}
        >
          <span className="core-mobile-tab__icon">
            <Grid2X2 size={22} strokeWidth={1.75} />
          </span>
          <span className="core-mobile-tab__label">More</span>
        </button>
      </nav>

      {/* ── More sheet (bottom drawer) ──────────────── */}
      {moreOpen && (
        <>
          <button
            type="button"
            className="core-mobile-sheet-backdrop"
            aria-label="Close extra navigation"
            onClick={() => setMoreOpen(false)}
          />
          <div ref={sheetRef} className="core-mobile-sheet">
            <div className="core-sheet-handle" />
            <p className="stitch-overline text-[11px] font-bold uppercase tracking-[0.16em] mb-3 px-1">
              More in SharedMinds
            </p>
            <div className="space-y-1">
              {moreSheetItems.map((item) => (
                <SheetNavRow key={item.to} item={item} onNavigate={() => setMoreOpen(false)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
