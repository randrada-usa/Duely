import type { ScanEvaluationFixture } from './scanEvaluation';

// All examples are synthetic. They contain no student scans, names, contact
// details, or retained OCR from beta participants.
export const CONTROLLED_SCAN_FIXTURES = [
  {
    id: 'en-full-month-first',
    language: 'english',
    ocrText: [
      'Assignment Title: Cellular Respiration Lab',
      'Subject: BIO 201',
      'Deadline: August 28, 2026 5:00 PM',
      'Task type: Assignment',
      'Priority: High',
      'Estimated workload: 2 hours',
      'Instructions: Explain the results using the supplied table.',
    ].join('\n'),
    expected: {
      deadline: { kind: 'explicit', date: '2026-08-28', time: '17:00' },
      fields: {
        title: 'Cellular Respiration Lab',
        subject: 'BIO 201',
        taskType: 'assignment',
        priority: 'high',
        estimatedEffortMinutes: 120,
        notes: 'Explain the results using the supplied table.',
      },
    },
  },
  {
    id: 'en-day-first-multiline',
    language: 'english',
    ocrText: [
      'Title',
      'Modern Philippine Literature Essay',
      'Course',
      'LIT 204',
      'Deadline',
      '3 September 2026',
      '2:30 PM',
      'Instructions',
      'Compare two works discussed in class.',
    ].join('\n'),
    expected: {
      deadline: { kind: 'explicit', date: '2026-09-03', time: '14:30' },
      fields: {
        title: 'Modern Philippine Literature Essay',
        subject: 'LIT 204',
        notes: 'Compare two works discussed in class.',
      },
    },
  },
  {
    id: 'en-iso-date',
    language: 'english',
    ocrText: 'Title: Linear Algebra Quiz\nSubject: MATH 221\nDue: 2026-09-14 09:15',
    expected: {
      deadline: { kind: 'explicit', date: '2026-09-14', time: '09:15' },
      fields: { title: 'Linear Algebra Quiz', subject: 'MATH 221', taskType: 'quiz' },
    },
  },
  {
    id: 'en-unambiguous-numeric-day-first',
    language: 'english',
    ocrText: 'Title: Field Observation Notes\nCourse: ENV 110\nDeadline: 23/09/2026 18:00',
    expected: {
      deadline: { kind: 'explicit', date: '2026-09-23', time: '18:00' },
      fields: { title: 'Field Observation Notes', subject: 'ENV 110' },
    },
  },
  {
    id: 'en-unambiguous-numeric-month-first',
    language: 'english',
    ocrText: 'Assignment Title: Statistics Worksheet\nSubject: STAT 120\nDue date: 09/24/2026 11:59 PM',
    expected: {
      deadline: { kind: 'explicit', date: '2026-09-24', time: '23:59' },
      fields: { title: 'Statistics Worksheet', subject: 'STAT 120', taskType: 'assignment' },
    },
  },
  {
    id: 'en-default-end-of-day',
    language: 'english',
    ocrText: 'Title: Ethics Reflection\nSubject: PHIL 101\nDeadline: October 2, 2026',
    expected: {
      deadline: { kind: 'explicit', date: '2026-10-02', time: '23:59' },
      fields: { title: 'Ethics Reflection', subject: 'PHIL 101' },
    },
  },
  {
    id: 'fil-full-month-first',
    language: 'filipino',
    ocrText: [
      'Pamagat: Repleksyon sa Kasaysayan',
      'Asignatura: KAS 101',
      'Takdang petsa: Agosto 30, 2026 4:00 PM',
      'Uri ng gawain: Takdang-aralin',
      'Prayoridad: Mataas',
      'Tinatayang oras: Dalawang oras',
      'Panuto: Sumulat ng limang talata tungkol sa aralin.',
    ].join('\n'),
    expected: {
      deadline: { kind: 'explicit', date: '2026-08-30', time: '16:00' },
      fields: {
        title: 'Repleksyon sa Kasaysayan',
        subject: 'KAS 101',
        taskType: 'assignment',
        priority: 'high',
        estimatedEffortMinutes: 120,
        notes: 'Sumulat ng limang talata tungkol sa aralin.',
      },
    },
  },
  {
    id: 'fil-day-first',
    language: 'filipino',
    ocrText: 'Pamagat ng gawain: Ulat sa Agham\nKurso: AGH 102\nPetsa ng pagpasa: 5 Setyembre 2026 1:30 PM',
    expected: {
      deadline: { kind: 'explicit', date: '2026-09-05', time: '13:30' },
      fields: { title: 'Ulat sa Agham', subject: 'AGH 102' },
    },
  },
  {
    id: 'fil-month-december',
    language: 'filipino',
    ocrText: 'Pamagat: Pangwakas na Proyekto\nAsignatura: SIN 205\nTakdang petsa: Disyembre 7, 2026 10:00 AM\nUri: Proyekto',
    expected: {
      deadline: { kind: 'explicit', date: '2026-12-07', time: '10:00' },
      fields: { title: 'Pangwakas na Proyekto', subject: 'SIN 205', taskType: 'project' },
    },
  },
  {
    id: 'fil-multiline-deadline',
    language: 'filipino',
    ocrText: 'Pamagat\nPagsusuri ng Tula\nAsignatura\nFIL 120\nTakdang petsa\n11 Nobyembre 2026\n8:00 AM',
    expected: {
      deadline: { kind: 'explicit', date: '2026-11-11', time: '08:00' },
      fields: { title: 'Pagsusuri ng Tula', subject: 'FIL 120' },
    },
  },
  {
    id: 'mixed-labels',
    language: 'mixed',
    ocrText: 'Assignment Title: Community Interview Summary\nAsignatura: SOC 130\nPetsa ng pagpasa: Oktubre 18, 2026 6:45 PM\nInstructions: Ibuod ang tatlong pangunahing sagot.',
    expected: {
      deadline: { kind: 'explicit', date: '2026-10-18', time: '18:45' },
      fields: {
        title: 'Community Interview Summary',
        subject: 'SOC 130',
        notes: 'Ibuod ang tatlong pangunahing sagot.',
      },
    },
  },
  {
    id: 'mixed-filipino-title-english-date',
    language: 'mixed',
    ocrText: 'Pamagat: Database Design Exercise\nCourse: CS 240\nDeadline: November 19, 2026 20:15\nPanuto: Gumawa ng normalized schema.',
    expected: {
      deadline: { kind: 'explicit', date: '2026-11-19', time: '20:15' },
      fields: {
        title: 'Database Design Exercise',
        subject: 'CS 240',
        notes: 'Gumawa ng normalized schema.',
      },
    },
  },
  {
    id: 'missing-en-basic',
    language: 'english',
    ocrText: 'Title: Photosynthesis Diagram\nSubject: BIO 105\nInstructions: Label every part clearly.',
    expected: {
      deadline: { kind: 'missing' },
      fields: { title: 'Photosynthesis Diagram', subject: 'BIO 105' },
    },
  },
  {
    id: 'missing-en-incidental-year',
    language: 'english',
    ocrText: 'Title: Review of 2026 Policy Changes\nCourse: POL 210\nNotes: Discuss the assigned article.',
    expected: {
      deadline: { kind: 'missing' },
      fields: { title: 'Review of 2026 Policy Changes', subject: 'POL 210' },
    },
  },
  {
    id: 'missing-en-date-in-notes',
    language: 'english',
    ocrText: 'Assignment Title: Historical Timeline\nSubject: HIS 115\nInstructions: Begin with June 12, 1898 and explain its importance.',
    expected: {
      deadline: { kind: 'missing' },
      fields: { title: 'Historical Timeline', subject: 'HIS 115' },
    },
  },
  {
    id: 'missing-fil-basic',
    language: 'filipino',
    ocrText: 'Pamagat: Sanaysay tungkol sa Wika\nAsignatura: FIL 101\nPanuto: Gumamit ng tatlong sanggunian.',
    expected: {
      deadline: { kind: 'missing' },
      fields: { title: 'Sanaysay tungkol sa Wika', subject: 'FIL 101' },
    },
  },
  {
    id: 'missing-fil-incidental-date',
    language: 'filipino',
    ocrText: 'Pamagat: Araw ng Kalayaan\nKurso: KAS 110\nPanuto: Ipaliwanag ang mga pangyayari noong Hunyo 12, 1898.',
    expected: {
      deadline: { kind: 'missing' },
      fields: { title: 'Araw ng Kalayaan', subject: 'KAS 110' },
    },
  },
  {
    id: 'missing-mixed-deadline-policy',
    language: 'mixed',
    ocrText: 'Title: Course Handbook Notes\nSubject: EDU 100\nDescription: Basahin ang deadline policy before class.',
    expected: {
      deadline: { kind: 'missing' },
      fields: { title: 'Course Handbook Notes', subject: 'EDU 100' },
    },
  },
  {
    id: 'ambiguous-en-slash',
    language: 'english',
    ocrText: 'Title: Economics Exercise\nSubject: ECON 101\nDeadline: 08/09/2026',
    expected: {
      deadline: { kind: 'ambiguous' },
      fields: { title: 'Economics Exercise', subject: 'ECON 101' },
    },
  },
  {
    id: 'ambiguous-en-dash',
    language: 'english',
    ocrText: 'Title: Chemistry Worksheet\nCourse: CHEM 111\nDue date: 10-11-2026 7:00 PM',
    expected: {
      deadline: { kind: 'ambiguous' },
      fields: { title: 'Chemistry Worksheet', subject: 'CHEM 111' },
    },
  },
  {
    id: 'ambiguous-fil-inline',
    language: 'filipino',
    ocrText: 'Pamagat: Pagsasanay sa Balarila\nAsignatura: FIL 105\nTakdang petsa: 09/10/2026',
    expected: {
      deadline: { kind: 'ambiguous' },
      fields: { title: 'Pagsasanay sa Balarila', subject: 'FIL 105' },
    },
  },
  {
    id: 'ambiguous-fil-multiline',
    language: 'filipino',
    ocrText: 'Pamagat: Maikling Ulat\nKurso: KOM 101\nPetsa ng pagpasa\n11/12/2026\n3:00 PM',
    expected: {
      deadline: { kind: 'ambiguous' },
      fields: { title: 'Maikling Ulat', subject: 'KOM 101' },
    },
  },
  {
    id: 'multiple-en',
    language: 'english',
    ocrText: 'Assignment 1\nRead chapter 3\nAssignment 2\nAnswer the review questions',
    expected: {
      deadline: { kind: 'missing' },
      hasMultipleAssignments: true,
    },
  },
  {
    id: 'multiple-fil',
    language: 'filipino',
    ocrText: 'Gawain 1\nBasahin ang kabanata 2\nGawain 2\nSagutin ang limang tanong',
    expected: {
      deadline: { kind: 'missing' },
      hasMultipleAssignments: true,
    },
  },
] as const satisfies readonly ScanEvaluationFixture[];
