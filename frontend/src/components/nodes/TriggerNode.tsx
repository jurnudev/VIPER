// src/components/nodes/TriggerNode.tsx
import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Play, Square } from 'lucide-react';
import NodeWrapper, { inputHandleClass, outputHandleClass } from './NodeWrapper';
import type { CustomNodeData } from '../../types';

const TriggerNode = ({ id, data, selected }: NodeProps<CustomNodeData>) => {
  const busy = data.status === 'start' || data.status === 'running';
  const looping = !!data.payload?.looping;

  return (
    <>
      <Handle type="target" position={Position.Left} className={inputHandleClass} />

      <NodeWrapper id={id} title="Trigger" status={data.status} selected={selected} className="min-w-[130px]">
        <button
          type="button"
          disabled={busy}
          onClick={() => data.onRunNode?.(id)}
          className={`nodrag w-full flex items-center justify-center gap-1 rounded-md border px-3 py-1.5 text-[12px] font-bold shadow-inner active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed transition ${
            looping
              ? 'border-red-800/60 bg-red-300 text-slate-900 hover:bg-red-200'
              : 'border-amber-700/60 bg-amber-200 text-slate-900 hover:bg-amber-100'
          }`}
          title={looping ? 'Stop the loop' : 'Run every node connected after this trigger'}
        >
          {looping ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
          {looping ? 'Stop' : 'Start'}
        </button>
      </NodeWrapper>

      <Handle type="source" position={Position.Right} className={outputHandleClass} />
    </>
  );
};

export default memo(TriggerNode);
