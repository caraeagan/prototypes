import { RoadmapView } from "./roadmap-view";

type LinearIssueData = {
	id: string;
	title: string;
	status: string;
	statusColor: string;
	priority: number;
	priorityLabel: string;
	assigneeName: string | null;
	assigneeAvatarUrl: string | null;
	projectName: string | null;
};

type GqlIssueNode = {
	id: string;
	title: string;
	priority: number;
	priorityLabel: string;
	state: { name: string; color: string } | null;
	assignee: { displayName: string; avatarUrl: string | null } | null;
	project: { name: string } | null;
};

type GqlResponse = {
	data: {
		issues: {
			nodes: GqlIssueNode[];
			pageInfo: { hasNextPage: boolean; endCursor: string | null };
		};
	};
};

const ISSUES_QUERY = `
	query Issues($after: String) {
		issues(first: 100, after: $after, orderBy: updatedAt) {
			nodes {
				id
				title
				priority
				priorityLabel
				state { name color }
				assignee { displayName avatarUrl }
				project { name }
			}
			pageInfo { hasNextPage endCursor }
		}
	}
`;

async function fetchIssues(): Promise<LinearIssueData[]> {
	const apiKey = process.env.LINEAR_API_KEY;
	if (!apiKey) return [];

	const allIssues: LinearIssueData[] = [];
	let hasMore = true;
	let endCursor: string | null = null;

	while (hasMore) {
		const res = await fetch("https://api.linear.app/graphql", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: apiKey,
			},
			body: JSON.stringify({
				query: ISSUES_QUERY,
				variables: { after: endCursor },
			}),
			next: { revalidate: 300 },
		});

		const json = (await res.json()) as GqlResponse;
		const { nodes, pageInfo } = json.data.issues;

		for (const issue of nodes) {
			allIssues.push({
				id: issue.id,
				title: issue.title,
				status: issue.state?.name ?? "Unknown",
				statusColor: issue.state?.color ?? "#94a3b8",
				priority: issue.priority,
				priorityLabel: issue.priorityLabel,
				assigneeName: issue.assignee?.displayName ?? null,
				assigneeAvatarUrl: issue.assignee?.avatarUrl ?? null,
				projectName: issue.project?.name ?? null,
			});
		}

		hasMore = pageInfo.hasNextPage;
		endCursor = pageInfo.endCursor;
	}

	return allIssues;
}

function mapStatusCategory(status: string): string {
	const lower = status.toLowerCase();
	if (lower === "done" || lower === "completed" || lower === "merged")
		return "done";
	if (
		lower === "in progress" ||
		lower === "in review" ||
		lower === "started" ||
		lower === "reviewing"
	)
		return "in-progress";
	if (lower === "cancelled" || lower === "canceled" || lower === "duplicate")
		return "cancelled";
	return "todo";
}

function getStatusColorClass(status: string): string {
	const category = mapStatusCategory(status);
	switch (category) {
		case "done":
			return "bg-status-done";
		case "in-progress":
			return "bg-status-in-progress";
		case "cancelled":
			return "bg-status-cancelled";
		default:
			return "bg-status-todo";
	}
}

function getPriorityIcon(priority: number): string {
	switch (priority) {
		case 1:
			return "!!!";
		case 2:
			return "!!";
		case 3:
			return "!";
		case 4:
			return "-";
		default:
			return "";
	}
}

function getPriorityColorClass(priority: number): string {
	switch (priority) {
		case 1:
			return "text-priority-urgent";
		case 2:
			return "text-priority-high";
		case 3:
			return "text-priority-medium";
		case 4:
			return "text-priority-low";
		default:
			return "text-priority-none";
	}
}

export type GroupedIssues = Record<string, LinearIssueData[]>;
export type { LinearIssueData };
export { getStatusColorClass, getPriorityIcon, getPriorityColorClass };

function groupBy(
	issues: LinearIssueData[],
	key: "owner" | "project" | "status",
): GroupedIssues {
	const groups: GroupedIssues = {};
	for (const issue of issues) {
		let groupKey: string;
		switch (key) {
			case "owner":
				groupKey = issue.assigneeName ?? "Unassigned";
				break;
			case "project":
				groupKey = issue.projectName ?? "No Project";
				break;
			case "status":
				groupKey = issue.status;
				break;
		}
		if (!groups[groupKey]) groups[groupKey] = [];
		groups[groupKey].push(issue);
	}
	return groups;
}

export default async function Page() {
	const issues = await fetchIssues();
	const hasApiKey = !!process.env.LINEAR_API_KEY;

	if (!hasApiKey) {
		return (
			<div className="min-h-screen bg-navy flex items-center justify-center">
				<div className="bg-card rounded-2xl shadow-lg p-12 max-w-md text-center">
					<h2 className="text-2xl font-bold text-text-primary mb-3">
						Connect to Linear
					</h2>
					<p className="text-text-secondary mb-6">
						Add your Linear API key to the{" "}
						<code className="bg-surface px-2 py-1 rounded text-sm font-mono">
							.env
						</code>{" "}
						file.
					</p>
					<div className="bg-surface rounded-lg p-4 text-left">
						<code className="text-sm text-text-secondary font-mono">
							LINEAR_API_KEY=lin_api_...
						</code>
					</div>
				</div>
			</div>
		);
	}

	const grouped = {
		owner: groupBy(issues, "owner"),
		project: groupBy(issues, "project"),
		status: groupBy(issues, "status"),
	};

	return <RoadmapView grouped={grouped} totalCount={issues.length} />;
}
