import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, ArrowRight } from 'lucide-react';
import { convertToProfessionalAccount, updateProfessionalProfile } from '../../lib/professional';

const PROFESSIONAL_TYPES = [
  'Therapist',
  'ADHD Coach',
  'Counselor',
  'Support Worker',
  'Psychologist',
  'Social Worker',
  'Family Therapist',
  'Other',
];

export function ProfessionalOnboarding() {
  const [step, setStep] = useState(1);
  const [professionalType, setProfessionalType] = useState('');
  const [customType, setCustomType] = useState('');
  const [bio, setBio] = useState('');
  const [credentials, setCredentials] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit() {
    if (!professionalType) {
      setError('Please select your professional type');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await convertToProfessionalAccount();

      const finalType = professionalType === 'Other' ? customType : professionalType;
      await updateProfessionalProfile({
        professionalType: finalType,
        professionalBio: bio,
        professionalCredentials: credentials,
      });

      navigate('/professional/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up professional account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={48} />
              <div>
                <h1 className="text-3xl font-bold">Professional Account Setup</h1>
                <p className="text-blue-100 mt-1">
                  Configure your professional profile to support households
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    step >= 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  1
                </div>
                <div className="flex-1 h-1 bg-gray-200">
                  <div
                    className={`h-full transition-all ${
                      step >= 2 ? 'bg-blue-600 w-full' : 'bg-gray-200 w-0'
                    }`}
                  ></div>
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    step >= 2
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  2
                </div>
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What type of professional are you?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {PROFESSIONAL_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setProfessionalType(type)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          professionalType === type
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium">{type}</p>
                      </button>
                    ))}
                  </div>

                  {professionalType === 'Other' && (
                    <input
                      type="text"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="Please specify your professional type"
                      className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!professionalType || (professionalType === 'Other' && !customType)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Continue
                  <ArrowRight size={20} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Bio (Optional)
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief description of your practice and approach..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label
                    htmlFor="credentials"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Credentials (Optional)
                  </label>
                  <input
                    id="credentials"
                    type="text"
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    placeholder="e.g., Licensed Therapist, ADHD-CCSP"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Privacy Notice:</strong> You'll be able to view household insights
                    based on the access level granted by each household. Raw questionnaire answers
                    are never exposed to maintain privacy.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
