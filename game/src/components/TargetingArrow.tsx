interface TargetingArrowProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  locked: boolean;
}

export function TargetingArrow({ startX, startY, endX, endY, locked }: TargetingArrowProps) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const bend = Math.min(130, distance * 0.2);
  const bendDirection = deltaX < 0 ? -1 : 1;
  const normalX = (-deltaY / distance) * bendDirection;
  const normalY = (deltaX / distance) * bendDirection;
  const firstControlX = startX + deltaX * 0.28 + normalX * bend;
  const firstControlY = startY + deltaY * 0.28 + normalY * bend;
  const secondControlX = startX + deltaX * 0.72 + normalX * bend * 0.45;
  const secondControlY = startY + deltaY * 0.72 + normalY * bend * 0.45;
  const tangentX = endX - secondControlX;
  const tangentY = endY - secondControlY;
  const tangentLength = Math.max(1, Math.hypot(tangentX, tangentY));
  const arrowLength = Math.min(24, distance * 0.3);
  const arrowBaseX = endX - (tangentX / tangentLength) * arrowLength;
  const arrowBaseY = endY - (tangentY / tangentLength) * arrowLength;
  const path = `M ${startX} ${startY} C ${firstControlX} ${firstControlY}, ${secondControlX} ${secondControlY}, ${arrowBaseX} ${arrowBaseY}`;

  return (
    <svg
      className={`targeting-arrow${locked ? " is-locked" : ""}`}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="target-arrowhead"
          viewBox="0 0 28 28"
          refX="2"
          refY="14"
          markerWidth="28"
          markerHeight="28"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M 2 2 L 26 14 L 2 26 z" />
        </marker>
      </defs>
      <path className="targeting-arrow__outline" d={path} />
      <path className="targeting-arrow__line" d={path} markerEnd="url(#target-arrowhead)" />
    </svg>
  );
}
