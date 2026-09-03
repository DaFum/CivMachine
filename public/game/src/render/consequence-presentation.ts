import { consequenceProfileById } from '../game/consequence-profiles.js';
import type { DecisionFeedback } from '../game/types.js';
import type { DrawSurface } from './draw-surface.js';
import { hash01 } from './primitives.js';

export type ImpactKind = 'containment' | 'time_streak' | 'scan' | 'vent' | 'fracture' | 'growth' | 'unrest' | 'surveillance' | 'identity' | 'generic';
export interface ConsequenceImpact { kind: ImpactKind; variant: string; intensity: number; durationMs: number; staticOnly: boolean; }

function inferredKind(feedback: DecisionFeedback): ImpactKind {
  if (feedback.eventId === 'tactical:stabilize') return 'containment';
  if (feedback.eventId === 'tactical:accelerate') return 'time_streak';
  if (feedback.eventId === 'tactical:probe') return 'scan';
  if (feedback.eventId === 'tactical:vent') return 'vent';
  const tags = feedback.consequence.tags;
  if (tags.includes('reality_damage') || feedback.eventId.startsWith('entropy_crisis_')) return 'fracture';
  if (tags.includes('civil_unrest') || tags.includes('mass_casualty')) return 'unrest';
  if (tags.includes('surveillance')) return 'surveillance';
  if (tags.includes('religious_shift') || tags.includes('path_shift') || tags.includes('institution_growth')) return 'identity';
  if (tags.includes('urban_growth') || tags.includes('technological_growth')) return 'growth';
  if (tags.includes('containment') || tags.includes('stabilization')) return 'containment';
  return 'generic';
}

/**
 * Reduced motion keeps the semantics -- same kind, same signature variant -- and drops only the
 * travelling animation: a short static frame instead of a sweep.
 */
export function consequenceImpact(feedback: DecisionFeedback, reducedMotion: boolean): ConsequenceImpact {
  const profile = consequenceProfileById(feedback.consequence.signatureProfile);
  const intensity = feedback.consequence.significance === 'turning_point' ? 1 : feedback.consequence.significance === 'major' ? .72 : .45;
  return {
    kind: inferredKind(feedback),
    variant: profile?.impactVariant ?? inferredKind(feedback),
    intensity,
    durationMs: reducedMotion ? 320 : feedback.consequence.significance === 'turning_point' ? 1800 : feedback.consequence.significance === 'major' ? 1350 : 950,
    staticOnly: reducedMotion,
  };
}

function roleColor(feedback: DecisionFeedback, kind: ImpactKind, accent: number): number {
  if (kind === 'containment') return 0x73e6bd;
  if (kind === 'time_streak') return 0xf2bd63;
  if (kind === 'scan' || kind === 'surveillance') return 0x6bdcf6;
  if (kind === 'vent') return 0x9ed7ff;
  if (kind === 'fracture' || kind === 'unrest') return 0xee6973;
  if (kind === 'identity' || kind === 'growth') return accent;
  return feedback.tone === 'positive' ? 0x73e6bd : feedback.tone === 'negative' ? 0xee6973 : 0xb68cff;
}

/**
 * What an impact may know about the world it happens in. Only `centerX` is required: the renderer
 * hands whole settlements, and a caller with nothing but a position still gets a placed impact.
 */
export interface ImpactAnchor {
  centerX: number;
  radius?: number;
  structures?: ReadonlyArray<{ x: number; width: number; height: number }>;
}

