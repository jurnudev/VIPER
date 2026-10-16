// File: src/FlowCanvas.tsx
import React, { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background, useNodesState, useEdgesState,
  addEdge, ConnectionLineType, useReactFlow,
  type Node as RFNode, type Edge, type Connection, BackgroundVariant, type Viewport
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes, edgeTypes, defaultEdgeOptions } from './lib/flowConfig';
import type { CustomNodeData, LogEntry, NodeStatus } from './types';

// ---------- Runners ----------
import { markStartThenRunning } from './lib/runners/utils';
import { captureFrame } from './lib/camera';

// ---------- Hooks / Utils ----------
import { useFlowHotkeys } from './hooks/useFlowHotkeys';
import { useFlowHistory } from './hooks/useFlowHistory';
import { useWorkflowFile } from './hooks/useWorkflowFile';
import { validateNodeInput, validateConnection, isFeedbackEdge } from './lib/validation';
import LogPanel from './components/LogPanel';

export interface FlowCanvasHandle {
  getSnapshot: () => { nodes: RFNode[]; edges: Edge[]; viewport: Viewport };
  restoreSnapshot: (nodes: RFNode[], edges: Edge[], viewport: Viewport) => void;
  fitView: () => void;
  saveWorkflow: () => void;
  loadWorkflow: () => void;
  clearWorkflow: () => void;
}

interface FlowCanvasProps {
  isRunning: boolean;
  onPipelineDone: () => void;
  onFlowChange?: (changes: { nodes: RFNode[]; edges: Edge[]; viewport: Viewport }) => void;
  currentTabName: string;
  showActivity?: boolean;
}

