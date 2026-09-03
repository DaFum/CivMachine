// Which `<details>` the player has opened, and the attribute that puts them back.
//
// `replaceIfChanged` rebuilds a panel's whole HTML as soon as one of its numbers moves, so an opened
// disclosure stays open only if the next render re-emits the `open` attribute. That is what the id is
// for: the listener records it on toggle and `disclosureAttr` re-emits `open` on every later render.
//
// A `<details>` rendered without an id is therefore not "a disclosure with default state" -- it is
// one that silently snaps shut the next time anything in its panel changes. The field manual spent
// six sections in exactly that state: opening a section and switching locale closed it again. So the
// state lives here rather than privately in `app.ts`, where the manual could not reach it.
const openDisclosures = new Set<string>();

export function isDisclosureOpen(id: string): boolean { return openDisclosures.has(id); }

/** ` open` for a disclosure the player has opened, otherwise nothing. Renders into the tag. */
export function disclosureAttr(id: string): string { return isDisclosureOpen(id) ? ' open' : ''; }

export function setDisclosureOpen(id: string, open: boolean): void {
  if (open) openDisclosures.add(id);
  else openDisclosures.delete(id);
}

/**
 * One capturing `toggle` listener for every disclosure in the shell, present and future: `toggle`
 * does not bubble, so this has to capture, and a rebuilt panel brings new elements that no
 * per-element listener would be attached to. Bound once per document.
 */
export function bindDisclosureListener(doc: Document): void {
  const flag = doc as unknown as { __disclosureListenerBound?: boolean };
  if (flag.__disclosureListenerBound) return;
  flag.__disclosureListenerBound = true;
  doc.addEventListener('toggle', event => {
    const target = event.target as HTMLDetailsElement | null;
    const id = target?.dataset?.disclosure;
    if (id) setDisclosureOpen(id, target!.open);
  }, true);
}
