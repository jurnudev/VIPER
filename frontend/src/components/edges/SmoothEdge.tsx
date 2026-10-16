// src/components/edges/SmoothEdge.tsx
// Forward wires use the normal smooth bezier. Wires that go "backwards" (target left of
// source, e.g. the Camera -> Trigger feedback wire) arch over the top instead of cutting
// an S-shape straight through the nodes.
import { memo } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from 'reactflow';

const SmoothEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) => {
  const dx = targetX - sourceX;
  let path: string;

  if (dx < 40) {
    const span = Math.abs(dx);
    const reach = Math.min(240, Math.max(70, span * 0.32 + 40)); // how far the curve swings out sideways
    const lift = Math.min(520, Math.max(110, span * 0.75)); // how high the arch rises
    path = `M ${sourceX},${sourceY} C ${sourceX + reach},${sourceY - lift} ${targetX - reach},${targetY - lift} ${targetX},${targetY}`;
  } else {
    [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  }

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{ ...style, ...(selected ? { stroke: '#bfdbfe' } : null) }}
    />
  );
};

export default memo(SmoothEdge);
