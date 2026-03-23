import { supabase } from '../supabase';

export type TrendState = 'new' | 'recurring' | 'settling';
export type TimeWindow = 'today' | '7days' | '14days';

export interface SignalAppearance {
  signal_key: string;
  detected_at: string;
}

export interface SignalTrend {
  signal_key: string;
  signal_name: string;
  trend_state: TrendState;
}

const SIGNAL_NAMES: Record<string, string> = {
  context_switching: 'Rapid Context Switching',
  scope_expansion: 'Runaway Scope Expansion',
  task_hopping: 'Fragmented Focus Session',
  deadline_pressure: 'Time Pressure',
  cognitive_overload: 'Mental Overwhelm',
};

/**
 * Get start date for a given time window
 */
function getWindowStartDate(window: TimeWindow): Date {
  const now = new Date();

  if (window === 'today') {
    return new Date(now.setHours(0, 0, 0, 0));
  } else if (window === '7days') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Get all signal appearances for a user within a time period
 */
async function getSignalAppearances(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SignalAppearance[]> {
  const { data, error } = await supabase
    .from('regulation_active_signals')
    .select('signal_key, detected_at')
    .eq('user_id', userId)
    .gte('detected_at', startDate.toISOString())
    .lte('detected_at', endDate.toISOString())
    .order('detected_at', { ascending: false });

  if (error) {
    console.error('[RegulationTrendService] Error fetching signal appearances:', error);
    return [];
  }

  return data || [];
}

/**
 * Classify a signal's trend state based on its appearances
 */
export function classifySignalTrend(
  signalKey: string,
  appearancesInWindow: SignalAppearance[],
  appearancesBeforeWindow: SignalAppearance[]
): TrendState {
  const inWindowCount = appearancesInWindow.filter(a => a.signal_key === signalKey).length;
  const beforeWindowCount = appearancesBeforeWindow.filter(a => a.signal_key === signalKey).length;

  if (inWindowCount === 0 && beforeWindowCount > 0) {
    return 'settling';
  }

  if (inWindowCount === 1 && beforeWindowCount === 0) {
    return 'new';
  }

  if (inWindowCount > 1) {
    return 'recurring';
  }

  return 'new';
}

/**
 * Get human-readable explanation for a trend state
 */
export function getTrendExplanation(trendState: TrendState): string {
  switch (trendState) {
    case 'new':
      return "This pattern hasn't appeared earlier in this period.";
    case 'recurring':
      return "This pattern has appeared more than once in this period.";
    case 'settling':
      return "This pattern appeared earlier, but hasn't shown up recently.";
  }
}

/**
 * Get trends for all signals in a given time window
 */
export async function getSignalTrends(
  userId: string,
  timeWindow: TimeWindow
): Promise<SignalTrend[]> {
  const windowStart = getWindowStartDate(timeWindow);
  const now = new Date();

  const beforeWindowEnd = new Date(windowStart.getTime() - 1);
  const beforeWindowStart = new Date(windowStart.getTime() - (timeWindow === 'today' ? 7 : 14) * 24 * 60 * 60 * 1000);

  const [appearancesInWindow, appearancesBeforeWindow] = await Promise.all([
    getSignalAppearances(userId, windowStart, now),
    getSignalAppearances(userId, beforeWindowStart, beforeWindowEnd),
  ]);

  const allSignalKeys = new Set([
    ...appearancesInWindow.map(a => a.signal_key),
    ...appearancesBeforeWindow.map(a => a.signal_key),
  ]);

  const trends: SignalTrend[] = [];

  for (const signalKey of allSignalKeys) {
    const trendState = classifySignalTrend(
      signalKey,
      appearancesInWindow,
      appearancesBeforeWindow
    );

    if (trendState !== 'settling' || appearancesInWindow.some(a => a.signal_key === signalKey)) {
      trends.push({
        signal_key: signalKey,
        signal_name: SIGNAL_NAMES[signalKey] || signalKey,
        trend_state: trendState,
      });
    }
  }

  trends.sort((a, b) => {
    const order: Record<TrendState, number> = { recurring: 0, new: 1, settling: 2 };
    return order[a.trend_state] - order[b.trend_state];
  });

  return trends;
}

/**
 * Get trend state for a specific signal
 */
export async function getSignalTrendState(
  userId: string,
  signalKey: string,
  timeWindow: TimeWindow
): Promise<TrendState | null> {
  const trends = await getSignalTrends(userId, timeWindow);
  const trend = trends.find(t => t.signal_key === signalKey);
  return trend?.trend_state || null;
}
