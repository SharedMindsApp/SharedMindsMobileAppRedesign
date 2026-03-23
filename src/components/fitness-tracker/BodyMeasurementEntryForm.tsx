/**
 * Body Measurement Entry Form
 * 
 * Form for logging body measurements
 * Low friction, pressure-free design
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BodyMeasurementService } from '../../lib/fitnessTracker/bodyMeasurementService';
import type { CreateBodyMeasurementInput, BodyMeasurementEntry, MeasurementContextTag } from '../../lib/fitnessTracker/bodyTransformationTypes';
import { MEASUREMENT_CONTEXT_TAGS } from '../../lib/fitnessTracker/bodyTransformationTypes';
import { X, Save, Loader2, Tag } from 'lucide-react';
import { showToast } from '../Toast';

type BodyMeasurementEntryFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialMeasurement?: BodyMeasurementEntry;
};

export function BodyMeasurementEntryForm({
  isOpen,
  onClose,
  onSaved,
  initialMeasurement,
}: BodyMeasurementEntryFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const measurementService = new BodyMeasurementService();

  // Form state
  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = now.toTimeString().slice(0, 5);

  const [measurementDate, setMeasurementDate] = useState<string>(defaultDate);
  const [measurementTime, setMeasurementTime] = useState<string>(defaultTime);
  const [bodyweightKg, setBodyweightKg] = useState<string>('');
  const [waistCm, setWaistCm] = useState<string>('');
  const [hipsCm, setHipsCm] = useState<string>('');
  const [chestCm, setChestCm] = useState<string>('');
  const [thighCm, setThighCm] = useState<string>('');
  const [armCm, setArmCm] = useState<string>('');
  const [contextTags, setContextTags] = useState<MeasurementContextTag[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Load initial measurement if editing
  useEffect(() => {
    if (initialMeasurement) {
      setMeasurementDate(initialMeasurement.measurementDate);
      setMeasurementTime(initialMeasurement.measurementTime || defaultTime);
      setBodyweightKg(initialMeasurement.bodyweightKg?.toString() || '');
      setWaistCm(initialMeasurement.waistCm?.toString() || '');
      setHipsCm(initialMeasurement.hipsCm?.toString() || '');
      setChestCm(initialMeasurement.chestCm?.toString() || '');
      setThighCm(initialMeasurement.thighCm?.toString() || '');
      setArmCm(initialMeasurement.armCm?.toString() || '');
      setContextTags(initialMeasurement.contextTags || []);
      setNotes(initialMeasurement.notes || '');
    } else {
      // Reset form for new entry
      setMeasurementDate(defaultDate);
      setMeasurementTime(defaultTime);
      setBodyweightKg('');
      setWaistCm('');
      setHipsCm('');
      setChestCm('');
      setThighCm('');
      setArmCm('');
      setContextTags([]);
      setNotes('');
    }
  }, [initialMeasurement, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate at least one measurement
    const hasMeasurement = bodyweightKg || waistCm || hipsCm || chestCm || thighCm || armCm;
    if (!hasMeasurement) {
      showToast('Please enter at least one measurement', 'error');
      return;
    }

    try {
      setLoading(true);

      const input: CreateBodyMeasurementInput = {
        measurementDate,
        measurementTime: measurementTime || undefined,
        bodyweightKg: bodyweightKg ? parseFloat(bodyweightKg) : undefined,
        waistCm: waistCm ? parseFloat(waistCm) : undefined,
        hipsCm: hipsCm ? parseFloat(hipsCm) : undefined,
        chestCm: chestCm ? parseFloat(chestCm) : undefined,
        thighCm: thighCm ? parseFloat(thighCm) : undefined,
        armCm: armCm ? parseFloat(armCm) : undefined,
        contextTags: contextTags.length > 0 ? contextTags : undefined,
        notes: notes.trim() || undefined,
      };

      if (initialMeasurement) {
        await measurementService.updateMeasurement(user.id, {
          id: initialMeasurement.id,
          ...input,
        });
        showToast('Measurement updated successfully', 'success');
      } else {
        await measurementService.createMeasurement(user.id, input);
        showToast('Measurement logged successfully', 'success');
      }

      onSaved();
    } catch (error) {
      console.error('Failed to save measurement:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to save measurement',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <h2 className="text-2xl font-bold text-gray-900">
              {initialMeasurement ? 'Edit Measurement' : 'Log Measurement'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={measurementDate}
                  onChange={(e) => setMeasurementDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time (optional)
                </label>
                <input
                  type="time"
                  value={measurementTime}
                  onChange={(e) => setMeasurementTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Core Measurements */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Measurements</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bodyweight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={bodyweightKg}
                    onChange={(e) => setBodyweightKg(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waist (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={waistCm}
                    onChange={(e) => setWaistCm(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hips (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={hipsCm}
                    onChange={(e) => setHipsCm(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chest (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={chestCm}
                    onChange={(e) => setChestCm(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thigh (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={thighCm}
                    onChange={(e) => setThighCm(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arm (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={armCm}
                    onChange={(e) => setArmCm(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Context Tags */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={16} className="text-gray-500" />
                <label className="block text-sm font-medium text-gray-700">
                  Context Tags (optional)
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Help explain fluctuations - select any that apply
              </p>
              <div className="flex flex-wrap gap-2">
                {MEASUREMENT_CONTEXT_TAGS.map((tagInfo) => {
                  const isSelected = contextTags.includes(tagInfo.tag);
                  return (
                    <button
                      key={tagInfo.tag}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setContextTags(contextTags.filter(t => t !== tagInfo.tag));
                        } else {
                          setContextTags([...contextTags, tagInfo.tag]);
                        }
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                      title={tagInfo.description}
                    >
                      {tagInfo.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., post-training, morning weigh-in"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{initialMeasurement ? 'Update' : 'Save'} Measurement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
