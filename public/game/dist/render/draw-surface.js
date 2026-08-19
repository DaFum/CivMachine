/**
 * Placeholder docstring for canvasSurface.
 */
export function canvasSurface(context, toColor) {
    const surface = {
        fillStyle(color, alpha = 1) { context.fillStyle = toColor(color, alpha); return surface; },
        lineStyle(width, color, alpha = 1) { context.lineWidth = width; context.strokeStyle = toColor(color, alpha); return surface; },
        fillRect(x, y, width, height) { context.fillRect(x, y, width, height); return surface; },
        strokeRect(x, y, width, height) { context.beginPath(); context.moveTo(x, y); context.lineTo(x + width, y); context.lineTo(x + width, y + height); context.lineTo(x, y + height); context.closePath(); context.stroke(); return surface; },
        fillCircle(x, y, radius) { context.beginPath(); context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); context.fill(); return surface; },
        strokeCircle(x, y, radius) { context.beginPath(); context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); context.stroke(); return surface; },
        fillTriangle(ax, ay, bx, by, cx, cy) { context.beginPath(); context.moveTo(ax, ay); context.lineTo(bx, by); context.lineTo(cx, cy); context.closePath(); context.fill(); return surface; },
        line(x1, y1, x2, y2) { context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); return surface; },
        fillPoly(points) {
            if (!points.length)
                return surface;
            context.beginPath();
            context.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++)
                context.lineTo(points[i][0], points[i][1]);
            context.closePath();
            context.fill();
            return surface;
        },
    };
    return surface;
}
//# sourceMappingURL=draw-surface.js.map