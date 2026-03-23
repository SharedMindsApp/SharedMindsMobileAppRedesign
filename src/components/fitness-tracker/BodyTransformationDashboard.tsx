/**
 * Body Transformation Dashboard
 * 
 * Main view for body transformation tracking
 * Shows measurements, trends, and cross-tracker insights
 * Philosophy: Observations only, no pressure
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { BodyMeasurementService } from '../../lib/fitnessTracker/bodyMeasurementService';
import { BodyTransformationIntelligenceService } from '../../lib/fitnessTracker/bodyTransformationIntelligenceService';
import type { BodyMeasurementEntry, BodyStateSummary, BodyProfile } from '../../lib/fitnessTracker/bodyTransformationTypes';
import { Calendar, TrendingUp, TrendingDown, Minus, Plus, Edit2, BarChart3, X } from 'lucide-react';
import { BodyMeasurementEntryForm } from './BodyMeasurementEntryForm';
import { BodyTransformationActivationCard } from './BodyTransformationActivationCard';
import { showToast } from '../Toast';

type BodyTransformationDashboardProps = {
  onHide?: () => void;
};

export function BodyTransformationDashboard({ onHide }: BodyTransformationDashboardProps = {}) {
  const { user } = useAuth();
  const { updateCustomOverride } = useUIPreferences();
  const [summary, setSummary] = useState<BodyStateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurementEntry | null>(null);

  const measurementService = new BodyMeasurementService();
  const intelligenceService = new BodyTransformationIntelligenceService();

  useEffect(() => {
    if (user) {
      loadProfile();
      loadSummary();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setLoadingProfile(true);
      const bodyProfile = await measurementService.getProfile(user.id);
      setProfile(bodyProfile);
    } catch (error) {
      console.error('Failed to load body profile:', error);
      // If migration not applied, profile will be null (handled gracefully by activation card)
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadSummary = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const bodyState = await intelligenceService.getBodyStateSummary(user.id);
      setSummary(bodyState);
    } catch (error) {
      console.error('Failed to load body state summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMeasurementSaved = () => {
    setShowEntryForm(false);
    setEditingMeasurement(null);
    loadSummary();
  };

  const handleEditMeasurement = (measurement: BodyMeasurementEntry) => {
    setEditingMeasurement(measurement);
    setShowEntryForm(true);
  };

  const handleHide = async () => {
    try {
      await updateCustomOverride('bodyTransformationVisible', false);
      showToast('success', 'Body Transformation tracker hidden');
      if (onHide) {
        onHide();
      }
    } catch (error) {
      console.error('Failed to hide body transformation tracker:', error);
      showToast('error', 'Failed to hide tracker');
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-24 sm:h-32 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-48 sm:h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Show activation card if no profile exists
  if (!profile && summary?.measurementCount === 0) {
    return (
      <div className="relative">
        <button
          onClick={handleHide}
          className="absolute top-2 right-2 z-10 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove Body Transformation tracker"
        >
          <X size={18} />
        </button>
        <BodyTransformationActivationCard onActivated={loadProfile} />
      </div>
    );
  }

  // Show empty state if profile exists but no measurements
  if (profile && (!summary || summary.measurementCount === 0)) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Body Transformation</h2>
            <p className="text-gray-600 text-xs sm:text-sm mt-0.5">Track how your body adapts to your training</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setShowEntryForm(true)}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-sm"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Log Measurement</span>
              <span className="sm:hidden">Log</span>
            </button>
            <button
              onClick={handleHide}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove Body Transformation tracker"
            >
              <X size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
        
        <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 px-4">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-blue-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">Ready to Track!</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-2">Start logging measurements to see how your body adapts to your training.</p>
          <button
            onClick={() => setShowEntryForm(true)}
            className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg text-sm sm:text-base"
          >
            Log First Measurement
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const { latestMeasurement, trends, insights, measurementCount, daysSinceLastMeasurement } = summary;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Body Transformation</h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-0.5">Track how your body adapts to your training</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => {
              setEditingMeasurement(null);
              setShowEntryForm(true);
            }}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-sm"
          >
            <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">Log Measurement</span>
            <span className="sm:hidden">Log</span>
          </button>
          <button
            onClick={handleHide}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove Body Transformation tracker"
          >
            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </div>

      {/* Latest Measurement Card */}
      {latestMeasurement && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1">Latest Measurement</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {new Date(latestMeasurement.measurementDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={() => handleEditMeasurement(latestMeasurement)}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <Edit2 size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {latestMeasurement.bodyweightKg && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5 sm:mb-1">Weight</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{latestMeasurement.bodyweightKg.toFixed(1)} kg</p>
              </div>
            )}
            {latestMeasurement.waistCm && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5 sm:mb-1">Waist</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{latestMeasurement.waistCm.toFixed(1)} cm</p>
              </div>
            )}
            {latestMeasurement.hipsCm && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5 sm:mb-1">Hips</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{latestMeasurement.hipsCm.toFixed(1)} cm</p>
              </div>
            )}
            {latestMeasurement.chestCm && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5 sm:mb-1">Chest</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{latestMeasurement.chestCm.toFixed(1)} cm</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trends */}
      {trends.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <BarChart3 size={18} className="sm:w-5 sm:h-5 text-gray-600" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Trends</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {trends.map(trend => (
              <TrendCard key={trend.metric} trend={trend} />
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Insights</h3>
          <div className="space-y-2.5 sm:space-y-3">
            {insights.slice(0, 3).map((insight, index) => (
              <div
                key={index}
                className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-sm text-gray-700">{insight.message}</p>
                <p className="text-xs text-gray-500 mt-1.5 sm:mt-2">{insight.timeFrame}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm text-center">
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{measurementCount}</p>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Total Measurements</p>
        </div>
        {daysSinceLastMeasurement !== undefined && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm text-center">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{daysSinceLastMeasurement}</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Days Since Last</p>
          </div>
        )}
      </div>

      {/* Entry Form Modal */}
      {showEntryForm && (
        <BodyMeasurementEntryForm
          isOpen={showEntryForm}
          onClose={() => {
            setShowEntryForm(false);
            setEditingMeasurement(null);
          }}
          onSaved={handleMeasurementSaved}
          initialMeasurement={editingMeasurement || undefined}
        />
      )}
    </div>
  );
}

/**
 * Trend Card Component
 */
function TrendCard({ trend }: { trend: any }) {
  const TrendIcon = trend.trend === 'increasing' ? TrendingUp 
    : trend.trend === 'decreasing' ? TrendingDown 
    : Minus;

  const trendColor = trend.trend === 'increasing' ? 'text-green-600'
    : trend.trend === 'decreasing' ? 'text-blue-600'
    : 'text-gray-600';

  return (
    <div className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <TrendIcon size={18} className={`sm:w-5 sm:h-5 flex-shrink-0 ${trendColor}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-900 capitalize truncate">{trend.metric}</p>
          {trend.changeOverPeriod && (
            <p className="text-xs text-gray-600 truncate">
              {trend.changeOverPeriod.value > 0 ? '+' : ''}{trend.changeOverPeriod.value.toFixed(1)} {trend.unit}
              {trend.changeOverPeriod.percentage && ` (${trend.changeOverPeriod.percentage.toFixed(1)}%)`}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">{trend.changeOverPeriod?.period || ''}</p>
    </div>
  );
}
