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
  { name: "PP3", startMonth: 0, duration: 4, color: "#E8F0FE" },
  { name: "Pre-Norming", startMonth: 4, duration: 2, color: "#FEF3E8" },
  { name: "Norming", startMonth: 6, duration: 7, color: "#E8FEF0" },
  { name: "Post Norming", startMonth: 13, duration: 4, color: "#FEE8F0" },
  { name: "BETA", startMonth: 17, duration: 5, color: "#F0E8FE" },
  { name: "GA", startMonth: 22, duration: 1, color: "#E8FEFE" },
];

// ── Teams ──────────────────────────────────────────────────────────────────

export const TEAMS: Team[] = [
  { name: "Engineering", color: "#2563EB", members: ["Oleksii", "Flo", "Maciej", "John", "Luida", "AK"] },
  { name: "Data Science", color: "#0E7490", members: ["Lucie"] },
  { name: "Design", color: "#A16207", members: ["Maria", "Carlos"] },
  { name: "Psychometrics", color: "#D97706", members: ["Erica", "David"] },
  { name: "Operations & GTM", color: "#1D4ED8", members: ["Eleanor", "Erin", "Stef", "Sam", "Molly"] },
  { name: "Product", color: "#EAB308", members: ["Cara"] },
];

// ── Helper to generate task IDs ────────────────────────────────────────────

let _taskCounter = 0;
function tid(): string {
  _taskCounter += 1;
  return `task-${_taskCounter}`;
}

