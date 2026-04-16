// ── Types ──────────────────────────────────────────────────────────────────

export type TaskStatus = "done" | "in-progress" | "todo";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
};

export type Project = {
  id: string;
  name: string;
  startMonth: number; // 0-based index into MONTHS array
  duration: number; // number of months
  tasks: Task[];
  linearProjectName?: string | null; // Linear project name for API integration
  order?: number; // Manual sort order within a person's row (lower = higher lane)
};

export type Person = {
  name: string;
  color: string;
  team: string;
  projects: Project[];
};

export type Phase = {
  name: string;
  startMonth: number;
  duration: number;
  color: string;
};

export type Team = {
  name: string;
  color: string;
  members: string[];
};

// ── Timeline constants ─────────────────────────────────────────────────────

export const MONTHS = [
  "Mar 2026",
  "Apr 2026",
  "May 2026",
  "Jun 2026",
  "Jul 2026",
  "Aug 2026",
  "Sep 2026",
  "Oct 2026",
  "Nov 2026",
  "Dec 2026",
  "Jan 2027",
  "Feb 2027",
  "Mar 2027",
  "Apr 2027",
  "May 2027",
  "Jun 2027",
  "Jul 2027",
  "Aug 2027",
  "Sep 2027",
  "Oct 2027",
  "Nov 2027",
  "Dec 2027",
  "Jan 2028",
];

export const PHASES: Phase[] = [
  { name: "PP3", startMonth: 0, duration: 3, color: "#E8F0FE" },
  { name: "Pre-Norming", startMonth: 3, duration: 3, color: "#FEF3E8" },
  { name: "Norming", startMonth: 6, duration: 4, color: "#E8FEF0" },
  { name: "Post Norming", startMonth: 10, duration: 4, color: "#FEE8F0" },
  { name: "BETA", startMonth: 14, duration: 5, color: "#F0E8FE" },
  { name: "GA", startMonth: 19, duration: 4, color: "#E8FEFE" },
];

// ── Teams ──────────────────────────────────────────────────────────────────

export const TEAMS: Team[] = [
  { name: "Engineering", color: "#2D5F3E", members: ["Oleksii", "Flo", "Maciej", "John", "Luida", "AK"] },
  { name: "Data Science", color: "#4A8B8B", members: ["Lucie"] },
  { name: "Design", color: "#C4956A", members: ["Maria", "Carlos"] },
  { name: "Psychometrics", color: "#B8860B", members: ["Erica", "David"] },
  { name: "Operations & GTM", color: "#3E6B89", members: ["Eleanor", "Erin", "Stef / Sam", "Molly"] },
  { name: "Product", color: "#D4A843", members: ["Cara"] },
];

// ── Helper to generate task IDs ────────────────────────────────────────────

let _taskCounter = 0;
function tid(): string {
  _taskCounter += 1;
  return `task-${_taskCounter}`;
}

let _projectCounter = 0;
function pid(): string {
  _projectCounter += 1;
  return `proj-${_projectCounter}`;
}

function makeTasks(names: string[], statuses: TaskStatus[]): Task[] {
  return names.map((title, i) => ({
    id: tid(),
    title,
    status: statuses[i] ?? "todo",
  }));
}

// ── People & project data ──────────────────────────────────────────────────
// Ordered by team: Engineering, Design, Psychometrics, Operations & GTM, Product

