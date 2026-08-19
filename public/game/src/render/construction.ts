export const CONSTRUCTION_MS = 1800;
export const CONSTRUCTION_REDUCED_MS = 400;

/**
 * Presentation-only timing for structure upgrades. Owned by the renderer, discarded on teardown,
 * never part of GameState. The first observation of a structure establishes a baseline without
 * animating, so loading a save does not put the entire world under scaffolding.
 */
export class ConstructionTracker {
  private levels = new Map<string, number>();
  private active = new Map<string, number>();

  constructor(private duration: number = CONSTRUCTION_MS) {}

  sync(structures: ReadonlyArray<{ id: string; level: number }>, now: number): void {
    // Drop structures the world no longer contains first. Without this both maps grow for the whole
    // run, and an id that vanishes and later returns at a higher level animates a build that never
    // happened, because its stale baseline is still on record.
    const present = new Set(structures.map(structure => structure.id));
    for (const id of this.levels.keys()) if (!present.has(id)) this.levels.delete(id);
    for (const id of this.active.keys()) if (!present.has(id)) this.active.delete(id);
    for (const structure of structures) {
      const previous = this.levels.get(structure.id);
      if (previous !== undefined && structure.level > previous) this.active.set(structure.id, now);
      this.levels.set(structure.id, structure.level);
    }
  }

  prune(now: number): void {
    for (const [id, startedAt] of this.active) if (now - startedAt >= this.duration) this.active.delete(id);
  }

  isBuilding(id: string, now: number): boolean {
    const startedAt = this.active.get(id);
    return startedAt !== undefined && now - startedAt < this.duration;
  }

  progress(id: string, now: number): number {
    const startedAt = this.active.get(id);
    if (startedAt === undefined || now - startedAt >= this.duration) return 1;
    return Math.max(0, (now - startedAt) / this.duration);
  }

  get activeCount(): number { return this.active.size; }

  reset(): void { this.levels.clear(); this.active.clear(); }
}