let _projectCounter = 100;
function pid(): string {
  _projectCounter += 1;
  return `proj-added-${_projectCounter}`;
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
    color: "#1E88E5",
    team: "Engineering",
    projects: [
      {
        id: "p002",
        name: "iPad Optimization for Examiners",
        linearProjectName: "iPad Polish",
        startMonth: 3,
        duration: 3,
        order: 1,
        tasks: [],
      },
      {
        id: "p003",
        name: "Form Updates",
        linearProjectName: "Form Updates",
        startMonth: 1,
        duration: 5,
        order: 0,
        tasks: [],
      },
      {
        id: "p004",
        name: "File Loading",
        linearProjectName: "File Loading",
        startMonth: 1,
        duration: 2,
        tasks: [],
      },
      {
        id: "p005",
        name: "Examiner Onboarding",
        linearProjectName: "Examiner Onboarding",
        startMonth: 0,
        duration: 2,
        tasks: [],
      },
    ],
  },
  {
    name: "Flo",
    color: "#43A047",
    team: "Engineering",
    projects: [
      {
        id: "p006",
        name: "Sizing",
        linearProjectName: null,
        startMonth: 0,
        duration: 3,
        tasks: [],
      },
    ],
  },
  {
    name: "Maciej",
    color: "#00ACC1",
    team: "Engineering",
    projects: [
      {
        id: "p007",
        name: "Internal App Bugs & Improvements",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
    ],
  },
  {
    name: "John",
    color: "#7CB342",
    team: "Engineering",
    projects: [
      {
        id: "p008",
        name: "PP3 Development",
        linearProjectName: "PP3 Development",
        startMonth: 1,
        duration: 4,
        tasks: [],
      },
      {
        id: "p009",
        name: "Migration and Foundations",
        linearProjectName: "Migration and Foundations",
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p010",
        name: "Score Review",
        linearProjectName: "Score Review",
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
    ],
  },
  {
    name: "Luida",
    color: "#F9A825",
    team: "Engineering",
    projects: [
      {
        id: "p011",
        name: "Animated Instructions",
        linearProjectName: "Animated Instructions",
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p012",
        name: "Examiner Instructions",
        linearProjectName: "Examiner Instructions",
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p013",
        name: "Corrective Feedback",
        linearProjectName: "Corrective Feedback",
        startMonth: 0,
        duration: 3,
        tasks: [],
      },
      {
        id: "p014",
        name: "Internal App - In Person",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p015",
        name: "Examiner Redesign - Middle Bar and Side Bar",
        linearProjectName: null,
        startMonth: 2,
        duration: 4,
        tasks: [],
      },
    ],
  },
  {
    name: "AK",
    color: "#00897B",
    team: "Engineering",
    projects: [
      {
        id: "p016",
        name: "Migration and Foundations",
        linearProjectName: "Migration and Foundations",
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p017",
        name: "Internal App Improvements",
        linearProjectName: null,
        startMonth: 1,
        duration: 4,
        tasks: [],
      },
    ],
  },

  // ── Product ──────────────────────────────────────────────────────────────
  {
    name: "Cara",
    color: "#F9A825",
    team: "Product",
    projects: [
      {
        id: "p018",
        name: "Corrective Feedback",
        linearProjectName: "Corrective Feedback",
        startMonth: 0,
        duration: 3,
        tasks: [],
      },
      {
        id: "p019",
        name: "End to End Experience",
        linearProjectName: "End to End Experience",
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p020",
        name: "Math Content Style",
        linearProjectName: "Math Content Style",
        startMonth: 2,
        duration: 3,
        tasks: [],
      },
      {
        id: "p021",
        name: "Score Review",
        linearProjectName: "Score Review",
        startMonth: 0,
        duration: 3,
        tasks: [],
      },
    ],
  },

  // ── Design ───────────────────────────────────────────────────────────────
  {
    name: "Maria",
    color: "#8D6E63",
    team: "Design",
    projects: [
      {
        id: "p022",
        name: "PP1 Instructions",
        linearProjectName: null,
        startMonth: 0,
        duration: 3,
        tasks: [],
      },
      {
        id: "p023",
        name: "PP2 Instructions",
        linearProjectName: null,
        startMonth: 2,
        duration: 3,
        tasks: [],
      },
    ],
  },
  {
    name: "Carlos",
    color: "#FF8F00",
    team: "Design",
    projects: [
      {
        id: "p024",
        name: "PP3 Bilingual Instructions",
        linearProjectName: null,
        startMonth: 0,
        duration: 3,
        tasks: [],
      },
      {
        id: "p025",
        name: "PP1 Bilingual Instructions",
        linearProjectName: null,
        startMonth: 2,
        duration: 3,
        tasks: [],
      },
      {
        id: "p026",
        name: "PP2 Bilingual Instructions",
        linearProjectName: null,
        startMonth: 3,
        duration: 3,
        tasks: [],
      },
    ],
  },

  // ── Psychometrics ────────────────────────────────────────────────────────
  {
    name: "Erica",
    color: "#E65100",
    team: "Psychometrics",
    projects: [
      {
        id: "p027",
        name: "Norm Plan",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p028",
        name: "PP3 data analysis",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
    ],
  },
  {
    name: "David",
    color: "#2E7D32",
    team: "Psychometrics",
    projects: [
      {
        id: "p029",
        name: "CAP (Referral Packet Analysis)",
        linearProjectName: null,
        startMonth: 3,
        duration: 4,
        tasks: [],
      },
    ],
  },

  // ── Operations & GTM ─────────────────────────────────────────────────────
  {
    name: "Eleanor",
    color: "#1565C0",
    team: "Operations & GTM",
    projects: [
      {
        id: "p030",
        name: "Examiner revamp",
        linearProjectName: null,
        startMonth: 0,
        duration: 2,
        tasks: [],
      },
      {
        id: "p031",
        name: "Async training website",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p032",
        name: "Hiring examiners",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p033",
        name: "Reporting",
        linearProjectName: null,
        startMonth: 2,
        duration: 4,
        tasks: [],
      },
      {
        id: "p034",
        name: "Financial model",
        linearProjectName: null,
        startMonth: 3,
        duration: 3,
        tasks: [],
      },
      {
        id: "p035",
        name: "Examiner booklets",
        linearProjectName: null,
        startMonth: 4,
        duration: 4,
        tasks: [],
      },
    ],
  },
  {
    name: "Erin",
    color: "#6D4C41",
    team: "Operations & GTM",
    projects: [
      {
        id: "p036",
        name: "Recruitment & Hard to reach dem challenge",
        linearProjectName: null,
        startMonth: 0,
        duration: 5,
        tasks: [],
      },
      {
        id: "p037",
        name: "Human Rater",
        linearProjectName: "Human Rater",
        startMonth: 2,
        duration: 4,
        tasks: [],
      },
      {
        id: "p038",
        name: "In person sessions",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p039",
        name: "Examiner training program",
        linearProjectName: null,
        startMonth: 1,
        duration: 4,
        tasks: [],
      },
      {
        id: "p040",
        name: "Hiring examiners",
        linearProjectName: null,
        startMonth: 0,
        duration: 3,
        tasks: [],
      },
      {
        id: "p041",
        name: "Participant & examiner support",
        linearProjectName: null,
        startMonth: 2,
        duration: 4,
        tasks: [],
      },
    ],
  },
  {
    name: "Stef",
    color: "#558B2F",
    team: "Operations & GTM",
    projects: [
      {
        id: "p042",
        name: "User research",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p043",
        name: "Hiring examiners",
        linearProjectName: null,
        startMonth: 1,
        duration: 3,
        tasks: [],
      },
    ],
  },
  {
    name: "Sam",
    color: "#7CB342",
    team: "Operations & GTM",
    projects: [],
  },
  {
    name: "Molly",
    color: "#AD1457",
    team: "Operations & GTM",
    projects: [
      {
        id: "p044",
        name: "Content updates & Data analysis with Erica",
        linearProjectName: null,
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p045",
        name: "Examiner training",
        linearProjectName: null,
        startMonth: 1,
        duration: 3,
        tasks: [],
      },
      {
        id: "p046",
        name: "Participant & examiner support",
        linearProjectName: null,
        startMonth: 3,
        duration: 4,
        tasks: [],
      },
    ],
  },

  // ── Unassigned ───────────────────────────────────────────────────────────
  {
    name: "Lucie",
    color: "#00838F",
    team: "Data Science",
    projects: [
      {
        id: "p047",
        name: "Internal App",
        linearProjectName: "Internal App",
        startMonth: 0,
        duration: 4,
        tasks: [],
      },
      {
        id: "p048",
        name: "Norming Stats",
        linearProjectName: "Norming Stats",
        startMonth: 4,
        duration: 2,
        tasks: [],
      },
      {
        id: "p049",
        name: "Human Rater",
        linearProjectName: "Human Rater",
        startMonth: 2,
        duration: 4,
        tasks: [],
      },
      {
        id: "p050",
        name: "Data",
        linearProjectName: "Data",
        startMonth: 0,
        duration: 2,
        tasks: [],
      },
    ],
  },
];
