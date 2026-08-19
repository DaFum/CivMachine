/**
 * The drawing vocabulary every world module writes against. Keeping it separate from the 2D
 * context lets the drawing code stay free of transform bookkeeping and lets tests record calls.
 */
export interface DrawSurface {
  fillStyle(color: number, alpha?: number): DrawSurface;
  lineStyle(width: number, color: number, alpha?: number): DrawSurface;
  fillRect(x: number, y: number, width: number, height: number): DrawSurface;
  strokeRect(x: number, y: number, width: number, height: number): DrawSurface;
  fillCircle(x: number, y: number, radius: number): DrawSurface;
  strokeCircle(x: number, y: number, radius: number): DrawSurface;
  fillTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): DrawSurface;
  line(x1: number, y1: number, x2: number, y2: number): DrawSurface;
  fillPoly(points: ReadonlyArray<readonly [number, number]>): DrawSurface;
}

export function canvasSurface(context: any, toColor: (value: number, alpha?: number) => string): DrawSurface {
  const surface: DrawSurface = {
    fillStyle(color, alpha = 1) { context.fillStyle = toColor(color, alpha); return surface; },
    lineStyle(width, color, alpha = 1) { context.lineWidth = width; context.strokeStyle = toColor(color, alpha); return surface; },
    fillRect(x, y, width, height) { context.fillRect(x, y, width, height); return surface; },
    strokeRect(x, y, width, height) { context.beginPath(); context.moveTo(x, y); context.lineTo(x + width, y); context.lineTo(x + width, y + height); context.lineTo(x, y + height); context.closePath(); context.stroke(); return surface; },
    fillCircle(x, y, radius) { context.beginPath(); context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); context.fill(); return surface; },
    strokeCircle(x, y, radius) { context.beginPath(); context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); context.stroke(); return surface; },
    fillTriangle(ax, ay, bx, by, cx, cy) { context.beginPath(); context.moveTo(ax, ay); context.lineTo(bx, by); context.lineTo(cx, cy); context.closePath(); context.fill(); return surface; },
    line(x1, y1, x2, y2) { context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); return surface; },
    fillPoly(points) {
      if (!points.length) return surface;
      context.beginPath(); context.moveTo(points[0]![0], points[0]![1]);
      for (let i = 1; i < points.length; i++) context.lineTo(points[i]![0], points[i]![1]);
      context.closePath(); context.fill(); return surface;
    },
  };
  return surface;
}
