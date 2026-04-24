import { useState } from "react";
import {
  GitBranch,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  ArrowRight,
} from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";
import * as api from "../../services/api";
import type { Branch } from "../../types/git";

export function BranchView() {
  const { repoPath, branches, refreshBranches, refreshStatus } = useRepoStore();
  const [newBranch, setNewBranch] = useState("");
  const [creating, setCreating] = useState(false);

  if (!repoPath) return null;

  const localBranches = branches.filter((b) => !b.isRemote);
  const remoteBranches = branches.filter((b) => b.isRemote);
  const currentBranch = branches.find((b) => b.isCurrent);

  const handleCheckout = async (name: string) => {
    try {
      await api.checkoutBranch(repoPath, name);
      await Promise.all([refreshBranches(), refreshStatus()]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreate = async () => {
    if (!newBranch.trim()) return;
    setCreating(true);
    try {
      await api.checkoutBranch(repoPath, newBranch.trim(), true);
      setNewBranch("");
      await Promise.all([refreshBranches(), refreshStatus()]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete branch "${name}"?`)) return;
    try {
      await api.deleteBranch(repoPath, name);
      await refreshBranches();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Branches</h2>
          <button
            onClick={() => refreshBranches()}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New branch name..."
            className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-sm focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newBranch.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-md text-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create
          </button>
        </div>
      </div>

      {currentBranch && (
        <div className="p-3 border-b border-zinc-800 bg-emerald-500/5">
          <div className="text-xs text-zinc-500 mb-1">Current</div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              {currentBranch.name}
            </span>
          </div>
        </div>
      )}

      <div className="p-3">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Local
        </h3>
        <div className="space-y-0.5">
          {localBranches
            .filter((b) => !b.isCurrent)
            .map((branch) => (
              <div
                key={branch.name}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-900 group"
              >
                <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                <span className="flex-1 text-sm text-zinc-300 truncate">
                  {branch.name}
                </span>
                <button
                  onClick={() => handleCheckout(branch.name)}
                  className="hidden group-hover:flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400"
                >
                  <ArrowRight className="w-3 h-3" />
                  Switch
                </button>
                <button
                  onClick={() => handleDelete(branch.name)}
                  className="hidden group-hover:block p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
        </div>

        {remoteBranches.length > 0 && (
          <>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-4 mb-2">
              Remote
            </h3>
            <div className="space-y-0.5">
              {remoteBranches.slice(0, 20).map((branch) => (
                <div
                  key={branch.name}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-500"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span className="truncate">{branch.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
