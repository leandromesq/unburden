import type { OmniIssue } from "@/lib/types";

export function createIssue(
  id: OmniIssue["id"],
  values?: OmniIssue["values"],
): OmniIssue {
  return values ? { id, values } : { id };
}

export function issueKey(issue: OmniIssue) {
  return `${issue.id}:${JSON.stringify(issue.values ?? {})}`;
}

export function uniqueIssues(issues: OmniIssue[]) {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = issueKey(issue);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
