/**
 * App Reference Guide - Web View
 * 
 * Phase 9: Web reference guide using grid layout showing relationships.
 * 
 * Spatial clarity, low text density, scannable.
 */

import { X } from 'lucide-react';
import { useState } from 'react';
import { ReferenceCard } from './ReferenceCard';
import { getAllReferenceItems } from './referenceContent';
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

interface AppReferenceGuideWebProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppReferenceGuideWeb({
  isOpen,
  onClose,
}: AppReferenceGuideWebProps) {
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
  const items = getAllReferenceItems();

  // Group items by category
  const overview = items.filter(item => 
    item.id === 'sharedminds-overview'
  );
  const contexts = items.filter(item => 
    ['spaces', 'trips', 'trackers'].includes(item.id)
  );
  const workAndPlanning = items.filter(item => 
    ['guardrails', 'calendar', 'planner'].includes(item.id)
  );
  const people = items.filter(item => 
    ['people'].includes(item.id)
  );

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
          className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              How Everything Fits Together
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
            {/* Overview Section (Full Width) */}
            {overview.length > 0 && (
              <div className="mb-8">
                {overview.map(item => (
                  <ReferenceCard 
                    key={item.id} 
                    item={item} 
                    variant="web"
                    onShowWidgetGuide={() => setShowWidgetGuide(true)}
                    onShowGuardrailsGuide={(section) => {
                      setGuardrailsSection(section);
                      setShowGuardrailsGuide(true);
                    }}
                    onShowPlannerGuide={() => setShowPlannerGuide(true)}
                    onShowProjectsGuide={() => setShowProjectsGuide(true)}
                    onShowSharedMindsOverview={() => setShowSharedMindsOverview(true)}
                    onShowHouseholdGuide={() => setShowHouseholdGuide(true)}
                  />
                ))}
              </div>
            )}

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Column 1: Organize */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Organize
                </h3>
                {contexts.map(item => (
                  <ReferenceCard 
                    key={item.id} 
                    item={item} 
                    variant="web"
                    onShowWidgetGuide={() => setShowWidgetGuide(true)}
                    onShowGuardrailsGuide={() => {
                      setGuardrailsSection(null);
                      setShowGuardrailsGuide(true);
                    }}
                    onShowPlannerGuide={() => setShowPlannerGuide(true)}
                    onShowProjectsGuide={() => setShowProjectsGuide(true)}
                    onShowSharedMindsOverview={() => setShowSharedMindsOverview(true)}
                    onShowHouseholdGuide={() => setShowHouseholdGuide(true)}
                  />
                ))}
              </div>

              {/* Column 2: Work & Planning */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Work & Planning
                </h3>
                {workAndPlanning.map(item => (
                  <ReferenceCard 
                    key={item.id} 
                    item={item} 
                    variant="web"
                    onShowWidgetGuide={() => setShowWidgetGuide(true)}
                    onShowGuardrailsGuide={() => {
                      setGuardrailsSection(null);
                      setShowGuardrailsGuide(true);
                    }}
                    onShowPlannerGuide={() => setShowPlannerGuide(true)}
                    onShowProjectsGuide={() => setShowProjectsGuide(true)}
                    onShowSharedMindsOverview={() => setShowSharedMindsOverview(true)}
                    onShowHouseholdGuide={() => setShowHouseholdGuide(true)}
                  />
                ))}
              </div>

              {/* Column 3: People & Collaboration */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  People & Collaboration
                </h3>
                {people.map(item => (
                  <ReferenceCard 
                    key={item.id} 
                    item={item} 
                    variant="web"
                    onShowWidgetGuide={() => setShowWidgetGuide(true)}
                    onShowGuardrailsGuide={() => {
                      setGuardrailsSection(null);
                      setShowGuardrailsGuide(true);
                    }}
                    onShowPlannerGuide={() => setShowPlannerGuide(true)}
                    onShowProjectsGuide={() => setShowProjectsGuide(true)}
                    onShowSharedMindsOverview={() => setShowSharedMindsOverview(true)}
                    onShowHouseholdGuide={() => setShowHouseholdGuide(true)}
                  />
                ))}
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Widget Guide */}
      <WidgetGuide
        isOpen={showWidgetGuide}
        onClose={() => setShowWidgetGuide(false)}
        onBack={() => setShowWidgetGuide(false)}
      />

      {/* Guardrails Guide */}
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

      {/* Planner Guide */}
      <PlannerGuide
        isOpen={showPlannerGuide}
        onClose={() => setShowPlannerGuide(false)}
        onBack={() => setShowPlannerGuide(false)}
      />

      {/* Projects Guide */}
      <ProjectsGuide
        isOpen={showProjectsGuide}
        onClose={() => setShowProjectsGuide(false)}
        onBack={() => setShowProjectsGuide(false)}
      />

      {/* Calendar Guide */}
      <CalendarGuide
        isOpen={showCalendarGuide}
        onClose={() => setShowCalendarGuide(false)}
        onBack={() => setShowCalendarGuide(false)}
      />

      {/* Shared Spaces Guide */}
      <SharedSpacesGuide
        isOpen={showSharedSpacesGuide}
        onClose={() => setShowSharedSpacesGuide(false)}
        onBack={() => setShowSharedSpacesGuide(false)}
      />

      {/* SharedMinds Overview */}
      <SharedMindsOverview
        isOpen={showSharedMindsOverview}
        onClose={() => setShowSharedMindsOverview(false)}
      />

      {/* Household Guide */}
      <HouseholdGuide
        isOpen={showHouseholdGuide}
        onClose={() => setShowHouseholdGuide(false)}
        onBack={() => setShowHouseholdGuide(false)}
      />

      {/* People Guide */}
      <PeopleGuide
        isOpen={showPeopleGuide}
        onClose={() => setShowPeopleGuide(false)}
        onBack={() => setShowPeopleGuide(false)}
      />

      {/* Trackers Guide */}
      <TrackersGuide
        isOpen={showTrackersGuide}
        onClose={() => setShowTrackersGuide(false)}
        onBack={() => setShowTrackersGuide(false)}
      />

      {/* Trips Guide */}
      <TripsGuide
        isOpen={showTripsGuide}
        onClose={() => setShowTripsGuide(false)}
        onBack={() => setShowTripsGuide(false)}
      />

      {/* Teams Guide */}
      <TeamsGuide
        isOpen={showTeamsGuide}
        onClose={() => setShowTeamsGuide(false)}
        onBack={() => setShowTeamsGuide(false)}
      />
    </>
  );
}
