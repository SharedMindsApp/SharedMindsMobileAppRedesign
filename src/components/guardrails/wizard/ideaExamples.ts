/**
 * Domain and Project Type aware example text for the Idea step
 * 
 * Priority:
 * 1. Project Type specific override (if predefined)
 * 2. Domain default
 * 3. Generic fallback
 */

export interface IdeaExampleText {
  idea: string;
  startingPoint: string;
  expectations: string;
}

// Domain-level default examples
export const domainDefaults: Record<string, IdeaExampleText> = {
  health: {
    idea: "This project is about improving my health and wellbeing by making positive lifestyle changes.",
    startingPoint: "Right now, my health habits are inconsistent and I want to improve them.",
    expectations: "I expect this project will require regular effort and changes to my routine.",
  },
  personal: {
    idea: "This project focuses on improving an aspect of my personal life that's important to me.",
    startingPoint: "At the moment, this area of my life feels unstructured or neglected.",
    expectations: "I expect this will involve reflection and gradual changes over time.",
  },
  work: {
    idea: "This project is about improving my effectiveness or direction in my work.",
    startingPoint: "Currently, I feel I could be more focused or intentional in this area.",
    expectations: "I expect this project will require planning, consistency, and learning.",
  },
  startup: {
    idea: "This project is about exploring or building a business idea.",
    startingPoint: "I'm at an early stage and still figuring out what's viable.",
    expectations: "I expect this will involve experimentation and problem-solving.",
  },
  creative: {
    idea: "This project is about creating or exploring something creative.",
    startingPoint: "I have ideas but haven't structured them into a clear project yet.",
    expectations: "I expect this will involve creative exploration and making things.",
  },
  passion: {
    idea: "This project is about pursuing a passion or interest that matters to me.",
    startingPoint: "This is something I care about but haven't given it proper structure yet.",
    expectations: "I expect this will involve dedicating time and energy to something I enjoy.",
  },
};

// Project Type specific overrides (only for predefined types)
export const projectTypeOverrides: Record<string, IdeaExampleText> = {
  'Fitness Goal': {
    idea: "This project is about improving my physical fitness by becoming more active and consistent with exercise.",
    startingPoint: "I don't exercise regularly at the moment and haven't had a consistent routine for a while.",
    expectations: "I expect this will involve regular workouts and lifestyle adjustments.",
  },
  // Add more project type overrides as needed
};

// Generic fallback (should never be needed if domain is always selected, but good to have)
const genericFallback: IdeaExampleText = {
  idea: "This project is about achieving a goal that's important to me.",
  startingPoint: "I'm starting from where I am now and want to make progress.",
  expectations: "I expect this project will require effort and consistency over time.",
};

/**
 * Get example text for the Idea step based on domain and project type
 * @param domainName - Domain name (e.g., "Health", "Personal")
 * @param projectTypeExampleText - Optional example text from database (ProjectType.example_text)
 */
export function getIdeaExampleText(
  domainName: string | null,
  projectTypeExampleText?: { idea?: string; startingPoint?: string; expectations?: string } | null
): IdeaExampleText {
  // Try project type example text from database first (if all keys exist)
  if (projectTypeExampleText && 
      projectTypeExampleText.idea && 
      projectTypeExampleText.startingPoint && 
      projectTypeExampleText.expectations) {
    return {
      idea: projectTypeExampleText.idea,
      startingPoint: projectTypeExampleText.startingPoint,
      expectations: projectTypeExampleText.expectations,
    };
  }

  // Fall back to domain default
  const domainKey = domainName?.toLowerCase() || '';
  if (domainKey && domainDefaults[domainKey]) {
    return domainDefaults[domainKey];
  }

  // Generic fallback (should rarely be needed)
  return genericFallback;
}

