import type { FormConfig } from '../../lib/types.ts';

const agree = { type: 'scale', required: true, help: 'How much do you agree?', minLabel: 'Strongly disagree', maxLabel: 'Strongly agree' } as const;

export default {
  id: 'lifegroup-survey',
  eyebrow: 'LifeGroups',
  title: 'Mid-Semester LifeGroups Survey',
  description: "This survey is completely anonymous. We don't collect your name, email, or anything else that identifies you.",
  submitLabel: 'Submit survey',
  anonymous: true,
  // Set this before sharing: the giveaway is drawn once the survey closes.
  // closesAt: '2026-11-07T23:59:00-05:00',
  compareBy: 'lifegroup',
  giveaway: {
    prize: "A free scoop at Mitchell's Ice Cream",
    winners: 5,
    questions: ['going-well', 'not-going-well', 'change', 'study-format', 'leaders'],
  },
  thankYou: {
    title: 'Thanks for your feedback',
    message: 'Your answers are anonymous and will help us make LifeGroups better.',
  },
  questions: [
    {
      id: 'lifegroup', shortLabel: 'LifeGroup',
      type: 'choice',
      required: true,
      label: 'Which LifeGroup have you mostly attended this semester?',
      options: [
        { id: 'monday', label: 'Monday 7:30pm' },
        { id: 'tuesday', label: 'Tuesday 7:30pm' },
      ],
    },
    { ...agree, id: 'learn', shortLabel: 'Learned more', label: 'My LifeGroup has helped me learn more about the Bible, Christianity, etc.' },
    { ...agree, id: 'grow', shortLabel: 'Grew in faith', label: 'My LifeGroup this semester has helped me grow in my faith.' },
    { ...agree, id: 'safe', shortLabel: 'Safe to share', label: "I've felt safe to share my thoughts, interpretations, and opinions." },
    { ...agree, id: 'apply', shortLabel: 'Ready to apply', label: "I've felt prepared and convicted to apply what I read in the text to my life." },
    {
      id: 'passage-length', shortLabel: 'Passage length',
      type: 'scale',
      required: true,
      label: "What do you think about the length of the passages we've been reading this semester?",
      minLabel: 'Too short',
      maxLabel: 'Too long',
    },
    {
      id: 'feedback-section',
      type: 'section',
      label: 'Optional feedback',
      help: "Though this is optional, we'd really appreciate any and all feedback you can give us.",
    },
    { id: 'going-well', shortLabel: 'Going well', type: 'textarea', label: 'What is going well for your LifeGroup so far?' },
    { id: 'not-going-well', shortLabel: 'Not going well', type: 'textarea', label: 'What has not been going well for your LifeGroup so far?' },
    { id: 'change', shortLabel: 'One change', type: 'textarea', label: 'What is one thing you would like to see change in your LifeGroup?' },
    {
      id: 'study-format', shortLabel: 'Study format',
      type: 'textarea',
      label: 'What feedback do you have for the study format: the topic of study, application/discussion questions, icebreaker, prayer time, etc.?',
    },
    { id: 'leaders', shortLabel: 'For leaders', type: 'textarea', label: 'Any specific feedback for the LifeGroup leaders themselves?' },
  ],
} satisfies FormConfig;