/** Drawn on the dynamic layer only; the caller owns clearing it. */
export function drawConsequenceImpact(
  surface: DrawSurface,
  feedback: DecisionFeedback | null,
  startTime: number,
  time: number,
  width: number,
  height: number,
  accent: number,
  reducedMotion: boolean,
  scroll = 0,
  worldWidth = width,
  settlements: ReadonlyArray<ImpactAnchor> = []
): void {
  if (!feedback || startTime <= 0) return;
  const impact = consequenceImpact(feedback, reducedMotion);
  const elapsed = time - startTime; if (elapsed < 0 || elapsed >= impact.durationMs) return;
  const progress = impact.staticOnly ? 0 : Math.max(0, Math.min(1, elapsed / impact.durationMs));
  const fade = impact.staticOnly ? .48 : (1 - progress) * (.38 + impact.intensity * .34);
  const color = roleColor(feedback, impact.kind, accent);
  const radius = Math.min(width,height) * (.14 + impact.intensity*.12 + progress*.28);

  let anchorWorldX = scroll + width * (0.3 + hash01(feedback.sequence * 37) * 0.4);
  if (settlements.length > 0) {
    let targetIndex = 0;
    if (impact.kind === 'identity' || impact.kind === 'growth') {
      targetIndex = 0;
    } else if (impact.kind === 'containment' || impact.kind === 'fracture' || impact.kind === 'unrest') {
      targetIndex = Math.floor(hash01(feedback.sequence * 37) * settlements.length);
    } else {
      targetIndex = Math.floor(hash01(feedback.sequence * 19) * settlements.length);
    }
    const targetSettlement = settlements[targetIndex] ?? settlements[0]!;

    const viewFrom = scroll;
    const viewTo = scroll + width;
    const isVisible = (s: { centerX: number }) => s.centerX >= viewFrom && s.centerX <= viewTo;

    if (isVisible(targetSettlement)) {
      anchorWorldX = targetSettlement.centerX;
    } else {
      const visibleSettlements = settlements.filter(isVisible);
      if (visibleSettlements.length > 0) {
        let best = visibleSettlements[0]!;
        let minDist = Math.abs(best.centerX - targetSettlement.centerX);
        for (let i = 1; i < visibleSettlements.length; i++) {
          const s = visibleSettlements[i]!;
          const dist = Math.abs(s.centerX - targetSettlement.centerX);
          if (dist < minDist) {
            minDist = dist;
            best = s;
          }
        }
        anchorWorldX = best.centerX;
      } else {
        const viewCenter = scroll + width * 0.5;
        let best = settlements[0]!;
        let minDist = Math.abs(best.centerX - viewCenter);
        for (let i = 1; i < settlements.length; i++) {
          const s = settlements[i]!;
          const dist = Math.abs(s.centerX - viewCenter);
          if (dist < minDist) {
            minDist = dist;
            best = s;
          }
        }
        anchorWorldX = best.centerX;
      }
    }
  }

  // Calculate raw screen X position
  const rawCx = anchorWorldX - scroll;
  // Ensure the impulse is visible within the current viewport slice
  const cx = Math.max(80, Math.min(width - 80, rawCx));
  // How far that clamp moved the anchor. Anything drawn from a world position rather than from `cx`
  // has to move with it, or a partially visible settlement gets its glow pulled on screen while the
  // geometry that belongs to it stays outside -- which is the opposite of what the clamp is for.
  const clampShift = cx - rawCx;
  const groundY = height * 0.78;

  // The anchor's own geometry, so a consequence lands on the civilization rather than on the middle
  // of the screen: its footprint decides how wide the effect is and its skyline how high it reaches.
  const anchor = settlements.length ? (settlements.find(item => item.centerX === anchorWorldX) ?? settlements[0]!) : null;
  const footprint = Math.max(70, Math.min(width * .42, anchor?.radius ?? 130));
  let crown = 0;
  if (anchor?.structures) for (const structure of anchor.structures) crown = Math.max(crown, structure.height);
  const skyline = Math.max(46, Math.min(height * .42, crown || 90));
  const cy = groundY - skyline * .55;

  if (impact.kind === 'containment') {
    // Rings over the settlement, closed by a containment line laid along its own footprint.
    for (let ring = 0; ring < 3; ring++) surface.lineStyle(3 - ring * .6, color, fade * (1 - ring * .16)).strokeCircle(cx, cy, Math.max(6, radius * (.72 + ring * .2)));
    surface.lineStyle(2, color, fade * .8).line(cx - footprint, groundY, cx + footprint, groundY);
    surface.lineStyle(1.2, color, fade * .5).line(cx - footprint, groundY - skyline * .2, cx + footprint, groundY - skyline * .2);
  } else if (impact.kind === 'time_streak') {
    // Streaks travelling across the settlement's own altitude band rather than the whole frame.
    for (let i = 0; i < 7; i++) {
      const y = groundY - skyline * (.1 + i * .16);
      const shift = impact.staticOnly ? 0 : progress * width * .22;
      surface.lineStyle(1.2 + (i % 2), color, fade).line(cx - footprint * 1.4 + shift, y, cx + footprint * 1.4 + shift, y);
    }
  } else if (impact.kind === 'scan' || impact.kind === 'surveillance') {
    // A sweep across the world plus the beam column it comes from, standing on the settlement.
    const y = impact.staticOnly ? cy : height * (.18 + progress * .64);
    surface.lineStyle(2, color, fade).line(cx - width * .38, y, cx + width * .38, y);
    surface.lineStyle(1.4, color, fade * .6).line(cx, groundY, cx, groundY - skyline * 1.3);
    surface.lineStyle(1, color, fade * .75).strokeCircle(cx, cy, Math.max(6, radius * .65));
  } else if (impact.kind === 'vent') {
    // A release from the ground the settlement stands on, not from a point in the air.
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI + (i / 5) * Math.PI;
      surface.lineStyle(1.6, color, fade).line(cx, groundY - 4, cx + Math.cos(angle) * radius, groundY - 4 + Math.sin(angle) * radius);
    }
    surface.fillCircle(cx, groundY - 4, Math.max(3, radius * .12));
  } else if (impact.kind === 'fracture') {
    // Fractures opening in the ground under the settlement and running up through the air above it.
    for (let i = 0; i < 8; i++) {
      const x = cx + (hash01(i * 13 + feedback.sequence) - .5) * footprint * 2.2;
      const bend = (hash01(i * 31 + feedback.sequence) - .5) * width * .05;
      surface.lineStyle(1.2 + (i % 2), color, fade).line(x, groundY + 14, x + bend, groundY - skyline * 1.35);
      if (i % 3 === 0) surface.lineStyle(1, color, fade * .6).line(x, groundY + 14, x + bend * 2, groundY + 30);
    }
  } else if (impact.kind === 'unrest') {
    // A crowd on the road through the settlement.
    for (let i = 0; i < 12; i++) {
      const x = cx + (hash01(feedback.sequence + i * 17) - .5) * footprint * 1.8;
      const y = groundY + 4 + hash01(feedback.sequence + i * 29) * 12;
      surface.fillStyle(color, fade * .72).fillCircle(x, y, Math.max(1, 2 + impact.intensity * 2));
    }
    surface.lineStyle(1.4, color, fade * .5).line(cx - footprint, groundY + 2, cx + footprint, groundY + 2);
  } else if (impact.kind === 'growth') {
    // New construction rising out of the settlement, on the plots its own structures stand on.
    const plots = anchor?.structures?.length ? anchor.structures : null;
    surface.fillRadialGlow(cx, groundY - skyline * .3, 0, Math.max(30, footprint * .8), [
      { offset: 0, color, alpha: fade * .16 },
      { offset: 1, color, alpha: 0 },
    ]);
    for (let i = 0; i < 6; i++) {
      const x = plots ? (plots[i % plots.length]!.x - scroll + clampShift) : cx + (i - 2.5) * Math.max(18, footprint * .3);
      const rise = skyline * (.35 + (i % 3) * .22) * (impact.staticOnly ? .6 : .3 + progress * .7);
      // Scaffolding: a rising mast with a lit cap and the pad it stands on, so growth reads as
      // construction on a plot rather than as a line over the city.
      surface.lineStyle(2.2, color, fade).line(x, groundY, x, groundY - rise);
      surface.lineStyle(1.2, color, fade * .7).line(x - 6, groundY - rise * .55, x + 6, groundY - rise * .55);
      surface.fillStyle(color, fade * .8).fillCircle(x, groundY - rise, Math.max(1.4, 2.2 + impact.intensity));
      surface.fillStyle(color, fade * .35).fillRect(x - 7, groundY - 2, 14, 3);
    }
  } else if (impact.kind === 'identity') {
    // A pulse over the capital's own crown, framed by the geometry its path builds with.
    surface.lineStyle(2.4, color, fade).strokeCircle(cx, cy, Math.max(6, radius));
    surface.lineStyle(1.2, color, fade * .8).strokeRect(cx - radius * .42, cy - radius * .42, radius * .84, radius * .84);
    surface.lineStyle(1.4, color, fade * .55).line(cx, groundY, cx, cy);
  } else {
    // A wavefront leaving fast and settling, rather than a circle growing at a constant rate: the
    // radius is eased with a cubic falloff and the stroke thins as it goes, which is what a release
    // of energy looks like. The second, inner front is the interference behind it -- one extra
    // stroke, and it is what stops the cue from reading as a single expanding outline.
    const ease = 1 - Math.pow(1 - progress, 3);
    const front = Math.max(6, radius * (.52 + ease * .76));
    const stroke = Math.max(.5, 2.4 - progress * 1.8);
    surface.lineStyle(stroke, color, fade).strokeCircle(cx, cy, front);
    if (front > 15) surface.lineStyle(Math.max(.5, stroke * .6), color, fade * .42).strokeCircle(cx, cy, front * .72);
    surface.fillStyle(color, fade * .08).fillCircle(cx, cy, Math.max(3, radius * .55));
  }
}

