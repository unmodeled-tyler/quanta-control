import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { GitCommit, Upload, X, Check } from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";
import { useSettingsStore } from "../../stores/settingsStore";
import * as api from "../../services/api";

export function CommitPanel({ onCommitted }: { onCommitted: () => void }) {
  const { repoPath, status } = useRepoStore();
  const { settings, updateSetting } = useSettingsStore();
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [pushDialog, setPushDialog] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const pushYesRef = useRef<HTMLButtonElement>(null);
  const hasChanges = (status?.files.length ?? 0) > 0;
  const hasStaged =
    status?.files.some(
      (f) => f.stagedStatus === "staged" || f.stagedStatus === "partially_staged",
    ) ?? false;

  const doPush = async () => {
    if (!repoPath) return;

    setPushing(true);
    try {
      await api.push(repoPath);
      await useRepoStore.getState().refresh();
    } catch (err: unknown) {
      console.error("Push failed:", err);
    } finally {
      setPushing(false);
      setPushDialog(false);
    }
  };

  const finalizeCommitFlow = useCallback(async () => {
    await useRepoStore.getState().refresh();
  }, []);

  const handleDismissPushDialog = useCallback(() => {
    setPushDialog(false);
    void finalizeCommitFlow();
  }, [finalizeCommitFlow]);

  const handleCommit = async () => {
    if (!repoPath || !status || !message.trim() || !hasChanges) return;

    setCommitting(true);
    try {
      if (!hasStaged) {
        await api.stageFiles(repoPath);
      }
      await api.commit(repoPath, message.trim());
      setMessage("");
      onCommitted();

      if (settings.autoPushOnCommit) {
        await doPush();
      } else {
        setDontAskAgain(false);
        setPushDialog(true);
      }
    } catch (err) {
      console.error("Commit failed:", err);
    } finally {
      setCommitting(false);
    }
  };

  const handlePushDialogYes = () => {
    if (dontAskAgain) {
      updateSetting("autoPushOnCommit", true);
    }
    doPush();
  };

  if (!repoPath || !status) return null;

  return (
    <div className="h-full overflow-y-auto border-t border-zinc-800 bg-zinc-950">
      <div className="p-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message..."
          rows={3}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm resize-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-zinc-600"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCommit();
            }
          }}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleCommit}
            disabled={!message.trim() || !hasChanges || committing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 rounded-md text-sm font-medium transition-colors"
          >
            {committing ? (
              <Check className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <GitCommit className="w-3.5 h-3.5" />
            )}
            {hasStaged ? "Commit" : "Commit All"}
          </button>
          <span className="text-xs text-zinc-600">
            {!hasChanges
              ? "No changes to commit"
              : hasStaged
              ? "Enter to commit"
              : "Enter to stage and commit all changes"}
          </span>
        </div>
      </div>

      {pushDialog &&
        createPortal(
          <PushDialog
            pushing={pushing}
            dontAskAgain={dontAskAgain}
            onDontAskChange={setDontAskAgain}
            onPush={handlePushDialogYes}
            onDismiss={handleDismissPushDialog}
            yesRef={pushYesRef}
          />,
          document.body,
        )}
    </div>
  );
}

function PushDialog({
  pushing,
  dontAskAgain,
  onDontAskChange,
  onPush,
  onDismiss,
  yesRef,
}: {
  pushing: boolean;
  dontAskAgain: boolean;
  onDontAskChange: (v: boolean) => void;
  onPush: () => void;
  onDismiss: () => void;
  yesRef: React.RefObject<HTMLButtonElement | null>;
}) {
  useEffect(() => {
    yesRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onPush();
      } else if (e.key === "Escape") {
        onDismiss();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onPush, onDismiss, yesRef]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Upload className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Commit successful</h3>
            <p className="text-xs text-zinc-500">Push to remote?</p>
          </div>
        </div>

        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
          <button
            onClick={() => onDontAskChange(!dontAskAgain)}
            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
              dontAskAgain
                ? "bg-emerald-600 border-emerald-600"
                : "border-zinc-600 hover:border-zinc-400"
            }`}
          >
            {dontAskAgain && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className="text-xs text-zinc-400">Don't ask again, always auto-push</span>
        </label>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            ref={yesRef}
            onClick={onPush}
            disabled={pushing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-md text-sm font-medium transition-colors"
          >
            {pushing ? (
              <span className="animate-pulse">Pushing...</span>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Push
                <kbd className="ml-1 text-[10px] opacity-50">Enter</kbd>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
