/**
 * Shared Calendar Entry Card
 * 
 * Direct entry point for Shared/Household Calendar on Dashboard.
 * Routes to Spaces calendar widget (household calendar).
 */

import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isStandaloneApp } from '../../lib/appContext';
import { getUserHousehold } from '../../lib/household';
import { loadHouseholdWidgets } from '../../lib/fridgeCanvas';

export function SharedCalendarCard() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || isStandaloneApp());
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClick = async () => {
    try {
      setLoading(true);
      const household = await getUserHousehold();
      
      if (!household) {
        // No household, navigate to spaces index
        navigate('/spaces');
        return;
      }

      if (isMobile) {
        // On mobile, navigate to Spaces calendar widget
        const widgets = await loadHouseholdWidgets(household.id);
        const calendarWidget = widgets.find(w => w.widget_type === 'calendar');

        if (calendarWidget) {
          // Navigate to calendar widget in Spaces
          navigate(`/spaces/${household.id}/app/${calendarWidget.id}`);
        } else {
          // No calendar widget found, navigate to space view
          navigate(`/spaces/${household.id}`);
        }
      } else {
        // On web, navigate to Planner household calendar
        navigate('/planner/household/calendar');
      }
    } catch (error) {
      console.error('[SharedCalendarCard] Error loading calendar widget:', error);
      // Fallback to spaces index on error
      navigate('/spaces');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full bg-white rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 hover:shadow transition-all text-left p-4 group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">Shared Calendar</h3>
            <p className="text-xs text-gray-600">
              Household and shared events
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </button>
  );
}
