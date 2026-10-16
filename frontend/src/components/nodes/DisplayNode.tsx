// src/components/nodes/DisplayNode.tsx
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, NodeResizer, Position, useStore, type NodeProps } from 'reactflow';
import { Maximize2, X } from 'lucide-react';
import { inputHandleClass } from './NodeWrapper';
import LiveVideo from './LiveVideo';
import { getNodeImageUrl } from '../../lib/runners/utils';
import type { CustomNodeData } from '../../types';

type Tab = 'data' | 'image' | 'meta';

const DOT: Record<string, string> = {
  idle: 'bg-emerald-500',
  start: 'bg-yellow-400',
  running: 'bg-yellow-400 animate-ping',
  success: 'bg-emerald-500',
  fault: 'bg-red-500',
};

// Shorten long strings (data URLs, base64) so the Data tab stays readable.
function compact(v: any): any {
  if (typeof v === 'string') return v.length > 120 ? `${v.slice(0, 60)}… (${v.length} chars)` : v;
  if (Array.isArray(v)) return v.slice(0, 50).map(compact);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => typeof x !== 'function')
        .map(([k, x]) => [k, compact(x)])
    );
  }
  return v;
}

const DisplayNode = ({ id, data, selected }: NodeProps<CustomNodeData>) => {
  // Subscribe only to the connected upstream node (not every node), so dragging or updating
  // unrelated nodes does not re-render this heavy node.
  const upstreamId = useStore(useCallback((s) => s.edges.find((e) => e.target === id)?.source, [id]));
  const upstreamType = useStore(
    useCallback((s) => (upstreamId ? s.nodeInternals.get(upstreamId)?.type : undefined), [upstreamId])
  );
  const upstreamData = useStore(
    useCallback(
      (s) => (upstreamId ? (s.nodeInternals.get(upstreamId)?.data as CustomNodeData | undefined) : undefined),
      [upstreamId]
    )
  );
  const [tab, setTab] = useState<Tab>('data');
  const [full, setFull] = useState(false);
  const [size, setSize] = useState<string | null>(null);

  const upstream = useMemo(
    () => (upstreamId && upstreamType ? ({ id: upstreamId, type: upstreamType, data: upstreamData } as any) : undefined),
    [upstreamId, upstreamType, upstreamData]
  );

  const imageUrl = getNodeImageUrl(upstream);
  const payload = upstream?.data?.payload;
  // Camera in a running loop: show the raw stream for smooth playback.
  const isLive = upstream?.type === 'camera-input' && !!payload?.live && payload?.enabled !== false;
  useEffect(() => {
    if (isLive) setTab('image');
  }, [isLive]);

  const hasPayload = !!payload && Object.keys(payload).length > 0;

  const dataText = hasPayload ? JSON.stringify(compact(payload), null, 2) : '';
  const meta = upstream
    ? {
        source: upstream.data?.label ?? upstream.type,
        type: upstream.type,
        status: upstream.data?.status ?? 'idle',
        description: upstream.data?.description,
        image_size: size ?? undefined,
        params: upstream.data?.payload?.params,
      }
    : null;

  const line1 = upstream ? `${upstream.data?.label ?? upstream.type} (${upstream.type})` : '-';
  const line2 = size ?? '-';

  const tabs: Tab[] = ['data', 'image', 'meta'];

  const body = (
    <div className="flex flex-col w-full h-full min-h-0">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#3d4556] rounded-t-lg">
        <span className="text-[15px] font-semibold text-slate-100">Display</span>
        <span className={`w-2.5 h-2.5 rounded-full ${DOT[data.status || 'idle'] ?? DOT.idle}`} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-1.5 py-1 bg-[#363a43]">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`nodrag px-3 py-0.5 rounded text-[14px] transition ${
              tab === t ? 'bg-[#5b86c4] text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFull((f) => !f)}
          className="nodrag ml-auto p-1 text-slate-300 hover:text-white"
          title={full ? 'Close' : 'Fullscreen'}
        >
          {full ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      <div className="nodrag nowheel flex-1 min-h-[120px] mx-1.5 mb-1 overflow-auto rounded bg-[#1e1f23] p-2 text-slate-300">
        {tab === 'data' &&
          (hasPayload ? (
            <pre className="text-[11px] leading-snug font-mono whitespace-pre-wrap break-all">{dataText}</pre>
          ) : (
            <span className="text-[16px] text-slate-500">No data</span>
          ))}

        {tab === 'image' &&
          (isLive ? (
            <LiveVideo
              deviceId={payload?.deviceId}
              className="max-w-full max-h-full mx-auto object-contain"
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="display"
              className="max-w-full max-h-full mx-auto object-contain"
              onLoad={(e) => setSize(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`)}
            />
          ) : (
            <span className="text-[16px] text-slate-500">No image</span>
          ))}

        {tab === 'meta' &&
          (meta ? (
            <pre className="text-[11px] leading-snug font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(compact(meta), null, 2)}
            </pre>
          ) : (
            <span className="text-[16px] text-slate-500">No data</span>
          ))}
      </div>

      {/* Footer lines */}
      <div className="px-3 pb-1.5 text-[12px] leading-snug text-slate-400 truncate">{line1}</div>
      <div className="px-3 pb-1.5 text-[12px] leading-snug text-slate-400 truncate">{line2}</div>
    </div>
  );

  return (
    <>
      <NodeResizer minWidth={320} minHeight={240} isVisible={!!selected && !full} />
      <Handle type="target" position={Position.Left} className={inputHandleClass} />

      <div
        className={`w-full h-full min-w-[420px] min-h-[320px] rounded-lg border bg-[#393c45] shadow-md text-slate-200 ${
          selected ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]' : 'border-[#4a5060]'
        }`}
      >
        {!full && body}
      </div>

      {full &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-8"
            onClick={() => setFull(false)}
          >
            <div
              className="w-full h-full max-w-[1400px] rounded-lg border border-[#4a5060] bg-[#393c45]"
              onClick={(e) => e.stopPropagation()}
            >
              {body}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default memo(DisplayNode);
