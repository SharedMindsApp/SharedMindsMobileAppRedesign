/**
 * Reference Card Component
 * 
 * Phase 9: Shared UI primitive for displaying a reference concept.
 * Used by both mobile and web layouts.
 */

import { ReferenceItem } from './referenceContent';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { WidgetGuide } from './WidgetGuide';
import { GuardrailsGuide } from './GuardrailsGuide';
import { PlannerGuide } from './PlannerGuide';
import { ProjectsGuide } from './ProjectsGuide';
import { CalendarGuide } from './CalendarGuide';
import { SharedSpacesGuide } from './SharedSpacesGuide';
import { SharedMindsOverview } from './SharedMindsOverview';
import { HouseholdGuide } from './HouseholdGuide';
import { PeopleGuide } from './PeopleGuide';
import { TrackersGuide } from './TrackersGuide';
import { TripsGuide } from './TripsGuide';
import { TeamsGuide } from './TeamsGuide';

interface ReferenceCardProps {
  item: ReferenceItem;
  variant?: 'mobile' | 'web';
  onShowWidgetGuide?: () => void;
  onShowGuardrailsGuide?: (section: string) => void;
  onShowPlannerGuide?: () => void;
  onShowProjectsGuide?: () => void;
  onShowCalendarGuide?: () => void;
  onShowSharedSpacesGuide?: () => void;
  onShowSharedMindsOverview?: () => void;
  onShowHouseholdGuide?: () => void;
  onShowPeopleGuide?: () => void;
  onShowTrackersGuide?: () => void;
  onShowTripsGuide?: () => void;
  onShowTeamsGuide?: () => void;
}

