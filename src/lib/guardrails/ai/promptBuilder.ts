import type { AIRoadmapGeneratorInput } from './types';

export function buildRoadmapPrompt(input: AIRoadmapGeneratorInput): string {
  const {
    projectName,
    projectDescription,
    domainType,
    tracks,
    constraints,
  } = input;

  const domainContext = getDomainContext(domainType);
  const tracksDescription = buildTracksDescription(tracks);
  const constraintsDescription = buildConstraintsDescription(constraints);

  const prompt = `
You are a project planning expert specializing in ${domainType} projects. Generate a detailed roadmap for the following project.

PROJECT INFORMATION:
- Name: ${projectName}
${projectDescription ? `- Description: ${projectDescription}` : ''}
- Domain: ${domainType} (${domainContext})

TRACKS AND SUBTRACKS:
${tracksDescription}

${constraintsDescription}

INSTRUCTIONS:
1. Create a comprehensive roadmap with actionable items for each track and subtrack
2. Each item should have:
   - A clear, specific title
   - A detailed description (2-3 sentences explaining what needs to be done)
   - An estimated time in hours (be realistic based on the constraint data)
3. Items should be logical and sequential where appropriate
4. Consider dependencies between items
5. Ensure items are specific to the ${domainType} domain
6. For each track, distribute items across its subtracks appropriately

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:

{
  "roadmap": [
    {
      "track": "Track Name",
      "subtrack": "Subtrack Name (optional, omit if not applicable)",
      "items": [
        {
          "title": "Clear, actionable item title",
          "description": "Detailed description of what needs to be done and why",
          "estimated_hours": 5
        }
      ]
    }
  ],
  "timeline_suggestions": {
    "recommended_duration_weeks": 12,
    "notes": "Brief explanation of timeline considerations"
  }
}

IMPORTANT:
- Return ONLY valid JSON, no additional text before or after
- Do not include markdown code blocks
- Ensure all JSON is properly formatted with no trailing commas
- Include 3-8 items per subtrack
- Make items specific and actionable, not vague
`;

  return prompt.trim();
}

function getDomainContext(domainType: string): string {
  const contexts: Record<string, string> = {
    work: 'Professional career development, workplace projects, and business objectives',
    personal: 'Life goals, self-improvement, relationships, and personal growth',
    creative: 'Startup ventures, entrepreneurship, innovation, and business creation',
    health: 'Physical wellness, mental health, fitness goals, and lifestyle changes',
  };

  return contexts[domainType] || 'General project management';
}

function buildTracksDescription(tracks: AIRoadmapGeneratorInput['tracks']): string {
  if (!tracks || tracks.length === 0) {
    return 'No tracks defined. Create a general roadmap structure.';
  }

  const descriptions = tracks.map((track, index) => {
    const subtracksList = track.subtracks.map(st => `  - ${st.subtrackName}`).join('\n');

    return `
${index + 1}. ${track.trackName}
   Subtracks:
${subtracksList || '   (No subtracks defined)'}`;
  });

  return descriptions.join('\n');
}

function buildConstraintsDescription(constraints?: AIRoadmapGeneratorInput['constraints']): string {
  if (!constraints) {
    return '';
  }

  const parts: string[] = ['CONSTRAINTS:'];

  if (constraints.timeAvailablePerWeek) {
    parts.push(`- Available time: ${constraints.timeAvailablePerWeek} hours per week`);
  }

  if (constraints.deadline) {
    parts.push(`- Target deadline: ${constraints.deadline}`);
  }

  if (constraints.resources && constraints.resources.length > 0) {
    parts.push(`- Available resources: ${constraints.resources.join(', ')}`);
  }

  return parts.length > 1 ? parts.join('\n') : '';
}
