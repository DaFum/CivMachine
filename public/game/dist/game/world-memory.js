import { consequenceProfileById } from './consequence-profiles.js';
export const MAX_MEMORY_MARKS = 6;
export const MAX_WORLD_SCARS = 3;
const MEMORY_DOMAINS = ['built_environment', 'identity', 'control', 'social', 'ecology', 'reality'];
const SCAR_DOMAINS = ['reality', 'civilization', 'identity'];
export function emptyWorldMemory() {
    return { version: 1, sequence: 0, marks: [], scars: [] };
}
function strength(value) {
    const n = Number(value);
    return n === 1 || n === 2 || n === 3 ? n : null;
}
function finiteSequence(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}
function cleanMark(value) {
    if (!value || typeof value !== 'object')
        return null;
    const raw = value;
    if (!MEMORY_DOMAINS.includes(raw.domain))
        return null;
    const s = strength(raw.strength);
    const seq = finiteSequence(raw.createdAtSequence);
    if (!s || seq === null || typeof raw.motif !== 'string' || !raw.motif || typeof raw.sourceEventId !== 'string')
        return null;
    const anchor = Number(raw.anchor01);
    if (!Number.isFinite(anchor))
        return null;
    return {
        domain: raw.domain, motif: raw.motif, strength: s, sourceEventId: raw.sourceEventId,
        createdAtSequence: seq, anchor01: Math.max(0, Math.min(1, anchor)), repairable: raw.repairable === true,
        ...(raw.repaired === true ? { repaired: true } : {}),
    };
}
function cleanScar(value) {
    if (!value || typeof value !== 'object')
        return null;
    const raw = value;
    if (!SCAR_DOMAINS.includes(raw.domain))
        return null;
    const s = strength(raw.strength);
    const seq = finiteSequence(raw.createdAtSequence);
    const evolution = finiteSequence(raw.evolution);
    if (!s || seq === null || evolution === null || typeof raw.motif !== 'string' || !raw.motif || typeof raw.sourceEventId !== 'string')
        return null;
    const anchor = Number(raw.anchor01);
    if (!Number.isFinite(anchor))
        return null;
    return { domain: raw.domain, motif: raw.motif, strength: s, sourceEventId: raw.sourceEventId, createdAtSequence: seq, anchor01: Math.max(0, Math.min(1, anchor)), evolution };
}
export function sanitizeWorldMemory(value) {
    if (!value || typeof value !== 'object')
        return emptyWorldMemory();
    const raw = value;
    if (raw.version !== 1)
        return emptyWorldMemory();
    const sequence = finiteSequence(raw.sequence);
    if (sequence === null)
        return emptyWorldMemory();
    const marks = Array.isArray(raw.marks) ? raw.marks.map(cleanMark).filter((item) => !!item) : [];
    const scars = Array.isArray(raw.scars) ? raw.scars.map(cleanScar).filter((item) => !!item) : [];
    const marksByDomain = new Map();
    for (const mark of marks) {
        const current = marksByDomain.get(mark.domain);
        if (!current || mark.strength > current.strength || (mark.strength === current.strength && mark.createdAtSequence > current.createdAtSequence))
            marksByDomain.set(mark.domain, mark);
    }
    const scarsByDomain = new Map();
    for (const scar of scars) {
        const current = scarsByDomain.get(scar.domain);
        if (!current || scar.evolution > current.evolution || (scar.evolution === current.evolution && scar.strength > current.strength))
            scarsByDomain.set(scar.domain, scar);
    }
    return { version: 1, sequence, marks: [...marksByDomain.values()].slice(0, MAX_MEMORY_MARKS), scars: [...scarsByDomain.values()].slice(0, MAX_WORLD_SCARS) };
}
function hash32(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
export function memoryAnchor01(seed, domain, sourceEventId, sequence) {
    return hash32(`${Math.trunc(seed)}|${domain}|${sourceEventId}|${Math.trunc(sequence)}`) / 0xffffffff;
}
function genericMemory(tags) {
    if (tags.includes('reality_damage'))
        return { domain: 'reality', motif: 'fracture', strength: 2, repairable: true };
    if (tags.includes('mass_casualty'))
        return { domain: 'social', motif: 'civic_ruin', strength: 3, repairable: true };
    if (tags.includes('civil_unrest'))
        return { domain: 'social', motif: 'unrest', strength: 2, repairable: true };
    if (tags.includes('ecological_damage'))
        return { domain: 'ecology', motif: 'blight', strength: 2, repairable: true };
    if (tags.includes('surveillance'))
        return { domain: 'control', motif: 'surveillance', strength: 2, repairable: true };
    if (tags.includes('religious_shift') || tags.includes('path_shift'))
        return { domain: 'identity', motif: 'path_monument', strength: 2, repairable: false };
    if (tags.includes('institution_growth'))
        return { domain: 'built_environment', motif: 'civic_landmark', strength: 2, repairable: false };
    if (tags.includes('technological_growth'))
        return { domain: 'built_environment', motif: 'advanced_district', strength: 2, repairable: false };
    if (tags.includes('urban_growth'))
        return { domain: 'built_environment', motif: 'growth_district', strength: 1, repairable: false };
    if (tags.includes('urban_decline'))
        return { domain: 'built_environment', motif: 'damaged_district', strength: 2, repairable: true };
    return null;
}
function upsertMark(memory, seed, eventId, descriptor) {
    const current = memory.marks.find(mark => mark.domain === descriptor.domain);
    if (!current) {
        memory.marks.push({ ...descriptor, sourceEventId: eventId, createdAtSequence: memory.sequence, anchor01: memoryAnchor01(seed, descriptor.domain, eventId, memory.sequence) });
        memory.marks = memory.marks.slice(0, MAX_MEMORY_MARKS);
        return;
    }
    if (descriptor.strength < current.strength)
        return;
    current.motif = descriptor.motif;
    current.strength = descriptor.strength;
    current.sourceEventId = eventId;
    current.createdAtSequence = memory.sequence;
    current.repairable = descriptor.repairable;
    delete current.repaired;
}
function upsertScar(memory, seed, eventId, descriptor) {
    const current = memory.scars.find(scar => scar.domain === descriptor.domain);
    if (!current) {
        memory.scars.push({ ...descriptor, sourceEventId: eventId, createdAtSequence: memory.sequence, anchor01: memoryAnchor01(seed, descriptor.domain, eventId, memory.sequence), evolution: 0 });
        memory.scars = memory.scars.slice(0, MAX_WORLD_SCARS);
        return;
    }
    current.strength = Math.max(current.strength, descriptor.strength);
    current.motif = descriptor.motif;
    current.sourceEventId = eventId;
    current.createdAtSequence = memory.sequence;
    current.evolution += 1;
}
// Repairs damage the civilization already carried, never the mark this same action just wrote:
// Stabilize costs +8 Entropy, so it authors a `reality` mark of its own, and repairing that instead
// would half-heal its own fracture and leave the standing unrest the player meant to fix untouched.
function repairOne(memory) {
    const domainOrder = ['reality', 'social', 'built_environment'];
    for (const domain of domainOrder) {
        const candidates = memory.marks.filter(mark => mark.domain === domain && mark.repairable && mark.createdAtSequence < memory.sequence).sort((a, b) => b.strength - a.strength || a.createdAtSequence - b.createdAtSequence);
        const mark = candidates[0];
        if (!mark)
            continue;
        if (mark.strength === 1)
            memory.marks = memory.marks.filter(item => item !== mark);
        else {
            mark.strength = (mark.strength - 1);
            mark.repaired = true;
        }
        return;
    }
}
export function applyWorldMemory(seed, value, feedback, options = {}) {
    const memory = sanitizeWorldMemory(value);
    memory.sequence += 1;
    const profile = consequenceProfileById(feedback.consequence.signatureProfile);
    if (feedback.consequence.significance !== 'routine') {
        const descriptor = profile?.memory ?? genericMemory(feedback.consequence.tags);
        if (descriptor)
            upsertMark(memory, seed, feedback.eventId, descriptor);
        if (profile?.scar)
            upsertScar(memory, seed, feedback.eventId, profile.scar);
    }
    if (options.repair)
        repairOne(memory);
    return memory;
}
//# sourceMappingURL=world-memory.js.map