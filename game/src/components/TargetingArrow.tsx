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
  const tangentUnitX = tangentX / tangentLength;
  const tangentUnitY = tangentY / tangentLength;
  const perpendicularX = -tangentUnitY;
  const perpendicularY = tangentUnitX;
  const arrowLength = Math.min(24, Math.max(14, distance * 0.3));
  const arrowHalfWidth = arrowLength * 0.52;
  const neckOverlap = Math.min(8, arrowLength * 0.35);
  const arrowBaseX = endX - tangentUnitX * arrowLength;
  const arrowBaseY = endY - tangentUnitY * arrowLength;
  const shaftEndX = arrowBaseX + tangentUnitX * neckOverlap;
  const shaftEndY = arrowBaseY + tangentUnitY * neckOverlap;
  const headLeftX = arrowBaseX + perpendicularX * arrowHalfWidth;
  const headLeftY = arrowBaseY + perpendicularY * arrowHalfWidth;
  const headRightX = arrowBaseX - perpendicularX * arrowHalfWidth;
  const headRightY = arrowBaseY - perpendicularY * arrowHalfWidth;
  const shaftPath = `M ${startX} ${startY} C ${firstControlX} ${firstControlY}, ${secondControlX} ${secondControlY}, ${shaftEndX} ${shaftEndY}`;
  const headPath = `M ${headLeftX} ${headLeftY} L ${endX} ${endY} L ${headRightX} ${headRightY} Z`;

  return (
    <svg
      className={`targeting-arrow${locked ? " is-locked" : ""}`}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <path className="targeting-arrow__outline" d={shaftPath} />
      <path className="targeting-arrow__head" d={headPath} />
      <path className="targeting-arrow__line" d={shaftPath} />
    </svg>
  );
}
