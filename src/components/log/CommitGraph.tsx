import { useMemo } from "react";
import type { CommitInfo } from "../../types/git";
import { getRelativeTime } from "../../utils/time";

interface CommitGraphProps {
  commits: CommitInfo[];
  selectedCommit: string | null;
  onSelectCommit: (hash: string) => void;
}

const CELL_H = 46;
const COL_W = 32;
const PAD_L = 16;
const PAD_R = 12;
const PAD_Y = 16;
const NODE_R = 5;
const BRANCH_PALETTE = [
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#38bdf8",
  "#fb923c",
  "#22d3ee",
];

interface LayoutNode {
  commit: CommitInfo;
  x: number;
  y: number;
  color: string;
  lane: number;
}

interface LayoutResult {
  nodes: LayoutNode[];
  maxLane: number;
}

// Walk newest -> oldest. Each commit consumes any lanes that prior children
// reserved for it (merging them into a single "primary" lane), then reserves
// lanes forward for its own parents. Lanes are reclaimed when no descendant
// still needs them, so the graph width stays bounded by concurrent branches.
function computeLayout(commits: CommitInfo[]): LayoutResult {
  const hashToIndex = new Map<string, number>();
  commits.forEach((c, i) => hashToIndex.set(c.hash, i));

  const inUse: boolean[] = [];
  const reservations = new Map<string, Set<number>>();

  const allocLane = (): number => {
    for (let l = 0; l < inUse.length; l++) {
      if (!inUse[l]) {
        inUse[l] = true;
        return l;
      }
    }
    inUse.push(true);
    return inUse.length - 1;
  };

  const reserve = (hash: string, lane: number) => {
    let set = reservations.get(hash);
    if (!set) {
      set = new Set();
      reservations.set(hash, set);
    }
    set.add(lane);
  };

  const nodes: LayoutNode[] = [];
  let maxLane = 0;

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]!;
    const expected = reservations.get(commit.hash);
    reservations.delete(commit.hash);

    let lane: number;
    if (expected && expected.size > 0) {
      let primary = Infinity;
      for (const l of expected) if (l < primary) primary = l;
      lane = primary;
      for (const l of expected) {
        if (l !== lane) inUse[l] = false;
      }
    } else {
      lane = allocLane();
    }

    if (lane > maxLane) maxLane = lane;
    nodes.push({
      commit,
      x: PAD_L + lane * COL_W,
      y: PAD_Y + i * CELL_H,
      color: BRANCH_PALETTE[lane % BRANCH_PALETTE.length]!,
      lane,
    });

    const inLogParents = commit.parents.filter((p) => hashToIndex.has(p));

    if (inLogParents.length === 0) {
      inUse[lane] = false;
    } else {
      reserve(inLogParents[0]!, lane);
      for (let p = 1; p < inLogParents.length; p++) {
        reserve(inLogParents[p]!, allocLane());
      }
    }
  }

  return { nodes, maxLane };
}

export function CommitGraph({ commits, selectedCommit, onSelectCommit }: CommitGraphProps) {
  const { nodes, maxLane } = useMemo(() => computeLayout(commits), [commits]);

  const svgWidth = Math.max(PAD_L + (maxLane + 1) * COL_W + PAD_R, 120);
  const svgHeight = Math.max(PAD_Y * 2 + commits.length * CELL_H, 100);

  const edges = useMemo(() => {
    const hashToNode = new Map<string, LayoutNode>();
    for (const n of nodes) hashToNode.set(n.commit.hash, n);

    const items: { d: string; color: string; key: string }[] = [];
    for (const node of nodes) {
      for (const parentHash of node.commit.parents) {
        const parent = hashToNode.get(parentHash);
        if (!parent) continue;

        const sx = node.x;
        const sy = node.y + NODE_R;
        const tx = parent.x;
        const ty = parent.y - NODE_R;
        const color = parent.color + "99";
        const key = `${node.commit.hash}->${parent.commit.hash}`;

        if (node.lane === parent.lane) {
          items.push({ d: `M ${sx} ${sy} L ${tx} ${ty}`, color, key });
        } else {
          const midY = (sy + ty) / 2 + CELL_H * 0.25;
          items.push({
            d: `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`,
            color,
            key,
          });
        }
      }
    }
    return items;
  }, [nodes]);

  return (
    <div className="h-full overflow-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="block min-h-full"
        style={{ background: "transparent" }}
      >
        {edges.map((edge) => (
          <path key={edge.key} d={edge.d} fill="none" stroke={edge.color} strokeWidth={1.5} />
        ))}

        {nodes.map((node) => {
          const isSelected = selectedCommit === node.commit.hash;
          return (
            <CommitRow
              key={node.commit.hash}
              node={node}
              isSelected={isSelected}
              labelWidth={Math.max(svgWidth - node.x - 14 - PAD_R, 40)}
              onSelect={onSelectCommit}
            />
          );
        })}
      </svg>
    </div>
  );
}

function CommitRow({
  node,
  isSelected,
  labelWidth,
  onSelect,
}: {
  node: LayoutNode;
  isSelected: boolean;
  labelWidth: number;
  onSelect: (hash: string) => void;
}) {
  const { commit, x, y, color } = node;
  const relative = getRelativeTime(commit.date);

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={isSelected ? NODE_R + 3 : NODE_R}
        fill={isSelected ? "#10b981" : "#18181b"}
        stroke={color}
        strokeWidth={isSelected ? 2.5 : 1.5}
        className="cursor-pointer transition-all duration-150"
        onClick={() => onSelect(commit.hash)}
      />
      <foreignObject x={x + 14} y={y - CELL_H / 2 + NODE_R} width={labelWidth} height={CELL_H}>
        <button
          type="button"
          onClick={() => onSelect(commit.hash)}
          aria-pressed={isSelected}
          className={`flex h-full w-full flex-col justify-center gap-0.5 rounded px-1 text-left text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
            isSelected ? "text-emerald-400" : "text-zinc-300 hover:text-zinc-200"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{commit.message}</span>
            {commit.refs.length > 0 && (
              <span className="shrink-0 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                {commit.refs.join(", ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="font-mono">{commit.shortHash}</span>
            <span className="text-zinc-700">•</span>
            <span className="truncate">{commit.author}</span>
            <span className="text-zinc-700">•</span>
            <span className="shrink-0">{relative}</span>
          </div>
        </button>
      </foreignObject>
    </g>
  );
}
