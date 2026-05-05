import { Loader2 } from "lucide-react";
import type { CommitInfo } from "../../types/git";
import { CommitList } from "./CommitList";

export function PickaxeResultsPanel({
  loading,
  error,
  commits,
}: {
  loading: boolean;
  error: string | null;
  commits: CommitInfo[];
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error && commits.length === 0) {
    return <div className="p-4 text-center text-sm text-zinc-500">{error}</div>;
  }

  return (
    <div className="text-xs">
      {commits.length > 0 && (
        <div className="px-3 py-1.5 text-zinc-500 border-b border-zinc-800/40">
          {commits.length} commit{commits.length !== 1 ? "s" : ""}
        </div>
      )}
      <CommitList commits={commits} loading={false} emptyMessage="" />
    </div>
  );
}
