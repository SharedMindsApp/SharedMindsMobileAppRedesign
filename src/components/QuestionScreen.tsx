import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { supabase, Question, Section, Answer } from '../lib/supabase';
import { QuestionInput } from './QuestionInput';

interface QuestionScreenProps {
  sectionId: string;
  onClose: () => void;
}

export function QuestionScreen({ sectionId, onClose }: QuestionScreenProps) {
  const [section, setSection] = useState<Section | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.error('No authenticated user');
          return;
        }

        // V1: Legacy 'members' table no longer exists. Use auth user id as member id.
        const memberData = { id: user.id, household_id: null };
        setMemberId(user.id);

        const { data: sectionData } = await supabase
          .from('sections')
          .select('*')
          .eq('id', sectionId)
          .maybeSingle();

        setSection(sectionData);

        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('section_id', sectionId)
          .order('id');

        setQuestions(questionsData || []);

        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('*')
          .eq('member_id', memberData.id)
          .in(
            'question_id',
            (questionsData || []).map((q) => q.id)
          );

        const answerMap: Record<string, string> = {};
        (existingAnswers || []).forEach((ans: Answer) => {
          answerMap[ans.question_id] = String(ans.answer.value || '');
        });
        setAnswers(answerMap);

        const answeredQuestions = Object.keys(answerMap).length;
        if (answeredQuestions > 0 && answeredQuestions < (questionsData || []).length) {
          const firstUnanswered = (questionsData || []).findIndex(
            (q) => !answerMap[q.id]
          );
          if (firstUnanswered !== -1) {
            setCurrentQuestionIndex(firstUnanswered);
          }
        }

        await updateProgress(memberData.id, sectionId, answeredQuestions, (questionsData || []).length);
      } catch (err) {
        console.error('Error loading question data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sectionId]);

  const updateProgress = async (
    memberId: string,
    sectionId: string,
    completed: number,
    total: number
  ) => {
    const isCompleted = completed === total && total > 0;

    const { data: existingProgress } = await supabase
      .from('progress')
      .select('*')
      .eq('member_id', memberId)
      .eq('section_id', sectionId)
      .maybeSingle();

    if (existingProgress) {
      await supabase
        .from('progress')
        .update({
          questions_completed: completed,
          questions_total: total,
          completed: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id);
    } else {
      await supabase.from('progress').insert({
        member_id: memberId,
        section_id: sectionId,
        questions_completed: completed,
        questions_total: total,
        completed: isCompleted,
      });
    }

    if (isCompleted) {
      await supabase.rpc('check_and_unlock_features', {
        p_member_id: memberId
      });
    }
  };

  const saveAnswer = useCallback(
    async (questionId: string, value: string) => {
      if (!memberId) return;

      try {
        setSaving(true);

        const { data: existingAnswer } = await supabase
          .from('answers')
          .select('*')
          .eq('member_id', memberId)
          .eq('question_id', questionId)
          .maybeSingle();

        if (existingAnswer) {
          await supabase
            .from('answers')
            .update({
              answer: { value },
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingAnswer.id);
        } else {
          await supabase.from('answers').insert({
            member_id: memberId,
            question_id: questionId,
            answer: { value },
          });
        }

        const completedCount = Object.values(answers).filter((a) => a.trim() !== '').length;
        await updateProgress(memberId, sectionId, completedCount, questions.length);

        setLastSaved(new Date());
      } catch (err) {
        console.error('Error saving answer:', err);
      } finally {
        setSaving(false);
      }
    },
    [memberId, sectionId, questions.length, answers]
  );

  const handleAnswerChange = (value: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveAnswer(currentQuestion.id, value);
    }, 1000);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSaveAndClose = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion && answers[currentQuestion.id]) {
      await saveAnswer(currentQuestion.id, answers[currentQuestion.id]);
    }

    onClose();
  };

  const getSaveIndicator = () => {
    if (saving) return 'Saving...';
    if (!lastSaved) return '';

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);

    if (diffSeconds < 3) return 'Saved';
    if (diffSeconds < 60) return `Saved ${diffSeconds}s ago`;
    const minutes = Math.floor(diffSeconds / 60);
    return `Saved ${minutes}m ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-4 text-blue-500">
            <CheckCircle2 size={48} />
          </div>
          <p className="text-gray-600 font-medium">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!section || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <p className="text-gray-900 font-semibold mb-4">No questions available</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id] || '';
  const progress = Math.round(
    (Object.values(answers).filter((a) => a.trim() !== '').length / questions.length) * 100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <button
              onClick={handleSaveAndClose}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{progress}% complete</span>
              <span className="font-medium text-blue-600">{getSaveIndicator()}</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {currentQuestion.question_text}
            </h3>
            <QuestionInput
              question={currentQuestion}
              value={currentAnswer}
              onChange={handleAnswerChange}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft size={18} />
              Previous
            </button>

            <button
              onClick={handleSaveAndClose}
              className="flex-1 px-6 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors"
            >
              Save & Close
            </button>

            <button
              onClick={handleNext}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Next
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
