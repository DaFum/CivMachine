/**
 * The drawing vocabulary every world module writes against. Keeping it separate from the 2D
 * context lets the drawing code stay free of transform bookkeeping and lets tests record calls.
 */
export interface GradientStop {
  offset: number;
  color: number;
  alpha?: number;
}

export interface DrawSurface {
  fillStyle(color: number, alpha?: number): DrawSurface;
  lineStyle(width: number, color: number, alpha?: number): DrawSurface;
  fillRect(x: number, y: number, width: number, height: number): DrawSurface;
  fillLinearGradientRect(
    x: number,
    y: number,
    width: number,
    height: number,
    stops: ReadonlyArray<GradientStop>,
    x0?: number,
    y0?: number,
    x1?: number,
    y1?: number
  ): DrawSurface;
  fillRadialGlow(
    cx: number,
    cy: number,
    innerRadius: number,
    outerRadius: number,
    stops: ReadonlyArray<GradientStop>
  ): DrawSurface;
  fillEllipseGlow(
    cx: number,
    cy: number,
    radiusX: number,
    radiusY: number,
    stops: ReadonlyArray<GradientStop>
  ): DrawSurface;
  fillLinearGradientPoly(
    points: ReadonlyArray<readonly [number, number]>,
    stops: ReadonlyArray<GradientStop>,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): DrawSurface;
  setCompositeOperation(op: GlobalCompositeOperation): DrawSurface;
  strokeRect(x: number, y: number, width: number, height: number): DrawSurface;
  fillCircle(x: number, y: number, radius: number): DrawSurface;
  strokeCircle(x: number, y: number, radius: number): DrawSurface;
  fillTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): DrawSurface;
  line(x1: number, y1: number, x2: number, y2: number): DrawSurface;
  fillPoly(points: ReadonlyArray<readonly [number, number]>): DrawSurface;
  strokePoly(points: ReadonlyArray<readonly [number, number]>): DrawSurface;
  resetState(): void;
}

export class CachedCanvasSurface implements DrawSurface {
  private lastFillStyle = '';
  private lastStrokeStyle = '';
  private lastLineWidth = -1;
  private lastCompositeOp = 'source-over';

  constructor(
    private context: any,
    private toColor: (value: number, alpha?: number) => string
  ) {}

  resetState(): void {
    this.lastFillStyle = '';
    this.lastStrokeStyle = '';
    this.lastLineWidth = -1;
    this.lastCompositeOp = 'source-over';
    if (this.context && 'globalCompositeOperation' in this.context) {
      this.context.globalCompositeOperation = 'source-over';
    }
  }

  fillStyle(color: number, alpha = 1): DrawSurface {
    const colStr = this.toColor(color, alpha);
    if (this.lastFillStyle !== colStr) {
      this.context.fillStyle = colStr;
      this.lastFillStyle = colStr;
    }
    return this;
  }

