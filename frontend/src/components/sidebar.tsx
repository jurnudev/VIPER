// src/components/sidebar.tsx
import React, { useMemo, useState } from 'react';
import { TEMPLATES, type WorkflowTemplate } from '../lib/workflowTemplates';

interface SidebarProps {
  onLoadTemplate: ((template: WorkflowTemplate) => void) | null;
}

interface JobGroup {
  name: string;
  color: string; // accent color for category header
  algorithms: { type: string; label: string; icon: string }[];
}

const Sidebar = ({ onLoadTemplate }: SidebarProps) => {
  const [activeTab, setActiveTab] = useState<'nodes' | 'templates'>('nodes');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'INPUT': true,
    'VISION': false,
    'QUALITY & MATCHING': false,
    'DEBUG & SAVER': false,
  });
  const [search, setSearch] = useState('');

  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const jobs = useMemo<JobGroup[]>(() => ([
    {
      name: 'INPUT',
      color: 'text-emerald-400',
      algorithms: [
        { type: 'trigger', label: 'Trigger', icon: '▶' },
        { type: 'camera-input', label: 'Camera', icon: '📷' },
      ],
    },
    {
      name: 'DEBUG & SAVER',
      color: 'text-amber-400',
      algorithms: [
        { type: 'display', label: 'Display', icon: '🖥' },
      ],
    },
  ]), []);

  const toggleGroup = (name: string) => setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));

  return (
    <aside className="w-60 border-r border-[#2a2a2a] bg-[#181818] flex flex-col h-full select-none text-sm">
      
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a2a2a] bg-[#1c1c1c]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          <span className="text-xs font-semibold text-slate-200 tracking-wider">NODE LIBRARY</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a2a2a]">
        <button
          className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${activeTab === 'nodes' ? 'text-sky-400 border-b-2 border-sky-400 -mb-px' : 'text-slate-500 hover:text-slate-300'}`}
          onClick={() => setActiveTab('nodes')}
        >
          Nodes
        </button>
        <button
          className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${activeTab === 'templates' ? 'text-sky-400 border-b-2 border-sky-400 -mb-px' : 'text-slate-500 hover:text-slate-300'}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-[#2a2a2a]">
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded pl-7 pr-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-600/60 transition-colors"
          />
        </div>
      </div>

      {/* Node List / Template List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
        {activeTab === 'nodes' ? (
          jobs.map(job => {
            const isOpen = openGroups[job.name] ?? false;
            const filteredAlgs = job.algorithms.filter(a =>
              a.label.toLowerCase().includes(search.toLowerCase())
            );
            if (search && filteredAlgs.length === 0) return null;
            const displayAlgs = search ? filteredAlgs : job.algorithms;

            return (
              <div key={job.name} className="mb-0.5">
                {/* Category Header */}
                <button
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-left hover:bg-[#222] transition-colors"
                  onClick={() => toggleGroup(job.name)}
                >
                  <svg
                    className={`w-3 h-3 text-slate-500 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
                    fill="currentColor" viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className={`text-[10px] font-bold tracking-widest ${job.color}`}>{job.name}</span>
                  <span className="ml-auto text-[10px] text-slate-600">{job.algorithms.length}</span>
                </button>

                {/* Nodes under category */}
                {isOpen && (
                  <div className="pb-1">
                    {displayAlgs.map(alg => (
                      <div
                        key={alg.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, alg.type)}
                        className="flex items-center gap-2.5 mx-2 mb-0.5 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing bg-[#1e1e1e] border border-[#282828] hover:border-[#3a3a3a] hover:bg-[#232323] text-slate-300 hover:text-white transition-all group"
                        title={`Drag to canvas: ${alg.label}`}
                      >
                        <span className="text-sm w-4 text-center flex-shrink-0 opacity-75">{alg.icon}</span>
                        <span className="text-[11px] flex-1 leading-tight">{alg.label}</span>
                        {/* Drag hint */}
                        <svg className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="space-y-1 p-2">
            {TEMPLATES.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map((t, idx) => (
              <div
                key={idx}
                onClick={() => onLoadTemplate?.(t)}
                className="px-3 py-2.5 rounded cursor-pointer bg-[#1e1e1e] border border-[#282828] hover:border-sky-800/60 hover:bg-[#1a2535] transition-all"
              >
                <div className="text-[11px] font-semibold text-sky-300 mb-0.5">{t.name}</div>
                <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{t.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer tip */}
      <div className="px-3 py-2 border-t border-[#2a2a2a] text-[10px] text-slate-600 italic">
        Drag a node onto the canvas to add it
      </div>
    </aside>
  );
};

export default Sidebar;
