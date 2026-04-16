import { type ReactNode } from "react";
import {
  GitBranch,
  FileText,
  GitCommit,
  History,
  RefreshCw,
  Settings,
  FolderOpen,
} from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";

export type View = "status" | "diff" | "branches" | "log" | "settings";

const NAV_ITEMS: Array<{ id: Exclude<View, "settings">; icon: typeof GitBranch; label: string }> = [
  { id: "status", icon: FileText, label: "Changes" },
  { id: "diff", icon: GitCommit, label: "Diff" },
  { id: "branches", icon: GitBranch, label: "Branches" },
  { id: "log", icon: History, label: "History" },
];

export function MainLayout({
  children,
  currentView,
  onViewChange,
}: {
  children: ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
}) {
  const { repoPath, status, loading, refresh } = useRepoStore();

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <nav className="w-48 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span>Quanta Control</span>
          </div>
        </div>

        {repoPath && (
          <div className="p-3 border-b border-zinc-800">
            <button
              onClick={refresh}
              disabled={loading}
              className="w-full flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span className="truncate">{status?.branch || "..."}</span>
            </button>
          </div>
        )}

        <div className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                currentView === id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-2 border-t border-zinc-800">
          <button
            onClick={() => onViewChange("settings")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              currentView === "settings"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