/** A settlement the phase cue may acknowledge, already resolved into screen space by the caller. */
export interface PhaseAnchor { x: number; crown: number }

/**
 * A Drama Phase change reached by simply surviving deserves the same acknowledgement a decision
 * gets. Renderer-local by design: it reads the phase the cached scene already resolved and writes
 * nothing back, so passive progress never touches gameplay state.
 */
export function drawPhaseTransitionImpact(surface: DrawSurface, from: number, to: number, startTime: number, time: number, width: number, height: number, accent: number, reducedMotion: boolean, anchors: ReadonlyArray<PhaseAnchor> = []): void {
  if (to === from || startTime <= 0) return;
  const duration = reducedMotion ? 320 : 1500;
  const elapsed = time - startTime; if (elapsed < 0 || elapsed >= duration) return;
  const progress = reducedMotion ? 0 : Math.max(0, Math.min(1, elapsed / duration));
  const alpha = reducedMotion ? .42 : (1 - progress) * .48;
  const step = Math.max(1, to - from);

  const groundY = height * .78;
  const horizonY = height * .68;

  // A phase is a change in the world, so it is acknowledged by the world: the horizon brightens,
  // the settlement lights come up, and distant infrastructure resolves out of the haze. Deliberately
  // built from a light field and a fixed handful of strokes -- never a wash over the whole frame,
  // which would flatten every layer underneath it for the length of the cue.
  surface.fillRadialGlow(width * .5, horizonY, 0, Math.max(40, Math.min(width, height) * (.45 + progress * .35)), [
    { offset: 0, color: accent, alpha: alpha * .34 },
    { offset: .45, color: accent, alpha: alpha * .12 },
    { offset: 1, color: accent, alpha: 0 },
  ]);

  // The horizon itself, and the ground line where the city lights answer it.
  surface.lineStyle(2 + step * .5, accent, alpha * .6).line(0, horizonY, width, horizonY);
  surface.lineStyle(1.5, accent, alpha * .4).line(0, groundY - 2, width, groundY - 2);

  // Settlement lights activating -- on the settlements that are actually on screen, at the height
  // their own skylines reach. Three bars at fixed fractions of the frame acknowledged a phase change
  // over whatever happened to be behind them, including empty ground; a phase is a change in the
  // world, so the world it changed is what has to light up. A viewport with no settlement in it
  // falls back to the frame's own thirds, or a scroll into open country would lose the cue entirely.
  //
  // Exactly three of them, whatever the viewport holds -- the cue's cost is fixed by design, so
  // anchoring it to the world replaces the three fixed fractions rather than adding to them.
  const lit: ReadonlyArray<PhaseAnchor> = [0, 1, 2].map(bar =>
    anchors[bar % anchors.length] ?? { x: width * (.24 + bar * .26), crown: 90 });
  for (const [bar, anchor] of lit.entries()) {
    const half = Math.max(width * .05, Math.min(width * .3, anchor.crown * .7)) * (reducedMotion ? .7 : .35 + progress * .65);
    // Up the settlement's own skyline as the cue runs: its lights come on from the street upward.
    const reach = Math.min(anchor.crown, height * .3);
    const y = groundY - 12 - bar * 4 - reach * (reducedMotion ? .5 : .2 + progress * .7);
    surface.lineStyle(1.4 + step * .3, accent, alpha * .9).line(anchor.x - half, y, anchor.x + half, y);
  }

  // Distant infrastructure resolving out of the haze on either side of the frame.
  for (let mast = 0; mast < 2; mast++) {
    const x = width * (mast === 0 ? .18 : .82);
    const rise = height * (.06 + .03 * to) * (reducedMotion ? .8 : .4 + progress * .6);
    surface.lineStyle(1.2, accent, alpha * .55).line(x, horizonY, x, horizonY - rise);
  }

  // And one ring over the settlement plane, the cue's own centre.
  surface.lineStyle(2, accent, alpha).strokeCircle(width * .5, groundY - 45, Math.min(width, height) * (.14 + to * .035 + progress * .16));
}
