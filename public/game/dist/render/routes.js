import { hash01, valueNoise } from './primitives.js';
/** At most nine settlements exist, so at most eight links between them. */
export const MAX_TRADE_ROUTES = 8;
/**
 * The lattice a route is sampled on, in world px. Coarse enough that one route is a dozen points
 * however wide the world, fine enough that the bow reads as a curve rather than as a bent line.
 */
export const ROUTE_STEP = 32;
/**
 * Ceiling on the deflection. A route belongs to the ground plane: bow it further and the road climbs
 * out of the strip the settlements stand on and reads as a wire over the world instead of a track
 * across it. It is also what keeps the roadbed inside the depth-lane offsets around it.
 */
export const ROUTE_MAX_BOW = 15;
/**
 * Flow marks are the animated half of a route, so they are bounded by a count and shared out over
 * the routes actually on screen rather than spent along the first one.
 */
export const MAX_ROUTE_FLOW_MARKS = 18;
/**
 * The roadbed, in one place. The road pass draws the bed and the traffic has to stay on it, and the
 * two used to say it separately: the bed is `12 + stage * 3` px deep under a fixed 4 px verge, while
 * the lanes sat on a fixed 7 px pitch, so lane 2 rode at `ground + 24` against a bed that ends at
 * `ground + 19` at stage 1 -- the outer lane drove on the verge at every stage but the last.
 */
export const ROAD_TOP_OFFSET = 4;
export const ROAD_LANES = 3;
/** How deep the bed is at a development stage: a wider road as the civilization builds one. */
export function roadbedHeight(stage) { return 12 + Math.max(0, stage) * 3; }
/**
 * Where lane `lane` rides, as an offset from the ground line, for something `thickness` px tall.
 * Derived from the bed rather than from a pitch, so the lanes crowd together on an early road
 * instead of walking off it -- and the thickness is taken off the usable depth, so it is the
 * vehicle's *bottom* edge that stays on the road, not merely its anchor.
 */
export function roadLaneOffset(stage, lane, thickness = 0) {
    const inset = 2;
    const usable = Math.max(0, roadbedHeight(stage) - inset * 2 - Math.max(0, thickness));
    const slot = ROAD_LANES > 1 ? Math.min(ROAD_LANES - 1, Math.max(0, lane)) / (ROAD_LANES - 1) : 0;
    return ROAD_TOP_OFFSET + inset + slot * usable;
}
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
/**
 * The links, in world order. Derived from the settlement layout and the snapshot's building count,
 * both of which `structuralWorldKey` already tracks -- so a route exists, and carries what it
 * carries, on the same structural bands the cached layers are rebuilt on.
 */
export function tradeRoutes(civ, settlements, snapshot) {
    const routes = [];
    if (!settlements.length || snapshot.stage === 0)
        return routes;
    const links = Math.min(MAX_TRADE_ROUTES, Math.max(1, settlements.length - 1));
    for (let i = 0; i < links; i++) {
        const from = settlements[i];
        // A lone settlement still has a road: it runs across its own footprint rather than to a
        // neighbour, which is the local traffic the world had before it had a network.
        const to = settlements[i + 1] ?? null;
        const left = to ? Math.min(from.centerX, to.centerX) : from.centerX - from.radius;
        const right = to ? Math.max(from.centerX, to.centerX) : from.centerX + from.radius;
        const span = Math.max(1, right - left);
        const seed = civ.seed * 31 + i * 137;
        // How far a route may bow scales with the room it has, so a short link between two neighbouring
        // towns is not thrown into the same arc a cross-world haul earns.
        const amplitude = Math.min(ROUTE_MAX_BOW, span * .09);
        // The ground the route crosses decides which way it bends: the same smooth noise the terrain
        // profile is built from, sampled at the route's own midpoint, so two routes over the same land
        // lean the same way and a route never moves when something unrelated changes.
        const terrain = valueNoise((left + right) * .5 / 260, civ.seed * 7 + 5) - .5;
        const lean = clamp((terrain * 1.6 + (hash01(seed) - .5) * .9) * amplitude * 2, amplitude);
        const structures = from.structures.length + (to ? to.structures.length : 0);
        routes.push({
            id: `r${i}`,
            fromIndex: i,
            toIndex: to ? i + 1 : i,
            fromX: left,
            toX: right,
            span,
            bow1: lean,
            // The counter-deflection: an S rather than an arc, so the trace reads as something that had to
            // get around the land twice instead of as a drawn curve.
            bow2: clamp(-lean * .62, amplitude),
            flow: Math.max(.15, Math.min(1, structures / Math.max(6, snapshot.buildingCount * .5))),
            direction: hash01(seed + 11) < .5 ? -1 : 1,
            seed,
        });
    }
    return routes;
}
/**
 * The curve's perpendicular offset at a world x, in px. The endpoints contribute nothing by
 * construction, so a route always meets both settlements exactly on the ground line however hard it
 * bows in between.
 */
