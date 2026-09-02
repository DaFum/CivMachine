import type { Civilization, WorldMemoryMark, WorldMemoryState, WorldScar } from '../game/types.js';
import { sanitizeWorldMemory } from '../game/world-memory.js';
import type { DrawSurface } from './draw-surface.js';
import { mixColor, shade } from './primitives.js';
import type { Settlement } from './settlements.js';

export interface MemoryViewBand { from: number; to: number }

/**
 * The structural half of saved memory: what a mark or scar *is*, never how many decisions have gone
 * past. `sequence` climbs on every completed decision, so folding it in would rebuild every cached
 * layer once per choice for memory that did not change.
 */
export function worldMemorySignature(value: unknown): string {
  const memory = sanitizeWorldMemory(value);
  const marks = memory.marks.map(mark => `${mark.domain}:${mark.motif}:${mark.strength}:${mark.anchor01.toFixed(4)}:${mark.repaired ? 1 : 0}`).sort();
  const scars = memory.scars.map(scar => `${scar.domain}:${scar.motif}:${scar.strength}:${scar.anchor01.toFixed(4)}:${scar.evolution}`).sort();
  return `${marks.join(';')}|${scars.join(';')}`;
}

// A mark belongs to the civilization, not to empty ground, so its deterministic anchor snaps to the
// nearest settlement centre rather than landing wherever the hash pointed.
function anchorX(anchor01: number, worldWidth: number, settlements: ReadonlyArray<Settlement>): number {
  const target = Math.max(0, Math.min(worldWidth, anchor01 * worldWidth));
  if (!settlements.length) return target;
  // One scan rather than a copy and a sort: this runs per mark and per scar, and the scar halos run
  // on the dynamic layer. A strict `<` keeps the first settlement in layout order when two tie,
  // which is what the stable sort it replaces did.
  let best = settlements[0]!, bestDistance = Math.abs(best.centerX - target);
  for (let i = 1; i < settlements.length; i++) {
    const settlement = settlements[i]!, distance = Math.abs(settlement.centerX - target);
    if (distance < bestDistance) { best = settlement; bestDistance = distance; }
  }
  return best.centerX;
}

function visible(x: number, view: MemoryViewBand, slack = 90): boolean { return x >= view.from - slack && x <= view.to + slack; }

function drawMark(surface: DrawSurface, mark: WorldMemoryMark, x: number, ground: number, accent: number): void {
  const s = mark.strength;
  const color = mark.repaired ? 0x73e6bd : accent;
  const alpha = mark.repaired ? .38 : .68;

  if (mark.domain === 'built_environment') {
    surface.fillStyle(color, alpha * .3).fillRect(x - 10 - s * 4, ground - 20 - s * 10, 20 + s * 8, 20 + s * 10);
    surface.lineStyle(1.4, color, alpha).strokeRect(x - 12 - s * 4, ground - 22 - s * 10, 24 + s * 8, 24 + s * 10);
    if (mark.repaired) surface.lineStyle(1, 0x73e6bd, .5).line(x - 12 - s * 4, ground, x + 12 + s * 4, ground - 22 - s * 10);
  }
  else if (mark.domain === 'identity') {
    for (let i = 0; i < s + 1; i++) surface.lineStyle(1.4, color, alpha).strokeCircle(x, ground - 24 - s * 10, 8 + i * 7);
  }
  else if (mark.domain === 'control') {
    surface.lineStyle(1.4, color, alpha).line(x, ground - 4, x, ground - 60 - s * 9);
    surface.strokeCircle(x, ground - 65 - s * 9, 8 + s * 3);
  }
  else if (mark.domain === 'social') {
    for (let i = 0; i < 3 + s; i++) surface.fillStyle(mark.repaired ? 0x73e6bd : 0xee6973, alpha * .75).fillCircle(x - 20 + i * 9, ground - 4 - (i % 2) * 3, 2.5);
  }
  else if (mark.domain === 'ecology') {
    for (let i = 0; i < 2 + s; i++) {
      surface.lineStyle(1.3, mark.repaired ? 0x73e6bd : 0x8ee66b, alpha).line(x + i * 8 - 12, ground + 10, x + i * 10 - 18, ground - 22 - s * 6);
    }
    // Blight reaches the foreground the player looks across, not only the strip it stands on: the
    // ground in front of the mark is stained and its growth is bent over.
    surface.fillStyle(mark.repaired ? 0x1d3a2c : 0x2a2a16, mark.repaired ? .3 : .5).fillRect(x - 26 - s * 5, ground + 12, 52 + s * 10, 10 + s * 3);
    for (let i = 0; i < 3; i++) {
      surface.lineStyle(1, mark.repaired ? 0x73e6bd : 0x6b6a35, alpha * .7).line(x - 18 + i * 16, ground + 22 + s * 2, x - 12 + i * 16, ground + 14);
    }
  }
  else {
    surface.lineStyle(1.6, mark.repaired ? 0x73e6bd : 0xee6973, alpha).line(x - 14, ground - 55 - s * 9, x + 5, ground - 28);
    surface.line(x + 5, ground - 28, x - 10, ground - 4);
  }
}

