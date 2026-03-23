/**
 * Safe Mode Toggle - Emergency Brake
 *
 * Allows user to instantly hide ALL behavioral insights.
 * Reversible, does not delete data.
 *
 * Keyboard shortcut: Ctrl+Shift+S (or Cmd+Shift+S on Mac)
 */

import { useState, useEffect } from 'react';
import { Shield, ShieldOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  toggleSafeMode,
  getSafeModeStatus,
  type SafeModeState,
} from '../../lib/behavioral-sandbox/stage2-service';

export function SafeModeToggle() {
  const { user } = useAuth();
  const [safeModeState, setSafeModeState] = useState<SafeModeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!user) return;

    loadSafeModeStatus();
  }, [user]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleToggle();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [safeModeState]);

  const loadSafeModeStatus = async () => {
    if (!user) return;

    try {
      const status = await getSafeModeStatus(user.id);
      setSafeModeState(status);
    } catch (error) {
      console.error('Failed to load Safe Mode status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!user || toggling) return;

    const newState = !(safeModeState?.is_enabled ?? false);

    setToggling(true);
    try {
      await toggleSafeMode(user.id, {
        enabled: newState,
        reason: newState ? 'User activated Safe Mode' : 'User deactivated Safe Mode',
      });

      await loadSafeModeStatus();
    } catch (error) {
      console.error('Failed to toggle Safe Mode:', error);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
        <Shield className="w-4 h-4 animate-pulse" />
        Loading...
      </div>
    );
  }

  const isEnabled = safeModeState?.is_enabled ?? false;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
          isEnabled
            ? 'bg-orange-50 border-orange-300 hover:bg-orange-100'
            : 'bg-white border-gray-300 hover:bg-gray-50'
        } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isEnabled ? (
          <ShieldOff className="w-5 h-5 text-orange-600 flex-shrink-0" />
        ) : (
          <Shield className="w-5 h-5 text-gray-600 flex-shrink-0" />
        )}

        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">
            {isEnabled ? 'Safe Mode: Active' : 'Safe Mode'}
          </div>
          <div className="text-sm text-gray-600">
            {isEnabled
              ? 'All behavioral insights are hidden'
              : 'Hide all insights instantly'}
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isEnabled
              ? 'bg-orange-200 text-orange-900'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          {isEnabled ? 'ON' : 'OFF'}
        </div>
      </button>

      {isEnabled && (
        <div className="flex items-start gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-900">
            <p className="font-medium mb-1">All behavioral insights are paused</p>
            <p className="text-orange-800">
              Your data is safe. Nothing has been deleted. You can turn insights back on
              whenever you want.
            </p>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 px-1">
        Keyboard shortcut: <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+Shift+S</kbd>
      </div>

      {safeModeState && safeModeState.activation_count > 0 && (
        <div className="text-xs text-gray-500 px-1">
          You have used Safe Mode {safeModeState.activation_count} time
          {safeModeState.activation_count !== 1 ? 's' : ''}. This is normal and expected.
        </div>
      )}
    </div>
  );
}
