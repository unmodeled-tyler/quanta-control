let currentSource: EventSource | null = null;
let currentRepo: string | null = null;
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

function closeCurrent() {
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

export async function connectRepoEvents(repo: string, refresh: () => void) {
  if (repo === currentRepo && currentSource) return;

  closeCurrent();
  currentRepo = repo;

  // Fetch auth token for SSE (EventSource doesn't support custom headers,
  // so we pass the token as a query parameter for this endpoint only)
  let tokenParam = "";
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.token) tokenParam = `&token=${encodeURIComponent(data.token)}`;
  } catch {}

  const source = new EventSource(
    `/api/git/events?repo=${encodeURIComponent(repo)}${tokenParam}`,
  );
  currentSource = source;

  source.onmessage = () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      refresh();
    }, 150);
  };

  source.onerror = () => {
    closeCurrent();
  };

  source.onopen = () => {};
}

export function disconnectRepoEvents() {
  closeCurrent();
}
