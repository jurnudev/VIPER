// src/lib/flowConfig.ts
import { type NodeTypes, type EdgeTypes, type DefaultEdgeOptions } from 'reactflow';
import TriggerNode from '../components/nodes/TriggerNode';
import CameraNode from '../components/nodes/CameraNode';
import DisplayNode from '../components/nodes/DisplayNode';
import SmoothEdge from '../components/edges/SmoothEdge';

export const nodeTypes: NodeTypes = {
  'trigger': TriggerNode,
  'camera-input': CameraNode,
  'display': DisplayNode,
};

// Overriding 'default' makes every wire (including ones loaded from saved workflows) use SmoothEdge.
export const edgeTypes: EdgeTypes = {
  default: SmoothEdge,
};

export const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'default',
  animated: false,
  style: { strokeWidth: 3, stroke: '#6a9fe8', strokeLinecap: 'round' },
};
