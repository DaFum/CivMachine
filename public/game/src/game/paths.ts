import { CONTENT } from '../data/content.generated.js';
import { pathName, text } from '../data/i18n.js';
import type { Civilization, PathState } from './types.js';

export const PATH_IDS = [
  'machine_faith','collective_mind','temporal_dominion','reality_engineering','biological_transcendence',
  'cosmic_resistance','bureaucratic_singularity','post_mortal_civilization','void_communion','recursive_simulation'
] as const;
export const DOMINANCE_MIN_AFFINITY = 5;
export const DOMINANCE_MIN_LEAD = 2;
// From Transcendence onward dominance can change hands. Without this, 18 written path events -- the
// consolidation and endgame phases of the nine non-dominant paths -- are unreachable in any run.
export const SUCCESSION_MIN_ERA = 2;
export const SUCCESSION_INTERVAL = 4;
export const SUCCESSION_MAX = 3;
const DEFINITIONS = CONTENT.path_definitions as unknown as Record<string, any>;

export class CivilizationPaths {
  static newState(): PathState {
    return { affinity: Object.fromEntries(PATH_IDS.map(id => [id, 0])), dominantPath: '', completedEvents: [], choiceFlags: [], recentPaths: [], recentDeltas: {}, endgameState: '', endgameStates: [], successions: 0, successionAtChoice: 0 };
  }
  static ensure(civ: Civilization): PathState {
    if (!civ.pathState) civ.pathState = this.newState();
    const ps = civ.pathState;
    for (const id of PATH_IDS) if (!(id in ps.affinity)) ps.affinity[id] = 0;
    if (!Array.isArray(ps.endgameStates)) ps.endgameStates = ps.endgameState ? [ps.endgameState] : [];
    if (typeof ps.successions !== 'number') ps.successions = 0;
    if (typeof ps.successionAtChoice !== 'number') ps.successionAtChoice = 0;
    return ps;
  }
  static getCompletedEventsSet(ps: PathState & { _cachedEventsVersion?: number, _cachedEventsArray?: string[] }): Set<string> {
    if (!(ps._completedEventsSet instanceof Set) || ps._cachedEventsArray !== ps.completedEvents || ps._completedEventsSet.size !== ps.completedEvents.length || ps._cachedEventsVersion !== ps._completedEventsVersion) {
      ps._completedEventsSet = new Set(ps.completedEvents);
      ps._cachedEventsArray = ps.completedEvents;
      ps._cachedEventsVersion = ps._completedEventsVersion;
    }
    return ps._completedEventsSet;
  }
  static getChoiceFlagsSet(ps: PathState & { _cachedFlagsVersion?: number, _cachedFlagsArray?: string[] }): Set<string> {
    if (!(ps._choiceFlagsSet instanceof Set) || ps._cachedFlagsArray !== ps.choiceFlags || ps._choiceFlagsSet.size !== ps.choiceFlags.length || ps._cachedFlagsVersion !== ps._choiceFlagsVersion) {
      ps._choiceFlagsSet = new Set(ps.choiceFlags);
      ps._cachedFlagsArray = ps.choiceFlags;
      ps._cachedFlagsVersion = ps._choiceFlagsVersion;
    }
    return ps._choiceFlagsSet;
  }
  static displayName(id: string): string { return pathName(id) ?? DEFINITIONS[id]?.name ?? id.replaceAll('_',' '); }
  static affinity(civ: Civilization, id: string): number { return PATH_IDS.includes(id as any) ? Number(this.ensure(civ).affinity[id] ?? 0) : 0; }
  static ranked(civ: Civilization, limit = 10, excludeDominant = false): string[] {
    const dominant = this.ensure(civ).dominantPath;
    return [...PATH_IDS].filter(id => (!excludeDominant || id !== dominant) && this.affinity(civ,id) > 0)
      .sort((a,b) => this.affinity(civ,b) - this.affinity(civ,a)).slice(0,limit);
  }
  static secondaryPaths(civ: Civilization, limit = 3): string[] { return this.ranked(civ, limit, true); }
  static resolveDominance(civ: Civilization): string {
    const ps = this.ensure(civ);
    const ranked = this.ranked(civ, PATH_IDS.length);
    if (!ranked.length) return '';
    const leader = ranked[0]!;
    const score = this.affinity(civ, leader);
    const runner = ranked[1] ? this.affinity(civ, ranked[1]) : 0;
    if (score < DOMINANCE_MIN_AFFINITY || score - runner < DOMINANCE_MIN_LEAD) return '';
    if (!ps.dominantPath) { ps.dominantPath = leader; return leader; }
    if (leader === ps.dominantPath) return '';
    if (civ.era < SUCCESSION_MIN_ERA) return '';
    if (ps.successions >= SUCCESSION_MAX) return '';
    if (civ.eventChoices - ps.successionAtChoice < SUCCESSION_INTERVAL) return '';
    ps.dominantPath = leader;
    ps.successions += 1;
    ps.successionAtChoice = civ.eventChoices;
    return leader;
  }
  static qualitativeTendencies(civ: Civilization): Array<{id:string;name:string;label:string}> {
    const ps = this.ensure(civ);
    const ids = ps.dominantPath ? this.secondaryPaths(civ,3) : this.ranked(civ,3);
    return ids.map(id => {
      const score = this.affinity(civ,id); const delta = ps.recentDeltas[id] ?? 0;
      const words = text().reports.lore.tendencies;
      const label = delta < 0 ? words.declining : score >= 4 ? words.strong : score >= 2 ? words.rising : score >= 1 ? words.emerging : words.faint;
      return { id, name: this.displayName(id), label };
    });
  }
  static mergedChoiceEffects(civ: Civilization, choice: any): Record<string, any> {
    const merged = { ...(choice.effects ?? {}) };
    const secondary = choice.secondary_effects ?? {};
    for (const id of this.secondaryPaths(civ,3)) {
      if (!secondary[id]) continue;
      for (const [key,value] of Object.entries(secondary[id] as Record<string,number>)) merged[key] = Number(merged[key] ?? 0) + Number(value);
      break;
    }
    return merged;
  }
  static applyChoice(civ: Civilization, event: any, choice: any): {newDominantPath:string;history:string;endgameState:string} {
    const ps = this.ensure(civ); const deltas = choice.path_affinity ?? {}; const recent: Record<string,number> = {};
    for (const [id, raw] of Object.entries(deltas)) if (PATH_IDS.includes(id as any)) { const d=Number(raw); ps.affinity[id] = (ps.affinity[id] ?? 0)+d; recent[id]=d; }
    ps.recentDeltas = recent;
    const flag = String(choice.path_flag_add ?? ''); if (flag && !this.getChoiceFlagsSet(ps).has(flag)) { ps.choiceFlags.push(flag); ps._choiceFlagsVersion = (ps._choiceFlagsVersion ?? 0) + 1; ps._choiceFlagsSet!.add(flag); }
    const eventId = String(event.id ?? ''); if (eventId && !this.getCompletedEventsSet(ps).has(eventId)) { ps.completedEvents.push(eventId); ps._completedEventsVersion = (ps._completedEventsVersion ?? 0) + 1; ps._completedEventsSet!.add(eventId); }
    const newDominantPath = this.resolveDominance(civ);
    let endgameState = '';
    if (event.path_phase === 'endgame' && event.path_id === ps.dominantPath) {
      endgameState = String(DEFINITIONS[event.path_id]?.endgame ?? '');
      if (endgameState) {
        ps.endgameState = endgameState;
        if (!ps.endgameStates.includes(endgameState)) ps.endgameStates.push(endgameState);
        if (!civ.flags.includes(endgameState)) civ.flags.push(endgameState);
      }
    }
    return { newDominantPath, history: String(choice.path_history ?? ''), endgameState };
  }
  static eventIsEligible(event: any, civ: Civilization): boolean {
    const id = String(event.path_id ?? ''); if (!id || !PATH_IDS.includes(id as any)) return true;
    const req = event.requirements ?? {}; const ps = this.ensure(civ);
    if (req.min_path_affinity != null && this.affinity(civ,id) < Number(req.min_path_affinity)) return false;
    if (req.min_development != null && civ.development < Number(req.min_development)) return false;
    if (req.requires_dominant_path != null && ps.dominantPath !== String(req.requires_dominant_path)) return false;
    if (req.requires_secondary_path != null && !this.secondaryPaths(civ,3).includes(String(req.requires_secondary_path))) return false;
    const completedSet = this.getCompletedEventsSet(ps);
    const any = req.completed_any ?? []; if (any.length && !any.some((x:string)=>completedSet.has(String(x)))) return false;
    const all = req.completed_all ?? []; if (all.some((x:string)=>!completedSet.has(String(x)))) return false;
    const flagSet = this.getChoiceFlagsSet(ps);
    if (req.requires_path_flag != null && !flagSet.has(String(req.requires_path_flag))) return false;
    if (req.excludes_path_flag != null && flagSet.has(String(req.excludes_path_flag))) return false;
    return true;
  }
  static eventWeightMultiplier(event: any, civ: Civilization): number {
    const id = String(event.path_id ?? ''); if (!id || !PATH_IDS.includes(id as any)) return 1;
    const ps=this.ensure(civ); const recent=ps.recentPaths;
    if (recent.length>=4 && recent.slice(-4).every(x=>x===id)) return 0;
    if (ps.dominantPath && id===ps.dominantPath) return 4.5;
    if (this.secondaryPaths(civ,3).includes(id)) return 2.2;
    if (!ps.dominantPath) return 1 + Math.min(2, Math.max(0,this.affinity(civ,id))*0.45);
    return 0.65;
  }
  static recordSelectedEvent(civ:Civilization,event:any):void { const ps=this.ensure(civ); const id=String(event.path_id??''); ps.recentPaths.push(PATH_IDS.includes(id as any)?id:'neutral'); while(ps.recentPaths.length>6) ps.recentPaths.shift(); }
  static dominanceEffects(id:string):Record<string,any>{ return structuredClone(DEFINITIONS[id]?.dominance_effects ?? {}); }
  static simulationModifier(civ:Civilization,key:string):number { const id=this.ensure(civ).dominantPath; return id ? Number(DEFINITIONS[id]?.simulation?.[key] ?? 1) : 1; }
  static summary(civ:Civilization){ const ps=this.ensure(civ); return { dominantId:ps.dominantPath, dominantName: ps.dominantPath?this.displayName(ps.dominantPath):'', tendencies:this.qualitativeTendencies(civ), endgameState:ps.endgameState, endgameStates:[...ps.endgameStates], successions:ps.successions }; }
}
