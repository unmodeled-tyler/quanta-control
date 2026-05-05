import { Clock, GitCommit, Loader2, User } from "lucide-react";
import type { CommitInfo } from "../../types/git";
import { getRelativeTime } from "../../utils/time";

export function CommitList({
  commits,
  loading,
  emptyMessage,
}: {
  commits: CommitInfo[];
  loading: boolean;
  emptyMessage: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      {commits.map((commit) => (
        <div
          key={commit.hash}
          className="flex items-start gap-3 px-3 py-2 border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
        >
          <GitCommit className="h-4 w-4 flex-shrink-0 mt-0.5 text-zinc-500" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-zinc-400">{commit.shortHash}</span>
              <span className="text-zinc-300 truncate font-medium">{commit.message}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
              <User className="h-2.5 w-2.5" />
              <span>{commit.author}</span>
              <Clock className="h-2.5 w-2.5 ml-1" />
              <span>{getRelativeTime(commit.date)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
