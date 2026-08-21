import { EXPLAIN_NOTES, HELP_ABBREVIATIONS, HELP_SECTIONS } from '../data/help-topics.js';
import { esc } from './format.js';

// The permanent half of the explanation layer: an always-available manual, and a per-panel note that
// EXPLAIN switches on. Both read from `data/help-topics.ts`, so a term cannot be described one way in
// the manual and another way on the panel it describes.

/**
 * The one-line "what is this panel for" note, rendered only while EXPLAIN is on. An unknown id
 * returns nothing rather than an empty box, so a panel without copy simply has no note.
 */
export function explainNote(id: string, explain: boolean): string {
  if (!explain) return '';
  const note = EXPLAIN_NOTES[id];
  return note ? `<p class="explain-note" data-explain="${esc(id)}"><b>?</b>${esc(note)}</p>` : '';
}

export function abbreviationTitle(key: string): string {
  return HELP_ABBREVIATIONS[key] ?? key;
}

// The abbreviated world strip is the densest surface in the game. Each column carries its expansion
// as a title, and EXPLAIN prints the whole legend under the strip for touch devices, which have no
// hover to reveal a title with.
export function abbreviationLegend(explain: boolean): string {
  if (!explain) return '';
  const rows = Object.entries(HELP_ABBREVIATIONS)
    .map(([key, meaning]) => `<span><b>${esc(key)}</b> ${esc(meaning)}</span>`)
    .join('');
  return `<div class="abbreviation-legend">${rows}</div>`;
}

export function fieldManual(explain: boolean, focus = ''): string {
  const sections = HELP_SECTIONS.map(section => {
    const topics = section.topics.map(topic => `
      <article class="manual-topic">
        <h5>${esc(topic.term)}</h5>
        <p class="manual-what"><span>WHAT</span>${esc(topic.what)}</p>
        <p class="manual-where"><span>WHERE</span>${esc(topic.where)}</p>
        <p class="manual-why"><span>WHY</span>${esc(topic.why)}</p>
      </article>`).join('');
    return `<details class="manual-section"><summary>${esc(section.title)}</summary><p class="manual-summary">${esc(section.summary)}</p><div class="manual-topics">${topics}</div></details>`;
  }).join('');
  return `<section class="panel field-manual${focus}"><h3>Field Manual</h3>${explainNote('field_manual', explain)}<p class="panel-note">Every term in the game, with where it is on screen and what it decides. Nothing here is unlocked — it is all readable from the first second.</p>${sections}</section>`;
}
