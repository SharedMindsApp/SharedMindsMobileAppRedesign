/**
 * SharedMinds Overview Guide - Web View
 * 
 * Phase 9: Web SharedMinds overview using scrollable layout with visual connections.
 */

import { X } from 'lucide-react';
import { SharedMindsOverviewCard } from './SharedMindsOverviewCard';
import { getAllSharedMindsOverviewSections } from './sharedMindsOverviewContent';

interface SharedMindsOverviewWebProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SharedMindsOverviewWeb({
  isOpen,
  onClose,
}: SharedMindsOverviewWebProps) {
  const sections = getAllSharedMindsOverviewSections();

  if (!isOpen) return null;

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
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              Welcome to SharedMinds
            </h2>
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
            <div className="space-y-4">
              {sections.map(section => (
                <SharedMindsOverviewCard key={section.id} section={section} variant="web" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
