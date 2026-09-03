import { EXPLAIN_NOTES, HELP_ABBREVIATIONS, HELP_SECTIONS } from '../data/help-topics.js';
import { abbreviationCopy, explainNoteCopy, helpSectionCopy, helpTopicCopy, text } from '../data/i18n.js';
import { esc } from './format.js';
import { disclosureAttr } from './disclosure.js';

// The permanent half of the explanation layer: an always-available manual, and a per-panel note that
// EXPLAIN switches on. Both read from `data/help-topics.ts`, so a term cannot be described one way in
// the manual and another way on the panel it describes.

/**
 * The one-line "what is this panel for" note, rendered only while EXPLAIN is on. An unknown id
 * returns nothing rather than an empty box, so a panel without copy simply has no note.
 */
export function explainNote(id: string, explain: boolean): string {
  if (!explain) return '';
  const note = explainNoteCopy(id) ?? EXPLAIN_NOTES[id];
  return note ? `<p class="explain-note" data-explain="${esc(id)}"><b>?</b>${esc(note)}</p>` : '';
}

export function abbreviationTitle(key: string): string {
  return abbreviationCopy(key) ?? HELP_ABBREVIATIONS[key] ?? key;
}

// The abbreviated world strip is the densest surface in the game. Each column carries its expansion
// as a title, and EXPLAIN prints the whole legend under the strip for touch devices, which have no
// hover to reveal a title with.
export function abbreviationLegend(explain: boolean): string {
  if (!explain) return '';
  const rows = Object.keys(HELP_ABBREVIATIONS)
    .map(key => `<span><b>${esc(key)}</b> ${esc(abbreviationTitle(key))}</span>`)
    .join('');
  return `<div class="abbreviation-legend">${rows}</div>`;
}

export function fieldManual(explain: boolean, focus = ''): string {
  const copy = text().ui.guideView;
  const sections = HELP_SECTIONS.map(section => {
    const localizedSection = helpSectionCopy(section.id);
    const topics = section.topics.map(topic => {
      const t = helpTopicCopy(section.id, topic.id) ?? topic;
      return `
      <article class="manual-topic">
        <h5>${esc(t.term)}</h5>
        <p class="manual-what"><span>${esc(copy.what)}</span>${esc(t.what)}</p>
        <p class="manual-where"><span>${esc(copy.where)}</span>${esc(t.where)}</p>
        <p class="manual-why"><span>${esc(copy.why)}</span>${esc(t.why)}</p>
      </article>`;
    }).join('');
    // The id is what keeps a section open past the next rebuild: without it the manual closed itself
    // whenever any value in the Machine view moved. Keyed by section id, so the manual can be
    // reordered or extended without a player's open section jumping to a different one.
    const disclosure = `manual-${section.id}`;
    return `<details class="manual-section" data-disclosure="${esc(disclosure)}"${disclosureAttr(disclosure)}><summary>${esc(localizedSection?.title ?? section.title)}</summary><p class="manual-summary">${esc(localizedSection?.summary ?? section.summary)}</p><div class="manual-topics">${topics}</div></details>`;
  }).join('');
  return `<section class="panel field-manual${focus}"><h3>${esc(copy.fieldManual)}</h3>${explainNote('field_manual', explain)}<p class="panel-note">${esc(copy.fieldManualNote)}</p>${sections}</section>`;
}
