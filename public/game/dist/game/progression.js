import { evaluateMilestones } from './milestones.js';
const MACHINE = {
    reality_lattice: { insight: 0 }, historical_compressor: { insight: 0 }, temporal_injector: { insight: 0 }, prediction_core: { insight: 1, resource: 'cognition' }, cognitive_extractor: { insight: 4, resource: 'cognition' }, paradox_sieve: { insight: 5, resource: 'paradox' }, awareness_scrubber: { insight: 4, resource: 'cognition' }, sanity_protocol: { insight: 5, resource: 'cognition' }, cosmic_muffling: { insight: 6, resource: 'paradox' }, contingency_vat: { insight: 8, resource: 'paradox' }, cultivation_accelerator: { insight: 9, resource: 'existence' }, existence_furnace: { insight: 10, resource: 'existence' }
};
const UNIVERSE = { wide_lattice: { insight: 7 }, twin_harvest: { insight: 8 }, stable_constants: { insight: 10 }, archive_of_screams: { insight: 11 }, paradox_rights: { insight: 12 }, bureaucracy_of_gods: { insight: 13 }, residue_refinery: { insight: 14 }, inherited_time: { insight: 15 } };
const AXIOM = { axiom_stability: { insight: 18 }, axiom_recursive_memory: { insight: 19 }, axiom_paradox_food: { insight: 20 }, axiom_compassionate_accounting: { insight: 21 }, axiom_impossible_birth: { insight: 22 }, axiom_multiple_choice: { insight: 23 } };
export const DIRECTIVE_INSIGHT = { accelerated_development: 3, cognitive_extraction: 3, stable_cultivation: 3, paradox_prospecting: 8, quiet_machine: 10, temporal_pressure: 12 };
export const MATRIX_INSIGHT = { neural_bloom: 7, industrial_genome: 7, adaptive_aberration: 7, museum_seed: 11, lunar_synapse: 13, post_causal_spore: 15 };
export const AXIOM_KNOWLEDGE = { axiom_stability: 18, axiom_recursive_memory: 19, axiom_paradox_food: 20, axiom_compassionate_accounting: 21, axiom_impossible_birth: 22, axiom_multiple_choice: 23 };
export class Progression {
    static machineInsight(state) { return state.meta.progression.machineInsight; }
    static systemUnlocked(state, id) { return state.meta.progression.unlockedSystems.includes(id); }
    static resourceDiscovered(state, id) { return state.meta.progression.discoveredResources.includes(id); }
    static canUseUpgrade(state, layer, id) {
        const rules = layer === 'machine' ? MACHINE : layer === 'universe' ? UNIVERSE : AXIOM;
        const rule = rules[id];
        if (!rule)
            return false;
        if (layer === 'universe' && !this.systemUnlocked(state, 'universe_upgrades'))
            return false;
        if (layer === 'axiom' && !this.systemUnlocked(state, 'axioms'))
            return false;
        if (this.machineInsight(state) < rule.insight)
            return false;
        if ('resource' in rule && rule.resource && !this.resourceDiscovered(state, rule.resource))
            return false;
        return true;
    }
    static announce(state, id, msg, out) { if (state.meta.progression.announcedUnlocks.includes(id))
        return; state.meta.progression.announcedUnlocks.push(id); out.push(msg); }
    static discover(state, id, name, out) { if (this.resourceDiscovered(state, id))
        return; state.meta.progression.discoveredResources.push(id); this.announce(state, `resource:${id}`, `NEW RESOURCE IDENTIFIED: ${name}`, out); }
    static unlockSystem(state, id, name, out) { if (this.systemUnlocked(state, id))
        return; state.meta.progression.unlockedSystems.push(id); this.announce(state, `system:${id}`, `NEW SYSTEM UNLOCKED: ${name}`, out); }
    static refreshKnown(state, system, thresholds, storage, out) { if (!this.systemUnlocked(state, system))
        return; const known = state.meta.progression[storage]; for (const [id, need] of Object.entries(thresholds))
        if (this.machineInsight(state) >= need && !known.includes(id)) {
            known.push(id);
            this.announce(state, `option:${id}`, `NEW OPTION UNLOCKED: ${id.replaceAll('_', ' ').toUpperCase()}`, out);
        } }
    static refresh(state, out = []) { const p = state.meta.progression; const insight = this.machineInsight(state); if (p.controlledHarvestsTotal >= 2 && insight >= 3)
        this.unlockSystem(state, 'directives', 'DIRECTIVES', out); if (state.machine.civilizationsTotal >= 4 || insight >= 6)
        this.unlockSystem(state, 'universe_prestige', 'UNIVERSE PRESTIGE', out); if (state.meta.universesTotal >= 1) {
        this.unlockSystem(state, 'universe_upgrades', 'UNIVERSE UPGRADES', out);
        if (insight >= 7)
            this.unlockSystem(state, 'breeding_matrices', 'BREEDING MATRICES', out);
    } if (state.meta.universesTotal >= 2)
        this.unlockSystem(state, 'multiverse_prestige', 'MULTIVERSE PRESTIGE', out); if (state.meta.multiversesConsumed >= 1 && insight >= 18)
        this.unlockSystem(state, 'axioms', 'AXIOMATIC MANIPULATION', out); this.refreshKnown(state, 'directives', DIRECTIVE_INSIGHT, 'knownDirectives', out); this.refreshKnown(state, 'breeding_matrices', MATRIX_INSIGHT, 'knownBreedingMatrices', out); this.refreshKnown(state, 'axioms', AXIOM_KNOWLEDGE, 'knownAxioms', out); return out; }
    static recordMilestones(state, convergenceUnlocked, out = []) { const result = evaluateMilestones(state, convergenceUnlocked); for (const milestone of result.newlyCompleted)
        if (milestone.insight)
            out.push(`MACHINE INSIGHT +${milestone.insight}: ${milestone.title}`); return this.refresh(state, out); }
    static recordCivilizationProgress(state, civ) { const out = []; if (civ.development >= 70)
        this.discover(state, 'cognition', 'Cognition', out); return this.recordMilestones(state, false, out); }
    static recordHarvest(state, record) { const out = []; if (record.chaotic)
        state.meta.progression.chaoticHarvestsTotal++;
    else {
        state.meta.progression.controlledHarvestsTotal++;
        if (state.meta.progression.controlledHarvestsTotal >= 1)
            this.discover(state, 'paradox', 'Paradox', out);
    } if (Number(record.development ?? 0) >= 180)
        this.discover(state, 'paradox', 'Paradox', out); return this.recordMilestones(state, false, out); }
    static recordUniverse(state) { const out = []; if (state.meta.universesTotal > 1) {
        state.meta.progression.machineInsight++;
        out.push('MACHINE INSIGHT +1: Repeated universe consumption');
    } this.discover(state, 'existence', 'Existence', out); this.discover(state, 'universal_residue', 'Universal Residue', out); return this.recordMilestones(state, false, out); }
    static recordMultiverse(state) { const out = []; this.discover(state, 'axioms', 'Axioms', out); return this.recordMilestones(state, false, out); }
    static visibleResourceKeys(state) { return state.meta.progression.discoveredResources.slice(); }
}
export function progressionRulesForLayer(layer) {
    return layer === 'machine' ? MACHINE : layer === 'universe' ? UNIVERSE : AXIOM;
}
export function upgradeUnlockReason(state, layer, id) {
    const rules = progressionRulesForLayer(layer);
    const rule = rules[id];
    if (!rule)
        return 'Unknown progression requirement.';
    if (layer === 'universe' && !Progression.systemUnlocked(state, 'universe_upgrades'))
        return 'Consume the first Universe.';
    if (layer === 'axiom' && !Progression.systemUnlocked(state, 'axioms'))
        return 'Unlock Axiomatic Manipulation.';
    const req = [];
    if (Progression.machineInsight(state) < rule.insight)
        req.push(`Machine Insight ${rule.insight}`);
    if (rule.resource && !Progression.resourceDiscovered(state, rule.resource))
        req.push(`discover ${rule.resource.replaceAll('_', ' ')}`);
    return req.length ? req.join(' and ') : 'Available after current progression refresh.';
}
export function visibleUpgradeEntries(state, layer, catalog) {
    if (layer === 'universe' && !Progression.systemUnlocked(state, 'universe_upgrades'))
        return [];
    if (layer === 'axiom' && !Progression.systemUnlocked(state, 'axioms'))
        return [];
    const available = [];
    const locked = [];
    const rules = progressionRulesForLayer(layer);
    for (const definition of catalog) {
        const id = String(definition.id);
        if (Progression.canUseUpgrade(state, layer, id))
            available.push({ definition, status: 'available', reason: '' });
        else
            locked.push({ definition, status: 'locked', reason: upgradeUnlockReason(state, layer, id), threshold: rules[id]?.insight ?? 999 });
    }
    locked.sort((a, b) => a.threshold - b.threshold);
    available.push(...locked.slice(0, 2).map(({ threshold: _t, ...entry }) => entry));
    return available;
}
export function nextSystemPreviews(state) {
    const candidates = [
        ['directives', 'Directive System', 'Complete 2 Controlled Harvests and reach Machine Insight 3.', 3],
        ['universe_prestige', 'Universe Consumption', 'Earn 18 Cultivation Credits from qualified harvests.', 6],
        ['universe_upgrades', 'Universe Upgrades', 'Consume your first Universe.', 7],
        ['breeding_matrices', 'Breeding Matrices', 'Consume your first Universe and reach Machine Insight 7.', 7],
        ['multiverse_prestige', 'Multiverse Consumption', 'Consume 2 Universes.', 16],
        ['axioms', 'Axiom Layer', 'Consume a Multiverse and reach Machine Insight 18.', 18]
    ];
    return candidates.filter(([id]) => !Progression.systemUnlocked(state, id)).sort((a, b) => a[3] - b[3]).slice(0, 2).map(([id, name, condition]) => ({ id, name, condition }));
}
//# sourceMappingURL=progression.js.map