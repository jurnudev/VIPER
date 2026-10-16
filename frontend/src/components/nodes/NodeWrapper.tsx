// src/components/nodes/NodeWrapper.tsx
import React, { useState } from 'react';
import type { NodeStatus } from '../../types';

// ─── Status Config ───────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<
  string,
  { dot: string; ring: string }
> = {
  idle:    { dot: 'bg-emerald-500',  ring: 'ring-1 ring-emerald-500/50' },
  start:   { dot: 'bg-yellow-400',   ring: 'ring-1 ring-yellow-500/50' },
  running: { dot: 'bg-yellow-400 animate-ping', ring: 'ring-1 ring-yellow-500/80' },
  success: { dot: 'bg-emerald-500',  ring: 'ring-1 ring-emerald-400/50' },
  fault:   { dot: 'bg-red-500',      ring: 'ring-1 ring-red-500/80' },
  error:   { dot: 'bg-red-500',      ring: 'ring-1 ring-red-500/80' },
};

interface NodeWrapperProps {
  id: string;
  title: string;
  category?: string;
  categoryColor?: string;
  status?: NodeStatus | string;
  selected?: boolean;
  icon?: React.ReactNode;
  variant?: 'minimal' | 'preview' | 'standard';
  metadata?: string;
  children?: React.ReactNode;
  className?: string;
  onSettingsClick?: () => void;
}

const NodeWrapper: React.FC<NodeWrapperProps> = ({
  title,
  status = 'idle',
  selected = false,
  icon,
  variant = 'minimal',
  metadata,
  children,
  className = '',
  onSettingsClick,
}) => {
  const cfg = STATUS_CONFIG[status as string] ?? STATUS_CONFIG['idle'];
  const [activeTab, setActiveTab] = useState<'data' | 'image' | 'meta'>('image');

  const borderStyle = selected
    ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)] ring-1 ring-sky-400/50'
    : 'border-[#2d323f] hover:border-slate-500 shadow-md';

  if (variant === 'preview') {
    return (
      <div
        className={`relative bg-[#1c1f26] rounded-xl border ${borderStyle} transition-all duration-200 min-w-[280px] max-w-[340px] text-slate-200 overflow-hidden ${className}`}
      >
        {/* Status Dot (Top-Right) */}
        <div className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${cfg.dot} ${cfg.ring} z-20`} />

        {/* Top Bar with Title + Tabs */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#282c37] bg-[#161920]">
          <div className="flex items-center gap-2">
            {icon && <div className="w-4 h-4 text-sky-400">{icon}</div>}
            <span className="text-xs font-semibold text-slate-100 tracking-wide">{title}</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#101216] p-0.5 rounded-md text-[10px] font-medium mr-5">
            <button
              onClick={() => setActiveTab('data')}
              className={`px-2 py-0.5 rounded transition ${
                activeTab === 'data' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              data
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`px-2 py-0.5 rounded transition ${
                activeTab === 'image' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              image
            </button>
            <button
              onClick={() => setActiveTab('meta')}
              className={`px-2 py-0.5 rounded transition ${
                activeTab === 'meta' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              meta
            </button>
          </div>
        </div>

        {/* Body Content / Preview area */}
        <div className="p-2 bg-[#12141a]">
          {children}
        </div>

        {/* Metadata Footer bar (Stein Editor style) */}
        {metadata && (
          <div className="px-3 py-1 bg-[#161920] border-t border-[#282c37] text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>{metadata}</span>
          </div>
        )}
      </div>
    );
  }

  // Default / Minimal Stein Editor Node Style
  return (
    <div
      className={`relative bg-[#1c1f26] rounded-xl border ${borderStyle} transition-all duration-200 py-3 px-4 flex flex-col items-center justify-center min-w-[105px] min-h-[75px] ${className}`}
    >
      {/* Top-Left Status Dot */}
      <div className={`absolute top-2 left-2 w-2.5 h-2.5 rounded-full ${cfg.dot} ${cfg.ring} z-10`} />

      {/* Settings icon if provided */}
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          className="absolute top-1.5 right-1.5 p-1 text-slate-500 hover:text-slate-200 text-[10px] transition rounded"
          title="Settings"
        >
          ⚙
        </button>
      )}

      {/* Center Icon */}
      {icon && (
        <div className="text-slate-300 w-7 h-7 mb-1 flex items-center justify-center">
          {icon}
        </div>
      )}

      {/* Node Label */}
      <div className="text-[12px] font-medium text-slate-200 text-center tracking-tight truncate max-w-[120px]">
        {title}
      </div>

      {/* Optional Children (for compact standard controls) */}
      {children && (
        <div className="w-full mt-2 pt-2 border-t border-[#282c37]">
          {children}
        </div>
      )}
    </div>
  );
};

export default NodeWrapper;

// ─── Handle class helpers ───
export const inputHandleClass =
  '!w-2.5 !h-2.5 !rounded-full !bg-[#38bdf8] !border-2 !border-[#1c1f26] hover:!scale-150 !transition-transform !duration-150 !-ml-1.5 shadow-[0_0_8px_rgba(56,189,248,0.8)]';

export const outputHandleClass =
  '!w-2.5 !h-2.5 !rounded-full !bg-[#38bdf8] !border-2 !border-[#1c1f26] hover:!scale-150 !transition-transform !duration-150 !-mr-1.5 shadow-[0_0_8px_rgba(56,189,248,0.8)]';


