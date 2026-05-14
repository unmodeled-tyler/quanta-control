import type { GraphNode, GraphEdge } from "../../types/graph";

interface GraphSidebarProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onNavigate?: (path: string) => void;
  chargeStrength: number;
  onChargeStrengthChange: (v: number) => void;
  linkDistance: number;
  onLinkDistanceChange: (v: number) => void;
  iterations: number;
  onIterationsChange: (v: number) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-zinc-500">
        <span>{label}</span>
        <span className="font-mono text-zinc-400">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded bg-zinc-800 accent-emerald-500"
      />
    </div>
  );
}

export function GraphSidebar({
  node,
  edges,
  nodes,
  onNavigate,
  chargeStrength,
  onChargeStrengthChange,
  linkDistance,
  onLinkDistanceChange,
  iterations,
  onIterationsChange,
}: GraphSidebarProps) {
  if (!node) {
    return (
      <div className="h-full w-72 border-l border-zinc-800 bg-zinc-950/80 p-4 overflow-y-auto">
        <div className="text-sm font-medium text-zinc-400">Graph Inspector</div>
        <div className="mt-2 text-xs text-zinc-600">
          Hover or click a node to inspect its details.
        </div>

        <div className="mt-5 space-y-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-700">Physics</div>
          <Slider label="Charge" value={chargeStrength} min={-200} max={-10} step={5} onChange={onChargeStrengthChange} />
          <Slider label="Link Distance" value={linkDistance} min={1} max={20} step={0.5} onChange={onLinkDistanceChange} />
          <Slider label="Iterations" value={iterations} min={50} max={800} step={50} onChange={onIterationsChange} />
        </div>

        <div className="mt-5 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-700">Legend</div>
          <div className="space-y-1 text-[11px]">
            {[
              { label: "routes", color: "#3b82f6" },
              { label: "components", color: "#8b5cf6" },
              { label: "services", color: "#10b981" },
              { label: "stores", color: "#f59e0b" },
              { label: "server", color: "#ec4899" },
              { label: "utils", color: "#22d3ee" },
              { label: "hooks", color: "#fb923c" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                <span className="text-zinc-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const incoming = edges.filter((e) => e.target === node.id);
  const outgoing = edges.filter((e) => e.source === node.id);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="h-full w-72 border-l border-zinc-800 bg-zinc-950/80 p-4 overflow-y-auto">
      <div className="text-sm font-medium text-zinc-200">{node.name}</div>
      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: node.color || "#a1a1aa" }}
        />
        {node.type}
        {node.group && <span className="text-zinc-700">• {node.group}</span>}
      </div>

      {node.filePath && onNavigate && (
        <button
          onClick={() => onNavigate(node.filePath!)}
          className="mt-3 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-left text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
        >
          Open in Explorer →
        </button>
      )}

      {node.description && (
        <div className="mt-3 text-[11px] leading-relaxed text-zinc-500">{node.description}</div>
      )}

      <div className="mt-5 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-700">Physics</div>
        <Slider label="Charge" value={chargeStrength} min={-200} max={-10} step={5} onChange={onChargeStrengthChange} />
        <Slider label="Link Distance" value={linkDistance} min={1} max={20} step={0.5} onChange={onLinkDistanceChange} />
        <Slider label="Iterations" value={iterations} min={50} max={800} step={50} onChange={onIterationsChange} />
      </div>

      {outgoing.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-700 mb-1.5">
            Depends on ({outgoing.length})
          </div>
          <div className="space-y-1">
            {outgoing.map((e) => {
              const target = nodeMap.get(e.target);
              return (
                <div key={e.id} className="rounded bg-zinc-900/40 px-2 py-1 text-[11px] text-zinc-400">
                  {target?.name || e.target}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-700 mb-1.5">
            Used by ({incoming.length})
          </div>
          <div className="space-y-1">
            {incoming.map((e) => {
              const source = nodeMap.get(e.source);
              return (
                <div key={e.id} className="rounded bg-zinc-900/40 px-2 py-1 text-[11px] text-zinc-400">
                  {source?.name || e.source}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
