import type {
  StatusResult,
  FileDiff,
  CommitInfo,
  Branch,
  Remote,
  CommitActivity,
  StashEntry,
  DiffHunk,
  RebaseRequest,
  RebaseResult,
  GrepMatch,
  BlameLine,
  PickaxeMode,
  TodoItem,
  Tag,
} from "../types/git";
import type { SystemStatus } from "../types/system";

const GIT_BASE = "/api/git";
const REPO_BASE = "/api/repos";
const SYSTEM_BASE = "/api/system";

let cachedToken = "";

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    cachedToken = data.token ?? "";
  } catch {
    cachedToken = "";
  }
  return cachedToken;
}

async function api<T>(url: string, options?: RequestInit, retry = true): Promise<T> {
  const token = await getToken();
  const hasBody = options?.body != null;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "x-quanta-token": token } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401 && retry) {
    cachedToken = "";
    return api<T>(url, options, false);
  }
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

export function generateCommitMessage(
  repo: string,
  options: {
    endpoint: string;
    model: string;
    apiKey?: string;
  },
) {
  return api<{ message: string }>(`${GIT_BASE}/generate-commit-message`, {
    method: "POST",
    body: JSON.stringify({ repo, ...options }),
  });
}

export function testAiEndpoint(options: {
  endpoint: string;
  model?: string;
  apiKey?: string;
}) {
  return api<{
    success: boolean;
    url: string;
    modelFound: boolean | null;
    modelCount: number;
  }>(`${GIT_BASE}/test-ai-endpoint`, {
    method: "POST",
    body: JSON.stringify(options),
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

export function applyHunk(repo: string, diff: FileDiff, hunk: DiffHunk, reverse = false) {
  return api<{ success: boolean }>("/api/apply-hunk", {
    method: "POST",
    body: JSON.stringify({
      repo,
      file: diff.path,
      oldFile: diff.oldPath,
      newFile: diff.newFile,
      newMode: diff.newMode,
      deletedMode: diff.deletedMode,
      hunk,
      reverse,
    }),
  });
}

export function getStashes(repo: string) {
  return api<StashEntry[]>(`/api/stashes?repo=${encodeURIComponent(repo)}`);
}

export function applyStash(repo: string, name: string) {
  return api<{ success: boolean }>("/api/stash-apply", {
    method: "POST",
    body: JSON.stringify({ repo, name }),
  });
}

export function popStash(repo: string, name: string) {
  return api<{ success: boolean }>("/api/stash-pop", {
    method: "POST",
    body: JSON.stringify({ repo, name }),
  });
}

export function dropStash(repo: string, name: string) {
  return api<{ success: boolean }>("/api/stash-drop", {
    method: "POST",
    body: JSON.stringify({ repo, name }),
  });
}

export function rebaseInteractive(request: RebaseRequest) {
  return api<RebaseResult>(`${GIT_BASE}/rebase-interactive`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function rebaseAbort(repo: string) {
  return api<{ success: boolean }>(`${GIT_BASE}/rebase-abort`, {
    method: "POST",
    body: JSON.stringify({ repo }),
  });
}

// ── Explorer ──

export function getFileTree(repo: string, ref?: string) {
  const params = new URLSearchParams({ repo });
  if (ref) params.set("ref", ref);
  return api<{ files: string[] }>(`/api/explorer/tree?${params}`);
}

export function getBlame(repo: string, file: string) {
  const params = new URLSearchParams({ repo, file });
  return api<{ lines: BlameLine[] }>(`/api/explorer/blame?${params}`);
}

export function getFileHistory(repo: string, file: string, limit = 50) {
  const params = new URLSearchParams({ repo, file, limit: String(limit) });
  return api<{ commits: CommitInfo[] }>(`/api/explorer/history?${params}`);
}

export function grepCode(repo: string, pattern: string, ignoreCase = true) {
  const params = new URLSearchParams({ repo, pattern, ignoreCase: String(ignoreCase) });
  return api<{ matches: GrepMatch[]; truncated?: boolean }>(`/api/explorer/grep?${params}`);
}

export function pickaxeSearch(repo: string, query: string, mode: PickaxeMode = "S", limit = 50) {
  const params = new URLSearchParams({ repo, query, mode, limit: String(limit) });
  return api<{ commits: CommitInfo[] }>(`/api/explorer/pickaxe?${params}`);
}

export function compareRefs(repo: string, from: string, to: string) {
  const params = new URLSearchParams({ repo, from, to });
  return api<{ diffs: FileDiff[] }>(`/api/explorer/compare?${params}`);
}

export function getLineHistory(repo: string, file: string, start: number, end: number, limit = 50) {
  const params = new URLSearchParams({
    repo,
    file,
    start: String(start),
    end: String(end),
    limit: String(limit),
  });
  return api<{ commits: CommitInfo[] }>(`/api/explorer/line-history?${params}`);
}

export function scanTodos(repo: string) {
  return api<{ items: TodoItem[]; truncated?: boolean }>(`/api/explorer/todos?repo=${encodeURIComponent(repo)}`);
}

export function getTags(repo: string) {
  return api<{ tags: Tag[] }>(`${GIT_BASE}/tags?repo=${encodeURIComponent(repo)}`);
}

export function createTag(repo: string, name: string, message?: string, ref?: string) {
  return api<{ success: boolean }>(`${GIT_BASE}/tag-create`, {
    method: "POST",
    body: JSON.stringify({ repo, name, message, ref }),
  });
}

export function deleteTag(repo: string, name: string) {
  return api<{ success: boolean }>(`${GIT_BASE}/tag-delete`, {
    method: "POST",
    body: JSON.stringify({ repo, name }),
  });
}

export function cherryPick(repo: string, commit: string) {
  return api<{ success: boolean; output: string }>(`${GIT_BASE}/cherry-pick`, {
    method: "POST",
    body: JSON.stringify({ repo, commit }),
  });
}
