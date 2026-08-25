// Every player-facing string in the game is read through this module. `localization.ts` beside it is
// pure data -- one catalog per locale, keyed by the stable IDs the runtime already uses -- and this
// is the single mutable thing about it: which locale is active.
//
// The one rule that keeps a locale switch honest: **no module may capture a catalog string in a
// module-level constant.** A constant is filled once, at import time, and would keep the language the
// page booted in for the rest of the session. Read through `text()` at the point of use instead, so a
// switch plus a re-render is the whole operation.
import { DEFAULT_LOCALE, LOCALIZATION, SUPPORTED_LOCALES, type Catalog, type Locale } from './localization.js';

export { DEFAULT_LOCALE, SUPPORTED_LOCALES };
export type { Catalog, Locale };

let active: Locale = DEFAULT_LOCALE;

export const isLocale = (value: unknown): value is Locale => SUPPORTED_LOCALES.some(entry => entry.code === value);
export const activeLocale = (): Locale => active;
// Returns whether anything changed, so a caller can skip the re-render and the write when a player
// re-picks the locale they are already reading.
export function setActiveLocale(next: Locale): boolean {
  if (next === active) return false;
  active = next; return true;
}
export const text = (): Catalog => LOCALIZATION[active];

// `{name}` in a catalog string, filled from a bag. An unknown token is left standing rather than
// blanked: a visible `{depth}` is a bug that gets reported, an empty gap is one that ships.
export const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (token, key: string) => key in values ? String(values[key]) : token);

// The ID-keyed sections. Their keys are the content IDs, which arrive as plain strings from the
// engine and the generated catalog, so each reader is a narrow structural view rather than an index
// into a literal-keyed object. A miss returns undefined and every call site falls back to the
// canonical English the source already carries -- localization must never delete copy.
type Table<T> = Readonly<Record<string, T>>;
const read = <T,>(table: Table<T>, id: string): T | undefined => table[id];

export type LocalizedNamed = { readonly name: string; readonly description: string };
export type LocalizedTitled = { readonly title: string; readonly description: string };
export type LocalizedChoice = { readonly label: string; readonly prediction: string; readonly history?: string };
export type LocalizedEvent = { readonly title: string; readonly body: string; readonly choices: readonly LocalizedChoice[] };
export type LocalizedIntervention = { readonly title: string; readonly label: string; readonly summary: string };

export const eventCopy = (id: string): LocalizedEvent | undefined => read<LocalizedEvent>(text().content.events, id);
export const traitCopy = (id: string): LocalizedNamed | undefined => read<LocalizedNamed>(text().content.traits, id);
export const upgradeCopy = (id: string): LocalizedNamed | undefined => read<LocalizedNamed>(text().content.upgrades, id);
export const mutationCopy = (id: string): LocalizedNamed | undefined => read<LocalizedNamed>(text().content.mutations, id);
export const directiveCopy = (id: string): LocalizedNamed | undefined => read<LocalizedNamed>(text().content.directives.catalog, id);
export const objectiveCopy = (id: string): LocalizedTitled | undefined => read<LocalizedTitled>(text().content.directives.objectives, id);
export const matrixCopy = (id: string): LocalizedNamed | undefined => read<LocalizedNamed>(text().content.breedingMatrices, id);
export const milestoneCopy = (id: string): LocalizedTitled | undefined => read<LocalizedTitled>(text().content.milestones, id);
export const interventionCopy = (id: string): LocalizedIntervention | undefined => read<LocalizedIntervention>(text().content.interventions, id);
export const pathName = (id: string): string | undefined => read<{ readonly name: string }>(text().content.paths, id)?.name;
export const institutionName = (id: string): string | undefined => read<{ readonly name: string }>(text().content.institutions, id)?.name;
export const eraName = (id: string): string | undefined => read<{ readonly name: string }>(text().content.eras, id)?.name;
export const flagLabel = (id: string): string | undefined => read<string>(text().content.flags, id);
export const pathFlagLabel = (id: string): string | undefined => read<string>(text().content.pathFlags, id);
export const endgameStateLabel = (id: string): string | undefined => read<string>(text().content.endgameStates, id);
export const harvestGradeLabel = (id: string): string | undefined => read<string>(text().reports.harvestGrades, id);
export const dramaPhaseLabel = (id: string): string | undefined => read<string>(text().reports.runReport.dramaPhases, id);
export type LocalizedTacticalAction = { readonly title: string; readonly label: string; readonly summary: string; readonly risk: string };
export const tacticalActionCopy = (id: string): LocalizedTacticalAction | undefined => read<LocalizedTacticalAction>(text().tacticalActions.actions, id);
export const resourceName = (key: string): string | undefined => read<string>(text().ui.viewModel.resources, key);
export const metricName = (key: string): string | undefined => read<string>(text().ui.viewModel.metrics, key);
export const milestoneGroupLabel = (group: string): string | undefined => read<string>(text().ui.app.milestoneGroups, group.toLowerCase());
export const explainNoteCopy = (id: string): string | undefined => read<string>(text().help.explainNotes, id);
export const abbreviationCopy = (id: string): string | undefined => read<string>(text().help.abbreviations, id);

export type LocalizedHelpTopic = { readonly term: string; readonly what: string; readonly where: string; readonly why: string };
export type LocalizedHelpSection = { readonly title: string; readonly summary: string; readonly topics: Table<LocalizedHelpTopic> };
export const helpSectionCopy = (id: string): LocalizedHelpSection | undefined => read<LocalizedHelpSection>(text().help.sections, id);
export const helpTopicCopy = (sectionId: string, topicId: string): LocalizedHelpTopic | undefined => {
  const section = helpSectionCopy(sectionId);
  return section ? read<LocalizedHelpTopic>(section.topics, topicId) : undefined;
};
export const tutorialStepCopy = (id: string) =>
  read<{ readonly title: string; readonly what: string; readonly where: string; readonly why: string; readonly action: string }>(text().tutorial.steps, id);

// `guidance.*` is deliberately absent from the readers above. Its two ladders name every report as a
// literal in `game/guidance.ts`, and the entries are not uniform -- a report whose advice depends on
// spare Control carries two advice lines, one whose headline counts credits carries two headlines. A
// literal key gets the exact shape typed; a dynamic reader would have to flatten them all into one.
