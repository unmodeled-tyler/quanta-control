import { create } from "zustand";
import type { StatusResult, Branch, CommitInfo, GitFile } from "../types/git";
import * as api from "../services/api";
import { saveRecentRepo } from "../utils/recentRepos";

function rememberRecentRepo(path: string) {
  try {
    const next = saveRecentRepo(path);

    if (typeof window !== "undefined" && window.electronAPI) {
      window.electronAPI.setRecentRepos(next);
    }
  } catch {}
}

function buildStatusSignature(status: StatusResult | null) {
  if (!status) return null;

  return JSON.stringify({
    branch: status.branch,
    ahead: status.ahead,
    behind: status.behind,
    staged: status.staged,
    unstaged: status.unstaged,
    untracked: status.untracked,
    conflicted: status.conflicted,
    files: [...status.files]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((file: GitFile) => ({
        path: file.path,
        oldPath: file.oldPath || "",
        status: file.status,
        stagedStatus: file.stagedStatus,
        additions: file.additions,
        deletions: file.deletions,
      })),
  });
}

interface RepoStore {
  repoPath: string | null;
  status: StatusResult | null;
  branches: Branch[];
  commits: CommitInfo[];
  loading: boolean;
  error: string | null;
  lastStatusUpdateAt: number | null;
  lastChangeDetectedAt: number | null;

  setRepo: (path: string | null) => void;
  refresh: () => Promise<void>;
  pollRepo: () => Promise<void>;
  refreshStatus: () => Promise<boolean>;
  refreshBranches: () => Promise<void>;
  refreshLog: () => Promise<void>;
  clearError: () => void;
}

export const useRepoStore = create<RepoStore>((set, get) => {
  async function syncRepo(showLoading: boolean) {
    const { repoPath } = get();
    if (!repoPath) return;

    if (showLoading) set({ loading: true, error: null });
    try {
      await Promise.all([
        get().refreshStatus(),
        get().refreshBranches(),
        get().refreshLog(),
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    } finally {
      if (showLoading) set({ loading: false });
    }
  }

  return {
  repoPath: null,
  status: null,
  branches: [],
  commits: [],
  loading: false,
  error: null,
  lastStatusUpdateAt: null,
  lastChangeDetectedAt: null,

  setRepo: (path) => {
    if (path) {
      rememberRecentRepo(path);
    }
    set({
      repoPath: path,
      status: null,
      branches: [],
      commits: [],
      error: null,
      lastStatusUpdateAt: null,
      lastChangeDetectedAt: null,
    });
    const state = get();
    if (state.refresh) state.refresh();
  },

  refresh: () => syncRepo(true),

  pollRepo: () => syncRepo(false),

  refreshStatus: async () => {
    const { repoPath } = get();
    if (!repoPath) return false;
    try {
      const previousStatus = get().status;
      const status = await api.getStatus(repoPath);
      const previousSignature = buildStatusSignature(previousStatus);
      const nextSignature = buildStatusSignature(status);
      const hasChanged = previousSignature !== null && previousSignature !== nextSignature;

      set({
        status,
        lastStatusUpdateAt: Date.now(),
        lastChangeDetectedAt: hasChanged ? Date.now() : get().lastChangeDetectedAt,
      });

      return hasChanged;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
      return false;
    }
  },

  refreshBranches: async () => {
    const { repoPath } = get();
    if (!repoPath) return;
    try {
      const branches = await api.getBranches(repoPath);
      set({ branches });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    }
  },

  refreshLog: async () => {
    const { repoPath } = get();
    if (!repoPath) return;
    try {
      const commits = await api.getLog(repoPath, 50);
      set({ commits });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    }
  },

  clearError: () => set({ error: null }),
  };
});
