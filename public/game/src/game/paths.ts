import { CONTENT } from '../data/content.generated.js';
import type { Civilization, PathState } from './types.js';

export const PATH_IDS = [
  'machine_faith','collective_mind','temporal_dominion','reality_engineering','biological_transcendence',
  'cosmic_resistance','bureaucratic_singularity','post_mortal_civilization','void_communion','recursive_simulation'
] as const;
export const DOMINANCE_MIN_AFFINITY = 5;
export const DOMINANCE_MIN_LEAD = 2;
const DEFINITIONS = CONTENT.path_definitions as unknown as Record<string, any>;

export class CivilizationPaths {
  static newState(): PathState {
    return { affinity: Object.fromEntries(PATH_IDS.map(id => [id, 0])), dominantPath: '', completedEvents: [], choiceFlags: [], recentPaths: [], recentDeltas: {}, endgameState: '' };
  }
  static ensure(civ: Civilization): PathState {
    if (!civ.pathState) civ.pathState = this.newState();
    for (const id of PATH_IDS) if (!(id in civ.pathState.affinity)) civ.pathState.affinity[id] = 0;
    return civ.pathState;
  }
  static displayName(id: string): string { return DEFINITIONS[id]?.name ?? id.replaceAll('_',' '); }
  static affinity(civ: Civilization, id: string): number { return PATH_IDS.includes(id as any) ? Number(this.ensure(civ).affinity[id] ?? 0) : 0; }
  static ranked(civ: Civilization, limit = 10, excludeDominant = false): string[] {
    const dominant = this.ensure(civ).dominantPath;
    return [...PATH_IDS].filter(id => (!excludeDominant || id !== dominant) && this.affinity(civ,id) > 0)
      .sort((a,b) => this.affinity(civ,b) - this.affinity(civ,a)).slice(0,limit);
  }
  static secondaryPaths(civ: Civilization, limit = 3): string[] { return this.ranked(civ, limit, true); }
  static resolveDominance(civ: Civilization): string {
    const ps = this.ensure(civ);
    if (ps.dominantPath) return '';
    const ranked = this.ranked(civ, PATH_IDS.length);
    if (!ranked.length) return '';
    const leader = ranked[0]!;
    const score = this.affinity(civ, leader);
    const runner = ranked[1] ? this.affinity(civ, ranked[1]) : 0;
    if (score < DOMINANCE_MIN_AFFINITY || score - runner < DOMINANCE_MIN_LEAD) return '';
    ps.dominantPath = leader;
    return leader;
  }
  static qualitativeTendencies(civ: Civilization): Array<{id:string;name:string;label:string}> {
    const ps = this.ensure(civ);
    const ids = ps.dominantPath ? this.secondaryPaths(civ,3) : this.ranked(civ,3);
    return ids.map(id => {
      const score = this.affinity(civ,id); const delta = ps.recentDeltas[id] ?? 0;
      const label = delta < 0 ? 'declining' : score >= 4 ? 'strong' : score >= 2 ? 'rising' : score >= 1 ? 'emerging' : 'faint';
      return { id, name: this.displayName(id), label };
    });
  }
  static mergedChoiceEffects(civ: Civilization, choice: any): Record<string, any> {
    const merged = structuredClone(choice.effects ?? {});
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
    const flag = String(choice.path_flag_add ?? ''); if (flag && !ps.choiceFlags.includes(flag)) ps.choiceFlags.push(flag);
    const eventId = String(event.id ?? ''); if (eventId && !ps.completedEvents.includes(eventId)) ps.completedEvents.push(eventId);
    const newDominantPath = this.resolveDominance(civ);
    let endgameState = '';
    if (event.path_phase === 'endgame' && event.path_id === ps.dominantPath) {
      endgameState = String(DEFINITIONS[event.path_id]?.endgame ?? ''); ps.endgameState = endgameState;
      if (endgameState && !civ.flags.includes(endgameState)) civ.flags.push(endgameState);
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
    const any = req.completed_any ?? []; if (any.length && !any.some((x:string)=>ps.completedEvents.includes(String(x)))) return false;
    const all = req.completed_all ?? []; if (all.some((x:string)=>!ps.completedEvents.includes(String(x)))) return false;
    if (req.requires_path_flag != null && !ps.choiceFlags.includes(String(req.requires_path_flag))) return false;
    if (req.excludes_path_flag != null && ps.choiceFlags.includes(String(req.excludes_path_flag))) return false;
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
  static summary(civ:Civilization){ const ps=this.ensure(civ); return { dominantId:ps.dominantPath, dominantName: ps.dominantPath?this.displayName(ps.dominantPath):'', tendencies:this.qualitativeTendencies(civ), endgameState:ps.endgameState }; }
}
