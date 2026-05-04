import { useState, useEffect, useCallback } from "react";
import { Package, RotateCcw, Trash2, Download } from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";
import * as api from "../../services/api";
import type { StashEntry } from "../../types/git";

export function StashView() {
  const { repoPath } = useRepoStore();
  const [stashes, setStashes] = useState<StashEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    try {
      const list = await api.getStashes(repoPath);
      setStashes(list);
    } catch {
      setStashes([]);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const wrap = async (name: string, fn: () => Promise<unknown>) => {
    setBusy((prev) => new Set(prev).add(name));
    try {
      await fn();
      await refresh();
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  if (!repoPath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Open a repository to view stashes
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading stashes...
      </div>
    );
  }

  if (stashes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        No stashes found
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-emerald-400" />
        Stashes
      </h2>
      <div className="space-y-2">
        {stashes.map((stash) => {
          const isBusy = busy.has(stash.name);
          return (
            <div
              key={stash.name}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all duration-150 ease-out shadow-sm shadow-black/5 hover:shadow-md hover:shadow-black/10"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-200 truncate">
                  {stash.message || stash.shortHash}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {stash.name} &middot; {stash.branch} &middot; {" "}
                  {new Date(stash.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => wrap(stash.name, () => api.applyStash(repoPath!, stash.name))}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-40"
                  title="Apply stash"
                >
                  <Download className="w-3 h-3" />
                  Apply
                </button>
                <button
                  onClick={() => wrap(stash.name, () => api.popStash(repoPath!, stash.name))}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/20 transition-colors disabled:opacity-40"
                  title="Pop stash"
                >
                  <RotateCcw className="w-3 h-3" />
                  Pop
                </button>
                <button
                  onClick={() => {
                    if (!confirm(`Drop stash ${stash.name}?`)) return;
                    void wrap(stash.name, () => api.dropStash(repoPath!, stash.name));
                  }}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 transition-colors disabled:opacity-40"
                  title="Drop stash"
                >
                  <Trash2 className="w-3 h-3" />
                  Drop
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
