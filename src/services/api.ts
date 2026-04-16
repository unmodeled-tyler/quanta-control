import type {
  StatusResult,
  FileDiff,
  CommitInfo,
  Branch,
  Remote,
  CommitActivity,
} from "../types/git";
import type { SystemStatus } from "../types/system";

const GIT_BASE = "/api/git";
const REPO_BASE = "/api/repos";
const SYSTEM_BASE = "/api/system";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function getStatus(repo: string) {
  return api<StatusResult>(`${GIT_BASE}/status?repo=${encodeURIComponent(repo)}`);
}

export function getDiff(repo: string, file?: string, staged?: boolean) {
  const params = new URLSearchParams({ repo });
  if (file) params.set("file", file);
  if (staged) params.set("staged", "true");
  return api<FileDiff[]>(`${GIT_BASE}/diff?${params}`);
}

export function getCommitDiff(repo: string, commit: string) {
  const params = new URLSearchParams({ repo, commit });
  return api<FileDiff[]>(`${GIT_BASE}/commit-diff?${params}`);
}

export function stageFiles(repo: string, files?: string[]) {
  return api<{ success: boolean }>(`${GIT_BASE}/stage`, {
    method: "POST",
    body: JSON.stringify({ repo, files }),
  });
}

export function unstageFiles(repo: string, files?: string[]) {
  return api<{ success: boolean }>(`${GIT_BASE}/unstage`, {
    method: "POST",
    body: JSON.stringify({ repo, files }),
  });
}

export function commit(repo: string, message: string, amend = false) {
  return api<{ success: boolean }>(`${GIT_BASE}/commit`, {
    method: "POST",
    body: JSON.stringify({ repo, message, amend }),
  });
}

export function getLog(repo: string, count = 50, branch?: string) {
  const params = new URLSearchParams({ repo, count: String(count) });
  if (branch) params.set("branch", branch);
  return api<CommitInfo[]>(`${GIT_BASE}/log?${params}`);
}

export function getCommitActivity(
  repo: string,
  options?: { email?: string; name?: string; days?: number },
) {
  const params = new URLSearchParams({ repo });
  if (options?.email) params.set("email", options.email);
  if (options?.name) params.set("name", options.name);
  if (options?.days) params.set("days", String(options.days));
  return api<CommitActivity>(`${GIT_BASE}/stats?${params}`);
}

export function getBranches(repo: string) {
  return api<Branch[]>(`${GIT_BASE}/branches?repo=${encodeURIComponent(repo)}`);
}

export function checkoutBranch(repo: string, branch: string, create = false) {
  return api<{ success: boolean }>(`${GIT_BASE}/checkout`, {
    method: "POST",
    body: JSON.stringify({ repo, branch, create }),
  });
}

export function deleteBranch(repo: string, branch: string, force = false) {
  return api<{ success: boolean }>(`${GIT_BASE}/delete-branch`, {
    method: "POST",
    body: JSON.stringify({ repo, branch, force }),
  });
}

export function getRemotes(repo: string) {
  return api<Remote[]>(`${GIT_BASE}/remotes?repo=${encodeURIComponent(repo)}`);
}

export function fetchRemote(repo: string, remote?: string) {
  return api<{ success: boolean }>(`${GIT_BASE}/fetch`, {
    method: "POST",
    body: JSON.stringify({ repo, remote }),
  });
}

export function pull(repo: string, remote?: string, branch?: string) {
  return api<{ success: boolean }>(`${GIT_BASE}/pull`, {
    method: "POST",
    body: JSON.stringify({ repo, remote, branch }),
  });
}

export function push(repo: string, remote?: string, branch?: string, force = false) {
  return api<{ success: boolean }>(`${GIT_BASE}/push`, {
    method: "POST",
    body: JSON.stringify({ repo, remote, branch, force }),
  });
}

export function stash(repo: string, message?: string) {
  return api<{ success: boolean }>(`${GIT_BASE}/stash`, {
    method: "POST",
    body: JSON.stringify({ repo, message }),
  });
}

export function stashPop(repo: string) {
  return api<{ success: boolean }>(`${GIT_BASE}/stash`, {
    method: "POST",
    body: JSON.stringify({ repo, pop: true }),
  });
}

export function discardChanges(repo: string, files?: string[]) {
  return api<{ success: boolean }>(`${GIT_BASE}/discard`, {
    method: "POST",
    body: JSON.stringify({ repo, files }),
  });
}

export function addToGitignore(repo: string, patterns: string[]) {
  return api<{ success: boolean; added: string[] }>(`${GIT_BASE}/gitignore`, {
    method: "POST",
    body: JSON.stringify({ repo, patterns }),
  });
}

export function validateRepo(path: string) {
  return api<{ valid: boolean; resolvedPath: string }>(`${REPO_BASE}/validate?path=${encodeURIComponent(path)}`);
}

export interface BrowseChild {
  name: string;
  path: string;
  isDirectory: boolean;
  isGitRepo: boolean;
}

export interface BrowseResult {
  path: string;
  isGitRepo: boolean;
  children: BrowseChild[];
}

export function browsePath(path: string, hidden = false) {
  const params = new URLSearchParams({ path });
  if (hidden) {
    params.set("hidden", "true");
  }
  return api<BrowseResult>(`${REPO_BASE}/browse?${params}`);
}

export function getRecentRepos() {
  return api<Array<{ name: string; path: string }>>(`${REPO_BASE}/recent`);
}

export function getGitConfig(repo: string, key: string) {
  return api<{ value: string }>(`${GIT_BASE}/config?repo=${encodeURIComponent(repo)}&key=${encodeURIComponent(key)}`);
}

export function getSystemStatus() {
  return api<SystemStatus>(`${SYSTEM_BASE}/status`);
}
