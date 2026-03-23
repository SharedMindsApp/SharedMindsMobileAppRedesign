import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllPresets, getPreset } from '../../lib/regulation/presetRegistry';
import { previewPreset, applyPreset, getActivePreset } from '../../lib/regulation/presetService';
import { PresetPreview } from '../../lib/regulation/presetTypes';
import { PresetCard } from './PresetCard';
import { PresetPreviewModal } from './PresetPreviewModal';

interface PresetQuickStartProps {
  onPresetApplied?: () => void;
}

export function PresetQuickStart({ onPresetApplied }: PresetQuickStartProps) {
  const { user } = useAuth();
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PresetPreview | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const presets = getAllPresets();

  useEffect(() => {
    loadActivePreset();
  }, [user]);

  async function loadActivePreset() {
    if (!user) return;
    const active = await getActivePreset(user.id);
    setActivePresetId(active?.presetId || null);
  }

  async function handlePreview(presetId: string) {
    if (!user) return;
    const preview = await previewPreset(user.id, presetId);
    setPreviewData(preview);
  }

  async function handleApply(presetId: string, shouldEdit: boolean = false) {
    if (!user || isApplying) return;

    setIsApplying(true);
    try {
      await applyPreset(user.id, presetId);
      setActivePresetId(presetId);
      setPreviewData(null);
      onPresetApplied?.();

      if (shouldEdit) {
        // Navigate to calibration page or open edit mode
        // This can be implemented based on your routing structure
      }
    } catch (error) {
      console.error('Failed to apply preset:', error);
      alert('Failed to apply preset. Please try again.');
    } finally {
      setIsApplying(false);
    }
  }

  async function handleQuickApply(presetId: string) {
    if (!user) return;
    const preview = await previewPreset(user.id, presetId);
    if (!preview) return;

    if (preview.warnings.length > 0) {
      setPreviewData(preview);
    } else {
      await handleApply(presetId);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Start with Presets</h2>
          <p className="text-base text-gray-700 leading-relaxed">
            Choose a preset that matches how you're feeling or what you need right now.
            Each one adjusts Regulation's appearance and behavior to support you differently.
          </p>
        </div>
      </div>

      {/* Key Points */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          What you should know
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold mt-0.5">✓</span>
            <span><strong>Presets are starting points</strong> - You can edit any setting afterward</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold mt-0.5">✓</span>
            <span><strong>Nothing is forced</strong> - Presets only change visibility and defaults</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold mt-0.5">✓</span>
            <span><strong>Always reversible</strong> - You can revert or switch presets anytime</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold mt-0.5">✓</span>
            <span><strong>Preview first</strong> - Click Preview to see exactly what will change</span>
          </li>
        </ul>
      </div>

      {/* Preset Cards */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose a preset:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {presets.map(preset => (
            <PresetCard
              key={preset.presetId}
              preset={preset}
              isActive={activePresetId === preset.presetId}
              onPreview={() => handlePreview(preset.presetId)}
              onApply={() => handleQuickApply(preset.presetId)}
            />
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewData && (
        <PresetPreviewModal
          preview={previewData}
          onApply={() => handleApply(previewData.preset.presetId)}
          onApplyAndEdit={() => handleApply(previewData.preset.presetId, true)}
          onCancel={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}
