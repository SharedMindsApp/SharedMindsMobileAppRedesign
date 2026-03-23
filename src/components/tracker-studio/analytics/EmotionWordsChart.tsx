/**
 * Emotion Words Chart Component
 * 
 * Displays common emotion words from mood tracker entries.
 * Shows word frequency and distribution by mood level.
 */

import { useMemo } from 'react';
import type { EmotionWordsAnalytics } from '../../../lib/trackerStudio/analyticsTypes';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface EmotionWordsChartProps {
  analytics: EmotionWordsAnalytics;
  loading?: boolean;
}

export function EmotionWordsChart({ analytics, loading = false }: EmotionWordsChartProps) {
  const chartData = useMemo(() => {
    return analytics.topEmotions.map(emotion => ({
      word: emotion.word,
      count: emotion.count,
      percentage: emotion.percentage,
    }));
  }, [analytics.topEmotions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading emotion data...</p>
        </div>
      </div>
    );
  }

  if (analytics.entriesWithEmotions === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-sm">No emotion words recorded yet.</p>
          <p className="text-xs text-gray-400 mt-1">Select emotion words when logging your mood to see them here.</p>
        </div>
      </div>
    );
  }

  // Color gradient based on frequency
  const getColor = (index: number, total: number) => {
    const intensity = (total - index) / total;
    const hue = 200 + (intensity * 60); // Blue to purple gradient
    return `hsl(${hue}, 70%, 60%)`;
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Total Entries</p>
          <p className="text-2xl font-bold text-gray-900">{analytics.totalEntries}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">With Emotions</p>
          <p className="text-2xl font-bold text-gray-900">{analytics.entriesWithEmotions}</p>
        </div>
      </div>

      {/* Top Emotions Chart */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Most Common Emotions</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <XAxis type="number" />
            <YAxis 
              dataKey="word" 
              type="category" 
              width={70}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-gray-900">{data.word}</p>
                      <p className="text-sm text-gray-600">
                        Appeared in {data.count} {data.count === 1 ? 'entry' : 'entries'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {data.percentage}% of entries with emotions
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(index, chartData.length)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Emotions by Mood Level */}
      {Object.keys(analytics.emotionsByMoodLevel).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Emotions by Mood Level</h3>
          {[1, 2, 3, 4, 5].map(level => {
            const emotions = analytics.emotionsByMoodLevel[level];
            if (!emotions || emotions.length === 0) return null;

            const emoji = ['😞', '😕', '😐', '🙂', '😄'][level - 1];
            
            return (
              <div key={level} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">Level {level}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {emotions.slice(0, 8).map(emotion => (
                    <span
                      key={emotion.word}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700"
                    >
                      <span>{emotion.word}</span>
                      <span className="text-xs text-gray-500">({emotion.count})</span>
                    </span>
                  ))}
                  {emotions.length > 8 && (
                    <span className="inline-flex items-center px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-500">
                      +{emotions.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
