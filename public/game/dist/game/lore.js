import { CONTENT } from '../data/content.generated.js';
import { CivilizationPaths } from './paths.js';
import { text } from '../data/i18n.js';
const L = CONTENT.lore;
const pick = (values, index) => values[((index % values.length) + values.length) % values.length] ?? values[0] ?? text().reports.lore.unknown;
export function speciesProfile(civ) {
    const t = civ.traits;
    let body = 'biped';
    if (t.includes('fungal_consensus'))
        body = 'fungal';
    else if (t.includes('telepathic_species'))
        body = 'avian';
    else if (t.includes('ritual_engineering'))
        body = 'synthetic';
    else if (t.includes('liquid_mathematics'))
        body = 'cephalopod';
    else if (t.includes('physics_optional'))
        body = 'insectoid';
    else
        body = pick(L.body_types, civ.seed * 13 + 23);
    // The word lists stay canonical: a species name is generated from the seed and must read the same
    // in every language, or the same civilization would have two names. Only what describes the pick --
    // its body type and its motif -- is localized.
    const lore = text().reports.lore;
    const bodyTypes = lore.bodyTypes;
    const motifs = lore.motifs;
    const name = pick(L.species_prefixes, civ.seed + t.length * 9) + pick(L.species_suffixes, civ.seed * 2 + t.length * 5 + 3);
    return { name, bodyType: bodyTypes[body] ?? body, culture: pick(L.cultures, civ.seed * 7 + 19), motif: t.includes('sentient_moon') ? motifs.moon : t.includes('ritual_engineering') ? motifs.ritual : body === 'fungal' ? motifs.fungal : body === 'avian' ? motifs.avian : body === 'cephalopod' ? motifs.cephalopod : motifs.default };
}
export function factionProfile(civ) {
    const ps = CivilizationPaths.ensure(civ);
    const path = ps.dominantPath;
    const focus = text().reports.lore.factionFocus;
    return { name: `${pick(L.faction_prefixes, civ.seed * 3 + 5)} ${pick(L.faction_nouns, civ.seed * 5 + 11)} ${pick(L.faction_endings, civ.seed * 7 + 17)}`, doctrine: path ? (L.path_doctrines[path] ?? CivilizationPaths.displayName(path)) : pick(L.doctrines, civ.seed * 23 + 7), focus: path ? (L.path_focus[path] ?? focus.adaptive) : focus.balanced };
}
//# sourceMappingURL=lore.js.map