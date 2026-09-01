export const CONSTRUCTION_MS = 1800;
export const CONSTRUCTION_REDUCED_MS = 400;
// Fixed ceiling on structures under scaffolding at once. A new settlement can appear with a dozen
// buildings in it; animating all of them reads as a glitch rather than as growth. Fixed rather than
// adaptive so a test can assert it, as the visualization design requires of every render budget.
export const MAX_CONCURRENT_BUILDS = 6;

/**
 * Presentation-only timing for structure growth. Owned by the renderer, discarded on teardown, never
 * part of GameState.
 *
 * Two things are worth animating: a structure gaining a level, and a structure appearing where there
 * was none. Only the first was animated until now, which meant the common case was silent --
 * `buildingCount` climbs with Development, so most growth arrives as new ids rather than as higher
 * levels, and the world simply got denser between one blink and the next.
 *
 * The first sync of a tracker's life stays silent regardless, so loading a save does not put the
 * whole world under scaffolding.
 */
export class ConstructionTracker {
  private levels = new Map<string, number>();
  private active = new Map<string, number>();
  // Never pruned, unlike `levels`. Structure ids are positional (`s2:7`), so a rebuild that shrinks
  // one settlement and grows another makes ids vanish and come back. That is layout churn, not
  // construction, and replaying a build for it would animate noise. Bounded by the id space, which
  // is at most nine settlements of eighty-four structures.
  private seenEver = new Set<string>();
  private seeded = false;

  constructor(private duration: number = CONSTRUCTION_MS) {}

  setDuration(duration: number): void {
    this.duration = duration;
  }

  sync(structures: ReadonlyArray<{ id: string; level: number }>, now: number): void {
    // Drop structures the world no longer contains first. Without this both maps grow for the whole
    // run, and an id that vanishes and later returns at a higher level animates a build that never
    // happened, because its stale baseline is still on record.
    const present = new Set(structures.map(structure => structure.id));
    for (const id of this.levels.keys()) if (!present.has(id)) this.levels.delete(id);
    for (const id of this.active.keys()) if (!present.has(id)) this.active.delete(id);
    for (const structure of structures) {
      const previous = this.levels.get(structure.id);
      const arrived = previous === undefined && this.seeded && !this.seenEver.has(structure.id);
      const grew = previous !== undefined && structure.level > previous;
      // Document order is the settlement layout's own order, so which structures win the budget is
      // deterministic rather than dependent on Map iteration luck.
      if ((arrived || grew) && this.active.size < MAX_CONCURRENT_BUILDS) this.active.set(structure.id, now);
      this.levels.set(structure.id, structure.level);
      this.seenEver.add(structure.id);
    }
    this.seeded = true;
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

  reset(): void { this.levels.clear(); this.active.clear(); this.seenEver.clear(); this.seeded = false; }
}
