import { create } from "zustand";

export interface AppSettings {
  defaultRepoPath: string;
  userName: string;
  userEmail: string;
  defaultBranch: string;
  pruneOnFetch: boolean;
  autoRefresh: boolean;
  autoRefreshInterval: number;
  showHiddenFiles: boolean;
  diffView: "unified" | "split";
  confirmDiscard: boolean;
  confirmPush: boolean;
  autoPushOnCommit: boolean;
}

const DEFAULTS: AppSettings = {
  defaultRepoPath: "",
  userName: "",
  userEmail: "",
  defaultBranch: "main",
  pruneOnFetch: false,
  autoRefresh: false,
  autoRefreshInterval: 30,
  showHiddenFiles: false,
  diffView: "unified",
  confirmDiscard: true,
  confirmPush: true,
  autoPushOnCommit: false,
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem("quanta-settings");
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULTS };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem("quanta-settings", JSON.stringify(settings));
}

interface SettingsStore {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: loadSettings(),

  updateSetting: (key, value) =>
    set((state) => {
      const next = { ...state.settings, [key]: value };
      saveSettings(next);
      return { settings: next };
    }),

  resetSettings: () =>
    set(() => {
      saveSettings({ ...DEFAULTS });
      return { settings: { ...DEFAULTS } };
    }),
}));
