/**
 * Guardrails Guide - Web View
 * 
 * Phase 9: Web Guardrails feature guide.
 * Shows feature index first, then allows navigation between features.
 */

import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { GuardrailsGuideCard } from './GuardrailsGuideCard';
import { GuardrailsFeaturesIndex } from './GuardrailsFeaturesIndex';
import { getGuardrailsGuideItem, getAllGuardrailsGuideItems } from './guardrailsGuideContent';

interface GuardrailsGuideWebProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  sectionId?: string;
}

export function GuardrailsGuideWeb({
  isOpen,
  onClose,
  onBack,
  sectionId: initialSectionId,
}: GuardrailsGuideWebProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(initialSectionId || null);
  const features = getAllGuardrailsGuideItems();
  const currentFeature = selectedSectionId ? getGuardrailsGuideItem(selectedSectionId) : null;

  if (!isOpen) return null;

  const handleSelectFeature = (featureId: string) => {
    setSelectedSectionId(featureId);
  };

  const handleBackToIndex = () => {
    setSelectedSectionId(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto ${
            currentFeature ? 'max-w-4xl' : 'max-w-6xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              {selectedSectionId ? (
                <button
                  onClick={handleBackToIndex}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Back to features"
                >
                  <ArrowLeft size={20} className="text-gray-500" />
                </button>
              ) : onBack ? (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} className="text-gray-500" />
                </button>
              ) : null}
              <h2 className="text-2xl font-semibold text-gray-900">
                {currentFeature ? currentFeature.title : 'Guardrails Features'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {currentFeature ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Feature Content */}
                <div className="lg:col-span-2">
                  <GuardrailsGuideCard feature={currentFeature} variant="web" />
                </div>

                {/* Quick Navigation Sidebar */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Other Features
                    </h3>
                    <div className="space-y-2">
                      {features
                        .filter(f => f.id !== selectedSectionId)
                        .map(feature => (
                          <button
                            key={feature.id}
                            onClick={() => handleSelectFeature(feature.id)}
                            className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <span className="text-lg">{feature.icon}</span>
                            <span className="text-sm font-medium text-gray-700">
                              {feature.title}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <GuardrailsFeaturesIndex
                features={features}
                onSelectFeature={handleSelectFeature}
                variant="web"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
