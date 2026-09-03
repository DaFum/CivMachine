import { hash01 } from './primitives.js';
export function agentPlanTotal(plan) {
    return plan.pedestrians.length + plan.vehicles.length + plan.aircraft.length + plan.orbital.length + plan.launches.length;
}
export function agentPlan(civ, snapshot, settlements, routes = []) {
    const budget = snapshot.agentBudget;
    const seed = civ.seed;
    const plan = { pedestrians: [], vehicles: [], aircraft: [], orbital: [], launches: [] };
    if (!settlements.length)
        return plan;
    // Pedestrians are distributed across settlements proportionally to how much is built there.
    const totalStructures = settlements.reduce((sum, settlement) => sum + settlement.structures.length, 0) || 1;
    for (let i = 0; i < budget.pedestrians; i++) {
        let target = (i / budget.pedestrians) * totalStructures;
        let settlementIndex = settlements.length - 1;
        for (let s = 0; s < settlements.length; s++) {
            target -= settlements[s].structures.length;
            if (target < 0) {
                settlementIndex = s;
                break;
            }
        }
        plan.pedestrians.push({
            settlementIndex,
            offset: hash01(seed + i * 13 + 5),
            speed: .35 + hash01(seed + i * 29) * .8,
            lane: i % 3,
            seed: seed + i * 7,
        });
    }
    // Vehicles ride a trade route, so traffic connects places along the trace that actually joins
    // them. Without a route -- a world too early to have one -- they fall back to the two centres.
    for (let i = 0; i < budget.vehicles; i++) {
        const from = settlements[i % settlements.length];
        const to = settlements[(i + 1) % settlements.length];
        const same = settlements.length < 2;
        const routeIndex = routes.length ? i % routes.length : -1;
        const route = routeIndex >= 0 ? routes[routeIndex] : null;
        // Half the vehicles run against the route's own direction, or every lane would be one-way.
        const reversed = i % 2 === 1;
        plan.vehicles.push({
            fromX: route ? (reversed ? route.toX : route.fromX) : (same ? from.centerX - from.radius : from.centerX),
            toX: route ? (reversed ? route.fromX : route.toX) : (same ? from.centerX + from.radius : to.centerX),
            lane: i % 3,
            speed: .5 + hash01(seed + i * 47) * .9,
            phase: hash01(seed + i * 31),
            seed: seed + i * 19,
            routeIndex,
        });
    }
    for (let i = 0; i < budget.aircraft; i++) {
        const from = settlements[i % settlements.length];
        const to = settlements[(i + settlements.length - 1) % settlements.length];
        plan.aircraft.push({
            fromX: from.centerX,
            toX: settlements.length < 2 ? from.centerX + from.radius * 4 : to.centerX,
            altitude: .16 + hash01(seed + i * 23) * .2,
            speed: .25 + hash01(seed + i * 5) * .5,
            phase: hash01(seed + i * 71),
        });
    }
    for (let i = 0; i < budget.orbital; i++) {
        plan.orbital.push({ altitude: .06 + hash01(seed + i * 11) * .1, speed: .08 + hash01(seed + i * 101) * .12, phase: hash01(seed + i * 61) });
    }
    const pads = settlements.flatMap(settlement => settlement.structures.filter(structure => structure.kind === 'spaceport' || structure.kind === 'orbital_anchor'));
    for (let i = 0; i < Math.min(budget.launches, pads.length); i++) {
        plan.launches.push({ x: pads[i].x, period: 9000 + hash01(seed + i * 83) * 7000, offset: hash01(seed + i * 37) * 9000 });
    }
    return plan;
}
//# sourceMappingURL=agents.js.map