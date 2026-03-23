import type { DomainType } from '../templateTypes';

export const TEMPLATE_VALIDATION_TEST_CASES = {
  noCrossDomainLeak: [
    {
      description: 'Startup project should not see Work templates',
      domain: 'startup' as DomainType,
      expectedTemplates: ['MVP Build', 'Marketing', 'Operations'],
      forbiddenTemplates: ['Strategic Work', 'Project Delivery', 'Skill Growth'],
    },
    {
      description: 'Work project should not see Personal templates',
      domain: 'work' as DomainType,
      expectedTemplates: ['Strategic Work', 'Project Delivery', 'Skill Growth'],
      forbiddenTemplates: ['Life Admin', 'Health', 'Learning'],
    },
    {
      description: 'Personal project should not see Passion templates',
      domain: 'personal' as DomainType,
      expectedTemplates: ['Life Admin', 'Health', 'Learning'],
      forbiddenTemplates: ['Creative Project', 'Craft / Hobby', 'Writing'],
    },
    {
      description: 'Passion project should not see Startup templates',
      domain: 'passion' as DomainType,
      expectedTemplates: ['Creative Project', 'Craft / Hobby', 'Writing'],
      forbiddenTemplates: ['MVP Build', 'Marketing', 'Operations'],
    },
  ],

  defaultTemplateApplication: [
    {
      description: 'Startup project should auto-create only MVP Build',
      domain: 'startup' as DomainType,
      expectedDefaults: ['MVP Build'],
      expectedDefaultCount: 1,
    },
    {
      description: 'Work project should auto-create only Strategic Work',
      domain: 'work' as DomainType,
      expectedDefaults: ['Strategic Work'],
      expectedDefaultCount: 1,
    },
    {
      description: 'Personal project should auto-create only Life Admin',
      domain: 'personal' as DomainType,
      expectedDefaults: ['Life Admin'],
      expectedDefaultCount: 1,
    },
    {
      description: 'Passion project should auto-create only Creative Project',
      domain: 'passion' as DomainType,
      expectedDefaults: ['Creative Project'],
      expectedDefaultCount: 1,
    },
  ],

  subTrackLinkage: [
    {
      description: 'MVP Build should have exactly 5 sub-tracks',
      templateName: 'MVP Build',
      expectedSubTrackCount: 5,
      expectedSubTracks: ['Research', 'UX/UI Design', 'Development', 'Testing', 'Launch'],
    },
    {
      description: 'Marketing should have exactly 5 sub-tracks',
      templateName: 'Marketing',
      expectedSubTrackCount: 5,
      expectedSubTracks: ['Branding', 'Market Analysis', 'Acquisition', 'Content', 'Analytics'],
    },
    {
      description: 'Life Admin should have exactly 3 sub-tracks',
      templateName: 'Life Admin',
      expectedSubTrackCount: 3,
      expectedSubTracks: ['Home', 'Finance', 'Errands'],
    },
    {
      description: 'Creative Project should have exactly 4 sub-tracks',
      templateName: 'Creative Project',
      expectedSubTrackCount: 4,
      expectedSubTracks: ['Inspiration', 'Drafting', 'Iteration', 'Completion'],
    },
  ],

  crossDomainValidation: [
    {
      description: 'Should throw error when applying Work template to Personal project',
      projectDomain: 'personal' as DomainType,
      attemptedTemplate: 'Strategic Work',
      shouldThrowError: true,
      expectedErrorMessage: 'This template does not belong to the selected domain',
    },
    {
      description: 'Should throw error when applying Passion template to Startup project',
      projectDomain: 'startup' as DomainType,
      attemptedTemplate: 'Creative Project',
      shouldThrowError: true,
      expectedErrorMessage: 'This template does not belong to the selected domain',
    },
    {
      description: 'Should allow applying Startup template to Startup project',
      projectDomain: 'startup' as DomainType,
      attemptedTemplate: 'MVP Build',
      shouldThrowError: false,
    },
    {
      description: 'Should allow applying Work template to Work project',
      projectDomain: 'work' as DomainType,
      attemptedTemplate: 'Project Delivery',
      shouldThrowError: false,
    },
  ],
};

export const TEST_IMPLEMENTATION_GUIDE = `
# Track Template Validation Tests

## Purpose
Ensure strict domain-template visibility rules are enforced at the service layer.

## Test Categories

### 1. No Cross-Domain Template Leak
Test that only domain-appropriate templates are returned when querying.

Functions to test:
- getTemplatesForDomain(domainType)
- getAllowedTemplates(domainType)
- getTrackTemplates(domainType)

Assertions:
- Template names match expected list
- No templates from other domains are present
- Ordering is consistent

### 2. Default Template Application
Test that only the correct default templates are applied during project creation.

Functions to test:
- getDefaultTemplatesForDomain(domainType)
- createTracksFromDefaultTemplates(masterProjectId, domainType)

Assertions:
- Only one default template per domain
- Correct template is marked as default
- Sub-tracks are created correctly

### 3. Sub-Track Template Linkage
Test that sub-track templates remain correctly linked to their parent track templates.

Functions to test:
- getSubTrackTemplates(trackTemplateId)
- getAllowedTemplates(domainType) [verify subtracks included]

Assertions:
- Sub-track count matches expected
- Sub-track names match expected
- Ordering is maintained

### 4. Cross-Domain Validation
Test that validation functions correctly prevent cross-domain template application.

Functions to test:
- validateTemplateForDomain(domainType, trackTemplateId)
- createTrackFromTemplate(input) [with domain_type validation]

Assertions:
- Throws error for invalid domain-template combinations
- Error message is descriptive
- Allows valid domain-template combinations

## Implementation Steps

1. Set up test database with seeded templates
2. Create helper functions to query templates
3. Write test cases for each category
4. Run tests and verify all pass
5. Document any edge cases or limitations

## Example Test Structure

\`\`\`typescript
describe('Template Validation', () => {
  describe('No Cross-Domain Leak', () => {
    it('should only return Startup templates for Startup domain', async () => {
      const templates = await getTemplatesForDomain('startup');
      const names = templates.map(t => t.name);
      expect(names).toEqual(['MVP Build', 'Marketing', 'Operations']);
    });

    it('should not include Work templates in Startup query', async () => {
      const templates = await getTemplatesForDomain('startup');
      const names = templates.map(t => t.name);
      expect(names).not.toContain('Strategic Work');
      expect(names).not.toContain('Project Delivery');
      expect(names).not.toContain('Skill Growth');
    });
  });

  describe('Default Template Application', () => {
    it('should auto-create only MVP Build for Startup projects', async () => {
      const defaults = await getDefaultTemplatesForDomain('startup');
      expect(defaults).toHaveLength(1);
      expect(defaults[0].name).toBe('MVP Build');
    });
  });

  describe('Cross-Domain Validation', () => {
    it('should throw error when applying Work template to Personal project', async () => {
      await expect(
        validateTemplateForDomain('personal', workTemplateId)
      ).rejects.toThrow('This template does not belong to the selected domain');
    });
  });
});
\`\`\`

## Notes

- Tests should be run against a clean database with fresh seed data
- Tests should be idempotent and not affect each other
- Mock data should match production seed data exactly
- All error messages should be descriptive and helpful
`;
