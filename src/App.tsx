import { Suspense, lazy } from 'react';
import { Analytics } from '@vercel/analytics/react';

const CoreApp = lazy(() => import('./core/CoreApp'));

function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
            SharedMinds
          </p>
          <h1
            className="mt-4 text-3xl text-stone-50 sm:text-4xl"
            style={{ fontFamily: '"Iowan Old Style", "Palatino Linotype", Georgia, serif' }}
          >
            Loading your day
          </h1>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Suspense fallback={<AppLoadingScreen />}>
        <CoreApp />
      </Suspense>
      {/* Vercel Web Analytics — privacy-friendly page-view + visitor counts.
          Covers the landing/marketing routes and the app. Only collects once
          Web Analytics is enabled for the project in the Vercel dashboard. */}
      <Analytics />
    </>
  );
}
