import { CivilizationPaths, PATH_IDS } from '../game/paths.js';
const PATH_VISUALS = {
    machine_faith: { motif: 'ritual_geometry', landmark: 'engine_spire', crown: 'luminous_core' },
    collective_mind: { motif: 'linked_nodes', landmark: 'neural_bridge', crown: 'synchronized_cluster' },
    temporal_dominion: { motif: 'chronal_rings', landmark: 'chronal_pylon', crown: 'offset_ring' },
    reality_engineering: { motif: 'lattice_frame', landmark: 'constraint_tower', crown: 'geometric_frame' },
    biological_transcendence: { motif: 'organic_branching', landmark: 'chitin_spire', crown: 'living_crown' },
    cosmic_resistance: { motif: 'defense_chevrons', landmark: 'shield_bastion', crown: 'blackout_shield' },
    bureaucratic_singularity: { motif: 'administrative_grid', landmark: 'admin_monolith', crown: 'ordered_block' },
    post_mortal_civilization: { motif: 'continuity_halo', landmark: 'data_mausoleum', crown: 'continuity_beacon' },
    void_communion: { motif: 'negative_space', landmark: 'void_obelisk', crown: 'absence_well' },
    recursive_simulation: { motif: 'nested_frames', landmark: 'recursive_tower', crown: 'nested_crown' },
};
const CONSOLIDATION_EVENT = {
    machine_faith: 'synod_of_the_second_engine', collective_mind: 'unanimous_afternoon', temporal_dominion: 'sovereign_hour',
    reality_engineering: 'department_of_permitted_physics', biological_transcendence: 'pollinators_of_the_state', cosmic_resistance: 'blackout_doctrine',
    bureaucratic_singularity: 'ministry_of_final_forms', post_mortal_civilization: 'immortal_electorate', void_communion: 'embassy_at_the_edge', recursive_simulation: 'recursion_registry',
};
export function pathIdentity(civ) {
    const dominant = civ.pathState.dominantPath;
    let pathId = dominant;
    let tier = dominant ? 2 : 0;
    if (!pathId) {
        pathId = [...PATH_IDS].sort((a, b) => CivilizationPaths.affinity(civ, b) - CivilizationPaths.affinity(civ, a))[0] ?? '';
        if (!pathId || CivilizationPaths.affinity(civ, pathId) < 2)
            return { pathId: '', tier: 0, motif: 'unaligned', landmark: 'none', crown: 'none' };
        tier = 1;
    }
    if (dominant && (civ.pathState.completedEvents.includes(CONSOLIDATION_EVENT[dominant] ?? '') || (civ.pathState.endgameStates ?? []).length > 0))
        tier = 3;
    const visual = PATH_VISUALS[pathId] ?? { motif: 'unaligned', landmark: 'none', crown: 'none' };
    return { pathId, tier, ...visual };
}
export function institutionLandmarks(civ) {
    const result = [];
    if (civ.institutions.includes('Lunar Ministry'))
        result.push({ institution: 'Lunar Ministry', kind: 'lunar_relay' });
    if (civ.institutions.includes('Ministry Of Sanity'))
        result.push({ institution: 'Ministry Of Sanity', kind: 'sanity_dome' });
    if (civ.institutions.includes('Consensus Office'))
        result.push({ institution: 'Consensus Office', kind: 'consensus_hall' });
    return result;
}
export function identitySignature(civ) {
    const identity = pathIdentity(civ);
    return `${identity.pathId || 'unaligned'}:${identity.tier}:${identity.landmark}|${institutionLandmarks(civ).map(item => item.kind).join(',')}`;
}
//# sourceMappingURL=identity.js.map