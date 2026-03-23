import { Sparkles } from 'lucide-react';
import { PresetQuickStart } from '../../regulation/PresetQuickStart';
import { useNavigate } from 'react-router-dom';

export function RegulationPresetsTab() {
  const navigate = useNavigate();

  function handlePresetApplied() {
    navigate('/regulation?tab=overview');
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 border border-purple-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Presets</h2>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              Pre-configured support settings for common situations. Apply a preset to instantly adjust signal
              sensitivities and response behaviors without thinking about each setting individually.
            </p>
            <div className="p-4 bg-white/80 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-600 italic">
                Presets are shortcuts, not commitments. You can revert to your previous settings anytime, or manually
                adjust anything after applying a preset.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PresetQuickStart onPresetApplied={handlePresetApplied} />

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">When presets help</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-medium">•</span>
            <span>
              You know roughly what support you need but don't want to configure individual settings
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-medium">•</span>
            <span>You're entering a period where certain patterns are more likely (crunch time, exploration, recovery)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-medium">•</span>
            <span>You want to experiment with different regulation configurations quickly</span>
          </li>
        </ul>
      </div>

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">What happens when you apply a preset</h3>
        <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
          <li>Your current settings are saved as a snapshot</li>
          <li>The preset's configuration is applied to your regulation system</li>
          <li>You'll see a banner in the Overview tab showing the active preset</li>
          <li>You can review exactly what changed, edit individual settings, or revert completely</li>
        </ol>
      </div>
    </div>
  );
}
