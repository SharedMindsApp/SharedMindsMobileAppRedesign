export interface IndividualProfileResponse {
  id: string;
  member_id: string;
  thinking_style: string[];
  focus_type: string;
  energy_pattern: string;
  time_perception: string[];
  thinking_speed: string;
  sensory_preferences: string[];
  overwhelm_reactions: string[];
  reset_preferences: string[];
  communication_style: string[];
  peak_moments: string[];
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface IndividualProfileAnswers {
  thinking_style: string[];
  focus_type: string;
  energy_pattern: string;
  time_perception: string[];
  thinking_speed: string;
  sensory_preferences: string[];
  overwhelm_reactions: string[];
  reset_preferences: string[];
  communication_style: string[];
  peak_moments: string[];
}

export const INITIAL_ANSWERS: IndividualProfileAnswers = {
  thinking_style: [],
  focus_type: '',
  energy_pattern: '',
  time_perception: [],
  thinking_speed: '',
  sensory_preferences: [],
  overwhelm_reactions: [],
  reset_preferences: [],
  communication_style: [],
  peak_moments: [],
};
