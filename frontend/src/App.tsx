// File: src/App.tsx
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import Sidebar from './components/sidebar';
import FlowCanvas, { type FlowCanvasHandle } from './FlowCanvas';
import TopBar from './components/TopBar';

import { BASIC_INPUT_DEBUG, type WorkflowTemplate } from './lib/workflowTemplates';
import type { WorkflowTab, NodeStatus } from './types'; 

const STORAGE_KEY_APP_TABS = 'n2n_app_tabs';
const STORAGE_KEY_ACTIVE_TAB = 'n2n_active_tab_id';

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [showNodes, setShowNodes] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  
  const isInitializing = useRef(true); 

  const [tabs, setTabs] = useState<WorkflowTab[]>(() => {
    try {
      const savedTabs = localStorage.getItem(STORAGE_KEY_APP_TABS);
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs);
        
        const cleanTabs = parsedTabs.map((tab: any) => ({
          ...tab,
          nodes: tab.nodes.map((node: any) => ({
            ...node,
            data: {
              ...node.data,
              status: 'idle' as NodeStatus 
            }
          }))
        }));
        
        if (cleanTabs.length === 0 || cleanTabs.every((tab: any) => !tab.nodes || tab.nodes.length === 0)) {
          const basicTab = {
            id: 'tab-1',
            name: BASIC_INPUT_DEBUG.name,
            nodes: BASIC_INPUT_DEBUG.nodes,
            edges: BASIC_INPUT_DEBUG.edges,
            viewport: { x: 0, y: 0, zoom: 1 }
          };
          localStorage.setItem(STORAGE_KEY_APP_TABS, JSON.stringify([basicTab]));
          return [basicTab];
        }
        localStorage.setItem(STORAGE_KEY_APP_TABS, JSON.stringify(cleanTabs));
        return cleanTabs;
      }
    } catch (e) {
      console.error("Failed to load tabs", e);
    }
    return [{
      id: 'tab-1',
      name: BASIC_INPUT_DEBUG.name,
      nodes: BASIC_INPUT_DEBUG.nodes,
      edges: BASIC_INPUT_DEBUG.edges,
      viewport: { x: 0, y: 0, zoom: 1 }
    }];
  });
  
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_TAB) || 'tab-1';
  });

  const canvasRef = useRef<FlowCanvasHandle>(null);

  useEffect(() => {
    isInitializing.current = true;
    const timer = setTimeout(() => {
        isInitializing.current = false;
        localStorage.setItem(STORAGE_KEY_APP_TABS, JSON.stringify(tabs));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isInitializing.current) return;

    try {
      const tabsToSave = tabs.map(tab => ({
        ...tab,
        nodes: tab.nodes.map(node => {
          const oldPayload = node.data.payload || {};
          let newPayload = undefined;

          if (node.type === 'image-input' || node.type === 'camera-input') {
             newPayload = oldPayload; 
          }
          else if (node.data.status === 'success') {
             const imgUrl = 
                oldPayload.vis_url || oldPayload.output_image ||         
                oldPayload.result_image_url || oldPayload.output?.image_url ||    
                oldPayload.output?.result_image_url || oldPayload.url || oldPayload.image_url;

             if (imgUrl) {
                const json = oldPayload.json || oldPayload.json_data || {};
                const imgMeta = json.image || {};
                
                const inputShape = imgMeta.original_shape || json.input_resolution || oldPayload.input_shape;
                const outputShape = imgMeta.enhanced_shape || imgMeta.processed_shape || imgMeta.processed_orb_shape || imgMeta.processed_sift_shape || imgMeta.processed_surf_shape || json.output_resolution || oldPayload.output_shape;

                newPayload = { 
                    vis_url: imgUrl,           
                    output_image: imgUrl,      
                    result_image_url: imgUrl,  
                    url: imgUrl,
                    input_shape: inputShape,
                    output_shape: outputShape,
                    params: oldPayload.params,
                    psnr: oldPayload.psnr,
                    ssim: oldPayload.ssim,
                    brisque: oldPayload.brisque,
                    json_data: { detections: json.detections }
                };
             } 
             else if (['psnr', 'ssim', 'brisque'].includes(node.type || '')) {
                newPayload = oldPayload;
             }
          }

          return {
            ...node,
            data: {
              ...node.data,
              payload: newPayload,
              status: 'idle' as NodeStatus 
            }
          };
        })
      }));

      localStorage.setItem(STORAGE_KEY_APP_TABS, JSON.stringify(tabsToSave));
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTabId);

    } catch (e) {
      console.error("Failed to save tabs", e);
    }
  }, [tabs, activeTabId]);


  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      const currentTab = tabs.find(t => t.id === activeTabId);
      if (currentTab && canvasRef.current) {
        const cleanNodes = currentTab.nodes.map(n => ({
            ...n,
            data: { ...n.data, status: 'idle' as NodeStatus }
        }));
        canvasRef.current.restoreSnapshot(
          cleanNodes,
          currentTab.edges,
          currentTab.viewport
        );
      }
    }, 50); 
    return () => clearTimeout(timer);
  }, []); 


  const syncCanvasToCurrentTab = useCallback(() => {
    if (!canvasRef.current) return;
    const snapshot = canvasRef.current.getSnapshot();
    setTabs((prevTabs) => prevTabs.map((tab) => tab.id === activeTabId ? { ...tab, ...snapshot } : tab));
  }, [activeTabId]);

  const handleFlowChange = useCallback((changes: { nodes: any[], edges: any[], viewport: any }) => {
    if (isInitializing.current) return;

    setTabs((prevTabs) => 
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const safeNodes = changes.nodes.map(n => {
            if (!isRunning && n.data?.status === 'success') {
                return { ...n, data: { ...n.data, status: 'idle' as NodeStatus } };
            }
            return n;
        });
        return { ...tab, ...changes, nodes: safeNodes };
      })
    );
  }, [activeTabId, isRunning]);

  const handleLoadTemplate = useCallback((template: WorkflowTemplate) => {
    syncCanvasToCurrentTab();
    const newId = `tab-${Date.now()}`;
    const cleanNodes = template.nodes.map(n => ({ ...n, data: { ...n.data, status: 'idle' as NodeStatus } }));
    
    const newTab: WorkflowTab = {
      id: newId, name: template.name, nodes: cleanNodes, edges: template.edges, viewport: { x: 0, y: 0, zoom: 1 }
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setTimeout(() => { canvasRef.current?.restoreSnapshot(cleanNodes, template.edges, { x: 0, y: 0, zoom: 1 }); }, 0);
    setTimeout(() => { canvasRef.current?.fitView(); }, 200);
  }, [syncCanvasToCurrentTab]);

  const handleStart = useCallback(() => {
    const currentTab = tabs.find(t => t.id === activeTabId);
    
    if (!currentTab || currentTab.nodes.length === 0) {
      alert("Canvas is empty! Please add nodes before running.");
      return; 
    }

    setIsRunning(true);
  }, [tabs, activeTabId]);

  const handleStop = useCallback(() => setIsRunning(false), []);
  const activeTabName = tabs.find(t => t.id === activeTabId)?.name || 'Untitled';

  const handleNew = () => {
    if (canvasRef.current && confirm('Start a new workflow? Unsaved changes will be lost.')) {
      canvasRef.current.restoreSnapshot([], [], { x: 0, y: 0, zoom: 1 });
    }
  };

  const handleOpen = () => {
    canvasRef.current?.loadWorkflow();
  };

  const handleSave = () => {
    canvasRef.current?.saveWorkflow();
  };

  const handleClear = () => {
    if (canvasRef.current && confirm('Clear all nodes and connections from canvas?')) {
      canvasRef.current.clearWorkflow();
    }
  };

  return (
    <div className="w-screen h-[100dvh] flex flex-col bg-[#141414] text-white overflow-hidden">
      <TopBar 
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onRun={handleStart}
        onStop={handleStop}
        onClear={handleClear}
        isRunning={isRunning}
        showNodes={showNodes}
        setShowNodes={setShowNodes}
        showActivity={showActivity}
        setShowActivity={setShowActivity}
      />
      <div className="flex flex-grow overflow-hidden relative">
        <ReactFlowProvider>
          {showNodes && <Sidebar onLoadTemplate={handleLoadTemplate} />}
          <div className="flex-1 h-full flex flex-col relative">
            <FlowCanvas 
              ref={canvasRef} 
              isRunning={isRunning} 
              onPipelineDone={handleStop} 
              onFlowChange={handleFlowChange} 
              currentTabName={activeTabName}
              showActivity={showActivity}
            />
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
