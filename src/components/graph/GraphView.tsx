import { useState, useEffect, useMemo, useCallback } from "react";
import { useRepoStore } from "../../stores/repoStore";
import { getDependencyGraph } from "../../services/api";
import type { GraphNode, GraphData } from "../../types/graph";
import { useGraphLayout } from "./useGraphLayout";
import { GraphCanvas } from "./GraphCanvas";
import { GraphSidebar } from "./GraphSidebar";
import { Network, Search, X } from "lucide-react";

const GROUP_COLORS: Record<string, string> = {
  routes: "#3b82f6",
  components: "#8b5cf6",
  services: "#10b981",
  stores: "#f59e0b",
  server: "#ec4899",
  utils: "#22d3ee",
  hooks: "#fb923c",
  src: "#60a5fa",
  default: "#a1a1aa",
};

function colorizeNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.map((n) => {
    const group = n.group || "default";
    const firstSegment = group.split("/")[0] ?? "default";
    const color = GROUP_COLORS[group] || GROUP_COLORS[firstSegment] || GROUP_COLORS.default;
    return { ...n, color };
  });
}

export function GraphView({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [], groups: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [chargeStrength, setChargeStrength] = useState(-50);
  const [linkDistance, setLinkDistance] = useState(4);
  const [iterations, setIterations] = useState(200);

  useEffect(() => {
    if (!repoPath) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDependencyGraph(repoPath)
      .then((res) => {
        if (cancelled) return;
        setData({
          nodes: colorizeNodes(res.nodes),
          edges: res.edges,
          groups: res.groups,
        });
        setSelectedId(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load graph");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoPath]);

  const filteredNodes = useMemo(() => {
    if (!query.trim()) return data.nodes;
    const q = query.toLowerCase();
    return data.nodes.filter((n) => n.name.toLowerCase().includes(q) || (n.group ?? "").toLowerCase().includes(q));
  }, [data.nodes, query]);

  const filteredEdges = useMemo(() => {
    if (!query.trim()) return data.edges;
    const visible = new Set(filteredNodes.map((n) => n.id));
    return data.edges.filter((e) => visible.has(e.source) && visible.has(e.target));
  }, [data.edges, filteredNodes, query]);

  const layoutNodes = useGraphLayout(filteredNodes, filteredEdges, {
    iterations,
    chargeStrength,
    linkDistance,
  });

  const selectedNode = useMemo(
    () => data.nodes.find((n) => n.id === selectedId) || null,
    [data.nodes, selectedId]
  );

  const graphStats = useMemo(() => {
    const groups = new Set(filteredNodes.map((n) => n.group).filter(Boolean));
    return {
      nodes: filteredNodes.length,
      edges: filteredEdges.length,
      groups: groups.size,
    };
  }, [filteredEdges.length, filteredNodes]);

  const handleNavigate = useCallback(
    (path: string) => {
      if (onNavigate) onNavigate(path);
    },
    [onNavigate]
  );

  if (!repoPath) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-zinc-500">Open a repository to view the graph.</div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-100">
      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-zinc-950/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-zinc-950/70 to-transparent" />
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-md border border-cyan-400/20 bg-zinc-950/85 px-4 py-3 shadow-2xl shadow-cyan-950/40">
              <div className="h-3 w-3 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
              <div className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Mapping neural graph</div>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
            <div className="max-w-md rounded-md border border-red-500/30 bg-zinc-950/90 p-4 text-center shadow-2xl shadow-red-950/30">
              <div className="text-sm font-medium text-red-400">Graph error</div>
              <div className="mt-1 text-xs text-zinc-500">{error}</div>
            </div>
          </div>
        )}
        <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-cyan-400/20 bg-zinc-950/80 px-3 py-2 shadow-xl shadow-cyan-950/20 backdrop-blur">
            <Network className="h-4 w-4 text-cyan-300" />
            <div className="hidden text-[10px] uppercase tracking-[0.2em] text-cyan-100/60 sm:block">Neural Graph</div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-zinc-800/80 bg-zinc-950/80 px-2 py-1.5 shadow-xl shadow-black/30 backdrop-blur">
            <Search className="h-3.5 w-3.5 text-cyan-300/70" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nodes…"
              className="w-48 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-zinc-500 transition-colors hover:text-zinc-300" aria-label="Clear graph search">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-md border border-zinc-800/70 bg-zinc-950/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 shadow-xl shadow-black/20 backdrop-blur">
            <span><span className="text-zinc-300">{graphStats.nodes}</span> nodes</span>
            <span className="text-zinc-800">/</span>
            <span><span className="text-zinc-300">{graphStats.edges}</span> links</span>
            <span className="text-zinc-800">/</span>
            <span><span className="text-zinc-300">{graphStats.groups}</span> groups</span>
          </div>
        </div>
        {!loading && !error && filteredNodes.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="rounded-md border border-zinc-800 bg-zinc-950/85 px-4 py-3 text-center shadow-xl shadow-black/30">
              <div className="text-sm text-zinc-300">No matching nodes</div>
              <button onClick={() => setQuery("")} className="mt-2 text-xs text-cyan-300 hover:text-cyan-200">
                Clear search
              </button>
            </div>
          </div>
        )}
        <GraphCanvas
          nodes={layoutNodes}
          edges={filteredEdges}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onOpenFile={handleNavigate}
        />
      </div>
      <GraphSidebar
        node={selectedNode}
        edges={data.edges}
        nodes={data.nodes}
        onNavigate={handleNavigate}
        chargeStrength={chargeStrength}
        onChargeStrengthChange={setChargeStrength}
        linkDistance={linkDistance}
        onLinkDistanceChange={setLinkDistance}
        iterations={iterations}
        onIterationsChange={setIterations}
      />
    </div>
  );
}