export function ReferenceCard({ 
  item, 
  variant = 'web', 
  onShowWidgetGuide, 
  onShowGuardrailsGuide, 
  onShowPlannerGuide,
  onShowProjectsGuide,
  onShowCalendarGuide,
  onShowSharedSpacesGuide,
  onShowSharedMindsOverview,
  onShowHouseholdGuide,
  onShowPeopleGuide,
  onShowTrackersGuide,
  onShowTripsGuide,
  onShowTeamsGuide,
}: ReferenceCardProps) {
  const navigate = useNavigate();
  const [showWidgetGuide, setShowWidgetGuide] = useState(false);
  const [showGuardrailsGuide, setShowGuardrailsGuide] = useState(false);
  const [showPlannerGuide, setShowPlannerGuide] = useState(false);
  const [showProjectsGuide, setShowProjectsGuide] = useState(false);
  const [showCalendarGuide, setShowCalendarGuide] = useState(false);
  const [showSharedSpacesGuide, setShowSharedSpacesGuide] = useState(false);
  const [showSharedMindsOverview, setShowSharedMindsOverview] = useState(false);
  const [showHouseholdGuide, setShowHouseholdGuide] = useState(false);
  const [showPeopleGuide, setShowPeopleGuide] = useState(false);
  const [showTrackersGuide, setShowTrackersGuide] = useState(false);
  const [showTripsGuide, setShowTripsGuide] = useState(false);
  const [showTeamsGuide, setShowTeamsGuide] = useState(false);
  const [guardrailsSection, setGuardrailsSection] = useState<string | null>(null);

  const handleLinkClick = (link: string) => {
    // Special handling for widget guide
    if (link === '/spaces/widgets') {
      if (onShowWidgetGuide) { onShowWidgetGuide(); } else { setShowWidgetGuide(true); }
      return;
    }
    
    // Special handling for planner guide
    if (link === '/planner/features') {
      if (onShowPlannerGuide) { onShowPlannerGuide(); } else { setShowPlannerGuide(true); }
      return;
    }
    
    // Special handling for Guardrails features guide
    if (link === '/guardrails/features') {
      if (onShowGuardrailsGuide) { onShowGuardrailsGuide(''); } else { setGuardrailsSection(null); setShowGuardrailsGuide(true); }
      return;
    }
    
    // Special handling for Projects guide
    if (link === '/guardrails/projects') {
      if (onShowProjectsGuide) { onShowProjectsGuide(); } else { setShowProjectsGuide(true); }
      return;
    }
    
    // Special handling for Calendar guide
    if (link === '/calendar/guide') {
      if (onShowCalendarGuide) { onShowCalendarGuide(); } else { setShowCalendarGuide(true); }
      return;
    }
    
    // Special handling for Shared Spaces guide
    if (link === '/spaces/shared') {
      if (onShowSharedSpacesGuide) { onShowSharedSpacesGuide(); } else { setShowSharedSpacesGuide(true); }
      return;
    }
    
    // Special handling for SharedMinds Overview
    if (link === '/sharedminds/overview') {
      if (onShowSharedMindsOverview) { onShowSharedMindsOverview(); } else { setShowSharedMindsOverview(true); }
      return;
    }
    
    // Special handling for Household guide
    if (link === '/spaces/household') {
      if (onShowHouseholdGuide) { onShowHouseholdGuide(); } else { setShowHouseholdGuide(true); }
      return;
    }
    
    // Special handling for People guide
    if (link === '/people/guide') {
      if (onShowPeopleGuide) { onShowPeopleGuide(); } else { setShowPeopleGuide(true); }
      return;
    }
    
    // Special handling for Trackers guide
    if (link === '/trackers/guide') {
      if (onShowTrackersGuide) { onShowTrackersGuide(); } else { setShowTrackersGuide(true); }
      return;
    }
    
    // Special handling for Trips guide
    if (link === '/trips/guide') {
      if (onShowTripsGuide) { onShowTripsGuide(); } else { setShowTripsGuide(true); }
      return;
    }
    
    // Special handling for Households guide (moved from Spaces)
    if (link === '/people/households') {
      if (onShowHouseholdGuide) { onShowHouseholdGuide(); } else { setShowHouseholdGuide(true); }
      return;
    }
    
    // Special handling for Teams guide
    if (link === '/people/teams') {
      if (onShowTeamsGuide) { onShowTeamsGuide(); } else { setShowTeamsGuide(true); }
      return;
    }
    
    navigate(link);
  };

  if (variant === 'mobile') {
    return (
      <div className="w-full bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        {/* Icon and Title - Prominent */}
        <div className="flex items-center gap-4 mb-6">
          <div className="text-5xl flex-shrink-0">{item.icon}</div>
          <h3 className="text-2xl font-bold text-gray-900 leading-tight">{item.title}</h3>
        </div>

        {/* Content - Clean and Spacious */}
        <div className="space-y-5 mb-6">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              What it is
            </p>
            <p className="text-base leading-relaxed text-gray-800">
              {item.whatItIs}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              When to use it
            </p>
            <p className="text-base leading-relaxed text-gray-800">
              {item.whenToUse}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              How it connects
            </p>
            <p className="text-base leading-relaxed text-gray-800">
              {item.howItConnects}
            </p>
          </div>
        </div>

        {/* Read Further Links - Premium Design */}
        {item.readFurther && item.readFurther.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Learn More
            </p>
            <div className="space-y-2">
              {item.readFurther.map((link, index) => (
                <button
                  key={index}
                  onClick={() => handleLinkClick(link.link)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-all touch-manipulation group"
                >
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                    {link.title}
                  </span>
                  <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Web variant
  return (
    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl flex-shrink-0">{item.icon}</div>
        <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
      </div>
      <div className="space-y-2 text-sm text-gray-700 mb-3">
        <p className="leading-relaxed">
          <span className="font-medium text-gray-900">What:</span> {item.whatItIs}
        </p>
        <p className="leading-relaxed">
          <span className="font-medium text-gray-900">When:</span> {item.whenToUse}
        </p>
        <p className="leading-relaxed">
          <span className="font-medium text-gray-900">Connects:</span> {item.howItConnects}
        </p>
      </div>

      {/* Read Further Link(s) */}
      {item.readFurther && (
        <>
          {Array.isArray(item.readFurther) ? (
            <div className="mt-2 space-y-1.5">
              {item.readFurther.map((link, index) => (
                <button
                  key={index}
                  onClick={() => handleLinkClick(link.link)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span>{link.title}</span>
                  <ExternalLink size={12} />
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => handleLinkClick(item.readFurther!.link)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
            >
              <span>{item.readFurther.title}</span>
              <ExternalLink size={12} />
            </button>
          )}
          {!Array.isArray(item.readFurther) && item.readFurther.link === '/spaces/widgets' && !onShowWidgetGuide && (
            <WidgetGuide
              isOpen={showWidgetGuide}
              onClose={() => setShowWidgetGuide(false)}
              onBack={() => setShowWidgetGuide(false)}
            />
          )}
          {!Array.isArray(item.readFurther) && item.readFurther.link === '/planner/features' && !onShowPlannerGuide && (
            <PlannerGuide
              isOpen={showPlannerGuide}
              onClose={() => setShowPlannerGuide(false)}
              onBack={() => setShowPlannerGuide(false)}
            />
          )}
          {showProjectsGuide && (
            <ProjectsGuide
              isOpen={showProjectsGuide}
              onClose={() => setShowProjectsGuide(false)}
              onBack={() => setShowProjectsGuide(false)}
            />
          )}
          {showCalendarGuide && (
            <CalendarGuide
              isOpen={showCalendarGuide}
              onClose={() => setShowCalendarGuide(false)}
              onBack={() => setShowCalendarGuide(false)}
            />
          )}
          {showSharedSpacesGuide && (
            <SharedSpacesGuide
              isOpen={showSharedSpacesGuide}
              onClose={() => setShowSharedSpacesGuide(false)}
              onBack={() => setShowSharedSpacesGuide(false)}
            />
          )}
          {showSharedMindsOverview && (
            <SharedMindsOverview
              isOpen={showSharedMindsOverview}
              onClose={() => setShowSharedMindsOverview(false)}
            />
          )}
          {showHouseholdGuide && (
            <HouseholdGuide
              isOpen={showHouseholdGuide}
              onClose={() => setShowHouseholdGuide(false)}
              onBack={() => setShowHouseholdGuide(false)}
            />
          )}
          {showPeopleGuide && (
            <PeopleGuide
              isOpen={showPeopleGuide}
              onClose={() => setShowPeopleGuide(false)}
              onBack={() => setShowPeopleGuide(false)}
            />
          )}
          {showTrackersGuide && (
            <TrackersGuide
              isOpen={showTrackersGuide}
              onClose={() => setShowTrackersGuide(false)}
              onBack={() => setShowTrackersGuide(false)}
            />
          )}
          {showTripsGuide && (
            <TripsGuide
              isOpen={showTripsGuide}
              onClose={() => setShowTripsGuide(false)}
              onBack={() => setShowTripsGuide(false)}
            />
          )}
          {showTeamsGuide && (
            <TeamsGuide
              isOpen={showTeamsGuide}
              onClose={() => setShowTeamsGuide(false)}
              onBack={() => setShowTeamsGuide(false)}
            />
          )}
        </>
      )}

      {/* Sub Sections */}
      {item.subSections && item.subSections.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-900 mb-2">Learn more:</p>
          <div className="flex flex-wrap gap-1.5">
            {item.subSections.map((sub, index) => {
              const sectionId = sub.link.replace('/guardrails/', '');
              return (
                <button
                  key={index}
                  onClick={() => handleLinkClick(sub.link)}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors flex items-center gap-1"
                >
                  <span>{sub.title}</span>
                  <ExternalLink size={10} />
                </button>
              );
            })}
          </div>
          {showGuardrailsGuide && !onShowGuardrailsGuide && (
            <GuardrailsGuide
              isOpen={showGuardrailsGuide}
              onClose={() => {
                setShowGuardrailsGuide(false);
                setGuardrailsSection(null);
              }}
              onBack={() => {
                setShowGuardrailsGuide(false);
                setGuardrailsSection(null);
              }}
              sectionId={guardrailsSection || undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
