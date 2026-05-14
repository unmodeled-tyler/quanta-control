declare module "d3-force-3d" {
  export function forceSimulation<NodeDatum = any>(
    nodes?: NodeDatum[],
    numDimensions?: number
  ): Simulation<NodeDatum>;

  export interface Simulation<NodeDatum = any> {
    restart(): Simulation<NodeDatum>;
    stop(): Simulation<NodeDatum>;
    tick(iterations?: number): Simulation<NodeDatum>;
    nodes(): NodeDatum[];
    nodes(nodes: NodeDatum[]): Simulation<NodeDatum>;
    alpha(): number;
    alpha(alpha: number): Simulation<NodeDatum>;
    alphaMin(): number;
    alphaMin(min: number): Simulation<NodeDatum>;
    alphaDecay(): number;
    alphaDecay(decay: number): Simulation<NodeDatum>;
    alphaTarget(): number;
    alphaTarget(target: number): Simulation<NodeDatum>;
    velocityDecay(): number;
    velocityDecay(decay: number): Simulation<NodeDatum>;
    force(name: string): Force<NodeDatum> | undefined;
    force(name: string, force: Force<NodeDatum>): Simulation<NodeDatum>;
    find(x: number, y: number, z?: number, radius?: number): NodeDatum | undefined;
    on(type: string): ((event: any) => void) | undefined;
    on(type: string, listener: ((event: any) => void) | null): Simulation<NodeDatum>;
    numDimensions(): number;
    numDimensions(d: number): Simulation<NodeDatum>;
  }

  export interface Force<NodeDatum = any> {
    (alpha: number): void;
    initialize?(nodes: NodeDatum[], random?: () => number): void;
  }

  export function forceManyBody<NodeDatum = any>(): ForceManyBody<NodeDatum>;
  export interface ForceManyBody<NodeDatum = any> extends Force<NodeDatum> {
    strength(): (d: NodeDatum, i: number, nodes: NodeDatum[]) => number;
    strength(strength: number | ((d: NodeDatum, i: number, nodes: NodeDatum[]) => number)): ForceManyBody<NodeDatum>;
    theta(): number;
    theta(theta: number): ForceManyBody<NodeDatum>;
    distanceMin(): number;
    distanceMin(min: number): ForceManyBody<NodeDatum>;
    distanceMax(): number;
    distanceMax(max: number): ForceManyBody<NodeDatum>;
  }

  export function forceLink<NodeDatum = any>(links?: Link<NodeDatum>[]): ForceLink<NodeDatum>;
  export interface Link<NodeDatum = any> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
    index?: number;
  }
  export interface ForceLink<NodeDatum = any> extends Force<NodeDatum> {
    links(): Link<NodeDatum>[];
    links(links: Link<NodeDatum>[]): ForceLink<NodeDatum>;
    id(): (d: NodeDatum, i: number, nodes: NodeDatum[]) => string | number;
    id(id: (d: NodeDatum, i: number, nodes: NodeDatum[]) => string | number): ForceLink<NodeDatum>;
    distance(): (d: Link<NodeDatum>, i: number, links: Link<NodeDatum>[]) => number;
    distance(distance: number | ((d: Link<NodeDatum>, i: number, links: Link<NodeDatum>[]) => number)): ForceLink<NodeDatum>;
    strength(): (d: Link<NodeDatum>, i: number, links: Link<NodeDatum>[]) => number;
    strength(strength: number | ((d: Link<NodeDatum>, i: number, links: Link<NodeDatum>[]) => number)): ForceLink<NodeDatum>;
  }

  export function forceCenter<NodeDatum = any>(x?: number, y?: number, z?: number): ForceCenter<NodeDatum>;
  export interface ForceCenter<NodeDatum = any> extends Force<NodeDatum> {
    x(): number;
    x(x: number): ForceCenter<NodeDatum>;
    y(): number;
    y(y: number): ForceCenter<NodeDatum>;
    z(): number;
    z(z: number): ForceCenter<NodeDatum>;
    strength(): number;
    strength(strength: number): ForceCenter<NodeDatum>;
  }

  export function forceCollide<NodeDatum = any>(radius?: number | ((d: NodeDatum) => number)): ForceCollide<NodeDatum>;
  export interface ForceCollide<NodeDatum = any> extends Force<NodeDatum> {
    radius(): (d: NodeDatum) => number;
    radius(radius: number | ((d: NodeDatum) => number)): ForceCollide<NodeDatum>;
    strength(): number;
    strength(strength: number): ForceCollide<NodeDatum>;
    iterations(): number;
    iterations(iterations: number): ForceCollide<NodeDatum>;
  }
}
