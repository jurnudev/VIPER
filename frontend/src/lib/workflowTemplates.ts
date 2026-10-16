// src/lib/workflowTemplates.ts
import type { Edge, Node } from 'reactflow';
import type { CustomNodeData } from '../types';

export type WorkflowTemplate = {
  desc?: any;
  name: string;
  descriptor?: { en: string; th: string }; 
  description: string;
  longDescription?: { en: string; th: string }; 

  color: string;

  nodes: Node<CustomNodeData>[];
  edges: Edge[];
};

export const BASIC_INPUT_DEBUG: WorkflowTemplate = {
  name: 'Empty Workflow',
  description: 'EMPTY',
  color: 'emerald',
  nodes: [],
  edges: []
};

export const TEMPLATES: WorkflowTemplate[] = [];