function drawScar(surface: DrawSurface, scar: WorldScar, x: number, ground: number, accent: number): void {
  const s = scar.strength;
  const alpha = .6 + s * .12;

  if (scar.domain === 'reality') {
    // The fracture continues past the settlement plane into the near ground, so a reality breach
    // reads as damage to the terrain rather than as a decal standing on it.
    surface.lineStyle(1.4, 0xee6973, alpha * .5).line(x - 8, ground + 16, x - 26 - s * 4, ground + 44 + s * 4);
    surface.lineStyle(1.2, 0xee6973, alpha * .38).line(x + 6, ground + 16, x + 22 + s * 4, ground + 40 + s * 3);
    // Scorched crater baseline extending deep into ground terrain
    surface.fillStyle(0x0a050d, .72).fillRect(x - 30 - s * 8, ground - 2, 60 + s * 16, 18);
    for (let i = 0; i < 3 + s + Math.min(2, scar.evolution); i++) {
      surface.lineStyle(1.6 + (i % 2) * 0.4, 0xee6973, alpha)
        .line(x - 26 + i * 10, ground - 92, x - 14 + i * 8, ground + 14);
    }
  }
  else if (scar.domain === 'civilization') {
    // Scorched foundation crater plinth and structural fracture lines
    surface.fillStyle(0x0e0612, .95).fillRect(x - 32 - s * 8, ground - 14 - s * 8, 64 + s * 16, 18 + s * 8);
    surface.lineStyle(1.5, 0xee6973, alpha).line(x - 32 - s * 8, ground - 14 - s * 8, x + 32 + s * 8, ground);
    surface.lineStyle(1.2, 0xee6973, alpha * .7).line(x - 20 - s * 4, ground, x + 20 + s * 4, ground - 14 - s * 8);
    // Two broken shells standing in the skyline the settlement kept: what the world lost is part of
    // its silhouette, not a mark on the floor beside it.
    for (let i = 0; i < 2; i++) {
      const shellX = x - 22 - s * 5 + i * (34 + s * 8);
      const shellHeight = 30 + s * 12 - i * 8;
      surface.fillStyle(shade(0x120a16, .1), .92).fillRect(shellX, ground - shellHeight, 14 + s * 2, shellHeight);
      surface.fillStyle(mixColor(0x120a16, 0xee6973, .12), .8).fillTriangle(shellX, ground - shellHeight, shellX + 14 + s * 2, ground - shellHeight + 10, shellX, ground - shellHeight + 14);
    }
  }
  else {
    surface.fillStyle(0x0a050d, .6).fillRect(x - 24 - s * 5, ground - 6, 48 + s * 10, 10);
    surface.lineStyle(2.2, accent, alpha).strokeCircle(x, ground - 48 - s * 10, 18 + s * 7);
    surface.lineStyle(1.2, accent, alpha * .8).strokeRect(x - 14 - s * 4, ground - 60 - s * 12, 28 + s * 8, 28 + s * 8);
    // A replaced identity leaves its own monument beside whatever the settlement built instead: a
    // plinth carrying a broken shaft, in the accent the current path uses.
    surface.fillStyle(mixColor(0x0a050d, accent, .18), .9).fillRect(x - 9 - s, ground - 22 - s * 4, 18 + s * 2, 22 + s * 4);
    surface.lineStyle(1.4, accent, alpha * .55).line(x - 9 - s, ground - 22 - s * 4, x + 4, ground - 30 - s * 5);
  }
}

/** Persistent geometry, so it belongs on the cached scenery layer that scrolls 1:1 with the world. */
export function drawWorldMemoryScenery(surface: DrawSurface, civ: Civilization, worldWidth: number, ground: number, settlements: ReadonlyArray<Settlement>, accent: number, view: MemoryViewBand): void {
  const memory: WorldMemoryState = sanitizeWorldMemory(civ.visualMemory);
  for (const mark of memory.marks) { const x = anchorX(mark.anchor01, worldWidth, settlements); if (visible(x,view)) drawMark(surface,mark,x,ground,accent); }
  for (const scar of memory.scars) { const x = anchorX(scar.anchor01, worldWidth, settlements); if (visible(x,view,120)) drawScar(surface,scar,x,ground,accent); }
}

/** The only animated part of memory: a slow halo over scars, so the geometry itself stays cached. */
export function drawWorldMemoryAccents(surface: DrawSurface, civ: Civilization, worldWidth: number, ground: number, settlements: ReadonlyArray<Settlement>, accent: number, view: MemoryViewBand, time: number, reducedMotion: boolean): void {
  const memory = sanitizeWorldMemory(civ.visualMemory);
  const pulse = reducedMotion ? 1 : .65 + Math.sin(time*.002)*.35;
  for (const scar of memory.scars) {
    const x = anchorX(scar.anchor01, worldWidth, settlements); if (!visible(x,view,120)) continue;
    if (scar.domain === 'reality') surface.lineStyle(1,0xee6973,.12+.12*pulse).strokeCircle(x,ground-42,22+scar.strength*8);
    if (scar.domain === 'identity') surface.lineStyle(1,accent,.1+.12*pulse).strokeCircle(x,ground-52,28+scar.strength*7);
  }
}
