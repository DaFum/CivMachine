export class CachedCanvasSurface {
    constructor(context, toColor) {
        this.context = context;
        this.toColor = toColor;
        this.lastFillStyle = '';
        this.lastStrokeStyle = '';
        this.lastLineWidth = -1;
        this.lastCompositeOp = 'source-over';
    }
    resetState() {
        this.lastFillStyle = '';
        this.lastStrokeStyle = '';
        this.lastLineWidth = -1;
        this.lastCompositeOp = 'source-over';
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
    fillLinearGradientRect(x, y, width, height, stops, x0, y0, x1, y1) {
        if (typeof this.context.createLinearGradient === 'function') {
            const gx0 = x0 ?? x;
            const gy0 = y0 ?? y;
            const gx1 = x1 ?? x;
            const gy1 = y1 ?? (y + height);
            const grad = this.context.createLinearGradient(gx0, gy0, gx1, gy1);
            for (const stop of stops) {
                grad.addColorStop(stop.offset, this.toColor(stop.color, stop.alpha ?? 1));
            }
            this.context.fillStyle = grad;
            this.lastFillStyle = '';
            this.context.fillRect(x, y, width, height);
        }
        else {
            if (stops.length > 0) {
                this.fillStyle(stops[0].color, stops[0].alpha ?? 1);
            }
            this.context.fillRect(x, y, width, height);
        }
        return this;
    }
    fillRadialGlow(cx, cy, innerRadius, outerRadius, stops) {
        const rIn = Math.max(0, innerRadius);
        const rOut = Math.max(0, outerRadius);
        if (rOut <= 0)
            return this;
        if (typeof this.context.createRadialGradient === 'function') {
            const grad = this.context.createRadialGradient(cx, cy, rIn, cx, cy, rOut);
            for (const stop of stops) {
                grad.addColorStop(stop.offset, this.toColor(stop.color, stop.alpha ?? 1));
            }
            this.context.fillStyle = grad;
            this.lastFillStyle = '';
            this.context.beginPath();
            this.context.arc(cx, cy, rOut, 0, Math.PI * 2);
            this.context.fill();
        }
        else {
            if (stops.length > 0) {
                this.fillStyle(stops[0].color, stops[0].alpha ?? 1);
            }
            this.context.beginPath();
            this.context.arc(cx, cy, rOut, 0, Math.PI * 2);
            this.context.fill();
        }
        return this;
    }
    setCompositeOperation(op) {
        if (this.lastCompositeOp !== op) {
            this.context.globalCompositeOperation = op;
            this.lastCompositeOp = op;
        }
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