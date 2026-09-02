const FACTORS = {
    0: { particleFraction: 1, hazeFraction: 1, agentFraction: 1, ambientLoopFraction: 1, windowFraction: 1, glowDetail: 1 },
    1: { particleFraction: .75, hazeFraction: .9, agentFraction: .8, ambientLoopFraction: 1, windowFraction: .8, glowDetail: .75 },
    2: { particleFraction: .55, hazeFraction: .75, agentFraction: .65, ambientLoopFraction: .5, windowFraction: .55, glowDetail: .4 },
    3: { particleFraction: .4, hazeFraction: .6, agentFraction: .5, ambientLoopFraction: 0, windowFraction: .3, glowDetail: 0 },
};
// The throttled dynamic interval. 33 ms (~30 FPS) is the architecture: it is what keeps a phone from
// spending its battery on drifting haze, and it is the floor every device is held to.
//
// The smooth interval is 15 ms rather than an arithmetic 16.7, and deliberately so: the throttle
// compares against the interval between animation frames, so any threshold above one display
// interval simply drops every second frame and lands back on 30 FPS. Below it, every frame draws --
// so this value means "paint at the display's rate", which is 60 FPS on ordinary hardware. It is
// granted only to a tier-0 renderer whose own measured average draw cost is a fraction of the
// budget, so the second half of the frames is paid for out of measured headroom, never assumed.
export const DYNAMIC_FRAME_MS = 33;
export const DYNAMIC_FRAME_MS_SMOOTH = 15;
export const REDUCED_MOTION_FRAME_MS = 180;
export const SMOOTH_FRAME_COST_BUDGET_MS = 6;
/**
 * Reduced motion is the strongest signal and wins outright: nothing is animating, so the layer only
 * has to repaint often enough to stay current. Otherwise a tier-0 renderer whose average measured
 * draw cost sits under `SMOOTH_FRAME_COST_BUDGET_MS` earns the smoother interval; anything else --
 * an unmeasured start, a degraded tier, a cost near the budget -- keeps 30 FPS.
 */
export function dynamicFrameIntervalMs(tier, averageCostMs, reducedMotion) {
    if (reducedMotion)
        return REDUCED_MOTION_FRAME_MS;
    if (tier !== 0)
        return DYNAMIC_FRAME_MS;
    if (!(averageCostMs > 0) || averageCostMs >= SMOOTH_FRAME_COST_BUDGET_MS)
        return DYNAMIC_FRAME_MS;
    return DYNAMIC_FRAME_MS_SMOOTH;
}
export function qualityFactors(tier) { return FACTORS[tier]; }
function average(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
/**
 * Renderer-local, and deliberately so: the tier is never written to `GameState`, never touches
 * `simulationSpeed`, and only ever sheds cosmetics. Degrading takes 30 consecutive hot frames and
 * recovering 180 cool ones, with a 5 s cooldown between changes, so the tier cannot oscillate
 * around a threshold and turn the adaptation itself into the visible artefact.
 */
export class RenderQualityController {
    constructor() {
        this.tier = 0;
        this.buffer = new Float64Array(180);
        this.count = 0;
        this.head = 0; // index where next sample will be inserted
        this.sum180 = 0;
        this.sum30 = 0;
        this.lastChangeMs = 0;
    }
    /** The mean of the samples held, or 0 before enough have arrived to mean anything. */
    get averageCostMs() { return this.count >= 30 ? this.sum30 / 30 : 0; }
    update(drawCostMs, nowMs) {
        if (Number.isFinite(drawCostMs) && drawCostMs >= 0) {
            if (this.count < 180) {
                this.buffer[this.head] = drawCostMs;
                this.sum180 += drawCostMs;
                this.count++;
                this.head = (this.head + 1) % 180;
            }
            else {
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
        if (nowMs - this.lastChangeMs < 5000)
            return this.tier;
        if (this.tier < 3 && this.count >= 30 && (this.sum30 / 30) > 24) {
            this.tier = (this.tier + 1);
            this.lastChangeMs = nowMs;
            this.resetSamples();
            return this.tier;
        }
        if (this.tier > 0 && this.count === 180 && (this.sum180 / 180) < 14) {
            this.tier = (this.tier - 1);
            this.lastChangeMs = nowMs;
            this.resetSamples();
        }
        return this.tier;
    }
    resetSamples() {
        this.buffer.fill(0);
        this.count = 0;
        this.head = 0;
        this.sum180 = 0;
        this.sum30 = 0;
    }
    reset() {
        this.tier = 0;
        this.lastChangeMs = 0;
        this.resetSamples();
    }
}
//# sourceMappingURL=quality.js.map