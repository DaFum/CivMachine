import { CONTENT } from '../data/content.generated.js';
import type { Civilization } from './types.js';
import { CivilizationPaths } from './paths.js';
const L=CONTENT.lore as any;
const pick=(values:string[],index:number)=>values[((index%values.length)+values.length)%values.length] ?? values[0] ?? 'Unknown';
export function speciesProfile(civ:Civilization){
  const t=civ.traits; let body='biped';
  if(t.includes('fungal_consensus'))body='fungal'; else if(t.includes('telepathic_species'))body='avian'; else if(t.includes('ritual_engineering'))body='synthetic'; else if(t.includes('liquid_mathematics'))body='cephalopod'; else if(t.includes('physics_optional'))body='insectoid'; else body=pick(L.body_types,civ.seed*13+23);
  const name=pick(L.species_prefixes,civ.seed+t.length*9)+pick(L.species_suffixes,civ.seed*2+t.length*5+3);
  return {name,bodyType:body,culture:pick(L.cultures,civ.seed*7+19),motif:t.includes('sentient_moon')?'moon sigils and tidal halos':t.includes('ritual_engineering')?'engraved machines and ceremonial lights':body==='fungal'?'spore crowns and root lanterns':body==='avian'?'crest feathers and sky glyphs':body==='cephalopod'?'ink veils and fluid geometry':'banner cloth and bio-luminescent trim'};
}
export function factionProfile(civ:Civilization){
  const ps=CivilizationPaths.ensure(civ); const path=ps.dominantPath;
  return {name:`${pick(L.faction_prefixes,civ.seed*3+5)} ${pick(L.faction_nouns,civ.seed*5+11)} ${pick(L.faction_endings,civ.seed*7+17)}`, doctrine:path?(L.path_doctrines[path]??CivilizationPaths.displayName(path)):pick(L.doctrines,civ.seed*23+7), focus:path?(L.path_focus[path]??'adaptive cultivation'):'balanced growth'};
}
