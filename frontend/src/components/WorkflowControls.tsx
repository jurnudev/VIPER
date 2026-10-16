// project_n2n/my-react-flow-app/src/components/WorkflowControls.tsx
import React from 'react';

interface WorkflowControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}

const WorkflowControls: React.FC<WorkflowControlsProps> = ({ isRunning, onStart, onStop }) => {
  return (
    <div className="bg-[#161b22] border-b border-[#21262d] flex justify-between items-center px-5 py-1.5 gap-4">

      {/* Status Indicator */}
      <div className="flex items-center gap-2.5">
        <div className={`relative flex items-center justify-center w-6 h-6`}>
          {isRunning && (
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-40 animate-ping" />
          )}
          <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase">Pipeline</span>
          <span className={`text-[11px] font-bold tracking-wide ${isRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
            {isRunning ? 'RUNNING' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Run Controls */}
      <div className="flex items-center gap-2">
        <button
          id="btn-start-pipeline"
          onClick={onStart}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider transition-all duration-150 border
            ${isRunning
              ? 'bg-transparent border-slate-700 text-slate-600 cursor-not-allowed'
              : 'bg-emerald-600/20 border-emerald-600/60 text-emerald-400 hover:bg-emerald-600/30 hover:border-emerald-500 active:scale-95'
            }`}
        >
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          RUN
        </button>

        <button
          id="btn-stop-pipeline"
          onClick={onStop}
          disabled={!isRunning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider transition-all duration-150 border
            ${!isRunning
              ? 'bg-transparent border-slate-700 text-slate-600 cursor-not-allowed'
              : 'bg-red-600/20 border-red-600/60 text-red-400 hover:bg-red-600/30 hover:border-red-500 active:scale-95'
            }`}
        >
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
          STOP
        </button>
      </div>
    </div>
  );
};

export default WorkflowControls;
