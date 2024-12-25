import type { NodeTypes } from '@xyflow/react';

import { AgentNode } from './agentNode';
import { InputNode } from './inputNode';
import { OutputNode } from './outputNode';


import { AppNode } from './types';

export const initialNodes: AppNode[] = [];

export const nodeTypes = {
  'agent': AgentNode,
  'inputnode': InputNode,
  'outputnode': OutputNode,
  // Add any of your custom nodes here!
} satisfies NodeTypes;
