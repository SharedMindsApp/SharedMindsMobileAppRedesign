import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { IntroScreen } from './IntroScreen';
import { QuestionWrapper } from './QuestionWrapper';
import { Question1ThinkingStyle } from './Question1ThinkingStyle';
import { Question2FocusType } from './Question2FocusType';
import { Question3EnergyPattern } from './Question3EnergyPattern';
import { Question4TimePerception } from './Question4TimePerception';
import { Question5ThinkingSpeed } from './Question5ThinkingSpeed';
import { Question6SensoryWorld } from './Question6SensoryWorld';
import { Question7OverwhelmReactions } from './Question7OverwhelmReactions';
import { Question8ResetTools } from './Question8ResetTools';
import { Question9CommunicationStyle } from './Question9CommunicationStyle';
import { Question10PeakMoments } from './Question10PeakMoments';
import { CompletionScreen } from './CompletionScreen';
import { IndividualProfileAnswers, INITIAL_ANSWERS } from '../../lib/individualProfileTypes';

const TOTAL_QUESTIONS = 10;

export function IndividualProfileFlow() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(-1);
  const [answers, setAnswers] = useState<IndividualProfileAnswers>(INITIAL_ANSWERS);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemberData();
  }, []);

  const loadMemberData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // V1: Legacy 'members' table no longer exists. Use user id as member id.
      const memberData = { id: user.id };
      if (memberData) {
        setMemberId(user.id);

        const { data: existingResponse } = await supabase
          .from('individual_profile_responses')
          .select('*')
          .eq('member_id', memberData.id)
          .maybeSingle();

        if (existingResponse) {
          setAnswers({
            thinking_style: existingResponse.thinking_style || [],
            focus_type: existingResponse.focus_type || '',
            energy_pattern: existingResponse.energy_pattern || '',
            time_perception: existingResponse.time_perception || [],
            thinking_speed: existingResponse.thinking_speed || '',
            sensory_preferences: existingResponse.sensory_preferences || [],
            overwhelm_reactions: existingResponse.overwhelm_reactions || [],
            reset_preferences: existingResponse.reset_preferences || [],
            communication_style: existingResponse.communication_style || [],
            peak_moments: existingResponse.peak_moments || [],
          });

          if (existingResponse.completed) {
            setCurrentStep(TOTAL_QUESTIONS + 1);
          }
        }
      }
    } catch (error) {
      console.error('Error loading member data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (updatedAnswers: IndividualProfileAnswers, isComplete = false) => {
    if (!memberId) return;

    try {
      const { error } = await supabase
        .from('individual_profile_responses')
        .upsert({
          member_id: memberId,
          ...updatedAnswers,
          completed: isComplete,
        });

      if (error) throw error;

      if (isComplete) {
        const { data: section } = await supabase
          .from('sections')
          .select('id')
          .eq('title', 'You, As an Individual')
          .maybeSingle();

        if (section) {
          await supabase.from('progress').upsert({
            member_id: memberId,
            section_id: section.id,
            completed: true,
          });

          await supabase.rpc('check_and_unlock_features', {
            p_member_id: memberId
          });
        }
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNext = async () => {
    if (currentStep === TOTAL_QUESTIONS - 1) {
      await saveProgress(answers, true);
    } else if (currentStep >= 0) {
      await saveProgress(answers, false);
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else if (currentStep === 0) {
      setCurrentStep(-1);
    }
  };

  const canProgress = (): boolean => {
    switch (currentStep) {
      case 0: return answers.thinking_style.length > 0;
      case 1: return answers.focus_type !== '';
      case 2: return answers.energy_pattern !== '';
      case 3: return answers.time_perception.length > 0;
      case 4: return answers.thinking_speed !== '';
      case 5: return answers.sensory_preferences.length > 0;
      case 6: return answers.overwhelm_reactions.length > 0;
      case 7: return answers.reset_preferences.length > 0;
      case 8: return answers.communication_style.length > 0;
      case 9: return answers.peak_moments.length > 0;
      default: return true;
    }
  };

  const handleContinue = () => {
    navigate('/journey');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  if (currentStep === -1) {
    return <IntroScreen onBegin={() => setCurrentStep(0)} />;
  }

  if (currentStep === TOTAL_QUESTIONS) {
    return <CompletionScreen answers={answers} onContinue={handleContinue} />;
  }

  return (
    <QuestionWrapper
      currentStep={currentStep}
      totalSteps={TOTAL_QUESTIONS}
      onNext={handleNext}
      onBack={handleBack}
      canProgress={canProgress()}
      questionNumber={currentStep + 1}
    >
      {currentStep === 0 && (
        <Question1ThinkingStyle
          selected={answers.thinking_style}
          onSelect={(values) => setAnswers({ ...answers, thinking_style: values })}
        />
      )}

      {currentStep === 1 && (
        <Question2FocusType
          selected={answers.focus_type}
          onSelect={(value) => setAnswers({ ...answers, focus_type: value })}
        />
      )}

      {currentStep === 2 && (
        <Question3EnergyPattern
          selected={answers.energy_pattern}
          onSelect={(value) => setAnswers({ ...answers, energy_pattern: value })}
        />
      )}

      {currentStep === 3 && (
        <Question4TimePerception
          selected={answers.time_perception}
          onSelect={(values) => setAnswers({ ...answers, time_perception: values })}
        />
      )}

      {currentStep === 4 && (
        <Question5ThinkingSpeed
          selected={answers.thinking_speed}
          onSelect={(value) => setAnswers({ ...answers, thinking_speed: value })}
        />
      )}

      {currentStep === 5 && (
        <Question6SensoryWorld
          selected={answers.sensory_preferences}
          onSelect={(values) => setAnswers({ ...answers, sensory_preferences: values })}
        />
      )}

      {currentStep === 6 && (
        <Question7OverwhelmReactions
          selected={answers.overwhelm_reactions}
          onSelect={(values) => setAnswers({ ...answers, overwhelm_reactions: values })}
        />
      )}

      {currentStep === 7 && (
        <Question8ResetTools
          selected={answers.reset_preferences}
          onSelect={(values) => setAnswers({ ...answers, reset_preferences: values })}
        />
      )}

      {currentStep === 8 && (
        <Question9CommunicationStyle
          selected={answers.communication_style}
          onSelect={(values) => setAnswers({ ...answers, communication_style: values })}
        />
      )}

      {currentStep === 9 && (
        <Question10PeakMoments
          selected={answers.peak_moments}
          onSelect={(values) => setAnswers({ ...answers, peak_moments: values })}
        />
      )}
    </QuestionWrapper>
  );
}
