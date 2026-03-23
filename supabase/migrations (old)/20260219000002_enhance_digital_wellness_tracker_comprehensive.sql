/*
  # Enhance Digital Wellness Tracker - Comprehensive for All Groups
  
  This migration expands the Digital Wellness Tracker to be comprehensive and inclusive
  for all groups of people: children, teens, adults, seniors, families, workers, students,
  caregivers, and people with different accessibility needs.
  
  Changes:
  1. Add device type tracking (not just phones)
  2. Add context/environment tracking (home, work, school, etc.)
  3. Add user demographic context (life stage, role)
  4. Add content quality and communication patterns
  5. Add accessibility and assistive technology tracking
  6. Add family/shared device scenarios
  7. Add device-free time tracking
  8. Add educational and creative work tracking
  9. Keep ALL existing fields unchanged (backward compatible)
  10. All new fields are optional
  
  Backward Compatibility:
  - All existing fields remain unchanged
  - All existing data remains valid
  - Existing trackers continue to work
  - New fields are all optional (nullable)
*/

-- Update Digital Wellness Tracker template
DO $$
DECLARE
  template_id_val UUID;
  existing_schema jsonb;
  new_fields jsonb;
BEGIN
  -- Find the Digital Wellness Tracker template
  SELECT id, field_schema INTO template_id_val, existing_schema
  FROM tracker_templates
  WHERE scope = 'global'
    AND name = 'Digital Wellness Tracker'
    AND archived_at IS NULL
  LIMIT 1;

  IF template_id_val IS NOT NULL THEN
    -- Build new fields array: keep all existing fields, add new comprehensive ones
    new_fields := existing_schema || jsonb_build_array(
      -- Device & Platform Tracking (Expanded)
      jsonb_build_object(
        'id', 'device_type',
        'label', 'Device Type',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'smartphone', 'label', 'Smartphone'),
          jsonb_build_object('value', 'tablet', 'label', 'Tablet'),
          jsonb_build_object('value', 'laptop', 'label', 'Laptop'),
          jsonb_build_object('value', 'desktop', 'label', 'Desktop Computer'),
          jsonb_build_object('value', 'smartwatch', 'label', 'Smartwatch'),
          jsonb_build_object('value', 'tv', 'label', 'TV/Streaming Device'),
          jsonb_build_object('value', 'gaming_console', 'label', 'Gaming Console'),
          jsonb_build_object('value', 'ereader', 'label', 'E-Reader'),
          jsonb_build_object('value', 'smart_speaker', 'label', 'Smart Speaker'),
          jsonb_build_object('value', 'vr_headset', 'label', 'VR/AR Headset'),
          jsonb_build_object('value', 'other', 'label', 'Other Device')
        ),
        'description', 'What device or platform were you using?'
      ),
      jsonb_build_object(
        'id', 'platform_type',
        'label', 'Platform Type',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'mobile_app', 'label', 'Mobile App'),
          jsonb_build_object('value', 'web_browser', 'label', 'Web Browser'),
          jsonb_build_object('value', 'desktop_app', 'label', 'Desktop Application'),
          jsonb_build_object('value', 'console_game', 'label', 'Console Game'),
          jsonb_build_object('value', 'streaming_service', 'label', 'Streaming Service'),
          jsonb_build_object('value', 'voice_assistant', 'label', 'Voice Assistant'),
          jsonb_build_object('value', 'messaging_platform', 'label', 'Messaging/Communication'),
          jsonb_build_object('value', 'other', 'label', 'Other')
        ),
        'description', 'What type of platform or interface were you using?'
      ),
      
      -- Context & Environment (New)
      jsonb_build_object(
        'id', 'use_context',
        'label', 'Context / Environment',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'home', 'label', 'Home'),
          jsonb_build_object('value', 'work', 'label', 'Work/Office'),
          jsonb_build_object('value', 'school', 'label', 'School/Education'),
          jsonb_build_object('value', 'commute', 'label', 'Commute/Transit'),
          jsonb_build_object('value', 'public', 'label', 'Public Space'),
          jsonb_build_object('value', 'social', 'label', 'Social Gathering'),
          jsonb_build_object('value', 'healthcare', 'label', 'Healthcare Setting'),
          jsonb_build_object('value', 'other', 'label', 'Other')
        ),
        'description', 'Where were you when using this device?'
      ),
      jsonb_build_object(
        'id', 'user_role_context',
        'label', 'Role / Life Stage Context',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'child', 'label', 'Child (under 13)'),
          jsonb_build_object('value', 'teen', 'label', 'Teen (13-17)'),
          jsonb_build_object('value', 'young_adult', 'label', 'Young Adult (18-25)'),
          jsonb_build_object('value', 'adult', 'label', 'Adult (26-64)'),
          jsonb_build_object('value', 'senior', 'label', 'Senior (65+)'),
          jsonb_build_object('value', 'student', 'label', 'Student'),
          jsonb_build_object('value', 'worker', 'label', 'Worker/Professional'),
          jsonb_build_object('value', 'caregiver', 'label', 'Caregiver'),
          jsonb_build_object('value', 'parent', 'label', 'Parent'),
          jsonb_build_object('value', 'educator', 'label', 'Educator/Teacher'),
          jsonb_build_object('value', 'retired', 'label', 'Retired'),
          jsonb_build_object('value', 'other', 'label', 'Other')
        ),
        'description', 'What role or life stage context applies? (Optional demographic context)'
      ),
      jsonb_build_object(
        'id', 'is_shared_device',
        'label', 'Shared Device',
        'type', 'boolean',
        'default', false,
        'description', 'Was this a shared or family device?'
      ),
      jsonb_build_object(
        'id', 'shared_with',
        'label', 'Shared With',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 200),
        'description', 'If shared device, who else uses it? (e.g., family, siblings, roommates)'
      ),
      
      -- Content & Communication Quality (New)
      jsonb_build_object(
        'id', 'content_quality',
        'label', 'Content Quality',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'default', 3,
        'description', 'How would you rate the quality of content you engaged with? (1 = low quality, 5 = high quality)'
      ),
      jsonb_build_object(
        'id', 'content_type',
        'label', 'Content Type',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'educational', 'label', 'Educational/Learning'),
          jsonb_build_object('value', 'creative', 'label', 'Creative/Creating'),
          jsonb_build_object('value', 'informational', 'label', 'Informational/News'),
          jsonb_build_object('value', 'entertainment', 'label', 'Entertainment'),
          jsonb_build_object('value', 'social', 'label', 'Social/Connection'),
          jsonb_build_object('value', 'work', 'label', 'Work/Productivity'),
          jsonb_build_object('value', 'shopping', 'label', 'Shopping/Commerce'),
          jsonb_build_object('value', 'health', 'label', 'Health/Wellness'),
          jsonb_build_object('value', 'other', 'label', 'Other')
        ),
        'description', 'What type of content were you engaging with?'
      ),
      jsonb_build_object(
        'id', 'communication_type',
        'label', 'Communication Type',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'one_on_one', 'label', 'One-on-One (1 person)'),
          jsonb_build_object('value', 'small_group', 'label', 'Small Group (2-5 people)'),
          jsonb_build_object('value', 'large_group', 'label', 'Large Group (6+ people)'),
          jsonb_build_object('value', 'public_post', 'label', 'Public Post/Update'),
          jsonb_build_object('value', 'video_call', 'label', 'Video Call/Meeting'),
          jsonb_build_object('value', 'voice_call', 'label', 'Voice Call'),
          jsonb_build_object('value', 'text_message', 'label', 'Text/Instant Message'),
          jsonb_build_object('value', 'email', 'label', 'Email'),
          jsonb_build_object('value', 'none', 'label', 'No Communication'),
          jsonb_build_object('value', 'other', 'label', 'Other')
        ),
        'description', 'What type of digital communication occurred? (if any)'
      ),
      jsonb_build_object(
        'id', 'communication_quality',
        'label', 'Communication Quality',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'description', 'How meaningful or positive was the communication? (1 = negative/poor, 5 = very positive/meaningful)'
      ),
      
      -- Accessibility & Assistive Technology (New)
      jsonb_build_object(
        'id', 'accessibility_tools',
        'label', 'Accessibility Tools Used',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 500),
        'description', 'What accessibility or assistive technology did you use? (e.g., screen reader, voice control, magnification, captions, switch control)'
      ),
      jsonb_build_object(
        'id', 'accessibility_needs_met',
        'label', 'Accessibility Needs Met',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'description', 'How well were your accessibility needs met? (1 = needs not met, 5 = needs fully met)'
      ),
      
      -- Educational & Creative Work (New)
      jsonb_build_object(
        'id', 'is_educational',
        'label', 'Educational Use',
        'type', 'boolean',
        'default', false,
        'description', 'Was this for learning or educational purposes?'
      ),
      jsonb_build_object(
        'id', 'is_creative_work',
        'label', 'Creative Work',
        'type', 'boolean',
        'default', false,
        'description', 'Were you creating content or doing creative work?'
      ),
      jsonb_build_object(
        'id', 'creative_output',
        'label', 'Creative Output Type',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 200),
        'description', 'What did you create? (e.g., writing, art, music, code, video, design)'
      ),
      jsonb_build_object(
        'id', 'learning_topic',
        'label', 'Learning Topic / Subject',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 200),
        'description', 'What were you learning about? (if educational use)'
      ),
      
      -- Device-Free Time & Breaks (New)
      jsonb_build_object(
        'id', 'device_free_time',
        'label', 'Device-Free Time (minutes)',
        'type', 'number',
        'validation', jsonb_build_object('min', 0, 'max', 1440),
        'description', 'How many minutes did you spend without any digital devices?'
      ),
      jsonb_build_object(
        'id', 'break_quality',
        'label', 'Break Quality',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'description', 'How restful or restorative was your break from devices? (1 = not restful, 5 = very restful)'
      ),
      jsonb_build_object(
        'id', 'break_activities',
        'label', 'Break Activities',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 500),
        'description', 'What did you do during device-free time? (e.g., reading, exercise, conversation, nature, rest)'
      ),
      
      -- Social & Relationship Aspects (New)
      jsonb_build_object(
        'id', 'social_connection_quality',
        'label', 'Social Connection Quality',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'description', 'How connected did you feel to others? (1 = disconnected/isolated, 5 = very connected)'
      ),
      jsonb_build_object(
        'id', 'was_with_others',
        'label', 'Using Device With Others',
        'type', 'boolean',
        'default', false,
        'description', 'Were you using the device together with other people (co-viewing, co-playing, shared activity)?'
      ),
      jsonb_build_object(
        'id', 'shared_activity_type',
        'label', 'Shared Activity Type',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'watching_together', 'label', 'Watching Together'),
          jsonb_build_object('value', 'playing_together', 'label', 'Playing Together'),
          jsonb_build_object('value', 'learning_together', 'label', 'Learning Together'),
          jsonb_build_object('value', 'creating_together', 'label', 'Creating Together'),
          jsonb_build_object('value', 'communicating', 'label', 'Communicating/Video Call'),
          jsonb_build_object('value', 'other', 'label', 'Other')
        ),
        'description', 'What type of shared digital activity? (if using with others)'
      ),
      
      -- Health & Wellbeing Context (Expanded)
      jsonb_build_object(
        'id', 'physical_comfort',
        'label', 'Physical Comfort',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'description', 'How physically comfortable were you while using the device? (1 = uncomfortable, 5 = very comfortable)'
      ),
      jsonb_build_object(
        'id', 'eye_strain_level',
        'label', 'Eye Strain Level',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'description', 'How much eye strain did you experience? (1 = no strain, 5 = significant strain)'
      ),
      jsonb_build_object(
        'id', 'posture_awareness',
        'label', 'Posture Awareness',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'description', 'How aware were you of your posture? (1 = not aware, 5 = very aware/maintained good posture)'
      ),
      
      -- Work & Productivity Context (Expanded)
      jsonb_build_object(
        'id', 'work_related',
        'label', 'Work Related',
        'type', 'boolean',
        'default', false,
        'description', 'Was this usage work or job-related?'
      ),
      jsonb_build_object(
        'id', 'required_for_work',
        'label', 'Required for Work',
        'type', 'boolean',
        'default', false,
        'description', 'Was this device usage required as part of your job or responsibilities?'
      ),
      jsonb_build_object(
        'id', 'work_productivity',
        'label', 'Work Productivity',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'description', 'How productive did you feel during work-related usage? (1 = not productive, 5 = very productive)'
      ),
      
      -- Reflection & Context (Expanded)
      jsonb_build_object(
        'id', 'overall_satisfaction',
        'label', 'Overall Satisfaction',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'description', 'Overall, how satisfied were you with this digital experience? (1 = very dissatisfied, 5 = very satisfied)'
      ),
      jsonb_build_object(
        'id', 'would_repeat',
        'label', 'Would Repeat This Experience',
        'type', 'boolean',
        'description', 'Would you want to repeat this type of digital usage?'
      ),
      jsonb_build_object(
        'id', 'key_takeaway',
        'label', 'Key Takeaway / Insight',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 1000),
        'description', 'Any key insight, observation, or takeaway from this digital experience?'
      )
    );

    -- Update the template
    UPDATE tracker_templates
    SET 
      description = 'Comprehensive digital wellness tracking for everyone. Understand how your digital environment affects your attention, energy, mood, behavior, relationships, work, learning, creativity, and overall wellbeing. Track across all devices, contexts, and life stages—without judgment or enforcement. Inclusive design for children, teens, adults, seniors, students, workers, caregivers, and people with accessibility needs.',
      field_schema = new_fields,
      tags = jsonb_build_array(
        'digital-wellness', 'screen-time', 'attention', 'boundaries', 'wellness', 
        'self-care', 'mobile', 'tracking', 'accessibility', 'education', 'creativity',
        'work', 'family', 'social-connection', 'health', 'inclusive', 'comprehensive'
      ),
      icon = 'Smartphone',
      color = 'violet',
      updated_at = NOW(),
      version = 3 -- Increment version to indicate comprehensive enhancement
    WHERE id = template_id_val;

    RAISE NOTICE 'Successfully enhanced Digital Wellness Tracker with comprehensive fields for all groups';
  ELSE
    RAISE NOTICE 'Digital Wellness Tracker template not found, skipping enhancement';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE tracker_templates IS 
  'Digital Wellness Tracker has been comprehensively enhanced to support all groups: children, teens, adults, seniors, students, workers, caregivers, families, and people with accessibility needs. Includes device diversity, context awareness, content quality, accessibility tools, educational use, creative work, and social connection tracking.';
