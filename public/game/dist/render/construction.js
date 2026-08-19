export const CONSTRUCTION_MS = 1800;
export const CONSTRUCTION_REDUCED_MS = 400;
/**
 * Presentation-only timing for structure upgrades. Owned by the renderer, discarded on teardown,
 * never part of GameState. The first observation of a structure establishes a baseline without
 * animating, so loading a save does not put the entire world under scaffolding.
 */
export class ConstructionTracker {
    constructor(duration = CONSTRUCTION_MS) {
        this.duration = duration;
        this.levels = new Map();
        this.active = new Map();
    }
    sync(structures, now) {
        for (const structure of structures) {
            const previous = this.levels.get(structure.id);
            if (previous !== undefined && structure.level > previous)
                this.active.set(structure.id, now);
            this.levels.set(structure.id, structure.level);
        }
    }
    prune(now) {
        for (const [id, startedAt] of this.active)
            if (now - startedAt >= this.duration)
                this.active.delete(id);
    }
    isBuilding(id, now) {
        const startedAt = this.active.get(id);
        return startedAt !== undefined && now - startedAt < this.duration;
    }
    progress(id, now) {
        const startedAt = this.active.get(id);
        if (startedAt === undefined || now - startedAt >= this.duration)
            return 1;
        return Math.max(0, (now - startedAt) / this.duration);
    }
    get activeCount() { return this.active.size; }
    reset() { this.levels.clear(); this.active.clear(); }
}
//# sourceMappingURL=construction.js.map