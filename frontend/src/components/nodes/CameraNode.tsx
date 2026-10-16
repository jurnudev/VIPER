// src/components/nodes/CameraNode.tsx
import { memo, useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { Camera, AlertCircle, Power } from 'lucide-react';
import { inputHandleClass, outputHandleClass } from './NodeWrapper';
import { captureFrame, listVideoDevices } from '../../lib/camera';
import LiveVideo from './LiveVideo';
import type { CustomNodeData } from '../../types';

const DOT: Record<string, string> = {
  idle: 'bg-emerald-500',
  start: 'bg-yellow-400',
  running: 'bg-yellow-400 animate-ping',
  success: 'bg-emerald-500',
  fault: 'bg-red-500',
};

const CameraNode = ({ id, data, selected }: NodeProps<CustomNodeData>) => {
  const { setNodes } = useReactFlow();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const payload = data.payload || {};
  const enabled = payload.enabled !== false;
  const frameUrl: string | undefined = payload.url;
  const device = devices.find((d) => d.deviceId === payload.deviceId) ?? devices[0];
  const deviceName = enabled && device ? device.label || `Camera ${devices.indexOf(device) + 1}` : 'none';
  const hasProblem = !!error || devices.length === 0 || data.status === 'fault';

  const patchPayload = useCallback(
    (patch: Record<string, unknown>) =>
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, payload: { ...(n.data.payload || {}), ...patch } } } : n
        )
      ),
    [id, setNodes]
  );

  const refreshDevices = useCallback(async () => {
    try {
      setDevices(await listVideoDevices());
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  const handleCapture = async () => {
    setBusy(true);
    setError(null);
    try {
      const frame = await captureFrame(payload.deviceId);
      if (typeof frameUrl === 'string' && frameUrl.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(frameUrl), 3000);
      }
      patchPayload({
        url: frame.url,
        preview_url: frame.url,
        width: frame.width,
        height: frame.height,
        captured_at: new Date().toISOString(),
      });
      await refreshDevices(); // labels become available after permission is granted
    } catch (e: any) {
      setError(e?.message || 'Cannot open camera');
    } finally {
      setBusy(false);
    }
  };

  const ring = selected
    ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
    : hasProblem
    ? 'border-amber-500/70'
    : 'border-[#2d323f] hover:border-slate-500';

  return (
    <>
      <Handle type="target" position={Position.Left} className={inputHandleClass} />

      <div
        className={`relative w-[200px] h-[200px] rounded-xl border-2 ${enabled && !hasProblem ? 'border-solid' : 'border-dashed'} ${ring} bg-[#1c1f26] shadow-md text-slate-200 flex flex-col items-center justify-center transition-all duration-200 ${enabled ? '' : 'opacity-60'}`}
      >
        {/* Enable toggle (top-left) */}
        <button
          type="button"
          className="nodrag absolute top-2 left-2 p-1 rounded text-slate-400 hover:text-slate-100"
          title={enabled ? 'Disable camera' : 'Enable camera'}
          onClick={() => patchPayload({ enabled: !enabled })}
        >
          <Power className={`w-4 h-4 ${enabled ? 'text-emerald-400' : ''}`} />
        </button>

        {/* Warning / status (top-right) */}
        {hasProblem ? (
          <span className="absolute top-2 right-2 text-amber-400" title={error || (devices.length === 0 ? 'No camera found' : 'Fault')}>
            <AlertCircle className="w-5 h-5" />
          </span>
        ) : (
          <span className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${DOT[data.status || 'idle'] ?? DOT.idle}`} />
        )}

        {/* Preview or icon */}
        {payload.live && enabled ? (
          <LiveVideo
            deviceId={payload.deviceId}
            className="w-[150px] h-[84px] object-cover rounded border border-sky-500/60"
          />
        ) : frameUrl ? (
          <img src={frameUrl} alt="last frame" className="w-[150px] h-[84px] object-cover rounded border border-[#2d323f]" />
        ) : (
          <Camera className="w-14 h-14 text-slate-400" strokeWidth={1.5} />
        )}

        {/* Device badge */}
        <span className="mt-1 max-w-[170px] truncate rounded bg-slate-600/70 px-1.5 py-0.5 text-[11px] font-semibold text-slate-100">
          {deviceName}
        </span>

        <div className="mt-1 text-[14px] font-semibold tracking-tight">Camera</div>

        {/* Controls */}
        <div className="nodrag mt-1 flex items-center gap-1">
          {devices.length > 1 && (
            <select
              value={device?.deviceId ?? ''}
              onChange={(e) => patchPayload({ deviceId: e.target.value })}
              className="max-w-[110px] rounded bg-[#101216] border border-[#2d323f] px-1 py-0.5 text-[10px] text-slate-300"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={!enabled || busy}
            onClick={handleCapture}
            className="rounded bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? '...' : 'Capture'}
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className={outputHandleClass} />
    </>
  );
};

export default memo(CameraNode);