export const PEOPLE: Person[] = [
  // ── Engineering ──────────────────────────────────────────────────────────
  {
    name: "Oleksii",
    color: "#2D5F3E",
    team: "Engineering",
    projects: [
      {
        id: pid(),
        name: "Post Subtest Score Page",
        linearProjectName: "Subtest Feedback & Assessment Player Edits",
        startMonth: 2,
        duration: 2,
        tasks: makeTasks(
          [
            "Design score summary layout",
            "Implement score calculation display",
            "Add progress indicators",
            "QA across devices",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Psych Training",
        linearProjectName: "Examiner Training",
        startMonth: 4,
        duration: 3,
        tasks: makeTasks(
          [
            "Build training module framework",
            "Implement video player with checkpoints",
            "Create knowledge check quizzes",
          ],
          ["todo", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "iPad Optimization for Examiners",
        linearProjectName: "iPad Polish",
        startMonth: 7,
        duration: 3,
        tasks: makeTasks(
          [
            "Audit touch interaction issues",
            "Optimize layout for iPad screen",
            "Implement gesture controls",
            "Test on multiple iPad models",
          ],
          ["todo", "todo", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Norming Forms",
        linearProjectName: "Form Updates",
        startMonth: 2,
        duration: 4,
        tasks: makeTasks(
          [
            "Design form UI components",
            "Implement validation logic",
            "Add progress saving",
            "Integration testing",
          ],
          ["in-progress", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "File Loading",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Implement lazy loading strategy",
            "Add loading state animations",
            "Optimize bundle splitting",
            "Performance benchmarks",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "CAP",
        linearProjectName: null,
        startMonth: 4,
        duration: 3,
        tasks: makeTasks(
          [
            "Define CAP requirements",
            "Build data processing pipeline",
            "Implement reporting dashboard",
          ],
          ["todo", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Examiner Onboarding",
        linearProjectName: "Examiner Instructions & Onboarding",
        startMonth: 0,
        duration: 2,
        tasks: makeTasks(
          [
            "Design onboarding flow",
            "Build welcome screens",
            "Create tutorial walkthrough",
            "Implement progress tracking",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
    ],
  },
  {
    name: "Flo",
    color: "#5B8C5A",
    team: "Engineering",
    projects: [
      {
        id: pid(),
        name: "New Subtests",
        linearProjectName: "PP3 Development",
        startMonth: 1,
        duration: 4,
        tasks: makeTasks(
          [
            "Design subtest UI components",
            "Implement timing logic",
            "Add response capture",
            "Accessibility review",
            "Integration with scoring",
          ],
          ["done", "in-progress", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "In between subtest student experience",
        linearProjectName: "Subtest Feedback & Assessment Player Edits",
        startMonth: 2,
        duration: 4,
        tasks: makeTasks(
          [
            "Design transition screens",
            "Add encouragement messaging",
            "Implement break timer",
            "A/B test engagement",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "shadCN Migration",
        linearProjectName: "Migration",
        startMonth: 2,
        duration: 3,
        tasks: makeTasks(
          [
            "Audit current component library",
            "Migrate button and input components",
            "Migrate modal and dialog components",
            "Update theme tokens",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Instructions as they come in",
        linearProjectName: "PP3 Animated Instructions",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Build instruction rendering engine",
            "Support rich text formatting",
            "Add media embeds",
          ],
          ["done", "done", "in-progress"],
        ),
      },
      {
        id: pid(),
        name: "Sizing",
        linearProjectName: null,
        startMonth: 0,
        duration: 3,
        tasks: makeTasks(
          [
            "Define responsive breakpoints",
            "Implement fluid typography",
            "Test across screen sizes",
          ],
          ["done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Student Offboarding",
        linearProjectName: null,
        startMonth: 4,
        duration: 4,
        tasks: makeTasks(
          [
            "Design completion flow",
            "Build thank-you screen",
            "Implement data cleanup",
            "Add feedback survey",
          ],
          ["todo", "todo", "todo", "todo"],
        ),
      },
    ],
  },
  {
    name: "Maciej",
    color: "#3B7A9E",
    team: "Engineering",
    projects: [
      {
        id: pid(),
        name: "Internal App Bugs & Improvements",
        linearProjectName: "Internal App",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Triage bug backlog",
            "Fix critical session bugs",
            "Improve search performance",
            "Add bulk actions",
            "Refactor legacy components",
          ],
          ["done", "done", "in-progress", "todo", "todo"],
        ),
      },
    ],
  },
  {
    name: "John",
    color: "#4A7C59",
    team: "Engineering",
    projects: [
      {
        id: pid(),
        name: "Migration and Foundations",
        linearProjectName: "Migration",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Plan database migration strategy",
            "Migrate core tables",
            "Update ORM models",
            "Verify data integrity",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Score Review",
        linearProjectName: "Score Review",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Design review workflow",
            "Build score comparison view",
            "Implement override controls",
            "Add audit logging",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
    ],
  },
  {
    name: "Luida",
    color: "#8B6914",
    team: "Engineering",
    projects: [
      {
        id: pid(),
        name: "Examiner Instructions 2.0",
        linearProjectName: "Examiner Instructions & Onboarding",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Rewrite instruction content",
            "Add step-by-step visuals",
            "Implement contextual help tooltips",
            "User test with examiners",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Corrective Feedback",
        linearProjectName: "Subtest Feedback & Assessment Player Edits",
        startMonth: 0,
        duration: 3,
        tasks: makeTasks(
          [
            "Define feedback taxonomy",
            "Build feedback display component",
            "Integrate with scoring engine",
          ],
          ["done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Internal App - In Person",
        linearProjectName: "Internal App",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Add in-person session management",
            "Build check-in flow",
            "Implement materials tracking",
          ],
          ["done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Examiner Redesign - Middle Bar and Side Bar",
        linearProjectName: "Examiner Revamp",
        startMonth: 2,
        duration: 4,
        tasks: makeTasks(
          [
            "Wireframe new layout",
            "Implement collapsible sidebar",
            "Build middle bar navigation",
            "Responsive adjustments",
          ],
          ["in-progress", "todo", "todo", "todo"],
        ),
      },
    ],
  },
  {
    name: "AK",
    color: "#2E6B62",
    team: "Engineering",
    projects: [
      {
        id: pid(),
        name: "Migration and Foundations",
        linearProjectName: "Migration",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Set up CI/CD for new infrastructure",
            "Migrate authentication layer",
            "Update API endpoints",
            "Performance testing",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Internal App Improvements",
        linearProjectName: "Internal App",
        startMonth: 1,
        duration: 4,
        tasks: makeTasks(
          [
            "Improve dashboard loading speed",
            "Add real-time notifications",
            "Refactor state management",
            "Update component library",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
    ],
  },

  // ── Design ───────────────────────────────────────────────────────────────
  {
    name: "Maria",
    color: "#C4956A",
    team: "Design",
    projects: [
      {
        id: pid(),
        name: "PP1 Instructions",
        linearProjectName: "PP3 Animated Instructions",
        startMonth: 0,
        duration: 3,
        tasks: makeTasks(
          [
            "Draft PP1 instruction content",
            "Review with psychometricians",
            "Finalize and format",
          ],
          ["done", "done", "in-progress"],
        ),
      },
      {
        id: pid(),
        name: "PP2 Instructions",
        linearProjectName: "PP3 Animated Instructions",
        startMonth: 2,
        duration: 3,
        tasks: makeTasks(
          [
            "Draft PP2 instruction content",
            "Review with psychometricians",
            "Finalize and format",
          ],
          ["in-progress", "todo", "todo"],
        ),
      },
    ],
  },
  {
    name: "Carlos",
    color: "#7A9B76",
    team: "Design",
    projects: [
      {
        id: pid(),
        name: "PP3 Bilingual Instructions",
        linearProjectName: "PP3 Animated Instructions",
        startMonth: 0,
        duration: 3,
        tasks: makeTasks(
          [
            "Translate PP3 instructions to Spanish",
            "Cultural adaptation review",
            "QA bilingual rendering",
          ],
          ["done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "PP1 Bilingual Instructions",
        linearProjectName: "PP3 Animated Instructions",
        startMonth: 2,
        duration: 3,
        tasks: makeTasks(
          [
            "Translate PP1 instructions",
            "Cultural adaptation review",
            "QA bilingual rendering",
          ],
          ["in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "PP2 Bilingual Instructions",
        linearProjectName: "PP3 Animated Instructions",
        startMonth: 3,
        duration: 3,
        tasks: makeTasks(
          [
            "Translate PP2 instructions",
            "Cultural adaptation review",
            "QA bilingual rendering",
          ],
          ["todo", "todo", "todo"],
        ),
      },
    ],
  },

  // ── Psychometrics ────────────────────────────────────────────────────────
  {
    name: "Erica",
    color: "#B8860B",
    team: "Psychometrics",
    projects: [
      {
        id: pid(),
        name: "Norm Plan",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Define norming population targets",
            "Create sampling methodology",
            "Draft statistical analysis plan",
            "Peer review plan",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "PP3 data analysis",
        linearProjectName: "Data",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Clean PP3 dataset",
            "Run item-level statistics",
            "Generate reliability metrics",
            "Write analysis report",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
    ],
  },
  {
    name: "David",
    color: "#6B8E7B",
    team: "Psychometrics",
    projects: [
      {
        id: pid(),
        name: "CAP (Referral Packet Analysis)",
        linearProjectName: null,
        startMonth: 3,
        duration: 4,
        tasks: makeTasks(
          [
            "Define packet structure requirements",
            "Build document parsing pipeline",
            "Implement analysis dashboard",
            "Integrate with referral workflow",
          ],
          ["in-progress", "todo", "todo", "todo"],
        ),
      },
    ],
  },

  // ── Operations & GTM ─────────────────────────────────────────────────────
  {
    name: "Eleanor",
    color: "#3E6B89",
    team: "Operations & GTM",
    projects: [
      {
        id: pid(),
        name: "Examiner revamp",
        linearProjectName: "Examiner Revamp",
        startMonth: 0,
        duration: 2,
        tasks: makeTasks(
          [
            "Audit existing examiner workflows",
            "Design new examiner dashboard",
            "Implement revised scheduling flow",
            "QA & user testing",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Async training website",
        linearProjectName: "Examiner Training",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Define training module structure",
            "Build video hosting integration",
            "Create progress tracking system",
            "Launch beta to examiners",
          ],
          ["done", "in-progress", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Hiring examiners",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Post job listings",
            "Screen applicants",
            "Conduct interviews",
            "Onboard new hires",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Reporting",
        linearProjectName: "Report generation",
        startMonth: 2,
        duration: 4,
        tasks: makeTasks(
          [
            "Define report templates",
            "Build data aggregation pipeline",
            "Create export functionality",
            "Stakeholder review",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Financial model",
        linearProjectName: null,
        startMonth: 3,
        duration: 3,
        tasks: makeTasks(
          [
            "Gather cost data",
            "Build revenue projections",
            "Create scenario analysis",
          ],
          ["in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Examiner booklets",
        linearProjectName: null,
        startMonth: 4,
        duration: 4,
        tasks: makeTasks(
          [
            "Content outline",
            "Design layout",
            "Print production coordination",
            "Distribution plan",
          ],
          ["in-progress", "todo", "todo", "todo"],
        ),
      },
    ],
  },
  {
    name: "Erin",
    color: "#8B7355",
    team: "Operations & GTM",
    projects: [
      {
        id: pid(),
        name: "Recruitment & Hard to reach dem challenge",
        linearProjectName: null,
        startMonth: 0,
        duration: 5,
        tasks: makeTasks(
          [
            "Identify underrepresented demographics",
            "Develop targeted outreach strategy",
            "Partner with community organizations",
            "Track recruitment metrics",
          ],
          ["done", "done", "in-progress", "in-progress"],
        ),
      },
      {
        id: pid(),
        name: "Human Rater",
        linearProjectName: null,
        startMonth: 2,
        duration: 4,
        tasks: makeTasks(
          [
            "Define rater rubric",
            "Build rater interface",
            "Train initial raters",
            "Establish inter-rater reliability",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "In person sessions",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Schedule session locations",
            "Prepare materials kits",
            "Conduct sessions",
            "Collect feedback",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Examiner training program",
        linearProjectName: "Examiner Training",
        startMonth: 1,
        duration: 4,
        tasks: makeTasks(
          [
            "Design training curriculum",
            "Record training videos",
            "Create assessment quizzes",
            "Pilot with first cohort",
          ],
          ["done", "in-progress", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Hiring examiners",
        linearProjectName: null,
        startMonth: 0,
        duration: 3,
        tasks: makeTasks(
          [
            "Coordinate with Eleanor on hiring",
            "Review applicant qualifications",
            "Conduct technical assessments",
          ],
          ["done", "done", "in-progress"],
        ),
      },
      {
        id: pid(),
        name: "Participant & examiner support",
        linearProjectName: null,
        startMonth: 2,
        duration: 4,
        tasks: makeTasks(
          [
            "Set up support ticketing system",
            "Create FAQ documentation",
            "Staff support rotation",
            "Monitor satisfaction scores",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
    ],
  },
  {
    name: "Stef / Sam",
    color: "#34A853",
    team: "Operations & GTM",
    projects: [
      {
        id: pid(),
        name: "User research",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Plan research sprints",
            "Recruit participants",
            "Conduct usability studies",
            "Synthesize findings",
            "Present to stakeholders",
          ],
          ["done", "done", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Hiring examiners",
        linearProjectName: null,
        startMonth: 1,
        duration: 3,
        tasks: makeTasks(
          [
            "Define examiner personas",
            "Develop screening criteria",
            "Assist with interviews",
          ],
          ["done", "in-progress", "todo"],
        ),
      },
    ],
  },
  {
    name: "Molly",
    color: "#C87F6B",
    team: "Operations & GTM",
    projects: [
      {
        id: pid(),
        name: "Content updates & Data analysis with Erica",
        linearProjectName: "Content Edits",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Review item performance data",
            "Update underperforming items",
            "Collaborate with Erica on analysis",
            "Document content changes",
          ],
          ["done", "in-progress", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Examiner training",
        linearProjectName: "Examiner Training",
        startMonth: 1,
        duration: 3,
        tasks: makeTasks(
          [
            "Develop training materials",
            "Run practice sessions",
            "Evaluate examiner readiness",
          ],
          ["done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Participant & examiner support",
        linearProjectName: null,
        startMonth: 3,
        duration: 4,
        tasks: makeTasks(
          [
            "Handle escalated support cases",
            "Create troubleshooting guides",
            "Weekly support retrospectives",
          ],
          ["in-progress", "todo", "todo"],
        ),
      },
    ],
  },

  // ── Product ──────────────────────────────────────────────────────────────
  {
    name: "Cara",
    color: "#D4A843",
    team: "Product",
    projects: [
      {
        id: pid(),
        name: "Corrective Sample Questions",
        linearProjectName: "Subtest Feedback & Assessment Player Edits",
        startMonth: 0,
        duration: 3,
        tasks: makeTasks(
          [
            "Catalog existing sample questions",
            "Identify gaps in coverage",
            "Write new sample items",
            "Peer review",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Fake Student - Psych Training",
        linearProjectName: "Examiner Training",
        startMonth: 4,
        duration: 4,
        tasks: makeTasks(
          [
            "Design fake student personas",
            "Build simulated response engine",
            "Create training scenarios",
          ],
          ["todo", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "End to End Experience",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Map full user journey",
            "Identify friction points",
            "Implement improvements",
            "Run E2E test suite",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Score report",
        linearProjectName: "Report generation",
        startMonth: 4,
        duration: 4,
        tasks: makeTasks(
          [
            "Design report template",
            "Implement PDF generation",
            "Add score visualizations",
          ],
          ["todo", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Math content rendered in LaTeX",
        linearProjectName: "Content Edits",
        startMonth: 2,
        duration: 3,
        tasks: makeTasks(
          [
            "Integrate KaTeX renderer",
            "Convert existing math content",
            "Test rendering across browsers",
          ],
          ["in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Score Review",
        linearProjectName: "Score Review",
        startMonth: 0,
        duration: 3,
        tasks: makeTasks(
          [
            "Build review queue interface",
            "Add filtering and sorting",
            "Implement approval workflow",
          ],
          ["done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Roadmap",
        linearProjectName: null,
        startMonth: 0,
        duration: 3,
        tasks: makeTasks(
          [
            "Design roadmap visualization",
            "Build interactive Gantt chart",
            "Add filtering and search",
          ],
          ["done", "done", "in-progress"],
        ),
      },
      {
        id: pid(),
        name: "Tech Specifications",
        linearProjectName: null,
        startMonth: 2,
        duration: 3,
        tasks: makeTasks(
          [
            "Define tech spec template",
            "Write scoring engine spec",
            "Write data pipeline spec",
          ],
          ["in-progress", "todo", "todo"],
        ),
      },
    ],
  },

  // ── Unassigned ───────────────────────────────────────────────────────────
  {
    name: "Lucie",
    color: "#4A8B8B",
    team: "Data Science",
    projects: [
      {
        id: pid(),
        name: "Subtest Adaptive Algorithm",
        linearProjectName: "Subtest Feedback & Assessment Player Edits",
        startMonth: 2,
        duration: 3,
        tasks: makeTasks(
          [
            "Research adaptive testing methods",
            "Implement item selection algorithm",
            "Calibrate difficulty parameters",
            "Validate against static tests",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Internal tool",
        linearProjectName: "Internal App",
        startMonth: 0,
        duration: 4,
        tasks: makeTasks(
          [
            "Gather requirements from team",
            "Build admin dashboard",
            "Add data export features",
            "Deploy and document",
          ],
          ["done", "done", "in-progress", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Data analysis",
        linearProjectName: "Data",
        startMonth: 0,
        duration: 1,
        tasks: makeTasks(
          [
            "Run descriptive statistics",
            "Generate visualizations",
            "Share preliminary findings",
          ],
          ["done", "done", "done"],
        ),
      },
      {
        id: pid(),
        name: "Norming Stats",
        linearProjectName: null,
        startMonth: 4,
        duration: 2,
        tasks: makeTasks(
          [
            "Compute norm tables",
            "Validate score distributions",
            "Peer review statistics",
          ],
          ["todo", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Human Rater",
        linearProjectName: null,
        startMonth: 2,
        duration: 4,
        tasks: makeTasks(
          [
            "Build rater calibration tool",
            "Implement scoring consensus logic",
            "Track rater agreement metrics",
          ],
          ["in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "AI scoring",
        linearProjectName: "AI Scoring",
        startMonth: 2,
        duration: 4,
        tasks: makeTasks(
          [
            "Prepare training dataset",
            "Fine-tune scoring model",
            "Evaluate model accuracy",
            "A/B test against human raters",
          ],
          ["done", "in-progress", "todo", "todo"],
        ),
      },
      {
        id: pid(),
        name: "Data Storage & Pipelines",
        linearProjectName: "Data",
        startMonth: 0,
        duration: 2,
        tasks: makeTasks(
          [
            "Design data warehouse schema",
            "Build ETL pipelines",
            "Set up monitoring and alerts",
          ],
          ["done", "done", "in-progress"],
        ),
      },
    ],
  },
];
