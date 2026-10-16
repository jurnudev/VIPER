// src/components/TopBar.tsx
import React from 'react';

interface TopBarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onRun: () => void;
  onStop: () => void;
  onClear: () => void;
  isRunning: boolean;
  showNodes: boolean;
  setShowNodes: (val: boolean) => void;
  showActivity: boolean;
  setShowActivity: (val: boolean) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  onNew, onOpen, onSave, onRun, onStop, onClear,
  isRunning, showNodes, setShowNodes, showActivity, setShowActivity,
}) => {
  return (
    <div className="flex items-center justify-between px-3 h-11 bg-[#161616] border-b border-[#2a2a2a] text-gray-300 text-sm select-none flex-shrink-0">
      
      {/* Left: Logo + File buttons */}
      <div className="flex items-center gap-0 h-full">
        {/* Logo */}
        <div className="flex items-center gap-2 pr-4 mr-1 border-r border-[#2a2a2a]">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <span className="text-[12px] font-bold text-slate-100 tracking-wide whitespace-nowrap">NovaFlow Studio</span>
        </div>

        {/* File buttons */}
        <div className="flex items-center">
          <button onClick={onNew} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-[#252525] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            New
          </button>
          <button onClick={onOpen} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-[#252525] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Open
          </button>
          <button onClick={onSave} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-[#252525] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[#2a2a2a] mx-1.5" />

        {/* Run / Stop / Clear */}
        <div className="flex items-center gap-1">
          <button
            onClick={onRun}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              isRunning
                ? 'bg-emerald-900/40 text-emerald-500/70 cursor-not-allowed border border-emerald-800/40'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-900/50'
            }`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {isRunning ? 'Running...' : 'Run'}
          </button>

          <button
            onClick={onStop}
            disabled={!isRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              !isRunning
                ? 'bg-[#252525] text-slate-600 cursor-not-allowed'
                : 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-900/50'
            }`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
            Stop
          </button>

          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[#2a2a2a] mx-1.5" />

        {/* View toggles */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowNodes(!showNodes)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
              showNodes ? 'text-sky-400 bg-sky-950/30' : 'text-slate-500 hover:text-slate-300 hover:bg-[#252525]'
            }`}
            title="Toggle Node Library"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Library
          </button>
          <button
            onClick={() => setShowActivity(!showActivity)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
              showActivity ? 'text-sky-400 bg-sky-950/30' : 'text-slate-500 hover:text-slate-300 hover:bg-[#252525]'
            }`}
            title="Toggle Log Panel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Log
          </button>
        </div>
      </div>

      {/* Right: status badge */}
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        {isRunning && (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Pipeline running
          </div>
        )}
        {!isRunning && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            Ready
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
