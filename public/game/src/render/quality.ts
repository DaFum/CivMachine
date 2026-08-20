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
  private samples: number[] = [];
  private lastChangeMs = 0;

  update(drawCostMs: number, nowMs: number): RenderQualityTier {
    if (Number.isFinite(drawCostMs) && drawCostMs >= 0) { this.samples.push(drawCostMs); while(this.samples.length>180)this.samples.shift(); }
    if (nowMs - this.lastChangeMs < 5000) return this.tier;
    const hot = this.samples.slice(-30);
    if (this.tier < 3 && hot.length === 30 && average(hot) > 24) {
      this.tier = (this.tier + 1) as RenderQualityTier; this.lastChangeMs = nowMs; this.samples.length = 0; return this.tier;
    }
    const cool = this.samples.slice(-180);
    if (this.tier > 0 && cool.length === 180 && average(cool) < 14) {
      this.tier = (this.tier - 1) as RenderQualityTier; this.lastChangeMs = nowMs; this.samples.length = 0;
    }
    return this.tier;
  }

  reset(): void { this.tier = 0; this.samples.length = 0; this.lastChangeMs = 0; }
}
