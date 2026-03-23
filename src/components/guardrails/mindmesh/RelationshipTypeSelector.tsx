/**
 * Relationship Type Selector
 *
 * Explicit selector for choosing relationship type when creating manual nodes.
 * User must explicitly select a type - no defaults.
 */

import { Check } from 'lucide-react';
import type { RelationshipType } from '../../../lib/mindmesh-v2/types';

interface RelationshipOption {
  type: RelationshipType;
  label: string;
  description: string;
  color: string;
}

const RELATIONSHIP_OPTIONS: RelationshipOption[] = [
  {
    type: 'hierarchy',
    label: 'Hierarchy',
    description: 'Parent-child relationship defining ownership or containment',
    color: 'bg-blue-100 border-blue-300 text-blue-700',
  },
  {
    type: 'composition',
    label: 'Composition',
    description: 'Items combine to form a larger whole',
    color: 'bg-blue-100 border-blue-400 text-blue-800',
  },
  {
    type: 'depends_on',
    label: 'Dependency',
    description: 'One item relies on or blocks another',
    color: 'bg-amber-100 border-amber-300 text-amber-700',
  },
  {
    type: 'references',
    label: 'Reference',
    description: 'Cross-reference or association between items',
    color: 'bg-purple-100 border-purple-300 text-purple-700',
  },
  {
    type: 'inspires',
    label: 'Ideation',
    description: 'Exploratory connection for offshoot ideas',
    color: 'bg-green-100 border-green-300 text-green-700',
  },
];

interface RelationshipTypeSelectorProps {
  position: { x: number; y: number };
  onSelect: (type: RelationshipType) => void;
  onCancel: () => void;
}

export function RelationshipTypeSelector({
  position,
  onSelect,
  onCancel,
}: RelationshipTypeSelectorProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        onClick={onCancel}
      />

      {/* Selector */}
      <div
        className="fixed z-[101] bg-white border border-gray-300 rounded-lg shadow-xl"
        style={{
          left: Math.min(position.x, window.innerWidth - 400),
          top: Math.min(position.y, window.innerHeight - 450),
          width: '380px',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Relationship Type</h3>
          <p className="text-sm text-gray-600 mt-1">
            Choose the type of relationship between these containers
          </p>
        </div>

        {/* Options */}
        <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
          {RELATIONSHIP_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => onSelect(option.type)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${option.color}`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="font-semibold mb-1">{option.label}</div>
                  <div className="text-xs opacity-90">{option.description}</div>
                </div>
                <Check className="h-4 w-4 opacity-0" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
