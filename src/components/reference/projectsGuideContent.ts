/**
 * Projects Guide Content
 * 
 * Phase 9: Comprehensive explanation of Projects with detailed examples.
 * 
 * Explains what projects are, how they work, and provides examples across all core project categories.
 */

export interface ProjectsGuideSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  examples?: Array<{
    title: string;
    description: string;
    useCase: string;
  }>;
}

export const PROJECTS_GUIDE_SECTIONS: ProjectsGuideSection[] = [
  {
    id: 'what-are-projects',
    title: 'What Are Projects?',
    icon: '📋',
    content: 'Projects in Guardrails are structured containers for organizing complex work. Each project can have tracks (major phases), subtracks (sub-phases), and events (specific tasks or milestones). Projects help you break down big goals into manageable steps and see everything in one place.',
  },
  {
    id: 'how-projects-work',
    title: 'How Projects Work',
    icon: '⚙️',
    content: 'Projects use a hierarchical structure: Projects contain Tracks, Tracks contain Subtracks, and Subtracks contain Events. This lets you organize work at different levels of detail. You can sync project events to your calendar, share projects with collaborators, and track progress across all levels.',
  },
  {
    id: 'event-organizing-projects',
    title: 'Event Organizing Projects',
    icon: '🎉',
    content: 'Perfect for planning weddings, parties, conferences, or any gathering. Organize by phases like planning, logistics, marketing, and day-of execution. Track vendor meetings, deadlines, and milestones.',
    examples: [
      {
        title: 'Wedding Planning',
        description: 'Tracks: Venue & Catering, Attire & Beauty, Photography, Guest Management. Events: Venue tours, dress fittings, RSVP deadlines, rehearsal dinner.',
        useCase: 'Coordinate all wedding details, manage vendor communications, and ensure nothing is missed before the big day.',
      },
      {
        title: 'Corporate Conference',
        description: 'Tracks: Content Development, Speaker Management, Logistics, Marketing. Events: Speaker confirmations, venue setup, registration deadlines, marketing campaigns.',
        useCase: 'Manage a multi-day conference with hundreds of attendees, multiple speakers, and complex logistics.',
      },
      {
        title: 'Birthday Party',
        description: 'Tracks: Planning, Decorations, Food & Drinks, Entertainment. Events: Invitation send date, cake order deadline, decoration setup, party day.',
        useCase: 'Plan a memorable celebration with clear timelines and task assignments.',
      },
    ],
  },
  {
    id: 'creative-projects',
    title: 'Creative Projects',
    icon: '🎨',
    content: 'Ideal for writing, art, music, design, or any creative endeavor. Organize by stages like ideation, development, production, and release. Track creative milestones, deadlines, and iterations.',
    examples: [
      {
        title: 'Writing a Book',
        description: 'Tracks: Research, Outline, First Draft, Revisions, Publishing. Events: Research deadlines, chapter completion dates, editor meetings, publication date.',
        useCase: 'Break down a book project into manageable writing phases with clear milestones and deadlines.',
      },
      {
        title: 'Album Production',
        description: 'Tracks: Songwriting, Recording, Mixing, Mastering, Release. Events: Studio booking dates, mixing sessions, mastering deadline, release date.',
        useCase: 'Coordinate a music production project with multiple songs, sessions, and release timelines.',
      },
      {
        title: 'Art Exhibition',
        description: 'Tracks: Concept Development, Creation, Curation, Installation. Events: Concept approval, artwork completion, gallery installation, opening night.',
        useCase: 'Plan an art show from initial concept through opening night with clear creative and logistical phases.',
      },
      {
        title: 'Web Design Project',
        description: 'Tracks: Discovery, Design, Development, Testing, Launch. Events: Client meetings, design reviews, development sprints, launch date.',
        useCase: 'Manage a website design project with client feedback loops and technical milestones.',
      },
    ],
  },
  {
    id: 'work-project-management',
    title: 'Work Project Management',
    icon: '💼',
    content: 'Essential for business projects, product launches, client work, or team initiatives. Organize by phases like planning, execution, review, and delivery. Track deliverables, deadlines, and stakeholder meetings.',
    examples: [
      {
        title: 'Product Launch',
        description: 'Tracks: Development, Marketing, Sales, Support. Events: Beta release, marketing campaign start, launch date, post-launch review.',
        useCase: 'Coordinate a product launch across multiple departments with synchronized timelines and deliverables.',
      },
      {
        title: 'Client Project',
        description: 'Tracks: Discovery, Design, Development, Delivery. Events: Kickoff meeting, design presentations, development milestones, final delivery.',
        useCase: 'Manage client expectations and deliverables with clear phases and communication checkpoints.',
      },
      {
        title: 'Business Initiative',
        description: 'Tracks: Planning, Implementation, Training, Rollout. Events: Strategy sessions, implementation milestones, training dates, go-live.',
        useCase: 'Execute a business change initiative with clear phases and stakeholder communication.',
      },
      {
        title: 'Team Restructure',
        description: 'Tracks: Planning, Communication, Transition, Optimization. Events: Announcement date, transition meetings, new structure launch, review period.',
        useCase: 'Manage organizational changes with careful planning and clear communication timelines.',
      },
    ],
  },
  {
    id: 'personal-goals-life-projects',
    title: 'Personal Goals & Life Projects',
    icon: '🌟',
    content: 'Great for personal development, health goals, home improvements, or life transitions. Organize by phases like preparation, action, and maintenance. Track personal milestones and progress.',
    examples: [
      {
        title: 'Fitness Transformation',
        description: 'Tracks: Assessment, Training Plan, Nutrition, Progress Tracking. Events: Initial assessment, program start, check-ins, goal milestones.',
        useCase: 'Structure a fitness journey with clear phases, milestones, and progress tracking.',
      },
      {
        title: 'Home Renovation',
        description: 'Tracks: Planning, Permits, Construction, Finishing. Events: Contractor meetings, permit approvals, construction phases, final inspection.',
        useCase: 'Coordinate a home renovation with contractors, permits, and multiple phases of work.',
      },
      {
        title: 'Career Change',
        description: 'Tracks: Research, Skill Development, Networking, Application. Events: Course completion, networking events, application deadlines, interviews.',
        useCase: 'Plan a career transition with structured skill development and strategic job search phases.',
      },
      {
        title: 'Learning a New Skill',
        description: 'Tracks: Foundation, Practice, Application, Mastery. Events: Course start dates, practice milestones, project deadlines, skill assessments.',
        useCase: 'Structure learning a new skill with clear progression and measurable milestones.',
      },
    ],
  },
  {
    id: 'academic-research-projects',
    title: 'Academic & Research Projects',
    icon: '📚',
    content: 'Perfect for research papers, thesis work, or academic studies. Organize by phases like literature review, methodology, data collection, analysis, and writing. Track research milestones and deadlines.',
    examples: [
      {
        title: 'Research Paper',
        description: 'Tracks: Literature Review, Methodology, Data Collection, Analysis, Writing. Events: Research deadlines, data collection periods, analysis sessions, submission date.',
        useCase: 'Structure academic research with clear phases and submission deadlines.',
      },
      {
        title: 'Thesis or Dissertation',
        description: 'Tracks: Proposal, Research, Writing, Defense. Events: Proposal defense, research milestones, chapter deadlines, final defense.',
        useCase: 'Manage a long-term academic project with multiple phases and critical deadlines.',
      },
      {
        title: 'Research Study',
        description: 'Tracks: Design, Ethics Approval, Recruitment, Data Collection, Analysis. Events: Ethics submission, recruitment periods, data collection windows, analysis deadlines.',
        useCase: 'Coordinate a research study with ethical approvals, participant recruitment, and data collection phases.',
      },
    ],
  },
  {
    id: 'construction-renovation-projects',
    title: 'Construction & Renovation Projects',
    icon: '🏗️',
    content: 'Ideal for building, remodeling, or construction work. Organize by phases like design, permits, construction, and inspection. Track contractor meetings, material orders, and milestone completions.',
    examples: [
      {
        title: 'Home Build',
        description: 'Tracks: Design, Permits, Foundation, Framing, Finishing. Events: Design approvals, permit submissions, foundation pour, framing completion, final inspection.',
        useCase: 'Coordinate a home construction project with multiple contractors and critical milestones.',
      },
      {
        title: 'Kitchen Remodel',
        description: 'Tracks: Design, Demolition, Installation, Finishing. Events: Design approval, demolition start, cabinet installation, appliance delivery, completion.',
        useCase: 'Manage a kitchen renovation with clear phases and coordination between contractors.',
      },
      {
        title: 'Commercial Build',
        description: 'Tracks: Planning, Permits, Construction, Inspection, Occupancy. Events: Permit approvals, construction phases, inspections, final occupancy.',
        useCase: 'Coordinate a commercial construction project with regulatory requirements and multiple stakeholders.',
      },
    ],
  },
  {
    id: 'marketing-campaign-projects',
    title: 'Marketing & Campaign Projects',
    icon: '📢',
    content: 'Perfect for marketing campaigns, product launches, or brand initiatives. Organize by phases like strategy, creative development, execution, and analysis. Track campaign milestones and performance reviews.',
    examples: [
      {
        title: 'Product Launch Campaign',
        description: 'Tracks: Strategy, Creative, Production, Launch, Analysis. Events: Strategy approval, creative deadlines, production milestones, launch date, performance review.',
        useCase: 'Coordinate a multi-channel marketing campaign with synchronized creative and execution phases.',
      },
      {
        title: 'Brand Rebranding',
        description: 'Tracks: Research, Design, Implementation, Rollout. Events: Brand research completion, design approvals, implementation phases, public launch.',
        useCase: 'Manage a comprehensive rebranding project with multiple touchpoints and launch phases.',
      },
      {
        title: 'Event Marketing',
        description: 'Tracks: Planning, Promotion, Execution, Follow-up. Events: Campaign start, promotion deadlines, event day, post-event analysis.',
        useCase: 'Coordinate event marketing with pre-event promotion and post-event follow-up phases.',
      },
    ],
  },
  {
    id: 'software-development-projects',
    title: 'Software Development Projects',
    icon: '💻',
    content: 'Essential for app development, website builds, or software releases. Organize by phases like planning, development, testing, and deployment. Track sprints, releases, and technical milestones.',
    examples: [
      {
        title: 'Mobile App Development',
        description: 'Tracks: Planning, Development, Testing, Launch. Events: Sprint planning, feature completion, testing phases, app store submission, launch date.',
        useCase: 'Manage app development with agile sprints, testing phases, and coordinated launch.',
      },
      {
        title: 'Website Redesign',
        description: 'Tracks: Discovery, Design, Development, Launch. Events: Discovery sessions, design reviews, development sprints, launch date.',
        useCase: 'Coordinate a website redesign with client feedback loops and technical implementation phases.',
      },
      {
        title: 'Software Feature Release',
        description: 'Tracks: Planning, Development, QA, Release. Events: Feature planning, development milestones, QA testing, release date.',
        useCase: 'Manage feature development with clear development and testing phases before release.',
      },
    ],
  },
  {
    id: 'business-management-projects',
    title: 'Business Management Projects',
    icon: '🏢',
    content: 'Perfect for managing startups, existing businesses, and collaborative business initiatives. Organize by phases like planning, execution, growth, and optimization. Track business milestones, team coordination, and strategic initiatives across multiple projects.',
    examples: [
      {
        title: 'Startup Launch',
        description: 'Tracks: Business Planning, Legal Setup, Product Development, Marketing, Launch. Events: Business plan completion, incorporation, MVP development, marketing campaign start, launch date.',
        useCase: 'Coordinate all aspects of launching a new business with clear phases and milestones across legal, product, and marketing.',
      },
      {
        title: 'Business Growth Initiative',
        description: 'Tracks: Strategy, Implementation, Team Expansion, Market Expansion, Optimization. Events: Strategy sessions, hiring milestones, market entry dates, performance reviews.',
        useCase: 'Manage business growth with structured phases for scaling operations, teams, and market presence.',
      },
      {
        title: 'Multi-Project Business Management',
        description: 'Tracks: Project Portfolio, Resource Allocation, Timeline Coordination, Performance Tracking. Events: Project kickoffs, resource reviews, milestone check-ins, portfolio reviews.',
        useCase: 'Coordinate multiple business projects simultaneously with clear resource allocation and timeline management.',
      },
      {
        title: 'Collaborative Business Project',
        description: 'Tracks: Planning, Team Coordination, Execution, Review. Events: Team meetings, milestone deadlines, collaboration checkpoints, project reviews.',
        useCase: 'Manage collaborative business projects with shared calendars and coordinated team efforts across departments.',
      },
      {
        title: 'Business Process Improvement',
        description: 'Tracks: Analysis, Design, Implementation, Training, Optimization. Events: Process analysis completion, design approval, implementation start, training sessions, optimization reviews.',
        useCase: 'Structure business process improvements with clear phases from analysis through optimization.',
      },
      {
        title: 'New Market Entry',
        description: 'Tracks: Market Research, Strategy, Setup, Launch, Expansion. Events: Research completion, strategy approval, market setup, launch date, expansion milestones.',
        useCase: 'Coordinate entering a new market with structured research, setup, and launch phases.',
      },
      {
        title: 'Business Partnership Development',
        description: 'Tracks: Partner Identification, Negotiation, Agreement, Integration, Growth. Events: Partner meetings, negotiation milestones, agreement signing, integration phases, growth reviews.',
        useCase: 'Manage business partnerships from initial identification through integration and growth phases.',
      },
    ],
  },
  {
    id: 'education-training-projects',
    title: 'Education & Training Projects',
    icon: '📚',
    content: 'Perfect for teaching, curriculum development, training programs, or educational initiatives. Organize by phases like planning, development, delivery, and evaluation. Track course milestones, training sessions, and educational outcomes.',
    examples: [
      {
        title: 'Course Development',
        description: 'Tracks: Curriculum Design, Content Creation, Assessment Development, Pilot Testing, Launch. Events: Curriculum approval, content creation deadlines, pilot sessions, course launch date.',
        useCase: 'Structure course development from initial design through launch with clear content and assessment milestones.',
      },
      {
        title: 'Training Program',
        description: 'Tracks: Needs Assessment, Program Design, Material Development, Delivery, Evaluation. Events: Assessment completion, design approval, material deadlines, training sessions, evaluation dates.',
        useCase: 'Coordinate a comprehensive training program with clear phases from assessment through evaluation.',
      },
      {
        title: 'Workshop Series',
        description: 'Tracks: Planning, Content Development, Marketing, Delivery, Follow-up. Events: Planning sessions, content deadlines, marketing launch, workshop dates, follow-up sessions.',
        useCase: 'Manage a workshop series with coordinated content development, marketing, and delivery phases.',
      },
      {
        title: 'Educational Initiative',
        description: 'Tracks: Research, Planning, Implementation, Monitoring, Evaluation. Events: Research completion, planning approval, implementation start, monitoring checkpoints, evaluation dates.',
        useCase: 'Structure an educational initiative with research-backed planning and continuous evaluation.',
      },
    ],
  },
  {
    id: 'healthcare-wellness-projects',
    title: 'Healthcare & Wellness Projects',
    icon: '🏥',
    content: 'Ideal for treatment plans, health journeys, therapy programs, or wellness initiatives. Organize by phases like assessment, treatment, monitoring, and maintenance. Track health milestones, appointments, and progress.',
    examples: [
      {
        title: 'Treatment Plan',
        description: 'Tracks: Assessment, Treatment Design, Implementation, Monitoring, Adjustment. Events: Assessment appointments, treatment start, monitoring checkpoints, adjustment sessions.',
        useCase: 'Structure a treatment plan with clear phases, monitoring points, and adjustment opportunities.',
      },
      {
        title: 'Health Journey',
        description: 'Tracks: Goal Setting, Planning, Action, Monitoring, Maintenance. Events: Goal setting sessions, plan approval, action milestones, progress reviews, maintenance checkpoints.',
        useCase: 'Manage a personal health journey with structured phases from goal setting through maintenance.',
      },
      {
        title: 'Therapy Program',
        description: 'Tracks: Intake, Treatment Planning, Sessions, Progress Review, Completion. Events: Intake appointments, treatment plan approval, session dates, progress reviews, completion evaluation.',
        useCase: 'Coordinate a therapy program with clear treatment phases and progress tracking milestones.',
      },
      {
        title: 'Recovery Plan',
        description: 'Tracks: Assessment, Planning, Active Recovery, Monitoring, Long-term Maintenance. Events: Assessment completion, plan approval, recovery milestones, monitoring checkpoints, maintenance reviews.',
        useCase: 'Structure a recovery plan with phased approach from initial assessment through long-term maintenance.',
      },
      {
        title: 'Wellness Program',
        description: 'Tracks: Planning, Launch, Engagement, Monitoring, Optimization. Events: Program planning, launch date, engagement activities, monitoring reviews, optimization sessions.',
        useCase: 'Coordinate a wellness program with clear engagement phases and continuous optimization.',
      },
    ],
  },
  {
    id: 'nonprofit-community-projects',
    title: 'Non-profit & Community Projects',
    icon: '🤝',
    content: 'Perfect for fundraising campaigns, community organizing, volunteer coordination, or advocacy initiatives. Organize by phases like planning, outreach, execution, and follow-up. Track fundraising milestones, volunteer coordination, and community impact.',
    examples: [
      {
        title: 'Fundraising Campaign',
        description: 'Tracks: Planning, Outreach, Fundraising Events, Donor Management, Follow-up. Events: Campaign planning, outreach launch, fundraising events, donor meetings, thank-you communications.',
        useCase: 'Coordinate a fundraising campaign with structured outreach, events, and donor management phases.',
      },
      {
        title: 'Community Organizing',
        description: 'Tracks: Research, Outreach, Mobilization, Action, Evaluation. Events: Research completion, outreach launch, mobilization meetings, action events, evaluation sessions.',
        useCase: 'Structure community organizing with clear phases from research through action and evaluation.',
      },
      {
        title: 'Volunteer Coordination',
        description: 'Tracks: Recruitment, Training, Assignment, Support, Recognition. Events: Recruitment launch, training sessions, volunteer assignments, support check-ins, recognition events.',
        useCase: 'Manage volunteer coordination with structured recruitment, training, and support phases.',
      },
      {
        title: 'Advocacy Initiative',
        description: 'Tracks: Research, Strategy, Outreach, Action, Impact Assessment. Events: Research completion, strategy approval, outreach launch, action events, impact assessment.',
        useCase: 'Coordinate an advocacy initiative with research-backed strategy and impact tracking.',
      },
      {
        title: 'Charity Event',
        description: 'Tracks: Planning, Promotion, Logistics, Execution, Follow-up. Events: Planning sessions, promotion launch, logistics setup, event day, follow-up communications.',
        useCase: 'Manage a charity event with coordinated planning, promotion, and execution phases.',
      },
    ],
  },
  {
    id: 'how-projects-influence-experience',
    title: 'How Projects Influence Your Experience',
    icon: '✨',
    content: 'Projects in Guardrails create a structured approach to complex work. By breaking things into tracks, subtracks, and events, you can see the big picture while managing details. When you sync project events to your calendar, everything stays coordinated. Projects help you move from ideas to execution with clarity and control.',
  },
];

/**
 * Get all projects guide sections
 */
export function getAllProjectsGuideSections(): ProjectsGuideSection[] {
  return PROJECTS_GUIDE_SECTIONS;
}
