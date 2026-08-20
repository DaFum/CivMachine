import { consequenceProfileById } from '../game/consequence-profiles.js';
import { hash01 } from './primitives.js';
function inferredKind(feedback) {
    if (feedback.eventId === 'tactical:stabilize')
        return 'containment';
    if (feedback.eventId === 'tactical:accelerate')
        return 'time_streak';
    if (feedback.eventId === 'tactical:probe')
        return 'scan';
    if (feedback.eventId === 'tactical:vent')
        return 'vent';
    const tags = feedback.consequence.tags;
    if (tags.includes('reality_damage') || feedback.eventId.startsWith('entropy_crisis_'))
        return 'fracture';
    if (tags.includes('civil_unrest') || tags.includes('mass_casualty'))
        return 'unrest';
    if (tags.includes('surveillance'))
        return 'surveillance';
    if (tags.includes('religious_shift') || tags.includes('path_shift') || tags.includes('institution_growth'))
        return 'identity';
    if (tags.includes('urban_growth') || tags.includes('technological_growth'))
        return 'growth';
    if (tags.includes('containment') || tags.includes('stabilization'))
        return 'containment';
    return 'generic';
}
/**
 * Reduced motion keeps the semantics -- same kind, same signature variant -- and drops only the
 * travelling animation: a short static frame instead of a sweep.
 */
export function consequenceImpact(feedback, reducedMotion) {
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
function roleColor(feedback, kind, accent) {
    if (kind === 'containment')
        return 0x73e6bd;
    if (kind === 'time_streak')
        return 0xf2bd63;
    if (kind === 'scan' || kind === 'surveillance')
        return 0x6bdcf6;
    if (kind === 'vent')
        return 0x9ed7ff;
    if (kind === 'fracture' || kind === 'unrest')
        return 0xee6973;
    if (kind === 'identity' || kind === 'growth')
        return accent;
    return feedback.tone === 'positive' ? 0x73e6bd : feedback.tone === 'negative' ? 0xee6973 : 0xb68cff;
}
/** Drawn on the dynamic layer only; the caller owns clearing it. */
export function drawConsequenceImpact(surface, feedback, startTime, time, width, height, accent, reducedMotion) {
    if (!feedback || startTime <= 0)
        return;
    const impact = consequenceImpact(feedback, reducedMotion);
    const elapsed = time - startTime;
    if (elapsed < 0 || elapsed >= impact.durationMs)
        return;
    const progress = impact.staticOnly ? 0 : Math.max(0, Math.min(1, elapsed / impact.durationMs));
    const fade = impact.staticOnly ? .48 : (1 - progress) * (.38 + impact.intensity * .34);
    const color = roleColor(feedback, impact.kind, accent);
    const radius = Math.min(width, height) * (.14 + impact.intensity * .12 + progress * .28);
    const cx = width * .5, cy = height * .54;
    if (impact.kind === 'containment') {
        for (let ring = 0; ring < 3; ring++)
            surface.lineStyle(3 - ring * .6, color, fade * (1 - ring * .16)).strokeCircle(cx, cy, radius * (.72 + ring * .2));
    }
    else if (impact.kind === 'time_streak') {
        for (let i = 0; i < 7; i++) {
            const y = height * (.24 + i * .085);
            const shift = impact.staticOnly ? 0 : progress * width * .22;
            surface.lineStyle(1.2 + (i % 2), color, fade).line(width * .1 + shift, y, width * .72 + shift, y);
        }
    }
    else if (impact.kind === 'scan' || impact.kind === 'surveillance') {
        const y = impact.staticOnly ? cy : height * (.18 + progress * .64);
        surface.lineStyle(2, color, fade).line(width * .12, y, width * .88, y);
        surface.lineStyle(1, color, fade * .75).strokeCircle(cx, cy, radius * .65);
    }
    else if (impact.kind === 'vent') {
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            surface.lineStyle(1.6, color, fade).line(cx, cy, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        }
    }
    else if (impact.kind === 'fracture') {
        for (let i = 0; i < 8; i++) {
            const x = width * (.18 + i * .085);
            const bend = (hash01(i * 31 + feedback.sequence) - .5) * width * .07;
            surface.lineStyle(1.2 + (i % 2), color, fade).line(x, height * .22, x + bend, height * .78);
        }
    }
    else if (impact.kind === 'unrest') {
        for (let i = 0; i < 12; i++) {
            const x = width * (.25 + hash01(feedback.sequence + i * 17) * .5);
            const y = height * (.48 + hash01(feedback.sequence + i * 29) * .22);
            surface.fillStyle(color, fade * .72).fillCircle(x, y, 2 + impact.intensity * 2);
        }
    }
    else if (impact.kind === 'growth') {
        for (let i = 0; i < 6; i++) {
            const x = width * (.22 + i * .11);
            const top = height * (.58 - progress * .18) - i % 2 * 12;
            surface.lineStyle(1.4, color, fade).line(x, height * .72, x, top);
        }
    }
    else if (impact.kind === 'identity') {
        surface.lineStyle(2.4, color, fade).strokeCircle(cx, cy, radius);
        surface.lineStyle(1.2, color, fade * .8).strokeRect(cx - radius * .42, cy - radius * .42, radius * .84, radius * .84);
    }
    else {
        surface.lineStyle(2, color, fade).strokeCircle(cx, cy, radius);
        surface.fillStyle(color, fade * .08).fillCircle(cx, cy, radius * .55);
    }
}
/**
 * A Drama Phase change reached by simply surviving deserves the same acknowledgement a decision
 * gets. Renderer-local by design: it reads the phase the cached scene already resolved and writes
 * nothing back, so passive progress never touches gameplay state.
 */
export function drawPhaseTransitionImpact(surface, from, to, startTime, time, width, height, accent, reducedMotion) {
    if (to === from || startTime <= 0)
        return;
    const duration = reducedMotion ? 320 : 1500;
    const elapsed = time - startTime;
    if (elapsed < 0 || elapsed >= duration)
        return;
    const progress = reducedMotion ? 0 : Math.max(0, Math.min(1, elapsed / duration));
    const alpha = reducedMotion ? .42 : (1 - progress) * .48;
    const rows = Math.max(2, Math.min(6, to + 2));
    for (let row = 0; row < rows; row++) {
        const y = height * (.3 + row * .09);
        const span = width * (.22 + .1 * to);
        surface.lineStyle(1.4 + (to - from) * .3, accent, alpha).line(width * .5 - span * .5, y, width * .5 + span * .5, y);
    }
    surface.lineStyle(2, accent, alpha).strokeCircle(width * .5, height * .54, Math.min(width, height) * (.14 + to * .035 + progress * .16));
}
//# sourceMappingURL=consequence-presentation.js.map