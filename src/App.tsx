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
import type { GitFile } from "./types/git";

export default function App() {
  const { repoPath, setRepo } = useRepoStore();
  const [view, setView] = useState<View>("status");
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null);

  useEffect(() => {
    setSelectedFile(null);
  }, [repoPath]);

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
              <div className="w-80 flex-shrink-0 border-r border-zinc-800 overflow-y-auto">
                <StatusView
                  onSelectFile={(file) => {
                    setSelectedFile(file);
                    setView("diff");
                  }}
                  selectedFile={selectedFile}
                />
              </div>
              <div className="flex-1 flex flex-col">
                <DiffViewer
                  repoPath={repoPath}
                  filePath={selectedFile?.path ?? null}
                />
                <CommitPanel onCommitted={() => setSelectedFile(null)} />
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
            <div className="w-96 flex-shrink-0">
              <BranchView />
            </div>
          )}

          {view === "log" && (
            <div className="flex-1">
              <LogView />
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
