"use client";

import { useState } from "react";
import type {
  GroupedIssues,
  LinearIssueData,
} from "./page";
import {
  getStatusColorClass,
  getPriorityIcon,
  getPriorityColorClass,
} from "./page";

type ViewMode = "owner" | "project" | "status";

function IssueCard({ issue }: { issue: LinearIssueData }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${getStatusColorClass(issue.status)}`}
          title={issue.status}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary leading-snug mb-2">
            {issue.title}
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary bg-surface px-2 py-1 rounded-md">
              {issue.status}
            </span>
            {issue.priority > 0 && (
              <span
                className={`text-xs font-bold ${getPriorityColorClass(issue.priority)}`}
              >
                {getPriorityIcon(issue.priority)} {issue.priorityLabel}
              </span>
            )}
            {issue.projectName && (
              <span className="text-xs text-text-secondary truncate max-w-[180px]">
                {issue.projectName}
              </span>
            )}
          </div>
        </div>
        {issue.assigneeName && (
          <div className="flex items-center gap-2 shrink-0">
            {issue.assigneeAvatarUrl ? (
              <img
                src={issue.assigneeAvatarUrl}
                alt={issue.assigneeName}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-status-in-progress/20 flex items-center justify-center text-xs font-semibold text-status-in-progress">
                {issue.assigneeName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupSection({
  name,
  issues,
}: {
  name: string;
  issues: LinearIssueData[];
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-white">{name}</h2>
        <span className="text-sm text-text-secondary bg-navy-light px-2.5 py-0.5 rounded-full">
          {issues.length}
        </span>
      </div>
      <div className="grid gap-3">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

export function RoadmapView({
  grouped,
  totalCount,
}: {
  grouped: Record<ViewMode, GroupedIssues>;
  totalCount: number;
}) {
  const [view, setView] = useState<ViewMode>("owner");
  const currentGroups = grouped[view];
  const sortedGroupNames = Object.keys(currentGroups).sort((a, b) => {
    if (a === "Unassigned" || a === "No Project" || a === "Unknown") return 1;
    if (b === "Unassigned" || b === "No Project" || b === "Unknown") return -1;
    return a.localeCompare(b);
  });

  const viewOptions: { key: ViewMode; label: string }[] = [
    { key: "owner", label: "By Owner" },
    { key: "project", label: "By Project" },
    { key: "status", label: "By Status" },
  ];

  return (
    <div className="min-h-screen bg-navy">
      {/* Header */}
      <header className="border-b border-white/10 bg-navy/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Marker Learning Roadmap
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {totalCount} issues from Linear
            </p>
          </div>
          <div className="flex items-center gap-1 bg-navy-light rounded-lg p-1">
            {viewOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setView(opt.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  view === opt.key
                    ? "bg-white text-navy shadow-sm"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {sortedGroupNames.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-secondary text-lg">
              No issues found. Make sure your Linear API key has the correct
              permissions.
            </p>
          </div>
        ) : (
          sortedGroupNames.map((name) => (
            <GroupSection
              key={name}
              name={name}
              issues={currentGroups[name]}
            />
          ))
        )}
      </main>
    </div>
  );
}
