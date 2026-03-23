/**
 * Personal Calendar Entry Card
 * 
 * Direct entry point for Personal Calendar on Dashboard.
 * Routes to Personal Space calendar widget (mobile calendar application).
 */

import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isStandaloneApp } from '../../lib/appContext';
import { getPersonalSpace } from '../../lib/household';
import { loadHouseholdWidgets } from '../../lib/fridgeCanvas';

export function PersonalCalendarCard() {
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
    if (isMobile) {
      // On mobile, navigate to Personal Space calendar widget
      try {
        setLoading(true);
        const personalSpace = await getPersonalSpace();
        
        if (!personalSpace) {
          // No personal space, navigate to personal space page
          navigate('/spaces/personal');
          return;
        }

        // Load widgets and find calendar widget
        const widgets = await loadHouseholdWidgets(personalSpace.id);
        const calendarWidget = widgets.find(w => w.widget_type === 'calendar');

        if (calendarWidget) {
          // Navigate to calendar widget in Personal Space
          navigate(`/spaces/${personalSpace.id}/app/${calendarWidget.id}`);
        } else {
          // No calendar widget found, navigate to personal space view
          navigate(`/spaces/personal`);
        }
      } catch (error) {
        console.error('[PersonalCalendarCard] Error loading calendar widget:', error);
        // Fallback to personal space page on error
        navigate('/spaces/personal');
      } finally {
        setLoading(false);
      }
    } else {
      // On web, navigate to Planner calendar (personal)
      navigate('/planner/monthly');
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
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">Personal Calendar</h3>
            <p className="text-xs text-gray-600">
              Your personal schedule and events
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
