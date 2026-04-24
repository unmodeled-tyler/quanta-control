export interface ElectronAPI {
  setRecentRepos: (repos: Array<{ name: string; path: string }>) => void;
  setCurrentRepo: (repoPath: string | null) => void;
  notify: (title: string, body?: string) => void;
  onOpenRepo: (callback: (path: string) => void) => () => void;
  onPullRepo: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
