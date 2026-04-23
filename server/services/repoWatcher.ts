import chokidar from "chokidar";

interface WatcherClient {
  id: number;
  write(data: string): void;
}

class RepoWatcherInstance {
  private clients = new Map<number, WatcherClient>();
  private nextClientId = 1;
  private watcher: ReturnType<typeof chokidar.watch>;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private repoPath: string) {
    this.watcher = chokidar.watch(repoPath, {
      ignored: [
        "**/.git/**",
        "**/node_modules/**",
        "**/.venv/**",
        "**/build/**",
        "**/dist/**",
        "**/.idea/**",
        "**/.vscode/**",
        "**/*.log",
        "**/.DS_Store",
        "**/coverage/**",
        "**/.next/**",
        "**/out/**",
        "**/.nuxt/**",
        "**/.cache/**",
      ],
      ignoreInitial: true,
      persistent: true,
      depth: 20,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 100 },
    });

    this.watcher
      .on("add", () => this.onChange())
      .on("change", () => this.onChange())
      .on("unlink", () => this.onChange())
      .on("addDir", () => this.onChange())
      .on("unlinkDir", () => this.onChange());
  }

  private onChange() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.broadcast("data: refresh\n\n");
    }, 350);
  }

  private broadcast(data: string) {
    for (const client of this.clients.values()) {
      client.write(data);
    }
  }

  add(writeFn: (data: string) => void): () => void {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    const id = this.nextClientId++;
    this.clients.set(id, { id, write: writeFn });
    return () => {
      this.clients.delete(id);
      if (this.clients.size === 0) {
        this.stopTimer = setTimeout(() => {
          this.stop();
          WATCHER_MAP.delete(this.repoPath);
        }, 30000);
      }
    };
  }

  stop() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.watcher.close().catch(() => {});
  }
}

const WATCHER_MAP = new Map<string, RepoWatcherInstance>();

export function getRepoWatcher(repoPath: string): RepoWatcherInstance {
  let watcher = WATCHER_MAP.get(repoPath);
  if (!watcher) {
    watcher = new RepoWatcherInstance(repoPath);
    WATCHER_MAP.set(repoPath, watcher);
  }
  return watcher;
}
