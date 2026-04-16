import { GitCommit, ArrowUp, ArrowDown } from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";
import { useState } from "react";
import type { CommitInfo } from "../../types/git";

export function LogView() {
  const { repoPath, commits } = useRepoStore();
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  if (!repoPath) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold">History</h2>
      </div>

      {commits.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-zinc-600">
          No commits
        </div>
      ) : (
        <div>
          {commits.map((commit) => (
            <CommitItem
              key={commit.hash}
              commit={commit}
              isSelected={selectedCommit === commit.hash}
              onSelect={setSelectedCommit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommitItem({
  commit,
  isSelected,
  onSelect,
}: {
  commit: CommitInfo;
  isSelected: boolean;
  onSelect: (hash: string) => void;
}) {
  const date = new Date(commit.date);
  const relative = getRelativeTime(date);

  return (
    <button
      onClick={() => onSelect(commit.hash)}
      className={`w-full text-left px-3 py-2.5 border-b border-zinc-800/50 hover:bg-zinc-900 transition-colors ${
        isSelected ? "bg-zinc-800" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <GitCommit className="w-4 h-4 text-zinc-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-200 break-words">{commit.message}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-500">{commit.author}</span>
            <span className="text-xs text-zinc-700">•</span>
            <span className="text-xs text-zinc-600">{relative}</span>
            <span className="text-xs text-zinc-700">•</span>
            <span className="text-xs font-mono text-zinc-600">
              {commit.shortHash}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return date.toLocaleDateString();
}
