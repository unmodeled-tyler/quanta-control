import { useState, useEffect } from "react";
import { useRepoStore } from "./stores/repoStore";
import { MainLayout } from "./components/layout/MainLayout";
import type { View } from "./components/layout/MainLayout";
import { RepoOpener } from "./components/repo/RepoOpener";
import { StatusView } from "./components/status/StatusView";
import { DiffViewer } from "./components/diff/DiffViewer";
import { CommitPanel } from "./components/commit/CommitPanel";
import { BranchView } from "./components/branches/BranchView";
import { LogView } from "./components/log/LogView";
import { RemoteActions } from "./components/remote/RemoteActions";
import { SettingsView } from "./components/settings/SettingsView";
import { StatsView } from "./components/stats/StatsView";
import { useSettingsStore } from "./stores/settingsStore";
import type { GitFile } from "./types/git";

const STATUS_PANEL_WIDTH_KEY = "quanta-layout-status-width";
const BRANCH_PANEL_WIDTH_KEY = "quanta-layout-branch-width";
const COMMIT_PANEL_HEIGHT_KEY = "quanta-layout-commit-height";

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

type DragState =
  | { kind: "statusWidth"; startPointer: number; startSize: number }
  | { kind: "branchWidth"; startPointer: number; startSize: number }
  | { kind: "commitHeight"; startPointer: number; startSize: number }
  | null;

export default function App() {
  const { repoPath, setRepo } = useRepoStore();
  const { settings } = useSettingsStore();
  const [view, setView] = useState<View>("status");
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null);
  const [statusPanelWidth, setStatusPanelWidth] = useState(() => loadStoredNumber(STATUS_PANEL_WIDTH_KEY, 320));
  const [branchPanelWidth, setBranchPanelWidth] = useState(() => loadStoredNumber(BRANCH_PANEL_WIDTH_KEY, 384));
  const [commitPanelHeight, setCommitPanelHeight] = useState(() => loadStoredNumber(COMMIT_PANEL_HEIGHT_KEY, 180));
  const [dragState, setDragState] = useState<DragState>(null);

  useEffect(() => {
    setSelectedFile(null);
  }, [repoPath]);

  useEffect(() => {
    if (!repoPath || !settings.autoRefresh) return;

    const intervalMs = Math.max(settings.autoRefreshInterval, 5) * 1000;

    const poll = async () => {
      const store = useRepoStore.getState();
      const hasChanged = await store.refreshStatus();
      if (hasChanged) {
        await Promise.all([store.refreshBranches(), store.refreshLog()]);
      }
    };

    const timer = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [repoPath, settings.autoRefresh, settings.autoRefreshInterval]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (dragState.kind === "statusWidth") {
        const nextWidth = clamp(
          dragState.startSize + (event.clientX - dragState.startPointer),
          240,
          640,
        );
        setStatusPanelWidth(nextWidth);
        return;
      }

      if (dragState.kind === "branchWidth") {
        const nextWidth = clamp(
          dragState.startSize + (event.clientX - dragState.startPointer),
          280,
          720,
        );
        setBranchPanelWidth(nextWidth);
        return;
      }

      const nextHeight = clamp(
        dragState.startSize - (event.clientY - dragState.startPointer),
        140,
        420,
      );
      setCommitPanelHeight(nextHeight);
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
      localStorage.setItem(STATUS_PANEL_WIDTH_KEY, String(statusPanelWidth));
    } catch {}
  }, [statusPanelWidth]);

  useEffect(() => {
    try {
      localStorage.setItem(BRANCH_PANEL_WIDTH_KEY, String(branchPanelWidth));
    } catch {}
  }, [branchPanelWidth]);

  useEffect(() => {
    try {
      localStorage.setItem(COMMIT_PANEL_HEIGHT_KEY, String(commitPanelHeight));
    } catch {}
  }, [commitPanelHeight]);

  if (!repoPath) {
    return <RepoOpener onSelect={setRepo} />;
  }

  return (
    <MainLayout currentView={view} onViewChange={setView}>
      <div className="h-full flex flex-col">
        <header className="h-10 border-b border-zinc-800 flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRepo("")}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Change Repo
            </button>
          </div>
          <RemoteActions />
        </header>

        <div className="flex-1 flex overflow-hidden">
          {view === "status" && (
            <>
              <div
                className="flex-shrink-0 overflow-y-auto border-r border-zinc-800"
                style={{ width: statusPanelWidth }}
              >
                <StatusView
                  onSelectFile={(file) => {
                    setSelectedFile(file);
                    setView("diff");
                  }}
                  selectedFile={selectedFile}
                />
              </div>
              <ResizeHandle
                orientation="vertical"
                onPointerDown={(event) =>
                  setDragState({
                    kind: "statusWidth",
                    startPointer: event.clientX,
                    startSize: statusPanelWidth,
                  })
                }
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="min-h-0 flex-1">
                  <DiffViewer
                    repoPath={repoPath}
                    filePath={selectedFile?.path ?? null}
                  />
                </div>
                <ResizeHandle
                  orientation="horizontal"
                  onPointerDown={(event) =>
                    setDragState({
                      kind: "commitHeight",
                      startPointer: event.clientY,
                      startSize: commitPanelHeight,
                    })
                  }
                />
                <div
                  className="flex-shrink-0 overflow-y-auto"
                  style={{ height: commitPanelHeight }}
                >
                  <CommitPanel onCommitted={() => setSelectedFile(null)} />
                </div>
              </div>
            </>
          )}

          {view === "diff" && (
            <div className="flex-1">
              <DiffViewer
                repoPath={repoPath}
                filePath={selectedFile?.path ?? null}
              />
            </div>
          )}

          {view === "branches" && (
            <>
              <div
                className="flex-shrink-0"
                style={{ width: branchPanelWidth }}
              >
                <BranchView />
              </div>
              <ResizeHandle
                orientation="vertical"
                onPointerDown={(event) =>
                  setDragState({
                    kind: "branchWidth",
                    startPointer: event.clientX,
                    startSize: branchPanelWidth,
                  })
                }
              />
              <div className="flex flex-1 items-center justify-center bg-zinc-950/40">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 text-center">
                  <div className="text-sm font-medium text-zinc-300">Branch Workspace</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Drag the divider to give the branch panel more or less space.
                  </div>
                </div>
              </div>
            </>
          )}

          {view === "log" && (
            <div className="flex-1">
              <LogView />
            </div>
          )}

          {view === "stats" && (
            <div className="flex-1">
              <StatsView onOpenSettings={() => setView("settings")} />
            </div>
          )}

          {view === "settings" && (
            <div className="flex-1">
              <SettingsView />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function ResizeHandle({
  orientation,
  onPointerDown,
}: {
  orientation: "vertical" | "horizontal";
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={`group relative flex-shrink-0 select-none ${
        orientation === "vertical"
          ? "h-full w-1.5 cursor-col-resize"
          : "h-1.5 w-full cursor-row-resize"
      }`}
      role="separator"
      aria-orientation={orientation}
    >
      <div
        className={`absolute inset-0 transition-colors group-hover:bg-emerald-500/20 ${
          orientation === "vertical" ? "border-x border-zinc-800" : "border-y border-zinc-800"
        }`}
      />
    </div>
  );
}
