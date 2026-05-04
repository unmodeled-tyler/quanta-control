import { useState, useEffect } from "react";
import {
  User,
  RefreshCw,
  Eye,
  SplitSquareHorizontal,
  AlignLeft,
  Shield,
  RotateCcw,
  FolderOpen,
} from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useRepoStore } from "../../stores/repoStore";
import * as api from "../../services/api";

export function SettingsView() {
  const { settings, updateSetting, resetSettings } = useSettingsStore();
  const { repoPath } = useRepoStore();
  const [gitConfig, setGitConfig] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (!repoPath) return;
    Promise.all([
      api.getGitConfig(repoPath, "user.name"),
      api.getGitConfig(repoPath, "user.email"),
    ])
      .then(([nameRes, emailRes]) => {
        setGitConfig({
          name: nameRes.value,
          email: emailRes.value,
        });
      })
      .catch(() => {});
  }, [repoPath]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-1">Settings</h2>
          <p className="text-sm text-zinc-500">Configure your Quanta Control preferences</p>
        </div>

        <section>
          <SectionHeader icon={<User className="w-4 h-4" />} title="Git Identity" />
          <div className="space-y-3 mt-3">
            {gitConfig && (
              <div className="px-3 py-2 bg-zinc-900/60 border border-zinc-800/60 rounded-md shadow-sm shadow-black/5">
                <div className="text-xs text-zinc-500 mb-1">Detected from git config</div>
                <div className="text-sm text-zinc-300">
                  {gitConfig.name} &lt;{gitConfig.email}&gt;
                </div>
              </div>
            )}
            <TextInput
              label="Default author name"
              value={settings.userName}
              onChange={(v) => updateSetting("userName", v)}
              placeholder="Uses git config if empty"
            />
            <TextInput
              label="Default author email"
              value={settings.userEmail}
              onChange={(v) => updateSetting("userEmail", v)}
              placeholder="Uses git config if empty"
            />
          </div>
        </section>

        <section>
          <SectionHeader icon={<FolderOpen className="w-4 h-4" />} title="Repository" />
          <div className="space-y-3 mt-3">
            <TextInput
              label="Default repo path"
              value={settings.defaultRepoPath}
              onChange={(v) => updateSetting("defaultRepoPath", v)}
              placeholder="~/my-project"
            />
            <TextInput
              label="Default branch name"
              value={settings.defaultBranch}
              onChange={(v) => updateSetting("defaultBranch", v)}
              placeholder="main"
            />
          </div>
        </section>

        <section>
          <SectionHeader icon={<RefreshCw className="w-4 h-4" />} title="Auto Refresh" />
          <div className="space-y-3 mt-3">
            <Toggle
              label="Auto refresh repo"
              description="Watch the working tree and auto-refresh on file changes"
              checked={settings.autoRefresh}
              onChange={(v) => updateSetting("autoRefresh", v)}
            />
            <Toggle
              label="Prune on fetch"
              description="Remove stale remote-tracking references"
              checked={settings.pruneOnFetch}
              onChange={(v) => updateSetting("pruneOnFetch", v)}
            />
          </div>
        </section>

        <section>
          <SectionHeader icon={<Eye className="w-4 h-4" />} title="Display" />
          <div className="space-y-3 mt-3">
            <Toggle
              label="Show hidden files"
              description="Show dotfiles in the file browser"
              checked={settings.showHiddenFiles}
              onChange={(v) => updateSetting("showHiddenFiles", v)}
            />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-300">Diff view style</div>
                <div className="text-xs text-zinc-600">Default diff display mode</div>
              </div>
              <div className="flex rounded-md border border-zinc-700 overflow-hidden">
                <button
                  onClick={() => updateSetting("diffView", "unified")}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
                    settings.diffView === "unified"
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <AlignLeft className="w-3 h-3" />
                  Unified
                </button>
                <button
                  onClick={() => updateSetting("diffView", "split")}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
                    settings.diffView === "split"
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <SplitSquareHorizontal className="w-3 h-3" />
                  Split
                </button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader icon={<Shield className="w-4 h-4" />} title="Confirmations" />
          <div className="space-y-3 mt-3">
            <Toggle
              label="Confirm before discarding"
              description="Show confirmation dialog when discarding changes"
              checked={settings.confirmDiscard}
              onChange={(v) => updateSetting("confirmDiscard", v)}
            />
            <Toggle
              label="Confirm before pushing"
              description="Show confirmation dialog when pushing to remote"
              checked={settings.confirmPush}
              onChange={(v) => updateSetting("confirmPush", v)}
            />
          </div>
        </section>

        <section className="pt-4 border-t border-zinc-800/60">
          <button
            onClick={() => {
              if (confirm("Reset all settings to defaults?")) {
                resetSettings();
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-150"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
      {icon}
      {title}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-zinc-300">{label}</div>
        {description && <div className="text-xs text-zinc-600">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-emerald-600" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-300 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 bg-zinc-900/60 border border-zinc-700/80 rounded-md text-sm focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20 placeholder-zinc-600 transition-all duration-150"
      />
    </div>
  );
}
