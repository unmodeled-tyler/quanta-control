let currentSource: EventSource | null = null;
let currentRepo: string | null = null;
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

export function connectRepoEvents(repo: string, refresh: () => void) {
  if (repo === currentRepo && currentSource) return;

  disconnectRepoEvents();
  currentRepo = repo;

  const source = new EventSource(
    `/api/git/events?repo=${encodeURIComponent(repo)}`,
  );
  currentSource = source;

  source.onmessage = () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      refresh();
    }, 150);
  };

  source.onerror = () => {};

  source.onopen = () => {};
}

export function disconnectRepoEvents() {
  if (currentSource) {
    currentSource.close();
    currentSource = null;
  }
  currentRepo = null;
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
}
