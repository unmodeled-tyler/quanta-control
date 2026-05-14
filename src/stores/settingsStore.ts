import { create } from "zustand";

export interface AppSettings {
  defaultRepoPath: string;
  userName: string;
  userEmail: string;
  defaultBranch: string;
  pruneOnFetch: boolean;
  autoRefresh: boolean;
  showHiddenFiles: boolean;
  diffView: "unified" | "split";
  confirmDiscard: boolean;
  confirmPush: boolean;
  autoPushOnCommit: boolean;
  aiCommitMessagesEnabled: boolean;
  aiCommitEndpoint: string;
  aiCommitModel: string;
  aiCommitApiKey: string;
}

const DEFAULTS: AppSettings = {
  defaultRepoPath: "",
  userName: "",
  userEmail: "",
  defaultBranch: "main",
  pruneOnFetch: false,
  autoRefresh: true,
  showHiddenFiles: false,
  diffView: "unified",
  confirmDiscard: true,
  confirmPush: true,
  autoPushOnCommit: false,
  aiCommitMessagesEnabled: false,
  aiCommitEndpoint: "https://api.openai.com/v1",
  aiCommitModel: "gpt-4.1-mini",
  aiCommitApiKey: "",
};

const SETTINGS_KEY = "quanta-settings";
// API key stored separately from general settings so it's easier to audit
// and clear independently. Still plaintext in localStorage — Electron apps
// should prefer safeStorage via IPC when available.
const API_KEY_KEY = "quanta-ai-api-key";

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const base = stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
    const apiKey = localStorage.getItem(API_KEY_KEY);
    if (apiKey) base.aiCommitApiKey = apiKey;
    return base;
  } catch {}
  return { ...DEFAULTS };
}

function saveSettings(settings: AppSettings) {
  const { aiCommitApiKey, ...rest } = settings;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(rest));
  if (aiCommitApiKey) {
    localStorage.setItem(API_KEY_KEY, aiCommitApiKey);
  } else {
    localStorage.removeItem(API_KEY_KEY);
  }
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
