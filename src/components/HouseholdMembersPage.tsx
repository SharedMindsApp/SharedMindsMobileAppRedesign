import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getUserHousehold, Household } from '../lib/household';
import { HouseholdMembersManager } from './HouseholdMembersManager';

export function HouseholdMembersPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHousehold();
  }, []);

  async function loadHousehold() {
    try {
      setLoading(true);
      const householdData = await getUserHousehold();

      if (!householdData) {
        navigate('/onboarding/household');
        return;
      }

      setHousehold(householdData);
    } catch (err) {
      console.error('Error loading household:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!household) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Household Members</h1>
          <p className="text-gray-600">Manage who has access to {household.name}</p>
        </div>
      </div>

      <HouseholdMembersManager householdId={household.id} />
    </div>
  );
}
