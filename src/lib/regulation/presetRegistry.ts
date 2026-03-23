import { RegulationPreset } from './presetTypes';

export const REGULATION_PRESETS: Record<string, RegulationPreset> = {
  overwhelmed: {
    presetId: 'overwhelmed',
    name: "I'm Feeling Overwhelmed",
    shortDescription: "Reduce cognitive load and noise",
    longExplanation: "If you're feeling overwhelmed, this adjusts how signals appear to reduce visual and mental noise. Signals will show more quietly, low-intensity ones will be hidden, and calming responses will be prioritized.",
    intendedState: "When you need less cognitive load and quieter information flow",
    appliesChanges: {
      globalVisibility: 'quietly',
      signals: {
        rapid_context_switching: {
          visibility: 'hide_unless_strong',
          sensitivity: 'only_when_strong'
        },
        runaway_scope_expansion: {
          visibility: 'quietly',
          sensitivity: 'only_when_strong'
        },
        fragmented_focus_session: {
          visibility: 'hide_unless_strong'
        },
        high_task_intake_without_completion: {
          visibility: 'quietly'
        },
        prolonged_inactivity_gap: {
          visibility: 'quietly'
        }
      },
      responseMode: 'calming_only',
      limitSuggestions: {
        sessionCap: 45
      }
    },
    doesNotDo: [
      "Does not disable signals entirely",
      "Does not enable Safe Mode automatically",
      "Does not block any actions",
      "Does not change what you can do"
    ],
    reversible: true
  },

  build_without_expanding: {
    presetId: 'build_without_expanding',
    name: "Build Without Expanding Scope",
    shortDescription: "Support execution without runaway growth",
    longExplanation: "If you want to focus on building what you've already started, this highlights scope expansion signals and surfaces responses that help maintain boundaries. New project creation remains available but less prominent.",
    intendedState: "When you want to execute on existing commitments",
    appliesChanges: {
      signals: {
        runaway_scope_expansion: {
          visibility: 'prominently',
          relevance: 'very_relevant',
          sensitivity: 'earlier'
        },
        rapid_context_switching: {
          visibility: 'prominently',
          relevance: 'very_relevant'
        },
        high_task_intake_without_completion: {
          visibility: 'prominently'
        }
      },
      responseMode: 'all',
      limitSuggestions: {
        newProjectVisibility: 'reduced'
      }
    },
    doesNotDo: [
      "Does not prevent creating new ideas",
      "Does not delete side projects",
      "Does not enforce focus",
      "Does not lock you into one path"
    ],
    reversible: true
  },

  explore_freely: {
    presetId: 'explore_freely',
    name: "Explore Ideas Freely",
    shortDescription: "Remove friction during exploration",
    longExplanation: "If you're in an exploratory phase where scope expansion is intentional, this de-emphasizes scope signals and relaxes governance warnings. You can capture ideas without constraint-focused responses appearing.",
    intendedState: "When exploration and idea generation are your priority",
    appliesChanges: {
      signals: {
        runaway_scope_expansion: {
          visibility: 'hide_unless_strong',
          relevance: 'not_useful_right_now'
        },
        rapid_context_switching: {
          visibility: 'quietly',
          sensitivity: 'only_when_strong'
        },
        high_task_intake_without_completion: {
          visibility: 'quietly'
        }
      },
      responseMode: 'manual_only',
      limitSuggestions: {
        newProjectVisibility: 'normal'
      }
    },
    doesNotDo: [
      "Does not disable regulation",
      "Does not remove history",
      "Does not change thresholds",
      "Does not silence all signals"
    ],
    reversible: true
  },

  returning_after_time: {
    presetId: 'returning_after_time',
    name: "Returning After Time Away",
    shortDescription: "Gentle re-entry after absence",
    longExplanation: "If you're returning after being away, this creates a 7-day period where signals appear more quietly. It surfaces gentle re-orientation responses and reduces visual intensity to support calm re-entry.",
    intendedState: "When you need a calm re-entry period",
    appliesChanges: {
      globalVisibility: 'quietly',
      signals: {
        rapid_context_switching: {
          visibility: 'quietly',
          sensitivity: 'only_when_strong'
        },
        runaway_scope_expansion: {
          visibility: 'quietly'
        },
        fragmented_focus_session: {
          visibility: 'quietly'
        },
        prolonged_inactivity_gap: {
          visibility: 'hide_unless_strong'
        },
        high_task_intake_without_completion: {
          visibility: 'quietly'
        }
      },
      responseMode: 'calming_only',
      temporaryUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    doesNotDo: [
      "Does not assume failure",
      "Does not reset projects",
      "Does not force planning",
      "Does not make judgments about absence"
    ],
    reversible: true
  },

  fewer_interruptions: {
    presetId: 'fewer_interruptions',
    name: "Fewer Interruptions Today",
    shortDescription: "Short-term calm",
    longExplanation: "If you need a quieter day, this hides signals unless they're strong and sets responses to manual-only. Soft session caps are suggested. This is a temporary state you can exit anytime.",
    intendedState: "When you need minimal interruptions for a period",
    appliesChanges: {
      globalVisibility: 'hide_unless_strong',
      signals: {
        rapid_context_switching: {
          visibility: 'hide_unless_strong',
          sensitivity: 'only_when_strong'
        },
        runaway_scope_expansion: {
          visibility: 'hide_unless_strong',
          sensitivity: 'only_when_strong'
        },
        fragmented_focus_session: {
          visibility: 'hide_unless_strong',
          sensitivity: 'only_when_strong'
        },
        prolonged_inactivity_gap: {
          visibility: 'hide_unless_strong'
        },
        high_task_intake_without_completion: {
          visibility: 'hide_unless_strong',
          sensitivity: 'only_when_strong'
        }
      },
      responseMode: 'manual_only',
      limitSuggestions: {
        sessionCap: 60
      }
    },
    doesNotDo: [
      "Does not enable Safe Mode automatically",
      "Does not silence everything permanently",
      "Does not change what triggers signals",
      "Does not remove your ability to check status"
    ],
    reversible: true
  }
};

export function getPreset(presetId: string): RegulationPreset | null {
  return REGULATION_PRESETS[presetId] || null;
}

export function getAllPresets(): RegulationPreset[] {
  return Object.values(REGULATION_PRESETS);
}
