// Every player-facing string in the game is read through this module. `localization.ts` beside it is
// pure data -- one catalog per locale, keyed by the stable IDs the runtime already uses -- and this
// is the single mutable thing about it: which locale is active.
//
// The one rule that keeps a locale switch honest: **no module may capture a catalog string in a
// module-level constant.** A constant is filled once, at import time, and would keep the language the
// page booted in for the rest of the session. Read through `text()` at the point of use instead, so a
// switch plus a re-render is the whole operation.
import { DEFAULT_LOCALE, LOCALIZATION, SUPPORTED_LOCALES } from './localization.js';
export { DEFAULT_LOCALE, SUPPORTED_LOCALES };
let active = DEFAULT_LOCALE;
export const isLocale = (value) => SUPPORTED_LOCALES.some(entry => entry.code === value);
export const activeLocale = () => active;
// Returns whether anything changed, so a caller can skip the re-render and the write when a player
// re-picks the locale they are already reading.
export function setActiveLocale(next) {
    if (next === active)
        return false;
    active = next;
    return true;
}
export const text = () => LOCALIZATION[active];
// `{name}` in a catalog string, filled from a bag. An unknown token is left standing rather than
// blanked: a visible `{depth}` is a bug that gets reported, an empty gap is one that ships.
export const fill = (template, values) => template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (token, key) => key in values ? String(values[key]) : token);
const read = (table, id) => table[id];
export const eventCopy = (id) => read(text().content.events, id);
export const traitCopy = (id) => read(text().content.traits, id);
export const upgradeCopy = (id) => read(text().content.upgrades, id);
export const mutationCopy = (id) => read(text().content.mutations, id);
export const directiveCopy = (id) => read(text().content.directives.catalog, id);
export const objectiveCopy = (id) => read(text().content.directives.objectives, id);
export const matrixCopy = (id) => read(text().content.breedingMatrices, id);
export const milestoneCopy = (id) => read(text().content.milestones, id);
export const interventionCopy = (id) => read(text().content.interventions, id);
export const pathName = (id) => read(text().content.paths, id)?.name;
export const institutionName = (id) => read(text().content.institutions, id)?.name;
export const eraName = (id) => read(text().content.eras, id)?.name;
export const flagLabel = (id) => read(text().content.flags, id);
export const pathFlagLabel = (id) => read(text().content.pathFlags, id);
export const endgameStateLabel = (id) => read(text().content.endgameStates, id);
export const harvestGradeLabel = (id) => read(text().reports.harvestGrades, id);
export const dramaPhaseLabel = (id) => read(text().reports.runReport.dramaPhases, id);
export const tacticalActionCopy = (id) => read(text().tacticalActions.actions, id);
export const resourceName = (key) => read(text().ui.viewModel.resources, key);
export const metricName = (key) => read(text().ui.viewModel.metrics, key);
export const milestoneGroupLabel = (group) => read(text().ui.app.milestoneGroups, group.toLowerCase());
export const explainNoteCopy = (id) => read(text().help.explainNotes, id);
export const abbreviationCopy = (id) => read(text().help.abbreviations, id);
export const helpSectionCopy = (id) => read(text().help.sections, id);
export const helpTopicCopy = (sectionId, topicId) => {
    const section = helpSectionCopy(sectionId);
    return section ? read(section.topics, topicId) : undefined;
};
export const tutorialStepCopy = (id) => read(text().tutorial.steps, id);
// `guidance.*` is deliberately absent from the readers above. Its two ladders name every report as a
// literal in `game/guidance.ts`, and the entries are not uniform -- a report whose advice depends on
// spare Control carries two advice lines, one whose headline counts credits carries two headlines. A
// literal key gets the exact shape typed; a dynamic reader would have to flatten them all into one.
//# sourceMappingURL=i18n.js.map