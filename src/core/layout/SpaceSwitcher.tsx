import { useMemo } from 'react';
import { useCoreData } from '../data/CoreDataContext';

export function SpaceSwitcher({ formattedDate, currentItemLabel }: { formattedDate: string; currentItemLabel: string }) {
    const { state, switchSpace } = useCoreData();

    const activeSpace = useMemo(() => {
        return state.spaces.find(s => s.id === state.activeSpaceId) || state.spaces[0];
    }, [state.spaces, state.activeSpaceId]);

    if (!state.spaces || state.spaces.length === 0) {
        return (
            <section className="core-panel core-stage-banner">
                <div>
                    <p className="core-overline">Loading spaces...</p>
                </div>
            </section>
        );
    }

    return (
        <section className="core-panel core-stage-banner">
            <div>
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <p className="core-overline">Current space</p>
                    <select
                        className="appearance-none rounded-lg border-0 bg-white/50 py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-emerald-500 max-w-xs cursor-pointer"
                        value={state.activeSpaceId || ''}
                        onChange={(e) => switchSpace(e.target.value)}
                    >
                        {state.spaces.map(space => (
                            <option key={space.id} value={space.id}>
                                {space.name} ({space.type})
                            </option>
                        ))}
                    </select>
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                    {activeSpace?.name || 'Personal space'}, with shared visibility when you choose it
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    SharedMinds keeps one mobile-first workflow for phone and web. The same projects,
                    tasks, calendar, and check-ins can stay personal or be shared with trusted people.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="core-pill core-pill--emerald">{formattedDate}</span>
                <span className="core-pill core-pill--sky">{currentItemLabel}</span>
                <span className="core-pill core-pill--amber">Cross-platform</span>
            </div>
        </section>
    );
}