export function routeOffsetAt(route, x) {
    const t = Math.max(0, Math.min(1, (x - route.fromX) / route.span));
    const u = 1 - t;
    return 3 * u * u * t * route.bow1 + 3 * u * t * t * route.bow2;
}
/** Where a traveller that is `t` of the way along the route stands. */
export function routePointAt(route, t) {
    const clamped = Math.max(0, Math.min(1, t));
    const x = route.fromX + route.span * clamped;
    return { x, offset: routeOffsetAt(route, x) };
}
/**
 * The route as a polyline, clipped to a band and sampled on the world lattice. Every point is at a
 * fixed world position and whether it is emitted depends only on the band, so the same band always
 * produces the same run of points -- which is the whole reason the cached scenery layer may redraw
 * only the strip a scroll exposed.
 *
 * The extra step of slack on each side is not cosmetic either: it puts the first emitted point
 * outside the exposed strip, so the point that opens the path is never a different primitive in the
 * strip redraw than it is in a full one.
 */
export function routePolyline(route, from, to) {
    const points = [];
    const steps = Math.max(1, Math.ceil(route.span / ROUTE_STEP));
    for (let step = 0; step <= steps; step++) {
        const x = step === steps ? route.toX : route.fromX + step * ROUTE_STEP;
        if (x < from - ROUTE_STEP || x > to + ROUTE_STEP)
            continue;
        points.push([x, routeOffsetAt(route, x)]);
    }
    return points;
}
/**
 * How many flow marks each of the routes on screen gets. Weighted by what each link *carries*, not
 * split equally: `flow` already sets how fast a mark travels and how long it is, and if it did not
 * also set how many there are, a trunk route and a spur would look identically busy -- capacity
 * would be the one thing the cue cannot show, which is most of what it is for.
 *
 * Every visible route keeps a floor of one mark, because a link with nothing on it reads as
 * abandoned rather than as quiet. The floor moves the budget rather than truncating the list -- the
 * same resolution the window budget uses -- so `sum(marks) <= max(routes.length,
 * MAX_ROUTE_FLOW_MARKS)` is an identity rather than an approximation, and at most eight links can
 * ever exist against eighteen marks, so in practice the ceiling is the constant.
 */
export function routeFlowMarks(routes) {
    if (!routes.length)
        return [];
    const budget = Math.max(routes.length, MAX_ROUTE_FLOW_MARKS);
    const spare = budget - routes.length;
    const totalFlow = routes.reduce((sum, route) => sum + route.flow, 0);
    return routes.map(route => 1 + (totalFlow > 0 ? Math.floor(spare * route.flow / totalFlow) : 0));
}
/** Whether any part of the route reaches the band. Its own extent, so the cull stays exact. */
export function routeInBand(route, from, to) {
    return route.toX >= from - ROUTE_STEP && route.fromX <= to + ROUTE_STEP;
}
//# sourceMappingURL=routes.js.map