import { create } from "zustand";
import type { StatusResult, Branch, CommitInfo } from "../types/git";
import * as api from "../services/api";

const RECENT_REPOS_KEY = "quanta-recent-repos";

function rememberRecentRepo(path: string) {
  try {
    const stored = localStorage.getItem(RECENT_REPOS_KEY);
    const parsed = stored ? (JSON.parse(stored) as Array<{ name: string; path: string }>) : [];
    const next = [
      {
        name: path.split("/").filter(Boolean).pop() || path,
        path,
      },
      ...parsed.filter((repo) => repo.path !== path),
    ].slice(0, 8);

    localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(next));
  } catch {}
}

interface RepoStore {
  repoPath: string | null;
  status: StatusResult | null;
  branches: Branch[];
  commits: CommitInfo[];
  loading: boolean;
  error: string | null;

  setRepo: (path: string) => void;
  refresh: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshLog: () => Promise<void>;
  clearError: () => void;
}

export const useRepoStore = create<RepoStore>((set, get) => ({
  repoPath: null,
  status: null,
  branches: [],
  commits: [],
  loading: false,
  error: null,

  setRepo: (path) => {
    if (path) {
      rememberRecentRepo(path);
    }
    set({ repoPath: path, status: null, branches: [], commits: [], error: null });
    const state = get();
    if (state.refresh) state.refresh();
  },

  refresh: async () => {
    const { repoPath } = get();
    if (!repoPath) return;

    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().refreshStatus(),
        get().refreshBranches(),
        get().refreshLog(),
      ]);
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  refreshStatus: async () => {
    const { repoPath } = get();
    if (!repoPath) return;
    try {
      const status = await api.getStatus(repoPath);
      set({ status });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  refreshBranches: async () => {
    const { repoPath } = get();
    if (!repoPath) return;
    try {
      const branches = await api.getBranches(repoPath);
      set({ branches });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  refreshLog: async () => {
    const { repoPath } = get();
    if (!repoPath) return;
    try {
      const commits = await api.getLog(repoPath, 50);
      set({ commits });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  clearError: () => set({ error: null }),
}));