  lineStyle(width: number, color: number, alpha = 1): DrawSurface {
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

  fillRect(x: number, y: number, width: number, height: number): DrawSurface {
    this.context.fillRect(x, y, width, height);
    return this;
  }

  fillLinearGradientRect(
    x: number,
    y: number,
    width: number,
    height: number,
    stops: ReadonlyArray<GradientStop>,
    x0?: number,
    y0?: number,
    x1?: number,
    y1?: number
  ): DrawSurface {
    if (width <= 0 || height <= 0 || !stops.length) return this;
    if (typeof this.context.createLinearGradient === 'function') {
      const gx0 = x0 ?? x;
      const gy0 = y0 ?? y;
      const gx1 = x1 ?? x;
      const gy1 = y1 ?? (y + height);
      const grad = this.context.createLinearGradient(gx0, gy0, gx1, gy1);
      for (const stop of stops) {
        const offset = Math.max(0, Math.min(1, Number.isFinite(stop.offset) ? stop.offset : 0));
        grad.addColorStop(offset, this.toColor(stop.color, stop.alpha ?? 1));
      }
      this.context.fillStyle = grad;
      this.lastFillStyle = '';
      this.context.fillRect(x, y, width, height);
    } else {
      if (stops.length > 0) {
        this.fillStyle(stops[0]!.color, stops[0]!.alpha ?? 1);
      }
      this.context.fillRect(x, y, width, height);
    }
    return this;
  }

  fillRadialGlow(
    cx: number,
    cy: number,
    innerRadius: number,
    outerRadius: number,
    stops: ReadonlyArray<GradientStop>
  ): DrawSurface {
    const rIn = Math.max(0, innerRadius);
    const rOut = Math.max(0, outerRadius);
    if (rOut <= 0 || !stops.length) return this;
    if (typeof this.context.createRadialGradient === 'function') {
      const grad = this.context.createRadialGradient(cx, cy, rIn, cx, cy, rOut);
      for (const stop of stops) {
        const offset = Math.max(0, Math.min(1, Number.isFinite(stop.offset) ? stop.offset : 0));
        grad.addColorStop(offset, this.toColor(stop.color, stop.alpha ?? 1));
      }
      this.context.fillStyle = grad;
      this.lastFillStyle = '';
      this.context.beginPath();
      this.context.arc(cx, cy, rOut, 0, Math.PI * 2);
      this.context.fill();
    } else {
      if (stops.length > 0) {
        this.fillStyle(stops[0]!.color, stops[0]!.alpha ?? 1);
      }
      this.context.beginPath();
      this.context.arc(cx, cy, rOut, 0, Math.PI * 2);
      this.context.fill();
    }
    return this;
  }

  /**
   * The same light field, flattened. Almost nothing a civilization emits is as tall as it is wide:
   * the glow over a city, the bloom along the horizon and the lit underside of a cloud bank are all
   * low and broad, and drawing them with `fillRadialGlow` meant choosing between a glow that stopped
   * short at the sides and one that climbed halfway up the sky. The vertical squash is applied to
   * the context rather than to the gradient, so the horizontal extent is exactly `radiusX` either
   * way -- which is what keeps the caller's culling, stated in x, honest.
   */
  fillEllipseGlow(
    cx: number,
    cy: number,
    radiusX: number,
    radiusY: number,
    stops: ReadonlyArray<GradientStop>
  ): DrawSurface {
    const rx = Math.max(0, radiusX);
    const ry = Math.max(0, radiusY);
    if (rx <= 0 || ry <= 0 || !stops.length) return this;
    const squash = ry / rx;
    // No context transform to squash with (a recording double, an older 2D context): fall back to a
    // circle at the horizontal radius rather than dropping the light entirely.
    if (typeof this.context.transform !== 'function' || typeof this.context.save !== 'function') {
      return this.fillRadialGlow(cx, cy, 0, rx, stops);
    }
    this.context.save();
    // Scale about `cy`, so the flattened field stays centred where the caller put it.
    this.context.transform(1, 0, 0, squash, 0, cy * (1 - squash));
    this.fillRadialGlow(cx, cy, 0, rx, stops);
    this.context.restore();
    // The restore rolls back whatever fill style the glow left behind, so the cache must forget it.
    // Stroke style and line width were never touched, so they survive the save/restore unchanged.
    this.lastFillStyle = '';
    return this;
  }

  /**
   * A ridgeline lit from the sky down into its own shadow: one path, one gradient, so a terrain
   * layer gets vertical lighting without a rectangle per band. The gradient axis is given in the
   * same space as the points, which is what lets the caller aim it at the horizon.
   */
  fillLinearGradientPoly(
    points: ReadonlyArray<readonly [number, number]>,
    stops: ReadonlyArray<GradientStop>,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): DrawSurface {
    if (points.length < 2 || !stops.length) return this;
    if (typeof this.context.createLinearGradient === 'function') {
      const grad = this.context.createLinearGradient(x0, y0, x1, y1);
      for (const stop of stops) {
        const offset = Math.max(0, Math.min(1, Number.isFinite(stop.offset) ? stop.offset : 0));
        grad.addColorStop(offset, this.toColor(stop.color, stop.alpha ?? 1));
      }
      this.context.fillStyle = grad;
      this.lastFillStyle = '';
    } else {
      this.fillStyle(stops[0]!.color, stops[0]!.alpha ?? 1);
    }
    this.context.beginPath();
    this.context.moveTo(points[0]![0], points[0]![1]);
    for (let i = 1, len = points.length; i < len; i++) this.context.lineTo(points[i]![0], points[i]![1]);
    this.context.closePath();
    this.context.fill();
    return this;
  }

  setCompositeOperation(op: GlobalCompositeOperation): DrawSurface {
    if (this.lastCompositeOp !== op) {
      this.context.globalCompositeOperation = op;
      this.lastCompositeOp = op;
    }
    return this;
  }

  strokeRect(x: number, y: number, width: number, height: number): DrawSurface {
    this.context.beginPath();
    this.context.moveTo(x, y);
    this.context.lineTo(x + width, y);
    this.context.lineTo(x + width, y + height);
    this.context.lineTo(x, y + height);
    this.context.closePath();
    this.context.stroke();
    return this;
  }

  fillCircle(x: number, y: number, radius: number): DrawSurface {
    this.context.beginPath();
    this.context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
    this.context.fill();
    return this;
  }

  strokeCircle(x: number, y: number, radius: number): DrawSurface {
    this.context.beginPath();
    this.context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
    this.context.stroke();
    return this;
  }

  fillTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): DrawSurface {
    this.context.beginPath();
    this.context.moveTo(ax, ay);
    this.context.lineTo(bx, by);
    this.context.lineTo(cx, cy);
    this.context.closePath();
    this.context.fill();
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number): DrawSurface {
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.stroke();
    return this;
  }

  fillPoly(points: ReadonlyArray<readonly [number, number]>): DrawSurface {
    if (!points.length) return this;
    this.context.beginPath();
    this.context.moveTo(points[0]![0], points[0]![1]);
    for (let i = 1; i < points.length; i++) this.context.lineTo(points[i]![0], points[i]![1]);
    this.context.closePath();
    this.context.fill();
    return this;
  }

  /** An open polyline: a ridge rim light or a skyline outline as one path rather than N strokes. */
  strokePoly(points: ReadonlyArray<readonly [number, number]>): DrawSurface {
    if (points.length < 2) return this;
    this.context.beginPath();
    this.context.moveTo(points[0]![0], points[0]![1]);
    for (let i = 1, len = points.length; i < len; i++) this.context.lineTo(points[i]![0], points[i]![1]);
    this.context.stroke();
    return this;
  }
}

export function canvasSurface(context: any, toColor: (value: number, alpha?: number) => string): DrawSurface {
  return new CachedCanvasSurface(context, toColor);
}
