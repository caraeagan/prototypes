// ── Linear API helper (server-side only) ──────────────────────────────────

const LINEAR_API_URL = "https://api.linear.app/graphql";

export async function queryLinear<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not set");
  }

  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Linear API error: ${res.status} ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Linear GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}

// ── GraphQL queries ───────────────────────────────────────────────────────

export const FETCH_CYCLES = `
  query Cycles {
    cycles(first: 50, orderBy: createdAt) {
      nodes {
        id
        number
        startsAt
        endsAt
      }
    }
  }
`;

export const FETCH_CYCLE_ISSUES = `
  query CycleIssues($cycleId: String!) {
    cycle(id: $cycleId) {
      id
      number
      startsAt
      endsAt
      issues {
        nodes {
          id
          title
          priority
          priorityLabel
          state { name color }
          assignee { displayName avatarUrl }
          project { id name }
          labels { nodes { name color } }
          startedAt
          dueDate
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const FETCH_ISSUE_DETAIL = `
  query Issue($id: String!) {
    issue(id: $id) {
      id
      title
      description
      priority
      priorityLabel
      identifier
      state { name color }
      assignee { displayName avatarUrl }
      project { id name }
      cycle { number startsAt endsAt }
      labels { nodes { name color } }
      startedAt
      dueDate
      createdAt
      updatedAt
      comments {
        nodes {
          body
          createdAt
          user { displayName avatarUrl }
        }
      }
    }
  }
`;

export const FETCH_PROJECT_ISSUES = `
  query ProjectIssues($projectId: String!) {
    project(id: $projectId) {
      id
      name
      issues {
        nodes {
          id
          title
          priority
          priorityLabel
          state { name color }
          assignee { displayName avatarUrl }
          project { id name }
          cycle { number startsAt endsAt }
          labels { nodes { name color } }
          startedAt
          dueDate
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const UPDATE_ISSUE_DATES = `
  mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        startedAt
        dueDate
      }
    }
  }
`;

export const FETCH_PROJECT_ISSUES_BY_NAME = `
  query ProjectIssuesByName($projectName: String!) {
    projects(filter: { name: { eq: $projectName } }) {
      nodes {
        id
        name
        issues(first: 100) {
          nodes {
            id
            title
            priority
            priorityLabel
            state { name color }
            assignee { displayName avatarUrl }
            startedAt
            dueDate
          }
        }
      }
    }
  }
`;

export const FETCH_ALL_PROJECTS_PROGRESS = `
  query AllProjectsProgress {
    projects(first: 50) {
      nodes {
        id
        name
        issues {
          nodes {
            id
            state { name type }
          }
        }
      }
    }
  }
`;

// ── Known project IDs ─────────────────────────────────────────────────────

export const SUBTEST_FEEDBACK_PROJECT_ID =
  "132ad838-091a-4a16-95d8-abb2f8c40d42";

// ── Types ─────────────────────────────────────────────────────────────────

export type LinearCycle = {
  id: string;
  number: number;
  startsAt: string;
  endsAt: string;
};

export type LinearLabel = {
  name: string;
  color: string;
};

export type LinearState = {
  name: string;
  color: string;
};

export type LinearAssignee = {
  id?: string;
  displayName: string;
  avatarUrl: string | null;
};

export type LinearProject = {
  id: string;
  name: string;
};

export type LinearComment = {
  body: string;
  createdAt: string;
  user: {
    displayName: string;
    avatarUrl: string | null;
  };
};

export type LinearIssue = {
  id: string;
  title: string;
  description?: string;
  priority: number;
  priorityLabel: string;
  identifier?: string;
  state: LinearState;
  assignee: LinearAssignee | null;
  project: LinearProject | null;
  cycle: LinearCycle | null;
  labels: { nodes: LinearLabel[] };
  startedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: { nodes: LinearComment[] };
};

export type CyclesResponse = {
  cycles: {
    nodes: LinearCycle[];
  };
};

export type CycleIssuesResponse = {
  cycle: {
    id: string;
    number: number;
    startsAt: string;
    endsAt: string;
    issues: {
      nodes: LinearIssue[];
    };
  };
};

export type IssueDetailResponse = {
  issue: LinearIssue;
};

export type ProjectIssuesResponse = {
  project: {
    id: string;
    name: string;
    issues: {
      nodes: LinearIssue[];
    };
  };
};

export type IssueUpdateResponse = {
  issueUpdate: {
    success: boolean;
    issue: {
      id: string;
      startedAt: string | null;
      dueDate: string | null;
    };
  };
};

export type ProjectIssuesByNameResponse = {
  projects: {
    nodes: {
      id: string;
      name: string;
      issues: {
        nodes: {
          id: string;
          title: string;
          priority: number;
          priorityLabel: string;
          state: { name: string; color: string };
          assignee: { displayName: string; avatarUrl: string | null } | null;
          startedAt: string | null;
          dueDate: string | null;
        }[];
      };
    }[];
  };
};

export type AllProjectsProgressResponse = {
  projects: {
    nodes: {
      id: string;
      name: string;
      issues: {
        nodes: {
          id: string;
          state: { name: string; type: string };
        }[];
      };
    }[];
  };
};
