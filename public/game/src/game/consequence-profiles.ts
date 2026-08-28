import type { ConsequenceTag, DecisionAddition, DecisionSignificance, MemoryDomain, ScarDomain } from './types.js';

export interface ConsequenceProfile {
  id: string;
  eventId: string;
  requiresAddition?: { kind: DecisionAddition['kind']; label: string };
  tags: ConsequenceTag[];
  significance?: DecisionSignificance;
  impactVariant: string;
  memory?: { domain: MemoryDomain; motif: string; strength: 1 | 2 | 3; repairable: boolean };
  scar?: { domain: ScarDomain; motif: string; strength: 1 | 2 | 3 };
}

export const CONSEQUENCE_PROFILES: ReadonlyArray<ConsequenceProfile> = [
  { id:'path:machine_faith', eventId:'synod_of_the_second_engine', tags:['religious_shift','path_shift'], significance:'major', impactVariant:'engine-sigil', memory:{domain:'identity',motif:'engine_shrine',strength:3,repairable:false} },
  { id:'path:collective_mind', eventId:'unanimous_afternoon', tags:['path_shift'], significance:'major', impactVariant:'linked-nodes', memory:{domain:'identity',motif:'neural_bridge',strength:3,repairable:false} },
  { id:'path:temporal_dominion', eventId:'sovereign_hour', tags:['technological_growth','path_shift'], significance:'major', impactVariant:'chronal-rings', memory:{domain:'identity',motif:'chronal_pylon',strength:3,repairable:false} },
  { id:'path:reality_engineering', eventId:'department_of_permitted_physics', tags:['technological_growth','path_shift'], significance:'major', impactVariant:'lattice-frame', memory:{domain:'identity',motif:'lattice_tower',strength:3,repairable:false} },
  { id:'path:biological_transcendence', eventId:'pollinators_of_the_state', tags:['path_shift'], significance:'major', impactVariant:'organic-bloom', memory:{domain:'identity',motif:'organic_spires',strength:3,repairable:false} },
  { id:'path:cosmic_resistance', eventId:'blackout_doctrine', tags:['militarization','path_shift'], significance:'major', impactVariant:'defense-blackout', memory:{domain:'identity',motif:'shield_bastion',strength:3,repairable:false} },
  { id:'path:bureaucratic_singularity', eventId:'ministry_of_final_forms', tags:['path_shift'], significance:'major', impactVariant:'admin-grid', memory:{domain:'identity',motif:'administrative_monolith',strength:3,repairable:false} },
  { id:'path:post_mortal_civilization', eventId:'immortal_electorate', tags:['path_shift'], significance:'major', impactVariant:'continuity-halo', memory:{domain:'identity',motif:'continuity_vault',strength:3,repairable:false} },
  { id:'path:void_communion', eventId:'embassy_at_the_edge', tags:['path_shift','reality_damage'], significance:'major', impactVariant:'void-well', memory:{domain:'identity',motif:'dark_obelisk',strength:3,repairable:false} },
  { id:'path:recursive_simulation', eventId:'recursion_registry', tags:['technological_growth','path_shift'], significance:'major', impactVariant:'recursive-frame', memory:{domain:'identity',motif:'nested_tower',strength:3,repairable:false} },

  { id:'crisis:entropy_25', eventId:'entropy_crisis_25', tags:['reality_damage'], significance:'turning_point', impactVariant:'fracture-first', scar:{domain:'reality',motif:'containment_fracture',strength:1} },
  { id:'crisis:entropy_50', eventId:'entropy_crisis_50', tags:['reality_damage'], significance:'turning_point', impactVariant:'fracture-history', scar:{domain:'reality',motif:'history_desynchronization',strength:2} },
  { id:'crisis:entropy_75', eventId:'entropy_crisis_75', tags:['reality_damage','surveillance'], significance:'turning_point', impactVariant:'fracture-observer', scar:{domain:'reality',motif:'cultivator_observation',strength:3} },

  { id:'institution:lunar_ministry', eventId:'moon_resigns', requiresAddition:{kind:'institution',label:'Lunar Ministry'}, tags:['institution_growth'], significance:'major', impactVariant:'lunar-relay', memory:{domain:'built_environment',motif:'lunar_relay',strength:2,repairable:false} },
  { id:'institution:ministry_of_sanity', eventId:'ministry_of_sanity', requiresAddition:{kind:'institution',label:'Ministry Of Sanity'}, tags:['institution_growth','stabilization'], significance:'major', impactVariant:'sanity-dome', memory:{domain:'built_environment',motif:'sanity_dome',strength:2,repairable:false} },
  { id:'institution:consensus_office', eventId:'planetary_mind', requiresAddition:{kind:'institution',label:'Consensus Office'}, tags:['institution_growth'], significance:'major', impactVariant:'consensus-hall', memory:{domain:'built_environment',motif:'consensus_hall',strength:2,repairable:false} },

  { id:'apotheosis:ledger', eventId:'apotheosis_ledger_of_the_cultivator', tags:['apotheosis_contact','surveillance'], significance:'turning_point', impactVariant:'ledger-grid', memory:{domain:'control',motif:'cultivator_ledger',strength:2,repairable:false} },
  { id:'apotheosis:yield_census', eventId:'apotheosis_the_yield_census', tags:['apotheosis_contact','surveillance'], significance:'turning_point', impactVariant:'census-scan', memory:{domain:'control',motif:'yield_census',strength:2,repairable:false} },
  { id:'apotheosis:observatory', eventId:'apotheosis_observatory_of_the_hand', tags:['apotheosis_contact','surveillance'], significance:'turning_point', impactVariant:'observer-eye', scar:{domain:'identity',motif:'observatory_of_the_hand',strength:2} },
  { id:'apotheosis:terms', eventId:'apotheosis_terms_of_cultivation', tags:['apotheosis_contact','path_shift'], significance:'turning_point', impactVariant:'terms-frame', memory:{domain:'identity',motif:'cultivation_terms',strength:2,repairable:false} },
  { id:'apotheosis:counteroffer', eventId:'apotheosis_the_counteroffer', tags:['apotheosis_contact','civil_unrest'], significance:'turning_point', impactVariant:'counteroffer-pulse', memory:{domain:'social',motif:'counteroffer_unrest',strength:2,repairable:true} },
  { id:'apotheosis:arbitration', eventId:'apotheosis_arbitration_of_scales', tags:['apotheosis_contact','reality_damage'], significance:'turning_point', impactVariant:'scale-fracture', scar:{domain:'reality',motif:'arbitration_breach',strength:2} },
  { id:'apotheosis:currency', eventId:'apotheosis_currency_of_unhappened', tags:['apotheosis_contact','reality_damage'], significance:'turning_point', impactVariant:'unhappened-wave', memory:{domain:'reality',motif:'unhappened_echo',strength:2,repairable:true} },
  { id:'apotheosis:debt', eventId:'apotheosis_debt_to_the_unborn', tags:['apotheosis_contact','civil_unrest'], significance:'turning_point', impactVariant:'debt-shadow', scar:{domain:'civilization',motif:'unborn_debt',strength:2} },
  { id:'apotheosis:futures', eventId:'apotheosis_futures_market_in_ruins', tags:['apotheosis_contact','urban_decline','civil_unrest'], significance:'turning_point', impactVariant:'market-collapse', scar:{domain:'civilization',motif:'futures_ruins',strength:3} },
  { id:'apotheosis:maintenance', eventId:'apotheosis_maintenance_window', tags:['apotheosis_contact','containment'], significance:'turning_point', impactVariant:'maintenance-grid', memory:{domain:'reality',motif:'maintenance_seam',strength:2,repairable:true} },
  { id:'apotheosis:replacement', eventId:'apotheosis_the_replacement_part', tags:['apotheosis_contact','technological_growth'], significance:'turning_point', impactVariant:'replacement-surge', scar:{domain:'identity',motif:'replacement_monument',strength:3} },
  { id:'apotheosis:recursive_audit', eventId:'apotheosis_recursive_audit', tags:['apotheosis_contact','surveillance','reality_damage'], significance:'turning_point', impactVariant:'recursive-audit', scar:{domain:'reality',motif:'recursive_audit_breach',strength:3} },
];

const CONSEQUENCE_PROFILES_BY_ID = new Map<string, ConsequenceProfile>(
  CONSEQUENCE_PROFILES.map(profile => [profile.id, profile])
);

export function consequenceProfileById(id: string): ConsequenceProfile | null {
  return CONSEQUENCE_PROFILES_BY_ID.get(id) ?? null;
}

export function consequenceProfileFor(eventId: string, additions: ReadonlyArray<DecisionAddition>): ConsequenceProfile | null {
  return CONSEQUENCE_PROFILES.find(profile => {
    if (profile.eventId !== eventId) return false;
    if (!profile.requiresAddition) return true;
    return additions.some(addition => addition.kind === profile.requiresAddition!.kind && addition.label === profile.requiresAddition!.label);
  }) ?? null;
}
