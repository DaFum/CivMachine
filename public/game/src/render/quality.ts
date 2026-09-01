export type RenderQualityTier = 0 | 1 | 2 | 3;
export interface QualityFactors { particleFraction:number; hazeFraction:number; agentFraction:number; ambientLoopFraction:number; }

const FACTORS: Readonly<Record<RenderQualityTier,QualityFactors>> = {
  0:{particleFraction:1,hazeFraction:1,agentFraction:1,ambientLoopFraction:1},
  1:{particleFraction:.75,hazeFraction:.9,agentFraction:.8,ambientLoopFraction:1},
  2:{particleFraction:.55,hazeFraction:.75,agentFraction:.65,ambientLoopFraction:.5},
  3:{particleFraction:.4,hazeFraction:.6,agentFraction:.5,ambientLoopFraction:0},
};

export function qualityFactors(tier: RenderQualityTier): QualityFactors { return FACTORS[tier]; }

function average(values: ReadonlyArray<number>): number { return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : 0; }

/**
 * Renderer-local, and deliberately so: the tier is never written to `GameState`, never touches
 * `simulationSpeed`, and only ever sheds cosmetics. Degrading takes 30 consecutive hot frames and
 * recovering 180 cool ones, with a 5 s cooldown between changes, so the tier cannot oscillate
 * around a threshold and turn the adaptation itself into the visible artefact.
 */
export class RenderQualityController {
  tier: RenderQualityTier = 0;
  private buffer = new Float64Array(180);
  private count = 0;
  private head = 0; // index where next sample will be inserted
  private sum180 = 0;
  private sum30 = 0;
  private lastChangeMs = 0;

  update(drawCostMs: number, nowMs: number): RenderQualityTier {
    if (Number.isFinite(drawCostMs) && drawCostMs >= 0) {
      if (this.count < 180) {
        this.buffer[this.head] = drawCostMs;
        this.sum180 += drawCostMs;
        this.count++;
        this.head = (this.head + 1) % 180;
      } else {
        const oldVal = this.buffer[this.head];
        this.buffer[this.head] = drawCostMs;
        this.sum180 += drawCostMs - oldVal;
        this.head = (this.head + 1) % 180;
      }

      // Maintain sum30 for the latest 30 samples
      // The latest 30 samples are at indices (head - 1 - i + 180) % 180 for i=0..29
      if (this.count >= 30) {
        let s30 = 0;
        for (let i = 0; i < 30; i++) {
          const idx = (this.head - 1 - i + 180) % 180;
          s30 += this.buffer[idx];
        }
        this.sum30 = s30;
      }
    }

    if (nowMs - this.lastChangeMs < 5000) return this.tier;

    if (this.tier < 3 && this.count >= 30 && (this.sum30 / 30) > 24) {
      this.tier = (this.tier + 1) as RenderQualityTier;
      this.lastChangeMs = nowMs;
      this.resetSamples();
      return this.tier;
    }

    if (this.tier > 0 && this.count === 180 && (this.sum180 / 180) < 14) {
      this.tier = (this.tier - 1) as RenderQualityTier;
      this.lastChangeMs = nowMs;
      this.resetSamples();
    }

    return this.tier;
  }

  private resetSamples(): void {
    this.buffer.fill(0);
    this.count = 0;
    this.head = 0;
    this.sum180 = 0;
    this.sum30 = 0;
  }

  reset(): void {
    this.tier = 0;
    this.lastChangeMs = 0;
    this.resetSamples();
  }
}
