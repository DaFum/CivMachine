function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function validateGameContent(raw) {
    const obj = isPlainObject(raw) ? raw : {};
    return {
        ...obj,
        traits: Array.isArray(obj.traits) ? obj.traits : [],
        events: Array.isArray(obj.events) ? obj.events : [],
        machine_upgrades: Array.isArray(obj.machine_upgrades)
            ? obj.machine_upgrades
            : [],
        universe_upgrades: Array.isArray(obj.universe_upgrades)
            ? obj.universe_upgrades
            : [],
        axiom_upgrades: Array.isArray(obj.axiom_upgrades)
            ? obj.axiom_upgrades
            : [],
        directives: Array.isArray(obj.directives)
            ? obj.directives
            : [],
        breeding_matrices: Array.isArray(obj.breeding_matrices)
            ? obj.breeding_matrices
            : [],
        mutations: Array.isArray(obj.mutations)
            ? obj.mutations
            : [],
    };
}
//# sourceMappingURL=content-validation.js.map