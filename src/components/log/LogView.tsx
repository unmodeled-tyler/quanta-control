import { GitCommit, Files, Loader2 } from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";
import { useEffect, useMemo, useState } from "react";
import * as api from "../../services/api";
import { DiffContent } from "../diff/DiffViewer";
import type { CommitInfo, FileDiff } from "../../types/git";

export function LogView() {
  const { repoPath, commits } = useRepoStore();
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [diffCache, setDiffCache] = useState<Record<string, FileDiff[]>>({});
  const [loadingCommit, setLoadingCommit] = useState<string | null>(null);
  const [error, setError] = useState<{ hash: string; message: string } | null>(null);

  if (!repoPath) return null;

  useEffect(() => {
    if (commits.length === 0) {
      setSelectedCommit(null);
      setDiffCache({});
      setLoadingCommit(null);
      setError(null);
      return;
    }

    if (!selectedCommit || !commits.some((commit) => commit.hash === selectedCommit)) {
      setSelectedCommit(commits[0]?.hash ?? null);
    }
  }, [commits, selectedCommit]);

  useEffect(() => {
    if (!repoPath || !selectedCommit || diffCache[selectedCommit]) return;

    let cancelled = false;

    setLoadingCommit(selectedCommit);
    setError(null);

    api.getCommitDiff(repoPath, selectedCommit)
      .then((diffs) => {
        if (cancelled) return;
        setDiffCache((current) => ({
          ...current,
          [selectedCommit]: diffs,
        }));
        setError((current) => (current?.hash === selectedCommit ? null : current));
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError({
          hash: selectedCommit,
          message: err.message || "Failed to load commit changes",
        });
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingCommit((current) => (current === selectedCommit ? null : current));
      });

    return () => {
      cancelled = true;
    };
  }, [diffCache, repoPath, selectedCommit]);

  const activeCommit = useMemo(
    () => commits.find((commit) => commit.hash === selectedCommit) ?? null,
    [commits, selectedCommit],
  );
  const activeDiffs = activeCommit ? (diffCache[activeCommit.hash] ?? []) : [];
  const totals = activeDiffs.reduce(
    (summary, diff) => ({
      additions: summary.additions + diff.additions,
      deletions: summary.deletions + diff.deletions,
    }),
    { additions: 0, deletions: 0 },
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex w-[360px] flex-shrink-0 flex-col border-r border-zinc-800">
        <div className="p-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold">History</h2>
        </div>

        {commits.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-zinc-600">
            No commits
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {commits.map((commit) => (
              <CommitItem
                key={commit.hash}
                commit={commit}
                isSelected={selectedCommit === commit.hash}
                isLoading={loadingCommit === commit.hash}
                onSelect={setSelectedCommit}
              />
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {activeCommit ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-zinc-800 bg-zinc-950/60 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-100 break-words">
                    {activeCommit.message}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>{activeCommit.author}</span>
                    <span className="text-zinc-700">•</span>
                    <span>{formatAbsoluteDate(activeCommit.date)}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="font-mono text-zinc-400">{activeCommit.hash}</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs">
                  <Files className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-zinc-300">
                    {activeDiffs.length} file{activeDiffs.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-zinc-700">•</span>
                  <span className="text-emerald-400">+{totals.additions}</span>
                  <span className="text-red-400">-{totals.deletions}</span>
                </div>
              </div>
            </div>

            {error?.hash === activeCommit.hash && loadingCommit !== activeCommit.hash ? (
              <div className="flex h-full items-center justify-center px-6 text-sm text-red-400">
                {error.message}
              </div>
            ) : (
              <DiffContent
                diffs={activeDiffs}
                loading={loadingCommit === activeCommit.hash && !diffCache[activeCommit.hash]}
                loadingMessage="Loading commit changes..."
                emptyStateMessage="No file changes recorded for this commit"
              />
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            Select a commit to inspect its changes
          </div>
        )}
      </div>
    </div>
  );
}

function CommitItem({
  commit,
  isSelected,
  isLoading,
  onSelect,
}: {
  commit: CommitInfo;
  isSelected: boolean;
  isLoading: boolean;
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
        {isLoading && <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-zinc-500" />}
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

function formatAbsoluteDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}