const getId = () => `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

function cleanErrorMessage(rawMsg: string): string {
  if (!rawMsg) return 'Unknown Error';
  try {
    const parsed = JSON.parse(rawMsg.substring(rawMsg.indexOf('{')));
    if (parsed.detail) return parsed.detail;
  } catch (e) { }
  return rawMsg.replace(/^HTTP \d+ [a-zA-Z ]+ - /, '').replace(/^Error: /, '').trim();
}

function getDownstreamNodes(sourceId: string, edges: Edge[]): Set<string> {
  const downstreamIds = new Set<string>();
  const queue = [sourceId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const outgoers = edges
      .filter((e) => e.source === currentId)
      .map((e) => e.target);

    outgoers.forEach((targetId) => {
      if (!downstreamIds.has(targetId)) {
        downstreamIds.add(targetId);
        queue.push(targetId);
      }
    });
  }
  return downstreamIds;
}

function hasUnreadyCameraAncestor(nodeId: string, nodes: RFNode[], edges: Edge[]): boolean {
  const visited = new Set<string>();
  const queue = edges.filter(e => e.target === nodeId).map(e => e.source);
  while (queue.length) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const parent = nodes.find(n => n.id === currentId);
    if (!parent) continue;
    if (parent.type?.toLowerCase() === 'camera-input' &&
        !parent.data?.payload?.url && !parent.data?.payload?.image_path) return true;
    edges.filter(e => e.target === currentId).forEach(e => queue.push(e.source));
  }
  return false;
}

const FlowCanvas = forwardRef<FlowCanvasHandle, FlowCanvasProps>(
  ({ isRunning, onPipelineDone, onFlowChange, currentTabName, showActivity = true }, ref) => {

    const { screenToFlowPosition, fitView, getViewport, setViewport, getNodes, getEdges } = useReactFlow();

    const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
    const onMouseMove = useCallback((event: React.MouseEvent) => {
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      lastMousePosRef.current = pos;
    }, [screenToFlowPosition]);

    const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const isDraggingRef = useRef(false);
    const isCanceledRef = useRef(false);

    const isProcessingRef = useRef(false);
    // Trigger nodes currently running a Camera -> Trigger feedback loop.
    const loopingRef = useRef<Set<string>>(new Set());
    useEffect(() => () => { loopingRef.current.clear(); }, []);

    useEffect(() => {
      if (!onFlowChange) return;
      const timer = setTimeout(() => {
        onFlowChange({ nodes, edges, viewport: getViewport() });
      }, 1000);
      return () => clearTimeout(timer);
    }, [nodes, edges, onFlowChange, getViewport]);

    useImperativeHandle(ref, () => ({
      getSnapshot: () => ({ nodes, edges, viewport: getViewport() }),
      restoreSnapshot: (newNodes, newEdges, newViewport) => {
        if (isApplyingHistoryRef.current) (isApplyingHistoryRef.current as any) = true;
        const nodesWithFunc = newNodes.map(n => ({
          ...n, data: { ...n.data, onRunNode: (id: string) => runNodeById(id) }
        }));
        setNodes(nodesWithFunc);
        setEdges(newEdges);
        setTimeout(() => {
          setViewport(newViewport);
          if (isApplyingHistoryRef.current) (isApplyingHistoryRef.current as any) = false;
        }, 50);
      },
      fitView: () => { window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 800 })); },
      saveWorkflow: () => saveWorkflow(),
      loadWorkflow: () => triggerLoadWorkflow(),
      clearWorkflow: () => handleClearWorkflow(),
    }));

    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info', nodeId?: string) => {
      // While a loop runs, skip the per-node "[Node] ..." info/success lines to keep the log usable.
      if (loopingRef.current.size > 0 && (type === 'info' || type === 'success') && message.startsWith('[')) return;
      setLogs((prev) => [...prev, {
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        type, message, nodeId,
      }]);
    }, []);

    const nodesRef = useRef(nodes);
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);

    const { undo, redo, isApplyingHistoryRef } = useFlowHistory({ nodes, edges, setNodes, setEdges, isDraggingRef });
    const { saveWorkflow, triggerLoadWorkflow, fileInputRef, handleFileChange } = useWorkflowFile({
      nodes, edges, setNodes, setEdges, isApplyingHistoryRef, flowName: currentTabName
    });

    const handleClearWorkflow = useCallback(() => {
      if (nodes.length === 0) return;
      setNodes([]); setEdges([]);
      addLog('Workflow cleared.', 'warning');
    }, [nodes, setNodes, setEdges, addLog]);

    const setIncomingEdgesStatus = useCallback((nodeId: string, status: 'default' | 'error') => {
      setEdges((eds) => eds.map((e) => e.target === nodeId ? {
        ...e, animated: status === 'error',
        style: { ...e.style, stroke: status === 'error' ? '#ef4444' : '#64748b', strokeWidth: status === 'error' ? 3 : 2 }
      } : e));
    }, [setEdges]);

    const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
      if (deletedEdges.length === 0) return;
      const targetNodeIds = new Set(deletedEdges.map((e) => e.target));

      setNodes((nds) => nds.map((node) => {
        if (targetNodeIds.has(node.id)) {
          const params = node.data.payload?.params;
          return {
            ...node,
            data: {
              ...node.data,
              status: 'idle',
              description: 'Connection removed',
              payload: { params }
            }
          };
        }
        return node;
      }));
      addLog('Connection removed. Target node reset.', 'info');
    }, [setNodes, addLog]);

    const runNodeById: (nodeId: string) => Promise<void> = useCallback(async (nodeId: string): Promise<void> => {
      const currentNodes = getNodes();
      const currentEdges = getEdges();

      const node = currentNodes.find((n) => n.id === nodeId);

      if (!node) {
        throw new Error(`Node ${nodeId} missing from store`);
      }
      if (!node.type) return;

      const nodeName = node.data.label || node.type.toUpperCase();

      setIncomingEdgesStatus(nodeId, 'default');

      // Camera: grab a fresh frame before validating, so the node can leave WAITING FOR FRAME.
      let validationNodes = currentNodes;
      if (node.type.toLowerCase() === 'camera-input' && node.data.payload?.enabled !== false) {
        try {
          const frame = await captureFrame(node.data.payload?.deviceId);
          const prevUrl = getNodes().find((n) => n.id === nodeId)?.data.payload?.url;
          if (typeof prevUrl === 'string' && prevUrl.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(prevUrl), 3000); // free the old frame once nothing shows it
          }
          const camPayload = {
            ...(node.data.payload || {}),
            url: frame.url,
            preview_url: frame.url,
            width: frame.width,
            height: frame.height,
            captured_at: new Date().toISOString(),
          };
          validationNodes = currentNodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, payload: camPayload } } : n
          );
          setNodes((nds) => nds.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, payload: camPayload } } : n
          ));
        } catch (err: any) {
          addLog(`[${nodeName}] ⚠️ Camera unavailable: ${err?.message || err}`, 'warning', nodeId);
        }
      }

      const check = validateNodeInput(nodeId, validationNodes, currentEdges);
      if (!check.isValid) {
        const cleanMsg = cleanErrorMessage(check.message || '');
        if (cleanMsg === 'WAITING FOR FRAME') {
          addLog(`[${nodeName}] ⏸ Waiting for camera frame.`, 'warning', nodeId);
          setNodes((nds) => nds.map((n) => n.id === nodeId ? {
            ...n,
            data: { ...n.data, status: 'idle' as NodeStatus, description: 'WAITING FOR FRAME' }
          } : n));
          setIncomingEdgesStatus(nodeId, 'default');
          return;
        }
        addLog(`[${nodeName}] ❌ fault: ${cleanMsg}`, 'error', nodeId);
        setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: 'fault' as NodeStatus } } : n)));
        setIncomingEdgesStatus(nodeId, 'error');
        throw new Error(check.message);
      }

      addLog(`[${nodeName}] ⏳ Processing...`, 'info', nodeId);
      await markStartThenRunning(nodeId, node.type.toUpperCase(), setNodes);

      try {
        const typeKey = node.type.toLowerCase();
        // Ignore Camera -> Trigger feedback edges so graph walks never loop back.
        const freshNodes = getNodes();
        const freshEdges = getEdges().filter((e) => !isFeedbackEdge(e, freshNodes));

        switch (typeKey) {
          case 'trigger': {
            const downIds = Array.from(getDownstreamNodes(nodeId, freshEdges));
            // While looping, downstream cameras are flagged "live" so Camera/Display
            // can show the raw video stream smoothly instead of the slow per-frame snapshots.
            const setTriggerState = (looping: boolean) => setNodes((nds) => nds.map((n) => {
              if (n.id === nodeId) {
                return {
                  ...n, data: {
                    ...n.data,
                    status: 'success' as NodeStatus,
                    description: looping ? 'Looping' : 'Triggered',
                    payload: { ...(n.data.payload || {}), looping },
                  }
                };
              }
              if (n.type === 'camera-input' && downIds.includes(n.id)) {
                return { ...n, data: { ...n.data, payload: { ...(n.data.payload || {}), live: looping } } };
              }
              return n;
            }));

            // Clicking Start/Stop while a loop is active stops it.
            if (loopingRef.current.has(nodeId)) {
              loopingRef.current.delete(nodeId);
              setTriggerState(false);
              addLog(`[${nodeName}] ⏹ Loop stopped`, 'warning', nodeId);
              return;
            }

            const hasFeedback = getEdges().some((e) => e.target === nodeId && isFeedbackEdge(e, freshNodes));

            if (!hasFeedback) {
              // No feedback wire: run everything after the trigger once.
              setTriggerState(false);
              for (const downId of downIds) await runNodeById(downId);
              addLog(`[${nodeName}] ✅ Completed`, 'success', nodeId);
              return;
            }

            // Camera -> Trigger feedback wire: keep re-running the chain until stopped.
            loopingRef.current.add(nodeId);
            setTriggerState(true);
            addLog(`🔁 [${nodeName}] Loop started - click Stop to end it`, 'info', nodeId);
            try {
              while (loopingRef.current.has(nodeId)) {
                for (const downId of downIds) {
                  if (!loopingRef.current.has(nodeId)) break;
                  await runNodeById(downId);
                }
                // A camera that cannot deliver frames would spin forever, so stop instead.
                const camsWithoutFrame = getNodes().filter(
                  (n) => downIds.includes(n.id) && n.type === 'camera-input' && !n.data.payload?.url
                );
                if (camsWithoutFrame.length > 0) throw new Error('Camera has no frame - loop stopped');
                await new Promise((r) => setTimeout(r, 300));
              }
            } catch (loopErr) {
              loopingRef.current.delete(nodeId);
              setTriggerState(false);
              throw loopErr;
            }
            return;
          }
          case 'camera-input':
          case 'display':
            setNodes((nds) => nds.map((n) => n.id === nodeId ? {
              ...n, data: { ...n.data, status: 'success' as NodeStatus, description: 'Ready' }
            } : n));
            break;
          default: console.warn(`Unknown type: ${node.type}`);
        }

        const downstreamIds = getDownstreamNodes(nodeId, freshEdges);
        if (downstreamIds.size > 0) {
          setNodes((nds) => nds.map((n) => {
            if (downstreamIds.has(n.id)) {
              const params = n.data.payload?.params;
              return {
                ...n,
                data: {
                  ...n.data,
                  status: 'idle',
                  description: 'Waiting for upstream...',
                  // Camera frames are stored on the CAMERA-INPUT source node.
                  // Do not clear the source payload while resetting downstream nodes.
                  payload: n.type?.toLowerCase() === 'camera-input'
                    ? { ...(n.data.payload || {}), params }
                    : { params }
                }
              };
            }
            return n;
          }));
        }

        addLog(`[${nodeName}] ✅ Completed`, 'success', nodeId);
      } catch (err: any) {
        addLog(`[${nodeName}] 💥 Error: ${cleanErrorMessage(err.message)}`, 'error', nodeId);
        setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: 'fault' as NodeStatus } } : n)));
        setIncomingEdgesStatus(nodeId, 'error');
        throw err;
      }
    }, [setNodes, addLog, setIncomingEdgesStatus, getNodes, getEdges]);

    useFlowHotkeys({ getPastePosition: () => lastMousePosRef.current, runNodeById, undo, redo });

    useEffect(() => {
      setNodes((nds) => {
        let changed = false;
        const updated = nds.map((n) => {
          if (n.data && typeof n.data.onRunNode === 'function') return n;
          changed = true;
          return { ...n, data: { ...(n.data || {}), onRunNode: (id: string) => runNodeById(id) } };
        });
        return changed ? updated : nds;
      });
    }, [nodes, runNodeById, setNodes]);


    useEffect(() => {
      if (!isRunning) {
        isCanceledRef.current = true;
        isProcessingRef.current = false;
        return;
      }

      if (isProcessingRef.current) return;

      isProcessingRef.current = true;
      isCanceledRef.current = false;

      const runAllNodes = async () => {
        try {
          addLog('🚀 Pipeline Started', 'info');

          const allNodes = getNodes();

          if (!allNodes || allNodes.length === 0) {
            addLog('⚠️ No nodes found to run.', 'warning');
            return;
          }

          const executionPriority: Record<string, number> = {
            'trigger': 1,
            'image-input': 2,
            'camera-input': 2,
            'display': 98,
            'dcnn': 10, 'dncnn': 10, 'swinir': 10, 'real': 10, 'realesrgan': 10,
            'clahe': 20, 'msrcr': 20, 'zero': 20, 'zerodce': 20, 'zero_dce': 20,
            'otsu': 30, 'snake': 30,
            'deep': 35, 'deeplab': 35, 'unet': 35, 'mask': 35, 'maskrcnn': 35,
            'sift': 40, 'surf': 40, 'orb': 40,
            'bfmatcher': 50, 'flannmatcher': 50,
            'homography-align': 60, 'affine-align': 60, 
            'brisque': 90, 'psnr': 90, 'ssim': 90,
            'save-image': 99,
            'save-json': 99
          };

          const sortedNodes = allNodes.sort((a, b) => {
            return (executionPriority[a.type?.toLowerCase() || ''] || 100) - (executionPriority[b.type?.toLowerCase() || ''] || 100);
          });

          for (const node of sortedNodes) {
            if (isCanceledRef.current) { addLog('Pipeline stopped.', 'warning'); break; }
            if (!node?.id || !node?.type) continue;

            if (node.type.startsWith('save-')) continue;

            // Trigger only marks itself; the loop already runs every node in order.
            if (node.type === 'trigger') {
              setNodes((nds) => nds.map(n => n.id === node.id ? {
                ...n, data: { ...n.data, status: 'success' as NodeStatus, description: 'Triggered' }
              } : n));
              continue;
            }

            // Do not execute any downstream node while a camera source has no frame.
            const latestNodes = getNodes();
            const latestEdges = getEdges().filter((e) => !isFeedbackEdge(e, latestNodes));
            if (hasUnreadyCameraAncestor(node.id, latestNodes, latestEdges)) {
              setNodes((nds) => nds.map(n => n.id === node.id ? {
                ...n, data: { ...n.data, status: 'idle' as NodeStatus, description: 'WAITING FOR FRAME' }
              } : n));
              addLog(`[${node.data.label || node.type}] ⏸ Waiting for camera frame.`, 'warning', node.id);
              continue;
            }

            try {
              setNodes((nds) => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'running' as NodeStatus } } : n));

              await new Promise(r => setTimeout(r, 50));

              await runNodeById(node.id);


              const isHeavyNode = ['deep', 'deeplab', 'mask', 'maskrcnn', 'unet'].includes(node.type?.toLowerCase() || '');
              const delayTime = isHeavyNode ? 500 : 100;

              await new Promise(r => setTimeout(r, delayTime));

            } catch (e) {
              console.warn(`Node ${node.id} failed.`);
              isCanceledRef.current = true;
              break;
            }
          }

          if (!isCanceledRef.current) addLog('🏁 Pipeline Finished', 'success');

        } finally {
          isProcessingRef.current = false;
          onPipelineDone?.();
        }
      };

      setTimeout(() => runAllNodes(), 0);

      return () => { isProcessingRef.current = false; };
    }, [isRunning]);

    const onValidateConnection = useCallback((connection: Connection) => {
      return validateConnection(connection, nodes, edges);
    }, [nodes, edges]);

    const onConnect = useCallback((conn: Edge | Connection) => setEdges((eds) => addEdge(conn, eds)), [setEdges]);
    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
    const onDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow');
      if (!type) return;
      const id = getId();
      setNodes((nds) => nds.concat({
        id, type, position: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
        data: { label: type.toUpperCase(), status: 'idle', onRunNode: (id: string) => runNodeById(id) },
      }));
      addLog(`Added ${type}`, 'info', id);
    }, [screenToFlowPosition, setNodes, runNodeById, addLog]);

    return (
      <div className="relative flex-1 h-full flex flex-col">
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onDrop={onDrop} onDragOver={onDragOver} onMouseMove={onMouseMove}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultEdgeOptions={defaultEdgeOptions}
            connectionLineType={ConnectionLineType.Bezier}
            fitView minZoom={0.08} maxZoom={5}
            onNodeDragStart={() => (isDraggingRef.current = true)}
            onNodeDragStop={() => (isDraggingRef.current = false)}
            isValidConnection={onValidateConnection}
            onEdgesDelete={onEdgesDelete}
          >
            <MiniMap
              position="bottom-right"
              style={{ background: 'rgba(13,17,27,0.95)', border: '1px solid #1e2535' }}
              maskColor="rgba(0,0,0,0.65)"
              nodeColor={(n) => n.data?.status === 'success' ? '#22c55e' : n.data?.status === 'fault' ? '#f43f5e' : '#334155'}
            />

            <Controls
              position="bottom-left"
              style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '22px' }}
            />

            <Background variant={BackgroundVariant.Lines} gap={20} color="#1e2535" />
          </ReactFlow>
        </div>
        {showActivity && <LogPanel logs={logs} onClear={() => setLogs([])} />}
      </div>
    );
  });

export default FlowCanvas;