export interface VariableState {
  name: string;
  value: unknown;
  type: string;
  changed: boolean;
}

export interface ArrayState {
  name: string;
  values: number[];
  labels?: string[]; // display labels for non-numeric values
  highlights: number[]; // indices being compared
  swapped: number[]; // indices just swapped
  sorted: number[]; // indices confirmed sorted
  cols?: number; // column count for 2D matrix visualization
}

export interface ObjectState {
  name: string;
  entries: { key: string; value: unknown; changed: boolean }[];
}

export interface LLNodeState {
  id: number; // index in nodes array (stable identity by creation order)
  val: number;
  next: number; // index of next node in nodes[], or -1 for null
  highlighted: boolean;
}

export interface LinkedListState {
  nodes: LLNodeState[];
  pointers: { name: string; nodeId: number }[]; // variable name → node index
}

export interface Snapshot {
  step: number;
  line: number;
  variables: VariableState[];
  arrays: ArrayState[];
  objects: ObjectState[];
  callStack: string[];
  logs: string[];
  comparisons: number;
  swaps: number;
  description: string;
  edges?: [number, number][]; // graph edges for visualization
  linkedList?: LinkedListState; // linked list node chain for visualization
}

export interface AlgorithmInfo {
  name: string;
  category: string;
  timeComplexity: { best: string; average: string; worst: string };
  spaceComplexity: string;
  description: string;
}
