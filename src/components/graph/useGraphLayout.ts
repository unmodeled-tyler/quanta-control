import { useMemo } from "react";
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from "d3-force-3d";
import type { GraphNode, GraphEdge } from "../../types/graph";

export interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
}

function seededCoordinate(id: string, axis: number) {
  let hash = 2166136261 + axis * 1013904223;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 4294967295 - 0.5) * 12;
}

export function useGraphLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options?: {
    iterations?: number;
    chargeStrength?: number;
    linkDistance?: number;
    centerStrength?: number;
  }
): LayoutNode[] {
  return useMemo(() => {
    if (nodes.length === 0) return [];

    const simulationNodes: LayoutNode[] = nodes.map((n) => ({
      ...n,
      x: n.position?.[0] ?? seededCoordinate(n.id, 0),
      y: n.position?.[1] ?? seededCoordinate(n.id, 1),
      z: n.position?.[2] ?? seededCoordinate(n.id, 2),
      vx: 0,
      vy: 0,
      vz: 0,
      radius: Math.min(1.6, Math.max(0.35, (n.importance ?? 1) * 0.45 + 0.28)),
    }));

    const nodeMap = new Map(simulationNodes.map((n) => [n.id, n]));

    const simulationLinks = edges
      .map((e) => {
        const source = nodeMap.get(e.source);
        const target = nodeMap.get(e.target);
        if (!source || !target) return null;
        return { source, target, weight: e.weight ?? 1 };
      })
      .filter(Boolean) as Array<{ source: LayoutNode; target: LayoutNode; weight: number }>;

    const density = Math.min(1, 140 / Math.max(nodes.length, 1));
    const sim = forceSimulation(simulationNodes, 3)
      .force("charge", forceManyBody().strength(options?.chargeStrength ?? -30))
      .force(
        "link",
        forceLink(simulationLinks)
          .id((d: unknown) => (d as LayoutNode).id)
          .distance(options?.linkDistance ?? 5)
          .strength((d: unknown) => Math.min(0.9, Math.max(0.08, (d as { weight: number }).weight * density)))
      )
      .force("center", forceCenter(0, 0, 0).strength(options?.centerStrength ?? 0.05))
      .force("collide", forceCollide().radius((d: unknown) => (d as LayoutNode).radius + 0.2).strength(0.5))
      .stop();

    const iterations = options?.iterations ?? 300;
    for (let i = 0; i < iterations; i++) {
      sim.tick();
    }

    return simulationNodes;
  }, [nodes, edges, options?.chargeStrength, options?.linkDistance, options?.centerStrength, options?.iterations]);
}
