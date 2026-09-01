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
  resetState(): void;
}

export class CachedCanvasSurface implements DrawSurface {
  private lastFillStyle = '';
  private lastStrokeStyle = '';
  private lastLineWidth = -1;

  constructor(
    private context: any,
    private toColor: (value: number, alpha?: number) => string
  ) {}

  resetState(): void {
    this.lastFillStyle = '';
    this.lastStrokeStyle = '';
    this.lastLineWidth = -1;
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
}

export function canvasSurface(context: any, toColor: (value: number, alpha?: number) => string): DrawSurface {
  return new CachedCanvasSurface(context, toColor);
}
