export class CachedCanvasSurface {
    constructor(context, toColor) {
        this.context = context;
        this.toColor = toColor;
        this.lastFillStyle = '';
        this.lastStrokeStyle = '';
        this.lastLineWidth = -1;
    }
    resetState() {
        this.lastFillStyle = '';
        this.lastStrokeStyle = '';
        this.lastLineWidth = -1;
    }
    fillStyle(color, alpha = 1) {
        const colStr = this.toColor(color, alpha);
        if (this.lastFillStyle !== colStr) {
            this.context.fillStyle = colStr;
            this.lastFillStyle = colStr;
        }
        return this;
    }
    lineStyle(width, color, alpha = 1) {
        if (this.lastLineWidth !== width) {
            this.context.lineWidth = width;
            this.lastLineWidth = width;
        }
        const colStr = this.toColor(color, alpha);
        if (this.lastStrokeStyle !== colStr) {
            this.context.strokeStyle = colStr;
            this.lastStrokeStyle = colStr;
        }
        return this;
    }
    fillRect(x, y, width, height) {
        this.context.fillRect(x, y, width, height);
        return this;
    }
    strokeRect(x, y, width, height) {
        this.context.beginPath();
        this.context.moveTo(x, y);
        this.context.lineTo(x + width, y);
        this.context.lineTo(x + width, y + height);
        this.context.lineTo(x, y + height);
        this.context.closePath();
        this.context.stroke();
        return this;
    }
    fillCircle(x, y, radius) {
        this.context.beginPath();
        this.context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
        this.context.fill();
        return this;
    }
    strokeCircle(x, y, radius) {
        this.context.beginPath();
        this.context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
        this.context.stroke();
        return this;
    }
    fillTriangle(ax, ay, bx, by, cx, cy) {
        this.context.beginPath();
        this.context.moveTo(ax, ay);
        this.context.lineTo(bx, by);
        this.context.lineTo(cx, cy);
        this.context.closePath();
        this.context.fill();
        return this;
    }
    line(x1, y1, x2, y2) {
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.stroke();
        return this;
    }
    fillPoly(points) {
        if (!points.length)
            return this;
        this.context.beginPath();
        this.context.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++)
            this.context.lineTo(points[i][0], points[i][1]);
        this.context.closePath();
        this.context.fill();
        return this;
    }
}
export function canvasSurface(context, toColor) {
    return new CachedCanvasSurface(context, toColor);
}
//# sourceMappingURL=draw-surface.js.map