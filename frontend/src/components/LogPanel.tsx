// src/components/LogPanel.tsx
import { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export default function LogPanel({ logs, onClear }: LogPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLevelInfo = (log: LogEntry): { label: string; color: string; bg: string } => {
    if (log.type === 'error' || log.message.toLowerCase().includes('error') || log.message.includes('fault') || log.message.includes('✗')) {
      return { label: 'ERROR', color: 'text-rose-400', bg: 'bg-rose-950/30' };
    }
    if (log.type === 'warning' || log.message.toLowerCase().includes('warning') || log.message.includes('!')) {
      return { label: 'WARN ', color: 'text-amber-400', bg: 'bg-amber-950/30' };
    }
    if (log.type === 'success' || log.message.toLowerCase().includes('success') || log.message.includes('✓') || log.message.includes('completed')) {
      return { label: 'OK   ', color: 'text-emerald-400', bg: '' };
    }
    return { label: 'INFO ', color: 'text-sky-400', bg: '' };
  };

  return (
    <div className="h-48 bg-[#131313] border-t border-[#2a2a2a] flex flex-col flex-shrink-0">
      
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 h-8 bg-[#1a1a1a] border-b border-[#2a2a2a] flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-[11px] font-semibold text-slate-300 tracking-wider">LOG / STATUS</span>
          {logs.length > 0 && (
            <span className="text-[10px] bg-[#252525] text-slate-500 px-1.5 py-0.5 rounded">
              {logs.length}
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          className="text-[11px] text-slate-600 hover:text-slate-300 hover:bg-[#252525] px-2 py-0.5 rounded transition-colors"
          title="Clear logs"
        >
          Clear
        </button>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px]">
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2 text-slate-600 italic">
            <span>[INFO ]</span>
            <span>NovaFlow Studio ready.</span>
          </div>
        ) : (
          logs.map((log, i) => {
            const { label, color, bg } = getLevelInfo(log);
            return (
              <div
                key={log.id || i}
                className={`flex items-start gap-0 px-3 py-[3px] border-b border-[#1e1e1e] hover:bg-[#1e1e1e] transition-colors ${bg}`}
              >
                {/* Timestamp */}
                <span className="text-slate-600 w-20 flex-shrink-0 pt-px">{log.timestamp}</span>
                {/* Level badge */}
                <span className={`${color} font-bold w-16 flex-shrink-0 pt-px`}>[{label}]</span>
                {/* Message */}
                <span className="text-slate-300 flex-1 break-all leading-relaxed">{log.message}</span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
