import { Section, Member, Progress } from '../../lib/supabase';
import { Household } from '../../lib/household';
import { StandardDashboardLayout } from './StandardDashboardLayout';
import { NDOptimizedDashboardLayout } from './NDOptimizedDashboardLayout';

interface DashboardLayoutRouterProps {
  neurotype: string | null;
  sections: Section[];
  members: Member[];
  progressData: Progress[];
  household: Household | null;
  currentMember: Member | null;
  firstIncompleteSection: Section | null;
  reportAvailable: boolean;
  overallProgress: number;
  isPremium: boolean;
}

export function DashboardLayoutRouter({
  neurotype,
  sections,
  members,
  progressData,
  household,
  currentMember,
  firstIncompleteSection,
  reportAvailable,
  overallProgress,
  isPremium,
}: DashboardLayoutRouterProps) {
  const standardLayoutProps = {
    sections,
    members,
    progressData,
    household,
    currentMember,
    firstIncompleteSection,
    reportAvailable,
    overallProgress,
    isPremium,
  };

  const ndLayoutProps = {
    members,
    household,
    currentMember,
    firstIncompleteSection,
    reportAvailable,
    overallProgress,
  };

  if (neurotype === 'adhd' || neurotype === 'asd' || neurotype === 'anxiety') {
    return <NDOptimizedDashboardLayout {...ndLayoutProps} />;
  }

  return <StandardDashboardLayout {...standardLayoutProps} />;
}
