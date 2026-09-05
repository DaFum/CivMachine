export function clampStats(civ) {
    const s = civ.stats;
    s.stability = Math.max(0, Math.min(s.stabilityMax, s.stability));
    s.awareness = Math.max(0, Math.min(100, s.awareness));
    s.sanity = Math.max(0, Math.min(100, s.sanity));
    s.attention = Math.max(0, Math.min(100, s.attention));
}
export function applyEffects(civ, effects, resilience, bonuses) {
    if (!effects || typeof effects !== "object")
        return;
    const b = bonuses;
    for (const key of Object.keys(effects)) {
        let value = effects[key];
        if (key === "stability" || key === "awareness" || key === "sanity" || key === "attention") {
            let amount = Number(value);
            if (resilience) {
                if (key === "stability" && amount < 0)
                    amount *= b.stabilityLossMult;
                else if (key === "awareness" && amount > 0)
                    amount *= b.awarenessGainMult;
                else if (key === "sanity" && amount < 0)
                    amount *= b.sanityLossMult;
                else if (key === "attention" && amount > 0)
                    amount *= b.attentionGainMult;
            }
            civ.stats[key] += amount;
        }
        else if (key === "entropy")
            civ.tactical.entropy = Math.max(0, Math.min(100, civ.tactical.entropy + Number(value)));
        else if (key === "control_capacity")
            civ.tactical.controlCapacity = Math.max(0, Math.min(3, civ.tactical.controlCapacity + Number(value)));
        else if (key === "stability_max") {
            civ.stats.stabilityMax = Math.max(1, civ.stats.stabilityMax + Number(value));
            civ.stats.stability = Math.min(civ.stats.stability, civ.stats.stabilityMax);
        }
        else if (key === "development")
            civ.development = Math.max(1, civ.development + Number(value));
        else if (key === "development_mult")
            civ.developmentMultiplier = Math.max(0.2, civ.developmentMultiplier + Number(value));
        else if (key === "event_delay")
            civ.eventDelayBonus += Number(value);
        else if (key === "stability_decay_mult")
            civ.stabilityDecayMult = Math.max(0.1, civ.stabilityDecayMult * Number(value));
        else if (key === "flag_add") {
            const id = String(value);
            if (!civ.flags.includes(id))
                civ.flags.push(id);
        }
        else if (key === "institution_add") {
            const id = String(value);
            if (!civ.institutions.includes(id))
                civ.institutions.push(id);
        }
        else if (key === "flags_add" && Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const id = String(value[i]);
                if (!civ.flags.includes(id))
                    civ.flags.push(id);
            }
        }
        else if (key === "institutions_add" && Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const id = String(value[i]);
                if (!civ.institutions.includes(id))
                    civ.institutions.push(id);
            }
        }
        else if (key === "trait_add") {
            const id = String(value);
            if (id && !civ.traits.includes(id))
                civ.traits.push(id);
        }
        else if (key.startsWith("harvest_mult_")) {
            const rk = key.slice(13);
            if (rk in civ.harvestMult)
                civ.harvestMult[rk] *= Number(value);
        }
        else if (key.startsWith("harvest_")) {
            const rk = key.slice(8);
            if (rk in civ.harvestBonus)
                civ.harvestBonus[rk] += Number(value);
        }
    }
    clampStats(civ);
}
//# sourceMappingURL=effects.js.map