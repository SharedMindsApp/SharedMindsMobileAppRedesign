/**
 * Stage 4.5: Regulation Onboarding Flow
 *
 * 4-screen calm explanation of what Regulation is and is not.
 * Skippable at any point, never re-forced.
 */

import { useState } from 'react';
import { X, ArrowRight, CheckCircle, Eye, Wrench, Shield } from 'lucide-react';

interface RegulationOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

type Screen = 1 | 2 | 3 | 4;

export function RegulationOnboarding({ onComplete, onSkip }: RegulationOnboardingProps) {
  const [screen, setScreen] = useState<Screen>(1);

  const handleNext = () => {
    if (screen < 4) {
      setScreen((screen + 1) as Screen);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Understanding Regulation
          </div>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {screen === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Regulation helps you notice patterns in how you work — nothing more.
                </h2>
              </div>

              <div className="space-y-4 text-gray-700">
                <p>
                  Regulation shows signals when certain patterns appear in how you use the app.
                  These signals are descriptive, not judgments.
                </p>

                <p className="font-medium">
                  They don't mean something is wrong.
                  They simply reflect what's happening right now.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-800 font-medium">Explicitly:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Signals do not diagnose</li>
                    <li>• Signals do not score you</li>
                    <li>• Signals do not compare you to others</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {screen === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Signals are observations, not instructions.
                </h2>
              </div>

              <div className="space-y-4 text-gray-700">
                <p>
                  A signal appears when a recognizable pattern shows up — for example:
                </p>

                <ul className="space-y-2 ml-4">
                  <li>• Switching contexts quickly</li>
                  <li>• Adding lots of scope at once</li>
                  <li>• Long gaps without activity</li>
                </ul>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-900">Signals:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Appear quietly</li>
                    <li>• Expire automatically</li>
                    <li>• Can be dismissed or hidden</li>
                  </ul>
                </div>

                <p className="font-medium text-gray-900">
                  You never have to act on a signal.
                </p>
              </div>
            </div>
          )}

          {screen === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Responses are tools you choose to use — or not.
                </h2>
              </div>

              <div className="space-y-4 text-gray-700">
                <p>
                  Responses are optional tools you can use if a signal feels relevant.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-gray-900">Nothing runs automatically.</p>
                  <p className="font-medium text-gray-900">Nothing activates without your choice.</p>
                </div>

                <p>You can:</p>
                <ul className="space-y-2 ml-4">
                  <li>• Use a response</li>
                  <li>• Undo it</li>
                  <li>• Ignore it completely</li>
                </ul>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-900">Explicit:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• No "best" response</li>
                    <li>• No penalties for not using responses</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {screen === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  You always stay in control.
                </h2>
              </div>

              <div className="space-y-4 text-gray-700">
                <p>You can:</p>
                <ul className="space-y-2 ml-4">
                  <li>• Set personal limits to keep things quiet</li>
                  <li>• Pause regulation entirely</li>
                  <li>• Add context when life gets in the way</li>
                </ul>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-800">
                    If you take time away, Regulation won't assume anything.
                    You decide what matters.
                  </p>
                </div>

                <p className="text-lg font-medium text-gray-900 pt-4">
                  Regulation exists to support your judgment — not replace it.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Skip for now
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {screen === 4 ? 'Go to Regulation Hub' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
