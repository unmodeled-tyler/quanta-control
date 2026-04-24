import { Upload, Download, RefreshCw } from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";
import { useState } from "react";
import * as api from "../../services/api";

export function RemoteActions() {
  const { repoPath, status, refresh } = useRepoStore();
  const [loading, setLoading] = useState<string | null>(null);

  if (!repoPath) return null;

  const handleFetch = async () => {
    setLoading("fetch");
    try {
      await api.fetchRemote(repoPath);
      await refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  const handlePull = async () => {
    setLoading("pull");
    try {
      await api.pull(repoPath);
      await refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  const handlePush = async () => {
    setLoading("push");
    try {
      await api.push(repoPath);
      await refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleFetch}
        disabled={!!loading}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
        title="Fetch"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading === "fetch" ? "animate-spin" : ""}`} />
      </button>
      <button
        onClick={handlePull}
        disabled={!!loading}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
        title="Pull"
      >
        <Download className={`w-3.5 h-3.5 ${loading === "pull" ? "animate-spin" : ""}`} />
        {(status?.behind ?? 0) > 0 && (
          <span className="text-yellow-400">{status!.behind}</span>
        )}
      </button>
      <button
        onClick={handlePush}
        disabled={!!loading}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
        title="Push"
      >
        <Upload className={`w-3.5 h-3.5 ${loading === "push" ? "animate-spin" : ""}`} />
        {(status?.ahead ?? 0) > 0 && (
          <span className="text-emerald-400">{status!.ahead}</span>
        )}
      </button>
    </div>
  );
}
