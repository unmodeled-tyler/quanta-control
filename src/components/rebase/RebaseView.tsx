import { useEffect, useMemo, useState } from "react";
import { GitCommit, GripVertical, Loader2, AlertTriangle, Pencil, Trash2, RotateCcw } from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";
import * as api from "../../services/api";
import type { RebaseAction, RebaseTodoEntry } from "../../types/git";

const ACTION_LABELS: Record<RebaseAction, string> = {
  pick: "Pick",
  reword: "Reword",
  squash: "Squash",
  fixup: "Fixup",
  drop: "Drop",
};

const ACTION_COLORS: Record<RebaseAction, string> = {
  pick: "bg-zinc-700 text-zinc-200",
  reword: "bg-amber-900/60 text-amber-300",
  squash: "bg-blue-900/60 text-blue-300",
  fixup: "bg-purple-900/60 text-purple-300",
  drop: "bg-red-900/60 text-red-300",
};

export function RebaseView() {
  const { repoPath, commits, refresh } = useRepoStore();
  const [commitCount, setCommitCount] = useState(10);
  const [todos, setTodos] = useState<RebaseTodoEntry[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [rebasing, setRebasing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; output: string; conflicts?: string[] } | null>(null);
  const [rewordMessages, setRewordMessages] = useState<Record<string, string>>({});
  const [editingMessageHash, setEditingMessageHash] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");

  const effectiveCount = Math.min(commitCount, Math.max(commits.length - 1, 0));
  const baseCommit = commits[effectiveCount];

  useEffect(() => {
    if (commits.length === 0 || initialized) return;
    buildTodos();
  }, [commits, initialized]);

  function buildTodos() {
    const subset = commits.slice(0, effectiveCount);
    setTodos(
      subset.map((c, i) => ({
        action: "pick" as RebaseAction,
        hash: c.hash,
        shortHash: c.shortHash,
        message: c.message,
        originalAction: "pick" as RebaseAction,
        originalIndex: i,
      })),
    );
    setInitialized(true);
  }

  function resetTodos() {
    setResult(null);
    setRewordMessages({});
    setEditingMessageHash(null);
    setInitialized(false);
  }

  const visibleTodos = useMemo(() => todos.filter((t) => t.action !== "drop"), [todos]);

  function updateAction(index: number, action: RebaseAction) {
    setTodos((prev) => prev.map((t, i) => (i === index ? { ...t, action } : t)));
  }

  function startReword(index: number) {
    const entry = todos[index];
    if (!entry) return;
    updateAction(index, "reword");
    setRewordMessages((prev) => ({
      ...prev,
      [entry.hash]: prev[entry.hash] ?? entry.message,
    }));
    setEditingMessageHash(entry.hash);
    setEditMessageText(rewordMessages[entry.hash] ?? entry.message);
  }

  function confirmReword() {
    if (!editingMessageHash) return;
    setRewordMessages((prev) => ({ ...prev, [editingMessageHash]: editMessageText }));
    setEditingMessageHash(null);
    setEditMessageText("");
  }

  function cancelReword() {
    setEditingMessageHash(null);
    setEditMessageText("");
  }

  async function executeRebase() {
    if (!repoPath || todos.length === 0) return;
    if (!baseCommit) return;

    setRebasing(true);
    setResult(null);

    try {
      const res = await api.rebaseInteractive({
        repo: repoPath,
        baseCommit: baseCommit.hash,
        todos: visibleTodos,
        rewordMessages,
      });
      setResult(res);
      if (res.success) {
        await refresh();
        resetTodos();
      }
    } catch (err) {
      setResult({
        success: false,
        output: err instanceof Error ? err.message : "Rebase failed",
      });
    } finally {
      setRebasing(false);
    }
  }

  if (!repoPath) return null;

  if (commits.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-600">
        No commits to rebase
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800/60 bg-zinc-950/40 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Interactive Rebase</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Reorder, squash, reword, or drop commits. {visibleTodos.length} commit{visibleTodos.length !== 1 ? "s" : ""} selected.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">
              Commits:
              <select
                value={commitCount}
                onChange={(e) => {
                  setCommitCount(Number(e.target.value));
                  resetTodos();
                }}
                className="ml-1.5 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
              >
                {[5, 10, 15, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              onClick={resetTodos}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              title="Reset to original state"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={executeRebase}
              disabled={rebasing || visibleTodos.length === 0 || !baseCommit}
              className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rebasing ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rebasing...
                </span>
              ) : (
                "Start Rebase"
              )}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div
          className={`border-b px-4 py-3 text-xs ${
            result.success
              ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-300"
              : "border-red-900/40 bg-red-950/30 text-red-300"
          }`}
        >
          <div className="flex items-start gap-2">
            {result.success ? null : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
            <div className="whitespace-pre-wrap break-words">{result.output}</div>
          </div>
        </div>
      )}

      {editingMessageHash && (
        <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Edit commit message
          </label>
          <textarea
            value={editMessageText}
            onChange={(e) => setEditMessageText(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-600 focus:outline-none resize-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={cancelReword}
              className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={confirmReword}
              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Save Message
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {todos.map((entry, index) => (
          <RebaseTodoItem
            key={entry.hash}
            entry={entry}
            index={index}
            setTodos={setTodos}
            onActionChange={(action) => updateAction(index, action)}
            onReword={() => startReword(index)}
            isEditingMessage={editingMessageHash === entry.hash}
            rewordMessage={rewordMessages[entry.hash]}
          />
        ))}
      </div>

      <div className="border-t border-zinc-800/60 bg-zinc-950/40 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span>
            Base: {baseCommit ? baseCommit.shortHash : "root"} ({baseCommit ? baseCommit.message.slice(0, 40) : "initial"})
          </span>
          <span>
            {visibleTodos.length} of {todos.length} commits
          </span>
        </div>
      </div>
    </div>
  );
}

function RebaseTodoItem({
  entry,
  index,
  setTodos,
  onActionChange,
  onReword,
  isEditingMessage,
  rewordMessage,
}: {
  entry: RebaseTodoEntry;
  index: number;
  setTodos: React.Dispatch<React.SetStateAction<RebaseTodoEntry[]>>;
  onActionChange: (action: RebaseAction) => void;
  onReword: () => void;
  isEditingMessage: boolean;
  rewordMessage?: string;
}) {
  const isDropped = entry.action === "drop";
  const displayMessage = rewordMessage ?? entry.message;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (fromIndex === index) return;

    setTodos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(index, 0, moved!);
      return next;
    });
  };

  return (
    <div
      draggable={!isDropped}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`group flex items-center gap-2 border-b border-zinc-800/40 px-3 py-2 transition-all duration-150 ease-out ${
        isDropped
          ? "opacity-40 bg-zinc-950/60"
          : isEditingMessage
            ? "bg-zinc-800/60 ring-1 ring-amber-600/20"
            : "hover:bg-zinc-900/40"
      }`}
    >
      <div
        className={`cursor-grab text-zinc-600 hover:text-zinc-400 active:cursor-grabbing ${
          isDropped ? "pointer-events-none" : ""
        }`}
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <GitCommit className={`h-4 w-4 flex-shrink-0 ${isDropped ? "text-zinc-700" : "text-zinc-500"}`} />

      <select
        value={entry.action}
        onChange={(e) => onActionChange(e.target.value as RebaseAction)}
        className={`rounded border-0 text-xs font-medium px-1.5 py-0.5 cursor-pointer ${ACTION_COLORS[entry.action]}`}
      >
        {(Object.keys(ACTION_LABELS) as RebaseAction[]).map((action) => (
          <option key={action} value={action}>
            {ACTION_LABELS[action]}
          </option>
        ))}
      </select>

      <div className="flex-1 min-w-0">
        <div className={`text-sm break-words ${isDropped ? "line-through text-zinc-600" : "text-zinc-200"}`}>
          {displayMessage}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono text-zinc-600">{entry.shortHash}</span>
          {entry.action !== entry.originalAction && (
            <span className="text-xs text-zinc-700">
              was {ACTION_LABELS[entry.originalAction]}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {entry.action !== "drop" && (
          <button
            onClick={onReword}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-amber-400 transition-colors"
            title="Reword commit message"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onActionChange(entry.action === "drop" ? "pick" : "drop")}
          className={`rounded p-1 transition-colors ${
            entry.action === "drop"
              ? "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              : "text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
          }`}
          title={entry.action === "drop" ? "Restore commit" : "Drop commit"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
