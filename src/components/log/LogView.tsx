import { GitCommit, Files, Loader2, List, Network, CopyCheck, AlertCircle } from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";
import { useEffect, useMemo, useState, useRef } from "react";
import * as api from "../../services/api";
import { DiffContent } from "../diff/DiffViewer";
import type { CommitInfo, FileDiff } from "../../types/git";
import { CommitGraph } from "./CommitGraph";
import { formatAbsoluteDate, getRelativeTime } from "../../utils/time";

const HISTORY_PANEL_WIDTH_KEY = "quanta-layout-history-width";

function loadStoredNumber(key: string, fallback: number) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type DragState = {
  startPointer: number;
  startSize: number;
} | null;

export function LogView() {
  const { repoPath, commits } = useRepoStore();
  const [mode, setMode] = useState<"list" | "graph">("graph");
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [diffCache, setDiffCache] = useState<Record<string, FileDiff[]>>({});
  const [loadingCommit, setLoadingCommit] = useState<string | null>(null);
  const [error, setError] = useState<{ hash: string; message: string } | null>(null);
  const [cherryPickSuccess, setCherryPickSuccess] = useState<string | null>(null);
  const [cherryPickError, setCherryPickError] = useState<string | null>(null);
  const [cherryPicking, setCherryPicking] = useState(false);
  const [historyPanelWidth, setHistoryPanelWidth] = useState(() =>
    loadStoredNumber(HISTORY_PANEL_WIDTH_KEY, 360),
  );
  const [dragState, setDragState] = useState<DragState>(null);
  const diffCacheRef = useRef(diffCache);
  diffCacheRef.current = diffCache;

  // Evict stale cache entries when commits list changes
  useEffect(() => {
    if (commits.length === 0) {
      setDiffCache({});
      return;
    }
    const validHashes = new Set(commits.map((c) => c.hash));
    setDiffCache((prev) => {
      const next: typeof prev = {};
      for (const [k, v] of Object.entries(prev)) {
        if (validHashes.has(k)) next[k] = v;
      }
      if (Object.keys(next).length === Object.keys(prev).length) return prev;
      return next;
    });
  }, [commits]);

  useEffect(() => {
    if (commits.length === 0) {
      setSelectedCommit(null);
      setLoadingCommit(null);
      setError(null);
      return;
    }

    if (!selectedCommit || !commits.some((commit) => commit.hash === selectedCommit)) {
      setSelectedCommit(commits[0]?.hash ?? null);
    }
  }, [commits, selectedCommit]);

  useEffect(() => {
    if (!repoPath || !selectedCommit) return;
    if (diffCacheRef.current[selectedCommit]) return;

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
        setError((prev) => (prev?.hash === selectedCommit ? null : prev));
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
        setLoadingCommit((prev) => (prev === selectedCommit ? null : prev));
      });

    return () => { cancelled = true; };
  }, [repoPath, selectedCommit]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = clamp(
        dragState.startSize + (event.clientX - dragState.startPointer),
        240,
        640,
      );
      setHistoryPanelWidth(nextWidth);
    };

    const handlePointerUp = () => setDragState(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_PANEL_WIDTH_KEY, String(historyPanelWidth));
    } catch {}
  }, [historyPanelWidth]);

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

  if (!repoPath) return null;

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className="flex flex-shrink-0 flex-col border-r border-zinc-800"
        style={{ width: historyPanelWidth }}
      >
        <div className="flex items-center justify-between p-3 border-b border-zinc-800/60">
          <h2 className="text-sm font-semibold">History</h2>
          <div
            role="group"
            aria-label="History view mode"
            className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setMode("list")}
              aria-label="List view"
              aria-pressed={mode === "list"}
              title="List view"
              className={`px-2 py-1 text-xs transition-all duration-150 ease-out ${
                mode === "list"
                  ? "bg-zinc-700 text-zinc-100 shadow-sm shadow-black/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMode("graph")}
              aria-label="Graph view"
              aria-pressed={mode === "graph"}
              title="Graph view"
              className={`px-2 py-1 text-xs transition-all duration-150 ease-out ${
                mode === "graph"
                  ? "bg-zinc-700 text-zinc-100 shadow-sm shadow-black/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Network className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {commits.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-zinc-600">
            No commits
          </div>
        ) : mode === "graph" ? (
          <div className="min-h-0 flex-1">
            <CommitGraph
              commits={commits}
              selectedCommit={selectedCommit}
              onSelectCommit={setSelectedCommit}
            />
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

      <ResizeHandle
        onPointerDown={(event) =>
          setDragState({
            startPointer: event.clientX,
            startSize: historyPanelWidth,
          })
        }
      />

      <div className="min-w-0 flex-1">
        {activeCommit ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-zinc-800/60 bg-zinc-950/40 px-4 py-3">
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
                <button
                  onClick={async () => {
                    if (!repoPath || !activeCommit || cherryPicking) return;
                    setCherryPicking(true);
                    setCherryPickSuccess(null);
                    setCherryPickError(null);
                    try {
                      await api.cherryPick(repoPath, activeCommit.hash);
                      setCherryPickSuccess(`Cherry-picked ${activeCommit.shortHash}`);
                    } catch (err) {
                      setCherryPickError(err instanceof Error ? err.message : "Cherry-pick failed");
                    } finally {
                      setCherryPicking(false);
                    }
                  }}
                  disabled={cherryPicking}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-emerald-600 hover:text-emerald-400 disabled:opacity-40 transition-colors"
                  title="Cherry-pick this commit onto the current branch"
                >
                  {cherryPicking ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CopyCheck className="h-3 w-3" />
                  )}
                  Cherry-pick
                </button>
              </div>
              {cherryPickSuccess && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
                  <CopyCheck className="h-3 w-3" />
                  {cherryPickSuccess}
                </div>
              )}
              {cherryPickError && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {cherryPickError}
                </div>
              )}
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

function ResizeHandle({
  onPointerDown,
}: {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="group relative flex h-full w-1.5 flex-shrink-0 cursor-col-resize select-none"
      role="separator"
      aria-orientation="vertical"
    >
      <div className="absolute inset-0 border-x border-zinc-800 transition-colors group-hover:bg-emerald-500/20" />
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
  const relative = getRelativeTime(commit.date);

  return (
    <button
      onClick={() => onSelect(commit.hash)}
      className={`w-full text-left px-3 py-2.5 border-b border-zinc-800/50 hover:bg-zinc-900/60 transition-all duration-150 ease-out ${
        isSelected ? "bg-zinc-800/80" : ""
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
