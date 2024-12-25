import type { Edge, EdgeTypes } from '@xyflow/react';

export interface edgeBasic {
  id: string;
  /** Type of an edge defined in edgeTypes */
  source: string;
  /** Id of target node */
  target: string;
  /** Id of source handle */
  sourceHandle: string;
  /** Id of target handle */
  targetHandle: string;
}

export const initialEdges: Edge[] = [];

export const edgeTypes = {
  // Add your custom edge types here!
} satisfies EdgeTypes;
