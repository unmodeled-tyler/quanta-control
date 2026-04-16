import { useEffect, useState } from "react";
import * as api from "../../services/api";
import type { FileDiff, DiffLine } from "../../types/git";

function DiffLineView({ line }: { line: DiffLine }) {
  const bg =
    line.type === "add"
      ? "bg-emerald-500/10"
      : line.type === "delete"
        ? "bg-red-500/10"
        : "";
  const text =
    line.type === "add"
      ? "text-emerald-400"
      : line.type === "delete"
        ? "text-red-400"
        : "text-zinc-400";
  const prefix = line.type === "add" ? "+" : line.type === "delete" ? "-" : " ";

  return (
    <div className={`flex font-mono text-xs ${bg}`}>
      <span className="w-12 flex-shrink-0 text-right pr-2 text-zinc-600 select-none">
        {line.oldLineNumber ?? ""}
      </span>
      <span className="w-12 flex-shrink-0 text-right pr-2 text-zinc-600 select-none">
        {line.newLineNumber ?? ""}
      </span>
      <span className={`w-4 flex-shrink-0 select-none ${text}`}>{prefix}</span>
      <pre className={`flex-1 whitespace-pre-wrap break-all ${text}`}>
        {line.content}
      </pre>
    </div>
  );
}

function DiffHunkView({
  hunks,
}: {
  hunks: FileDiff["hunks"];
}) {
  return (
    <div>
      {hunks.map((hunk, i) => (
        <div key={i}>
          <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-mono">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines}@@{" "}
            {hunk.header}
          </div>
          {hunk.lines.map((line, j) => (
            <DiffLineView key={j} line={line} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DiffContent({
  diffs,
  loading = false,
  loadingMessage = "Loading diff...",
  emptyStateMessage = "Select a file to view diff",
}: {
  diffs: FileDiff[];
  loading?: boolean;
  loadingMessage?: string;
  emptyStateMessage?: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-500">
        {loadingMessage}
      </div>
    );
  }

  if (diffs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-600">
        {emptyStateMessage}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {diffs.map((diff, i) => (
        <div key={i} className="border-b border-zinc-800 last:border-0">
          <div className="px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-300">{diff.path}</span>
            {diff.oldPath && (
              <span className="text-xs text-zinc-600">
                ← {diff.oldPath}
              </span>
            )}
            <div className="flex gap-2 ml-auto text-xs">
              <span className="text-emerald-400">+{diff.additions}</span>
              <span className="text-red-400">-{diff.deletions}</span>
            </div>
          </div>
          {diff.isBinary ? (
            <div className="px-3 py-4 text-xs text-zinc-600 text-center">
              Binary file
            </div>
          ) : (
            <DiffHunkView hunks={diff.hunks} />
          )}
        </div>
      ))}
    </div>
  );
}

export function DiffViewer({
  repoPath,
  filePath,
  staged,
  showAllWhenNoFile = true,
  emptyStateMessage,
}: {
  repoPath: string;
  filePath: string | null;
  staged?: boolean;
  showAllWhenNoFile?: boolean;
  emptyStateMessage?: string;
}) {
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filePath) {
      if (!showAllWhenNoFile) {
        setDiffs([]);
        setLoading(false);
        return;
      }
      api.getDiff(repoPath, undefined, staged).then(setDiffs).catch(() => setDiffs([]));
      return;
    }
    setLoading(true);
    api.getDiff(repoPath, filePath, staged)
      .then(setDiffs)
      .catch(() => setDiffs([]))
      .finally(() => setLoading(false));
  }, [repoPath, filePath, staged]);

  return (
    <DiffContent
      diffs={diffs}
      loading={loading}
      emptyStateMessage={filePath ? "No changes" : (emptyStateMessage || "Select a file to view diff")}
    />
  );
}
