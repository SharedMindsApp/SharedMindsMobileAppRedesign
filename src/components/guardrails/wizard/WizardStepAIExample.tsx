import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { WizardAIService } from '../../../lib/guardrails/ai/wizardAIService';
import { AIErrorBanner, AILoadingState, AIDisabledNotice } from './AIErrorBanner';

export function WizardStepAIExample() {
  const { state, setAIError, disableAIForSession, clearAIError } = useProjectWizard();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projectIdea, setProjectIdea] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAIAnalysis = async () => {
    clearAIError();
    setIsAnalyzing(true);

    try {
      const result = await WizardAIService.analyzeProjectIdea(
        projectIdea,
        state.aiSessionId
      );

      if (!result.success) {
        setAIError(result.error || 'AI analysis failed');

        if (result.errorDetails?.includes('session limit') || result.errorDetails?.includes('disabled')) {
          disableAIForSession();
        }
        return;
      }

      setAnalysisResult(result.data);
      clearAIError();
    } catch (error) {
      setAIError('An unexpected error occurred');
      console.error('AI analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleContinueManually = () => {
    clearAIError();
    setAnalysisResult(null);
  };

  if (state.aiDisabledForSession) {
    return (
      <div className="space-y-4">
        <AIDisabledNotice />

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Continue Manually</h2>
          <p className="text-gray-600 mb-4">
            Please describe your project and we'll help you set it up.
          </p>

          <textarea
            value={projectIdea}
            onChange={(e) => setProjectIdea(e.target.value)}
            placeholder="Describe your project..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AIErrorBanner
        error={state.aiError}
        onRetry={handleAIAnalysis}
        onContinueManually={handleContinueManually}
        onDismiss={clearAIError}
        retriesRemaining={1}
        isRetrying={isAnalyzing}
      />

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">AI-Assisted Project Setup</h2>
        </div>

        <p className="text-gray-600 mb-4">
          Tell us about your project and our AI will help structure it for you.
        </p>

        <textarea
          value={projectIdea}
          onChange={(e) => setProjectIdea(e.target.value)}
          placeholder="Example: I want to write a science fiction novel about AI consciousness..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          rows={4}
          disabled={isAnalyzing}
        />

        {isAnalyzing && (
          <AILoadingState message="Analyzing your project idea..." />
        )}

        {!isAnalyzing && (
          <div className="flex gap-2">
            <button
              onClick={handleAIAnalysis}
              disabled={!projectIdea.trim() || isAnalyzing || !WizardAIService.isAIAvailable()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Analyze with AI
            </button>
            <button
              onClick={handleContinueManually}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Skip AI Suggestions
            </button>
          </div>
        )}

        {analysisResult && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Analysis Complete</h3>
            <div className="text-sm text-green-800 space-y-2">
              <div>
                <strong>Goals:</strong> {analysisResult.goals.join(', ')}
              </div>
              <div>
                <strong>Key Concepts:</strong> {analysisResult.concepts.join(', ')}
              </div>
              <div>
                <strong>Project Type:</strong> {analysisResult.outputType}
              </div>
              <div>
                <strong>Confidence:</strong> {Math.round(analysisResult.confidence * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center">
        AI calls remaining: {WizardAIService.getSessionStats(state.aiSessionId).remainingCalls}
      </div>
    </div>
  );
}
