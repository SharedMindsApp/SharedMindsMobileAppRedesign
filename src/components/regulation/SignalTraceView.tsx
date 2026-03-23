/**
 * Stage 4.6: Signal Trace View (Interactive Step-by-Step)
 *
 * Interactive visualization of how a signal was computed.
 * Shows step-by-step reasoning with visual timeline.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Clock, Target, TrendingUp, AlertCircle } from 'lucide-react';
import type { SignalTraceExplanation } from '../../lib/regulation/testingModeService';

interface SignalTraceViewProps {
  trace: SignalTraceExplanation;
}

type Step = {
  icon: typeof Clock;
  title: string;
  content: string | string[];
  color: 'blue' | 'purple' | 'green' | 'orange';
};

export function SignalTraceView({ trace }: SignalTraceViewProps) {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps: Step[] = [
    {
      icon: Clock,
      title: 'Evaluation Window',
      content: trace.evaluation_window,
      color: 'blue'
    },
    {
      icon: Target,
      title: 'Events Observed',
      content: trace.events_observed,
      color: 'purple'
    },
    {
      icon: TrendingUp,
      title: 'Threshold Crossed',
      content: trace.threshold_logic,
      color: 'green'
    }
  ];

  if (trace.intensity_reason) {
    steps.push({
      icon: AlertCircle,
      title: 'Intensity',
      content: trace.intensity_reason,
      color: 'orange'
    });
  }

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      icon: 'text-purple-600',
      iconBg: 'bg-purple-100'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      icon: 'text-green-600',
      iconBg: 'bg-green-100'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      icon: 'text-orange-600',
      iconBg: 'bg-orange-100'
    }
  };

  return (
    <div className="border-t-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center border border-amber-300">
            <Info className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Signal Computation Trace</h4>
            <p className="text-sm text-gray-600">Step-by-step analysis of how this pattern was detected</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-white border-2 border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">Testing Information Only</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                This trace shows the internal logic used to detect this pattern. It's descriptive, not evaluative.
                It does not imply intent, fault, or outcome - only what was observed.
              </p>
            </div>
          </div>
        </div>

        {/* Signal Name */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Signal Pattern
          </div>
          <div className="text-lg font-semibold text-gray-900">{trace.signal_name}</div>
        </div>

        {/* Interactive Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = activeStep === index;
            const colors = colorClasses[step.color];
            const StepIcon = step.icon;

            return (
              <div
                key={index}
                className={`border-2 rounded-xl overflow-hidden transition-all ${
                  isActive ? `${colors.border} shadow-md` : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => setActiveStep(isActive ? null : index)}
                  className={`w-full p-4 flex items-center gap-3 transition-colors ${
                    isActive ? colors.bg : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center border ${colors.border}`}>
                    <StepIcon className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">{step.title}</div>
                    {!isActive && (
                      <div className="text-sm text-gray-600 mt-0.5">Click to expand</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Step {index + 1}</span>
                    {isActive ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isActive && (
                  <div className={`p-4 border-t-2 ${colors.border} ${colors.bg}`}>
                    {Array.isArray(step.content) ? (
                      <ul className="space-y-2">
                        {step.content.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className={`${colors.icon} mt-1 font-bold`}>•</span>
                            <span className="text-sm text-gray-700 flex-1">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-700 leading-relaxed">{step.content}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Why Shown - Conclusion */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center border border-green-300">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2">
                Conclusion: Why This Signal Appeared
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{trace.why_shown}</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-white border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 italic leading-relaxed">
            <strong>Important:</strong> This signal appearing doesn't mean something is wrong. It simply reflects observable patterns in your recent activity. Signals are neutral observations, not judgments.
          </p>
        </div>
      </div>
    </div>
  );
}
