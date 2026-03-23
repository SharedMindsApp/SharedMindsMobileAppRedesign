import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, Section, Member, Progress } from '../lib/supabase';
import { SectionCard } from './SectionCard';
import { QuestionScreen } from './QuestionScreen';
import { ReportGenerator } from './ReportGenerator';

export function SectionDashboard() {
  const [sections, setSections] = useState<Section[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [progressData, setProgressData] = useState<Progress[]>([]);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Record<string, Date>>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError('Please sign in to view your dashboard.');
          setLoading(false);
          return;
        }

        setCurrentUserId(user.id);

        // V1: Legacy 'members' table no longer exists. Use space_members instead.
        console.log('[SectionDashboard] V1 schema: skipping legacy members table');
        setMembers([]);

        const { data: sectionsData, error: sectionsError } = await supabase
          .from('sections')
          .select('*')
          .order('order_index', { ascending: true });

        if (sectionsError) throw sectionsError;
        setSections(sectionsData || []);

        const { data: progressDataList, error: progressError } = await supabase
          .from('progress')
          .select('*')
          .in(
            'member_id',
            householdMembers?.map((m) => m.id) || []
          );

        if (progressError) throw progressError;
        setProgressData(progressDataList || []);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError('Failed to load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const progressSubscription = supabase
      .channel('progress-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'progress' },
        (payload) => {
          setProgressData((prev) => {
            const index = prev.findIndex((p) => p.id === payload.new.id);
            if (index > -1) {
              const updated = [...prev];
              updated[index] = payload.new;
              return updated;
            }
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      progressSubscription.unsubscribe();
    };
  }, []);

  const handleContinueSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleReviewAnswers = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleCloseQuestions = () => {
    setActiveSection(null);
  };

  const buildProgressMap = () => {
    const map: Record<string, Progress[]> = {};
    progressData.forEach((p) => {
      if (!map[p.member_id]) {
        map[p.member_id] = [];
      }
      map[p.member_id].push(p);
    });
    return map;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <CheckCircle2 size={48} className="text-blue-500" />
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-red-500" size={32} />
            <h2 className="text-lg font-semibold text-gray-900">Error</h2>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (activeSection) {
    return <QuestionScreen sectionId={activeSection} onClose={handleCloseQuestions} />;
  }

  const progressMap = buildProgressMap();

  const overallProgress = sections.length > 0
    ? Math.round(
        (progressData.filter((p) => p.completed).length / (sections.length * members.length)) *
          100
      )
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SharedMinds Household</h1>
          <p className="text-gray-600 text-lg">
            Work through sections together to build understanding
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold text-blue-600">{members.length}</div>
              <div className="text-sm text-gray-600">Household Members</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{sections.length}</div>
              <div className="text-sm text-gray-600">Sections</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">{overallProgress}%</div>
              <div className="text-sm text-gray-600">Overall Progress</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <ReportGenerator />
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              progressByMember={progressMap}
              members={members}
              onContinue={handleContinueSection}
              onReview={handleReviewAnswers}
              lastSaveTime={lastSaveTime}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
