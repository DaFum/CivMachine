export type Locale = 'en' | 'de';

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
] as const;

export const DEFAULT_LOCALE: Locale = 'en';

// The English catalog is `as const`, so its own values are literal types. Every consumer wants the
// widened shape instead -- a locale switch hands out German strings through the same accessor -- so
// `Catalog` is what `i18n.ts` exposes and what the rest of the game reads.
type LocalizedShape<T> =
  T extends string ? string :
  T extends readonly unknown[] ? { readonly [K in keyof T]: LocalizedShape<T[K]> } :
  T extends object ? { readonly [K in keyof T]: LocalizedShape<T[K]> } :
  never;

const ENGLISH = {
  "ui": {
    "shell": {
      "documentTitle": "Reality Consumption Engine — Browser Edition",
      "brandName": "REALITY CONSUMPTION ENGINE",
      "brandNode": "BROWSER CULTIVATION NODE",
      "explainAria": "Toggle explain mode: annotate every panel with what it is, where it is and why it matters",
      "worldVisualizationAria": "Scrollable civilization visualization",
      "machineRecord": "MACHINE RECORD",
      "footerVersion": "Reality Consumption Engine Browser v{version}",
      "footerTech": "v{saveVersion} save · migrating loader · localStorage · No offline progression",
      "pwaName": "Reality Consumption Engine",
      "pwaShortName": "RCE",
      "pwaDescription": "Cultivate civilizations, shape their histories, and harvest reality.",
      "languageLabel": "Language"
    },
    "app": {
      "resourceCausal": "Causal",
      "resourceCognition": "Cognition",
      "resourceParadox": "Paradox",
      "resourceExistence": "Existence",
      "metaMachineInsight": "Machine Insight",
      "metaCultivationCredits": "Cultivation Credits",
      "metaMilestones": "Milestones",
      "metaMultiverse": "Multiverse",
      "metaConvergences": "Convergences",
      "milestoneGroups": {
        "cultivation": "CULTIVATION",
        "harvest": "HARVEST",
        "paths": "PATHS",
        "prestige": "PRESTIGE",
        "convergence": "CONVERGENCE"
      },
      "reserveCost": "COST {cost} {currency} · {usesLeft} OF {maxUses} LEFT",
      "harvestSummaryOne": "×{multiplier} yield · +{credits} Cultivation Credit{objectiveBonus}",
      "harvestSummaryMany": "×{multiplier} yield · +{credits} Cultivation Credits{objectiveBonus}",
      "objectiveBonusActive": " · OBJECTIVE BONUS ACTIVE",
      "situationHeading": "SITUATION // WHAT IS HAPPENING",
      "situationDetailsSummary": "Situation / Details",
      "pressureHarvestDetails": "Pressure & Harvest Details",
      "optionsCount": "options",
      "machineRecord": "MACHINE RECORD",
      "why": "WHY",
      "do": "DO",
      "pathAffinity": "{label} affinity",
      "pathInfluence": "Path influence",
      "noMeasurableStateChange": "No measurable state change.",
      "decisionResolved": "DECISION RESOLVED // EXACT OUTCOME",
      "metricChangedOne": "{count} METRIC CHANGED",
      "metricChangedMany": "{count} METRICS CHANGED",
      "machineRecordAwaitingActivity": "Machine record awaiting activity.",
      "explainOnTitle": "Explain mode on: every panel says what it is for. Click to turn off.",
      "explainOffTitle": "Explain mode: annotate every panel with what it is for and what it decides.",
      "level": "Level {level}/{max}",
      "max": "MAX",
      "locked": "LOCKED",
      "install": "INSTALL",
      "active": "ACTIVE",
      "lockedForRun": "LOCKED FOR RUN",
      "select": "SELECT",
      "directiveObjective": "DIRECTIVE OBJECTIVE",
      "milestoneRegister": "MILESTONE REGISTER",
      "milestoneSummary": "{completed} of {total} milestones recorded. Each one pays Machine Insight.",
      "insightAward": "INSIGHT +{amount}",
      "greatConvergence": "GREAT CONVERGENCE",
      "convergenceDescription": "Terminal cultivation begins in APOTHEOSIS with no yield and 1.6× Entropy. It is won by a controlled harvest at Cultivation Depth {targetDepth} or deeper. Failure costs nothing but the run.",
      "initiateGreatConvergence": "INITIATE GREAT CONVERGENCE",
      "convergencesAchieved": "Convergences achieved: {count}",
      "noDirectiveOffers": "No Directive offers are currently stable.",
      "lastHarvest": "LAST HARVEST",
      "lastHarvestDetailOne": "+{credits} Cultivation Credit · ×{multiplier} yield",
      "lastHarvestDetailMany": "+{credits} Cultivation Credits · ×{multiplier} yield",
      "directiveObjectiveTitle": "Directive Objective",
      "browserNode": "REALITY CONSUMPTION ENGINE // BROWSER NODE",
      "machineControl": "Machine Control",
      "machineDescription": "Cultivate civilizations, shape their histories, and harvest reality without allowing the crop to understand the farm.",
      "nextCivilization": "NEXT CIVILIZATION",
      "startingTraitsPreview": "STARTING TRAITS // DETERMINISTIC PREVIEW",
      "traitArchiveUnavailable": "Trait archive unavailable",
      "startCivilization": "START CIVILIZATION",
      "machineUpgrades": "Machine Upgrades",
      "breedingMatrix": "Breeding Matrix",
      "noBreedingMatrices": "No breeding matrices are currently understood.",
      "universeUpgrades": "Universe Upgrades",
      "axiomUpgrades": "Axiom Upgrades",
      "nextDiscoveries": "Next Discoveries",
      "consumeUniverse": "CONSUME UNIVERSE",
      "collapseMultiverse": "COLLAPSE MULTIVERSE",
      "cascadeUnderWay": "CASCADE UNDER WAY // harvest now or lose 40% of the credits",
      "deepestBandReachedCreditCap": "DEEPEST BAND REACHED // credit cap reached",
      "noLimit": "no limit",
      "harvestNowForecast": "HARVEST NOW // credit {nextCredit} needs {secondsToNextCredit}s, the run can reach {runLeft}",
      "closingForecast": "CLOSING // credit {nextCredit} in {secondsToNextCredit}s, the run can reach {runLeft}",
      "buildingPremature": "BUILDING // no credits until the run clears Premature",
      "buildingForecast": "BUILDING // credit {nextCredit} in {secondsToNextCredit}s",
      "cascadeHarvestNow": "CASCADE — HARVEST NOW",
      "deepestBandReached": "DEEPEST BAND REACHED",
      "deepestBandReachedShort": "DEEPEST BAND REACHED · cap reached",
      "harvestNowShort": "HARVEST NOW · credit {nextCredit} out of reach",
      "buildingPrematureShort": "BUILDING · clears Premature first",
      "closing": "CLOSING",
      "building": "BUILDING",
      "shortCreditForecast": "{state} · credit {nextCredit} in {seconds}",
      "nextBand": "NEXT {grade} AT DEPTH {depth} FOR ×{multiplier}",
      "harvestGrade": "HARVEST GRADE",
      "simulationSpeed": "Simulation speed",
      "tacticalActions": "TACTICAL ACTIONS",
      "keys": "KEYS",
      "controlCapacity": "CONTROL CAPACITY",
      "controlAvailable": "{available} of {max} Control available",
      "cost": "COST {cost}",
      "collapseWarning": "⚠ REALITY COLLAPSE IMMINENT — CHAOTIC HARVEST WILL TRIGGER AT ZERO STABILITY",
      "pressureHarvest": "PRESSURE & HARVEST",
      "pressureHarvestAria": "Pressure and harvest",
      "tacticalActionsAria": "Tactical actions",
      "containmentPressureRate": "Containment {containment} · Pressure ×{pressure} · {rate}/s",
      "cascadeCurrentCourse": "CASCADE IN {seconds} AT CURRENT COURSE",
      "controlledHarvest": "CONTROLLED HARVEST",
      "forceChaoticHarvest": "FORCE CHAOTIC HARVEST",
      "abandonWithoutReward": "ABANDON WITHOUT REWARD",
      "terminalCultivation": "TERMINAL CULTIVATION",
      "convergenceTargetDepth": "CONVERGENCE TARGET DEPTH {depth}",
      "currentDepthReady": "CURRENT {depth} · CONVERGENCE READY",
      "currentDepthInsufficient": "CURRENT {depth} · INSUFFICIENT DEPTH",
      "dominantPath": "DOMINANT: {path}",
      "unresolvedPath": "PATH: UNRESOLVED",
      "cascade": "CASCADE",
      "dragSwipeExplore": "↔ DRAG / SWIPE TO EXPLORE",
      "panLeft": "Pan left",
      "panRight": "Pan right",
      "currentIntervention": "CURRENT INTERVENTION",
      "currentInterventionProbed": "CURRENT INTERVENTION // PROBED",
      "predictionCoreOffline": "PREDICTION CORE OFFLINE // Spend 1 Control on Probe to reveal risk directions.",
      "rerollWithParadox": "REROLL WITH PARADOX",
      "monitoringCivilization": "Monitoring civilization...",
      "nextInterventionWindow": "Next intervention window in approximately {seconds} simulation seconds.",
      "noCoherentTendency": "No coherent tendency yet.",
      "directiveObjectiveComplete": "COMPLETE",
      "directiveObjectiveActive": "ACTIVE",
      "objectiveBonus": "OBJECTIVE BONUS // ×1.15 rewards + 1 Cultivation Credit",
      "machineReserve": "Machine Reserve",
      "machineReserveDescription": "Commit banked resources to the running civilization. Each use triples the price, and the price rises with the depth already reached.",
      "strategicOverview": "Strategic Overview",
      "realityStability": "Reality Stability",
      "machineAwareness": "Machine Awareness",
      "collectiveSanity": "Collective Sanity",
      "cosmicAttention": "Cosmic Attention",
      "era": "Era",
      "year": "Year",
      "development": "Development",
      "externalObserversConverging": "External observers are converging.",
      "civilizationDangerouslyAware": "The civilization is becoming dangerously aware of cultivation.",
      "cosmicObservationTolerable": "Cosmic observation remains tolerable.",
      "speciesFactionDossier": "Species & Faction Dossier",
      "emergingTendencies": "Emerging Tendencies",
      "institutions": "Institutions",
      "harvestYieldDetail": "Harvest Yield Detail",
      "harvestDetailDescription": "Grade, Cultivation Depth and the next band are in the pressure rail above; this is the per-resource breakdown behind them.",
      "controlled": "CONTROLLED",
      "chaotic": "CHAOTIC",
      "chaoticAutomatic": "Automatic at zero Stability; Premature collapses retain a salvage floor.",
      "recordsAndIntelligence": "RECORDS & INTELLIGENCE",
      "civilizationRecord": "Civilization Record",
      "noRecordedHistoryYet": "No recorded history yet.",
      "civilizationIdentity": "Civilization Identity",
      "visualMotif": "Visual motif: {motif}",
      "doctrine": "Doctrine: {doctrine}",
      "focus": "Focus: {focus}",
      "eraProgression": "Era Progression",
      "eraRanges": "Emergence: 0–2,499 years · Expansion: 2,500–6,499 · Transcendence: 6,500–13,999 · Apotheosis: 14,000+",
      "victoryNoneRecorded": "none recorded",
      "victoryTitle": "The Machine Closes Its Ledger",
      "victoryDescription": "A civilization was cultivated to the depth at which the harvest and the harvester stop being different operations.",
      "seed": "SEED",
      "years": "YEARS",
      "depth": "DEPTH",
      "dominantPathLabel": "DOMINANT PATH",
      "unresolved": "unresolved",
      "permanentReward": "Permanent reward: ×{yield} harvest yield and +{containment} Containment.",
      "continue": "CONTINUE"
    },
    "resetSave": {
      "defaultTitle": "Reset browser save",
      "armedLabel": "ERASE SAVE?",
      "armedTitle": "Click again to erase the browser save and reset all progress",
      "armedAria": "Confirm: erase the browser save and reset all Machine Insight, unlocks and progress",
      "armedAnnouncement": "Erase save armed. Click again within {seconds} seconds to erase the browser save and reset all Machine Insight, unlocks and progress."
    },
    "viewModel": {
      "resources": {
        "causal_mass": "Causal Mass",
        "cognition": "Cognition",
        "paradox": "Paradox",
        "existence": "Existence",
        "universal_residue": "Universal Residue",
        "axioms": "Axioms"
      },
      "metrics": {
        "stability": "Stability",
        "awareness": "Awareness",
        "sanity": "Sanity",
        "attention": "Attention",
        "development": "Development",
        "entropy": "Entropy",
        "stability_max": "Maximum Stability"
      },
      "range": "{label} range {lower} to {upper}",
      "noDirectMetricVector": "No direct metric vector detected",
      "allRequirementsMet": "All requirements met.",
      "probeVectorAppend": " Probe vector: {vector}.",
      "probeVector": "Probe vector: {vector}.",
      "eraFallback": "Era {era}",
      "selectDirective": "Select one offered Directive for this Civilization.",
      "entropyCascade": "CASCADE",
      "entropyCritical": "CRITICAL",
      "entropyFractured": "FRACTURED",
      "entropyStrained": "STRAINED",
      "entropyContained": "CONTAINED"
    },
    "guideView": {
      "what": "WHAT",
      "where": "WHERE",
      "why": "WHY",
      "fieldManual": "Field Manual",
      "fieldManualNote": "Every term in the game, with where it is on screen and what it decides. Nothing here is unlocked — it is all readable from the first second."
    },
    "reportView": {
      "development": "Development",
      "entropy": "Entropy",
      "stability": "Stability",
      "curveAria": "Development, Entropy and Stability over the run",
      "samples": "{count} samples",
      "percentOfYield": "{share}% of the yield",
      "noPhaseChange": "No phase change recorded",
      "endedInsideStartState": "The run ended inside the state it started in.",
      "noRecordedHistory": "No recorded history.",
      "objectiveMet": "MET, ×1.15 and +1 Cultivation Credit",
      "objectiveNotMet": "NOT MET",
      "runReportCivilization": "RUN REPORT // CIVILIZATION {seed}",
      "terminalSuffix": " // TERMINAL",
      "harvestGrade": "HARVEST GRADE",
      "harvestSummaryOne": "DEPTH {depth} · ×{multiplier} yield · {credits} Cultivation Credit",
      "harvestSummaryMany": "DEPTH {depth} · ×{multiplier} yield · {credits} Cultivation Credits",
      "lasted": "LASTED",
      "civilizationYears": "{years} civilization years",
      "endedIn": "ENDED IN",
      "phase": "{phase} phase",
      "peak": "peak {value}",
      "interventions": "INTERVENTIONS",
      "path": "path: {path}",
      "noDominantPath": "no dominant path",
      "entropyAtEnd": "ENTROPY AT END",
      "peakOf100": "peak {value} of 100",
      "stabilityAtEnd": "STABILITY AT END",
      "ofMax": "of {max}",
      "sanityAwarenessAttention": "SANITY / AWARENESS / ATTENTION",
      "resourcesFarmed": "RESOURCES FARMED",
      "unitsBanked": "{units} units banked in total.",
      "nothingBanked": "Nothing was banked. This run paid no resources at all.",
      "howItDeveloped": "HOW IT DEVELOPED",
      "whatThisRunSuggests": "WHAT THIS RUN SUGGESTS",
      "civilizationRecord": "Civilization record",
      "dismissReport": "DISMISS REPORT"
    },
    "tutorialView": {
      "guidedRunAria": "Guided run",
      "guidedRun": "GUIDED RUN",
      "show": "SHOW",
      "waiting": "Waiting for you to make the move above.",
      "continue": "CONTINUE",
      "do": "DO",
      "stepOf": "GUIDED RUN // STEP {index} OF {total}",
      "collapseTitle": "Collapse the guided run card",
      "hide": "HIDE",
      "dismissTitle": "Dismiss the guided run; the Field Manual stays available",
      "skip": "SKIP",
      "what": "WHAT",
      "where": "WHERE",
      "why": "WHY",
      "replayGuidedRun": "REPLAY GUIDED RUN",
      "startGuidedRun": "START GUIDED RUN",
      "replayFinished": "The guided run is finished. Replaying it changes nothing about your progress.",
      "replaySkipped": "The guided run was skipped. It walks through one civilization from start to harvest."
    },
    "format": {
      "numberLocale": "en-US",
      "minuteSuffix": "m",
      "secondSuffix": "s"
    }
  },
  "tutorial": {
    "steps": {
      "overview": {
        "title": "You are the Machine",
        "what": "This is an engine that grows civilizations in order to consume them. One civilization at a time; one attempt is called a run.",
        "where": "You are in the Machine view. It is where you spend what the last run paid and decide what the next one is.",
        "why": "Nothing accumulates in this view. Every resource in the game comes out of a run that you ended deliberately.",
        "action": ""
      },
      "run_build": {
        "title": "Build the run before you start it",
        "what": "The next civilization already exists as a seed, so its starting traits can be shown exactly rather than promised.",
        "where": "The NEXT CIVILIZATION panel. Once Directives unlock, three drafted offers appear here too.",
        "why": "A run cannot be edited once it starts. This panel is the only place its shape is still yours to choose.",
        "action": "Press START CIVILIZATION."
      },
      "world_read": {
        "title": "The world is the state",
        "what": "The canvas draws the civilization from its live numbers -- settlements, factions and damage are all read from the same state the panels show.",
        "where": "The strip over the world: ERA, DEV, STB, SAN, AWR, ATT, ENT. Drag the world to look around it.",
        "why": "It means nothing on screen is decoration. If the world changes, a number changed, and the strip says which.",
        "action": ""
      },
      "situation": {
        "title": "What is happening, and why",
        "what": "The SITUATION line states the run’s current dominant pressure, the cause behind it, and the move it suggests.",
        "where": "Directly under the world, above everything else in the run.",
        "why": "It is recomputed from the live run rather than scripted, so it stays true for the whole game, not only this tutorial.",
        "action": ""
      },
      "intervention": {
        "title": "Interventions are the decisions",
        "what": "Every so often the civilization forces a decision. The simulation is paused while one is open -- years, Development and Entropy all stop.",
        "where": "The CURRENT INTERVENTION panel. Each choice carries a prediction of what it will do.",
        "why": "Choices are what push the civilization down a path, and a run needs three resolved interventions before it can pay anything at all.",
        "action": "Resolve the first intervention by taking one of its choices."
      },
      "feedback": {
        "title": "Every decision reports itself",
        "what": "The panel that just appeared lists the exact before and after of every metric the choice moved, plus anything it added.",
        "where": "DECISION RESOLVED, immediately under the intervention.",
        "why": "This is the answer to \"what did that do\". It is exact, so a run can be understood instead of guessed at.",
        "action": ""
      },
      "tactical": {
        "title": "Four moves, three charges",
        "what": "Stabilize, Accelerate, Probe and Entropy Vent, on keys 1 to 4. Each costs Control Capacity, and each charges Entropy for what it gives you.",
        "where": "The TACTICAL ACTIONS rail. The pips at its top are the Control you have left.",
        "why": "Control Capacity is the hard budget on steering a run. It refills only when the civilization enters a new Era.",
        "action": "Spend one tactical action. Probe (3) is the cheapest at 1 Control, but it needs an open intervention; Accelerate (2) works any time."
      },
      "pressure": {
        "title": "Entropy is the clock",
        "what": "Entropy only rises, and it rises faster the more years the civilization has lived. At 25, 50 and 75 it forces a containment crisis; at 100 the run cascades.",
        "where": "The ENTROPY readout in the PRESSURE & HARVEST rail, with CASCADE IN Xs under it.",
        "why": "That number is the deadline every other decision is measured against. Only Entropy Vent and Containment upgrades push it back.",
        "action": ""
      },
      "depth": {
        "title": "Depth is the payout",
        "what": "Cultivation Depth is Development / 80 plus 1.5 per endgame state. It sets the Harvest Grade and the yield multiplier.",
        "where": "The HARVEST GRADE readout, with the next band and the computed stay-or-harvest call under it.",
        "why": "Premature pays a flat 0.2 and no Cultivation Credits. Leaving Premature is the first real goal of every run.",
        "action": ""
      },
      "harvest": {
        "title": "Stopping is the skill",
        "what": "A controlled harvest banks the full grade. A cascade or a collapse takes it anyway, at about 40% fewer credits.",
        "where": "The three buttons at the bottom of the PRESSURE & HARVEST rail.",
        "why": "The harvest call above them compares the seconds to your next credit against the seconds the run can still reach. When it says HARVEST NOW, the next credit provably does not fit.",
        "action": "End this run with CONTROLLED HARVEST when you are ready."
      },
      "report": {
        "title": "Read the run back",
        "what": "The RUN REPORT states how the run developed, why it ended, what it paid, and what its own numbers suggest doing differently.",
        "where": "At the top of the Machine view after every run. It stays until you dismiss it.",
        "why": "It is where a run turns into a decision about the next one instead of a number that scrolled past.",
        "action": ""
      },
      "manual": {
        "title": "Nothing here is hidden",
        "what": "The FIELD MANUAL explains every term in the game, and EXPLAIN in the top bar annotates every panel with what it is for.",
        "where": "The FIELD MANUAL panel in the Machine view; the EXPLAIN button next to the resource bar, on every screen.",
        "why": "Both are permanent. You never have to remember what a number meant -- you can ask the screen it is on.",
        "action": ""
      }
    },
    "offPhase": {
      "machine": "This step is about the Machine view. End or abandon the run to get back to it.",
      "civilization": "This step is about a running civilization. Start one to continue."
    }
  },
  "help": {
    "sections": {
      "loop": {
        "title": "The Loop",
        "summary": "You are the Machine. You grow a civilization, then you harvest it. Everything else is a knob on those two moves.",
        "topics": {
          "run": {
            "term": "Run (Civilization)",
            "what": "One cultivated civilization, from its first year until you harvest, abandon or lose it.",
            "where": "Started from START CIVILIZATION in the Machine view; played in the Civilization view.",
            "why": "A run is the only thing that produces resources. Nothing accumulates while you sit in the Machine view."
          },
          "harvest": {
            "term": "Harvest",
            "what": "Ending a run to convert it into the four resources plus Cultivation Credits.",
            "where": "CONTROLLED HARVEST and FORCE CHAOTIC HARVEST in the Pressure & Harvest rail.",
            "why": "A run has no value until it is harvested. Waiting increases the yield and the risk of losing it."
          },
          "resources": {
            "term": "Causal Mass · Cognition · Paradox · Existence",
            "what": "The four harvest resources. Causal Mass tracks lived years and Development, Cognition tracks Development and Awareness, Paradox tracks damage (lost Stability, lost Sanity, Attention), Existence tracks Development and Era.",
            "where": "The bar along the top; the per-resource breakdown sits under HARVEST YIELD DETAIL.",
            "why": "They buy Machine upgrades. Because Paradox is paid by damage, a wrecked civilization is not a wasted one."
          },
          "credits": {
            "term": "Cultivation Credits",
            "what": "A second currency paid only by a harvest of Established grade or better: floor(0.6 × Cultivation Depth), capped at 20.",
            "where": "The meta bar under the top bar, as Cultivation Credits x/18.",
            "why": "18 of them consume the Universe, which is the first prestige step. Credits, not resources, are what gate progress."
          },
          "insight": {
            "term": "Machine Insight",
            "what": "A progression score paid by milestones. It unlocks systems and the Machine Reserve.",
            "where": "The meta bar, and the MILESTONE REGISTER panel that lists what still pays.",
            "why": "It is the only thing that survives every prestige, so a run that pays a milestone is never wasted."
          }
        }
      },
      "metrics": {
        "title": "Civilization Metrics",
        "summary": "Six numbers describe the crop. Four of them can end the run; two of them only cost you yield.",
        "topics": {
          "stability": {
            "term": "Stability (STB)",
            "what": "How intact reality around the civilization is. It decays continuously and choices move it in both directions.",
            "where": "The world strip over the canvas, and the first meter in STRATEGIC OVERVIEW.",
            "why": "At zero the run ends immediately in a forced chaotic harvest. It is the resource you actually spend to stay alive."
          },
          "sanity": {
            "term": "Collective Sanity (SAN)",
            "what": "How well the population tolerates what you are doing to it.",
            "where": "The world strip, and STRATEGIC OVERVIEW.",
            "why": "Low Sanity pulls darker interventions into the pool and raises the Paradox a harvest pays."
          },
          "awareness": {
            "term": "Machine Awareness (AWR)",
            "what": "How close the civilization is to understanding that it is being farmed.",
            "where": "The world strip, and STRATEGIC OVERVIEW.",
            "why": "Above 65 the civilization starts acting against the cultivation. It also raises the Cognition yield."
          },
          "attention": {
            "term": "Cosmic Attention (ATT)",
            "what": "How visible the cultivation is to whatever is outside it.",
            "where": "The world strip, and STRATEGIC OVERVIEW.",
            "why": "Above 65 external observers converge. It raises the Paradox yield, which is why it is worth spending."
          },
          "development": {
            "term": "Development (DEV)",
            "what": "The civilization’s accumulated capability. It grows every second at a rate the run’s state sets.",
            "where": "The world strip, and the Era/Year/Development line in STRATEGIC OVERVIEW.",
            "why": "Development divided by 80 is most of Cultivation Depth, so it is the number the whole harvest scales off."
          },
          "era": {
            "term": "Era (ERA) and Years",
            "what": "Emergence 0–2,499 years, Expansion 2,500–6,499, Transcendence 6,500–13,999, Apotheosis 14,000+. Years advance 25 per simulation second.",
            "where": "The world strip, STRATEGIC OVERVIEW, and the ERA PROGRESSION panel.",
            "why": "Each new Era grants +1 Control Capacity, unlocks later interventions, and adds a flat Existence and Paradox bonus at harvest."
          }
        }
      },
      "pressure": {
        "title": "Pressure & Time",
        "summary": "A run does not end when you get bored. It ends when Entropy reaches 100 or Stability reaches 0.",
        "topics": {
          "entropy": {
            "term": "Entropy (ENT)",
            "what": "Accumulated containment pressure. It only ever rises on its own, faster the more years the civilization has lived.",
            "where": "The ENTROPY readout in the Pressure & Harvest rail, and ENT in the world strip.",
            "why": "At 25, 50 and 75 it forces a containment crisis intervention. At 100 the run cascades and a harvest loses about 40% of its credits."
          },
          "cascade": {
            "term": "CASCADE IN Xs",
            "what": "How many seconds until Entropy reaches 100 if you do nothing at all.",
            "where": "Under the Entropy meter, and in the mobile strip over the world.",
            "why": "It is the deadline every other decision is measured against. It deliberately assumes no further intervention, so it is a floor, not a forecast."
          },
          "containment": {
            "term": "Containment Rating",
            "what": "The sum of your containment upgrades. Each point divides the Entropy rate by a little more.",
            "where": "Next to the Entropy meter, as Containment N.",
            "why": "It is the only permanent way to make runs longer. Everything else buys seconds one at a time."
          },
          "control": {
            "term": "Control Capacity",
            "what": "Three charges that pay for tactical actions. It refills when the civilization enters a new Era, and with the Bureaucracy of Gods upgrade.",
            "where": "The pips at the top of the TACTICAL ACTIONS rail.",
            "why": "It is the hard budget on how much you can steer a run. Spending it on the wrong action is what usually ends a promising one."
          }
        }
      },
      "harvest": {
        "title": "Harvest & Depth",
        "summary": "When to stop is the actual game. The rail computes the answer instead of hinting at it.",
        "topics": {
          "depth": {
            "term": "Cultivation Depth",
            "what": "Development / 80, plus 1.5 for every endgame state the civilization reached.",
            "where": "The large number in the HARVEST GRADE readout.",
            "why": "It sets both the grade and the yield multiplier (0.25 + 0.22 × Depth), so it is the single number a run is trying to raise."
          },
          "grade": {
            "term": "Harvest Grade",
            "what": "Premature below Depth 1.5, then Established, Transcendent at 4, Ascendant at 9, Singular at 16. A run is also Premature until it has resolved 3 interventions and left Emergence.",
            "where": "HARVEST GRADE // in the Pressure & Harvest rail.",
            "why": "Premature pays a flat 0.2 multiplier and zero Cultivation Credits, which makes leaving it the first goal of every run."
          },
          "call": {
            "term": "The harvest call",
            "what": "BUILDING, CLOSING, HARVEST NOW, CASCADE or capped -- computed by comparing the seconds to the next Cultivation Credit against the seconds the run can still reach.",
            "where": "The highlighted line at the bottom of the HARVEST GRADE readout.",
            "why": "It answers stay-or-harvest with arithmetic. HARVEST NOW means the next credit provably does not fit in the run that is left."
          },
          "chaotic": {
            "term": "Chaotic harvest",
            "what": "Ending the run through collapse instead of control: Paradox ×1.5, every other resource cut to the Contingency retention, credits rounded to 60%. It also grants a Machine mutation.",
            "where": "FORCE CHAOTIC HARVEST, or automatically at zero Stability.",
            "why": "On a run that is already lost it is strictly better than abandoning, and a Premature collapse still returns a salvage floor of 8 Causal Mass."
          },
          "objective": {
            "term": "Directive Objective",
            "what": "A condition attached to the Directive you drafted for the run.",
            "where": "The DIRECTIVE OBJECTIVE panel during a run; previewed on the Directive cards before it.",
            "why": "Meeting it multiplies the whole harvest by 1.15 and adds one Cultivation Credit, which is often a whole depth band of value."
          }
        }
      },
      "actions": {
        "title": "Tactical Actions",
        "summary": "Four moves, keys 1 to 4, paid out of Control Capacity. Each one buys something and charges Entropy for it.",
        "topics": {
          "stabilize": {
            "term": "Stabilize (1)",
            "what": "+14 Stability for 2 Control, at +6 Attention and +8 Entropy.",
            "where": "First button in the TACTICAL ACTIONS rail.",
            "why": "Stability is what a long run runs out of first. This is the direct purchase of more of it."
          },
          "accelerate": {
            "term": "Accelerate (2)",
            "what": "+200 years and Development for 2 Control, at -4 Stability and +3 Entropy plus 3 per Era.",
            "where": "Second button in the rail.",
            "why": "The injected years are excluded from the Entropy curve, so it is a one-off price rather than a permanent rate rise."
          },
          "probe": {
            "term": "Probe (3)",
            "what": "Reveals the risk directions of the current intervention’s choices for 1 Control.",
            "where": "Third button in the rail; the result appears inside the intervention card.",
            "why": "Without a Prediction Core this is the only way to see what a choice will do before taking it."
          },
          "vent": {
            "term": "Entropy Vent (4)",
            "what": "-18 Entropy for 1 Control, paid with 10 Stability and 4 Attention.",
            "where": "Fourth button in the rail.",
            "why": "It is the only way to push the cascade back, which makes Stability the currency that actually buys run length."
          },
          "reserve": {
            "term": "Machine Reserve",
            "what": "Banked resources committed into the running civilization. Each use triples its own price, and the price rises with the Depth already reached.",
            "where": "The MACHINE RESERVE panel, once Machine Insight allows it.",
            "why": "It converts resources you already own into one more depth band on a run that is going well."
          }
        }
      },
      "machine": {
        "title": "Machine & Progression",
        "summary": "Between runs you spend what the last one paid, and pick what the next one is allowed to be.",
        "topics": {
          "upgrades": {
            "term": "Machine Upgrades",
            "what": "Permanent-until-prestige purchases in the four resources.",
            "where": "MACHINE UPGRADES in the Machine view.",
            "why": "Containment, harvest multipliers and the Prediction Core all come from here. This is where a harvest becomes a better next run."
          },
          "directive": {
            "term": "Directive draft",
            "what": "Three deterministic offers per run; picking one locks it for that run and attaches its objective.",
            "where": "The NEXT CIVILIZATION panel.",
            "why": "The Directive changes the run’s multipliers, so it is chosen against the run you intend to play rather than at random."
          },
          "traits": {
            "term": "Starting traits",
            "what": "The traits the next civilization will be born with, previewed exactly because they are derived from its seed.",
            "where": "STARTING TRAITS // DETERMINISTIC PREVIEW in the NEXT CIVILIZATION panel.",
            "why": "They are visible before you commit, so the run can be planned instead of discovered."
          },
          "prestige": {
            "term": "Consume Universe / Collapse Multiverse",
            "what": "18 Cultivation Credits consume the Universe for Universal Residue; 4 Universes collapse the Multiverse for Axioms.",
            "where": "The buttons at the bottom of the Machine view, once unlocked.",
            "why": "Each layer resets the one below it and pays a currency the reset cannot touch."
          },
          "convergence": {
            "term": "Great Convergence",
            "what": "A terminal run that starts in Apotheosis, pays no yield and runs at 1.6× Entropy. It is won by a controlled harvest at or beyond the target Depth.",
            "where": "The GREAT CONVERGENCE panel, after the first Multiverse.",
            "why": "It is the win condition, and each one grants permanent harvest yield and Containment. Failing costs nothing but the run."
          }
        }
      }
    },
    "abbreviations": {
      "ERA": "Era — Emergence, Expansion, Transcendence, Apotheosis",
      "DEV": "Development — the capability score Cultivation Depth is computed from",
      "STB": "Stability — reality integrity; the run ends at zero",
      "SAN": "Sanity — population tolerance",
      "AWR": "Awareness — how close the civilization is to noticing the farm",
      "ATT": "Attention — how visible the cultivation is from outside",
      "ENT": "Entropy — containment pressure; the run cascades at 100"
    },
    "explainNotes": {
      "machine_hero": "The Machine view is between runs. Nothing accumulates here — spend the last harvest, then start the next civilization.",
      "run_preparation": "What the next run will be: its seed-derived starting traits and, once unlocked, one of three drafted Directives. Both are visible before you commit.",
      "machine_upgrades": "Permanent purchases that change every following run. Containment buys length; the harvest modules buy yield.",
      "milestones": "Every milestone pays Machine Insight, which no prestige takes back. Read it as the list of things worth aiming a run at.",
      "run_report": "What the run just did, why it stopped and what it paid. The lessons are derived from this run’s own numbers.",
      "field_manual": "Every term in the game, with where it is on screen and what it decides.",
      "situation": "One sentence on what is happening right now, why, and the move it suggests. It is recomputed from the run’s live state, not scripted.",
      "intervention": "A decision the civilization is forcing on you. The run is paused on it — the clock only moves again once you choose.",
      "decision_feedback": "The exact before/after of the choice you just made, so a decision is never a mystery after the fact.",
      "command_rail": "What you can spend Control Capacity on. Every action buys something and charges Entropy for it.",
      "pressure_rail": "When the run should end. The Entropy readout is the deadline; the harvest readout is what stopping is worth right now.",
      "harvest_readout": "Grade, Depth and the next band, plus the computed stay-or-harvest call.",
      "strategic_overview": "The four metrics that can end the run or change what it pays, with the Era and Development line under them.",
      "objective": "The condition attached to the Directive you drafted. Meeting it is worth ×1.15 and one extra Cultivation Credit.",
      "reserve": "Banked resources spent into the live run. Each use triples its own price.",
      "harvest_detail": "The per-resource breakdown behind the grade, controlled against chaotic.",
      "world": "The civilization itself, drawn from its live state. Drag to explore; the strip over it is the same numbers as the panels below."
    }
  },
  "guidance": {
    "civilization": {
      "cascade": {
        "headline": "Entropy has cascaded. The run is being taken from you.",
        "cause": "Entropy reached 100, so Stability is now decaying at a fixed fraction of its maximum on top of everything else.",
        "advice": "Harvest now. A cascade harvest still pays, at roughly 40% fewer Cultivation Credits than a controlled one."
      },
      "collapse_imminent": {
        "headline": "Stability is at {stability}. At zero the run ends by itself.",
        "cause": "Stability decays continuously, and both Entropy Vent and several interventions charge more of it.",
        "adviceWithControl": "Stabilize (1) buys +14 Stability for 2 Control. Otherwise harvest before the collapse chooses for you.",
        "adviceWithoutControl": "There is not enough Control left to stabilize. Harvest before the collapse chooses for you."
      },
      "decision_pending": {
        "headline": "A decision is open: {eventTitle}.",
        "cause": "The simulation is paused while an intervention is unresolved — years, Development and Entropy are all frozen.",
        "advice": "Read the predictions and choose. Probe (3) reveals the risk directions first, for 1 Control."
      },
      "convergence_ready": {
        "headline": "Convergence target reached at Depth {depth}.",
        "cause": "The terminal run needs a controlled harvest at Depth {targetDepth} or deeper, and it is there.",
        "advice": "Take the controlled harvest. Depth beyond the target adds nothing to the win."
      },
      "convergence_short": {
        "headline": "Terminal run at Depth {depth} of the {targetDepth} it needs.",
        "cause": "A terminal run pays no yield and runs at 1.6× Entropy, so its only measure is whether it reaches the target Depth in time.",
        "advice": "{secondsToCascade} of cascade clock left. Accelerate (2) is the fastest Depth per Control here."
      },
      "entropy_critical": {
        "headline": "Entropy at {entropy} — the cascade is {secondsToCascade} away.",
        "cause": "Entropy rises at {entropyRate}/s, and the rate grows with every year the civilization lives.",
        "advice": "Entropy Vent (4) removes 18 for 1 Control and 10 Stability. Otherwise this is the run’s last window."
      },
      "harvest_window": {
        "headline": "Harvest now — Cultivation Credit {nextCredit} no longer fits in the run.",
        "cause": "The next credit needs {secondsToNextCredit} of Development and the run can only reach {secondsOfRunLeft}.",
        "adviceOneCredit": "A controlled harvest banks {credits} credit at {grade}. Staying trades that for nothing.",
        "adviceManyCredits": "A controlled harvest banks {credits} credits at {grade}. Staying trades that for nothing."
      },
      "cosmic_attention": {
        "headline": "Cosmic Attention at {attention} — external observers are converging.",
        "cause": "Attention rises on its own and every Stabilize and Vent adds more of it.",
        "advice": "It also raises the Paradox a harvest pays, so this is a reason to stop soon rather than to panic."
      },
      "civilization_awareness": {
        "headline": "Machine Awareness at {awareness} — the civilization is working out that it is farmed.",
        "cause": "Awareness rises with Development and with choices that expose the cultivation.",
        "advice": "It raises the Cognition yield but pulls hostile interventions into the pool. Bank the run before they land."
      },
      "sanity_failing": {
        "headline": "Collective Sanity at {sanity}.",
        "cause": "Sanity falls continuously and faster after choices that spend the population.",
        "advice": "Low Sanity raises the Paradox yield and darkens the intervention pool. It costs nothing directly — decide whether that trade is one you want."
      },
      "premature": {
        "headline": "This run cannot pay yet.",
        "causeInterventions": "Premature grade: it has resolved {eventChoices} of the 3 interventions a payout needs.",
        "causeEra": "Premature grade: it is still in {eraName}, and a payout needs Expansion or later.",
        "causeDepth": "Premature grade: Depth is {depth} and Established starts at 1.5.",
        "advice": "Keep it alive. Accelerate (2) is the fastest route out of Premature, at +200 years for 2 Control."
      },
      "credit_cap": {
        "headline": "Cultivation Credits are capped at {credits}.",
        "cause": "The credit formula stops at 20 regardless of Depth.",
        "advice": "Only raw resource yield still grows. Harvest unless a Directive objective is still within reach."
      },
      "closing": {
        "headline": "Closing — credit {nextCredit} in {secondsToNextCredit}, run reaches {secondsOfRunLeft}.",
        "cause": "The next credit still fits, but only inside the last 30% of the run the current course allows.",
        "advice": "One Entropy Vent (4) buys the margin back. Without it, plan to harvest at the credit."
      },
      "objective_open": {
        "headline": "Building — the Directive objective \"{objectiveTitle}\" is still open.",
        "cause": "Depth {depth} at {grade}, {secondsToCascade} of cascade clock, and the objective unmet.",
        "advice": "Meeting it multiplies the whole harvest by 1.15 and adds a Cultivation Credit — often worth a band on its own."
      },
      "building": {
        "headlineOneCredit": "Building — Depth {depth} at {grade}, {credits} credit banked.",
        "headlineManyCredits": "Building — Depth {depth} at {grade}, {credits} credits banked.",
        "cause": "Development is compounding and Entropy is at {entropy}, {secondsToCascade} from the cascade.",
        "advice": "Credit {nextCredit} lands in {secondsToNextCredit}. Nothing needs spending yet."
      }
    },
    "machine": {
      "pick_directive": {
        "headline": "The next run needs a Directive.",
        "cause": "Three offers were drafted deterministically from the next civilization’s seed, and one must be locked in before it starts.",
        "advice": "Pick the one whose objective matches how you intend to play the run."
      },
      "collapse_multiverse": {
        "headline": "The Multiverse can be collapsed.",
        "cause": "Enough Universes have been consumed to pay out Axioms.",
        "advice": "Collapsing resets Universes and Machine upgrades but pays a currency nothing below can touch."
      },
      "consume_universe": {
        "headline": "The Universe can be consumed at {credits} Cultivation Credits.",
        "cause": "{creditsRequired} credits is the prestige threshold, and it has been met.",
        "advice": "It resets resources and Machine upgrades and pays Universal Residue. Spend anything you were saving first."
      },
      "read_report": {
        "headline": "The last run is reported above.",
        "cause": "It states how the run developed, why it stopped, and what its own numbers suggest changing.",
        "advice": "Spend the harvest on what the report’s lessons name, then start the next civilization."
      },
      "spend_bank": {
        "headlineOneUpgrade": "{count} upgrade affordable right now.",
        "headlineManyUpgrades": "{count} upgrades affordable right now.",
        "cause": "Resources do nothing while banked, and a prestige will take them.",
        "advice": "Containment buys longer runs; the harvest modules buy more out of the same run."
      },
      "first_run": {
        "headline": "Nothing has been cultivated yet.",
        "cause": "Every resource in the game comes out of a run, and there has not been one.",
        "advice": "Start a civilization. The first run is meant to be lost — it still pays."
      },
      "start_run": {
        "headlineMilestone": "Next milestone: {milestone}.",
        "headlineIdle": "The Machine is idle.",
        "causeReady": "Nothing accumulates between runs.",
        "causeNotReady": "The next run is not ready to start yet.",
        "adviceReady": "Start the next civilization.",
        "adviceNotReady": "Resolve what the panel above is asking for."
      }
    }
  },
  "reports": {
    "decisionFeedback": {
      "metrics": {
        "stability": "Stability",
        "stabilityMax": "Maximum Stability",
        "awareness": "Awareness",
        "sanity": "Sanity",
        "attention": "Cosmic Attention",
        "years": "Civilization Years",
        "development": "Development",
        "eventTimer": "Intervention Timer",
        "entropy": "Entropy",
        "controlCapacity": "Control Capacity"
      },
      "additionKinds": {
        "trait": "trait",
        "institution": "institution",
        "flag": "flag",
        "path_flag": "path flag"
      }
    },
    "runReport": {
      "reasonTitles": {
        "controlled_harvest": "Controlled harvest",
        "forced_chaotic_harvest": "Chaotic harvest, forced by you",
        "stability_collapse": "Reality collapse",
        "abandoned": "Abandoned without a harvest",
        "convergence_won": "Great Convergence achieved",
        "convergence_failed": "Great Convergence failed"
      },
      "reasonDetails": {
        "controlledOneCredit": "You ended it yourself in year {year}, at Cultivation Depth {depth} and {grade} grade. A controlled harvest banks the full grade multiplier and all {credits} Cultivation Credit.",
        "controlledManyCredits": "You ended it yourself in year {year}, at Cultivation Depth {depth} and {grade} grade. A controlled harvest banks the full grade multiplier and all {credits} Cultivation Credits.",
        "forcedChaotic": "You forced the collapse in year {year} with Entropy at {entropy}. Paradox yield rose by half, every other resource was cut to the Contingency retention, and the credits were rounded down to 60%.",
        "stabilityCollapse": "Stability reached zero in year {year}, with Entropy at {entropy}. The harvest was taken automatically as a chaotic one, so it paid the reduced yield rather than nothing.",
        "abandoned": "The run was released in year {year} without a harvest, so it paid nothing. A chaotic harvest would have paid something even at {grade} grade.",
        "convergenceWon": "A controlled harvest at Cultivation Depth {depth} closed the terminal run in year {year}. The Convergence bonus is permanent.",
        "convergenceFailed": "The terminal run ended in year {year} at Cultivation Depth {depth}, short of the target. Convergence authorization is retained, so it can be attempted again at no cost."
      },
      "arc": {
        "detail": "Development {development} · Depth {depth} · Entropy {entropy} · Stability {stability}",
        "enteredEra": "Entered {era}",
        "beganEra": "Began in {era}",
        "eraFallback": "Era {era}",
        "phase": "{phase} phase",
        "phaseFallback": "Phase {phase}"
      },
      "dramaPhases": {
        "emergence": "Emergence",
        "expansion": "Expansion",
        "division": "Division",
        "transformation": "Transformation",
        "crisis": "Crisis"
      },
      "lessons": {
        "abandoned": "Abandoning banks nothing. Even a Premature chaotic harvest returns a salvage floor of 8 Causal Mass, so there is never a reason to release a run instead of collapsing it.",
        "prematureOneIntervention": "The run resolved {eventChoices} intervention. Three plus Expansion era is the floor a harvest has to clear before it pays any Cultivation Credits.",
        "prematureManyInterventions": "The run resolved {eventChoices} interventions. Three plus Expansion era is the floor a harvest has to clear before it pays any Cultivation Credits.",
        "prematureEra": "The run never left {era}. A payout needs Expansion, which is 2,500 years — Accelerate (2) buys 200 of them per use.",
        "prematureDepth": "Cultivation Depth finished at {depth}; Established starts at 1.5, which is Development 120.",
        "stabilityCollapse": "Stability, not Entropy, ended this run — it hit zero with Entropy at {entropy}. Stabilize (1) is +14 for 2 Control, and every Entropy Vent charges 10 of the same number.",
        "entropyCascade": "Entropy reached 100 and the cascade took the rest. Containment upgrades divide the rate permanently; Entropy Vent (4) only removes 18 at a time.",
        "unusedControlOneAction": "The run ended with {control} Control unspent after {actions} tactical action. Control does not carry over — an unspent charge is a discarded one.",
        "unusedControlManyActions": "The run ended with {control} Control unspent after {actions} tactical actions. Control does not carry over — an unspent charge is a discarded one.",
        "directiveOneCredit": "The Directive objective \"{objectiveTitle}\" was not met. It is worth ×1.15 on the whole harvest plus one Cultivation Credit, which at this depth was about {credits} credit.",
        "directiveManyCredits": "The Directive objective \"{objectiveTitle}\" was not met. It is worth ×1.15 on the whole harvest plus one Cultivation Credit, which at this depth was about {credits} credits.",
        "nextBand": "{grade} begins at Depth {minDepth}, which was {distance} away. The harvest call in the pressure rail says when that distance stops being reachable.",
        "creditCap": "Cultivation Credits are capped at {cap} and this run hit the cap. Past it only raw resource yield grows, so staying longer buys upgrades rather than prestige.",
        "cleanOneCredit": "Nothing went wrong: {grade} grade at Depth {depth} for {credits} Cultivation Credit. Spend the harvest on Containment for a longer next run, or on the harvest modules for more out of the same one.",
        "cleanManyCredits": "Nothing went wrong: {grade} grade at Depth {depth} for {credits} Cultivation Credits. Spend the harvest on Containment for a longer next run, or on the harvest modules for more out of the same one."
      }
    },
    "harvestGrades": {
      "premature": "Premature",
      "established": "Established",
      "transcendent": "Transcendent",
      "ascendant": "Ascendant",
      "singular": "Singular"
    },
    "progression": {
      "newResourceIdentified": "NEW RESOURCE IDENTIFIED: {name}",
      "newSystemUnlocked": "NEW SYSTEM UNLOCKED: {name}",
      "newOptionUnlocked": "NEW OPTION UNLOCKED: {name}",
      "machineInsightAwarded": "MACHINE INSIGHT +{amount}: {title}",
      "repeatedUniverseConsumption": "Repeated universe consumption",
      "unknownProgressionRequirement": "Unknown progression requirement.",
      "consumeFirstUniverse": "Consume the first Universe.",
      "unlockAxiomaticManipulation": "Unlock Axiomatic Manipulation.",
      "machineInsightRequirement": "Machine Insight {amount}",
      "discoverResource": "discover {resource}",
      "requirementJoiner": " and ",
      "availableAfterRefresh": "Available after current progression refresh.",
      "unlockSystemNames": {
        "directives": "DIRECTIVES",
        "universe_prestige": "UNIVERSE PRESTIGE",
        "universe_upgrades": "UNIVERSE UPGRADES",
        "breeding_matrices": "BREEDING MATRICES",
        "multiverse_prestige": "MULTIVERSE PRESTIGE",
        "axioms": "AXIOMATIC MANIPULATION"
      },
      "systems": {
        "directives": {
          "name": "Directive System",
          "condition": "Complete 2 Controlled Harvests and reach Machine Insight 3."
        },
        "universe_prestige": {
          "name": "Universe Consumption",
          "condition": "Earn 18 Cultivation Credits from qualified harvests."
        },
        "universe_upgrades": {
          "name": "Universe Upgrades",
          "condition": "Consume your first Universe."
        },
        "breeding_matrices": {
          "name": "Breeding Matrices",
          "condition": "Consume your first Universe and reach Machine Insight 7."
        },
        "multiverse_prestige": {
          "name": "Multiverse Consumption",
          "condition": "Consume 2 Universes."
        },
        "axioms": {
          "name": "Axiom Layer",
          "condition": "Consume a Multiverse and reach Machine Insight 18."
        }
      }
    },
    "engine": {
      "saveFailed": "Save failed: browser storage rejected the write. Progress is only in memory.",
      "backupSaveRestored": "Backup save restored.",
      "eraseFailed": "Erase failed: browser storage rejected the removal. The old save may return on reload.",
      "modificationAuthorized": "Modification authorized: {name} level {level}.",
      "directiveLocked": "DIRECTIVE LOCKED FOR THE NEXT CIVILIZATION: {name}",
      "breedingMatrixLocked": "BREEDING MATRIX LOCKED FOR THIS UNIVERSE: {name}",
      "cultivationBeginsHistory": "YEAR {year}: Cultivation begins. Traits: {traits}",
      "cultivationLinkEstablished": "Cultivation link established for civilization seed {seed}.",
      "entropyThreshold": "ENTROPY THRESHOLD: {entropy} // containment crisis queued.",
      "entropyThresholdEventTitle": "Entropy Threshold Breach",
      "entropyThresholdChoiceLabel": "Containment fracture detected",
      "selectDirectiveFirst": "Select one Directive before starting the Civilization.",
      "startCivilizationFirst": "Start a civilization first.",
      "requiresMachineInsight": "Requires Machine Insight {amount}.",
      "interventionExhausted": "{title} is exhausted for this civilization.",
      "requiresCurrency": "Requires {cost} {currency}.",
      "unknownMachineIntervention": "Unknown machine intervention.",
      "machineReserveHistory": "YEAR {year}: Machine reserve -> {label}",
      "machineReserveCommitted": "MACHINE RESERVE COMMITTED: {title} for {cost} {currency}.",
      "tacticalActionFailed": "The tactical action could not be resolved.",
      "tacticalActionHistory": "YEAR {year}: Tactical action -> {label}",
      "pathSuccessionHistory": "YEAR {year}: {pathName} succeeded the previous dominant civilization path.",
      "dominantPathHistory": "YEAR {year}: {pathName} became the dominant civilization path.",
      "pathSuccessionPost": "PATH SUCCESSION: {pathName}",
      "dominantPathPost": "DOMINANT CIVILIZATION PATH: {pathName}",
      "eventPathHistory": "YEAR {year}: {history}",
      "pathEndState": "YEAR {year}: Civilization reached path end-state {endState}.",
      "choiceHistory": "YEAR {year}: {eventTitle} -> {choiceLabel}",
      "realityRewound": "Reality rewound at a cost of {cost} Paradox.",
      "harvestComplete": "{mode} {grade} HARVEST complete. +{credits} Cultivation Credits.",
      "directiveObjectiveComplete": "DIRECTIVE OBJECTIVE COMPLETE: rewards ×1.15 and +1 Cultivation Credit.",
      "yield": "Yield: Causal {causal}, Cognition {cognition}, Paradox {paradox}, Existence {existence}.",
      "mutationAcquired": "Machine mutation acquired: {name}.",
      "convergenceAchieved": "GREAT CONVERGENCE {convergence} ACHIEVED at Cultivation Depth {depth}.",
      "convergenceFailed": "CONVERGENCE FAILED at Cultivation Depth {depth}. Authorization retained.",
      "universeConsumed": "UNIVERSE CONSUMED. {award} Universal Residue recovered.",
      "multiverseCollapsed": "MULTIVERSE COLLAPSED. {award} Axiom units extracted.",
      "convergenceNotAuthorized": "The Great Convergence is not authorized.",
      "convergenceInitiated": "GREAT CONVERGENCE INITIATED. Terminal cultivation begins in APOTHEOSIS.",
      "guidedRunDismissed": "Guided run dismissed. FIELD MANUAL and EXPLAIN stay available; REPLAY GUIDED RUN restores it.",
      "guidedRunRestarted": "Guided run restarted.",
      "eraHistory": "YEAR {year}: Civilization enters {era}.",
      "eraEntered": "Civilization entered {era}. Control Capacity +1."
    },
    "saveMigration": {
      "unreadable": "Save could not be read. The original was kept as a backup and a new Machine was started.",
      "runDroppedSuffix": " The in-progress civilization could not be restored.",
      "newerBuild": "Save was written by a newer build (v{fromVersion}). Loaded in compatibility mode; the original is kept as a backup.{runNote}",
      "migrated": "Save migrated from v{fromVersion} to v{toVersion}. Progress preserved.{runNote}",
      "repairedOne": "Save repaired: {count} field restored to defaults.{runNote}",
      "repairedMany": "Save repaired: {count} fields restored to defaults.{runNote}"
    },
    "convergence": {
      "requirements": {
        "milestones": "Milestones completed",
        "multiverses": "Multiverses collapsed",
        "axioms": "Axiom upgrades at level {level}",
        "grade": "Ascendant harvest recorded"
      }
    },
    "lore": {
      "unknown": "Unknown",
      "bodyTypes": {
        "biped": "biped",
        "fungal": "fungal",
        "avian": "avian",
        "synthetic": "synthetic",
        "cephalopod": "cephalopod",
        "insectoid": "insectoid"
      },
      "motifs": {
        "moon": "moon sigils and tidal halos",
        "ritual": "engraved machines and ceremonial lights",
        "fungal": "spore crowns and root lanterns",
        "avian": "crest feathers and sky glyphs",
        "cephalopod": "ink veils and fluid geometry",
        "default": "banner cloth and bio-luminescent trim"
      },
      "factionFocus": {
        "adaptive": "adaptive cultivation",
        "balanced": "balanced growth"
      },
      "tendencies": {
        "declining": "declining",
        "strong": "strong",
        "rising": "rising",
        "emerging": "emerging",
        "faint": "faint"
      }
    }
  },
  "tacticalActions": {
    "actions": {
      "stabilize": {
        "title": "Stability Override",
        "label": "Stabilize the reality lattice",
        "summary": "+14 Stability",
        "risk": "+6 Attention · +8 Entropy"
      },
      "accelerate": {
        "title": "Temporal Injection",
        "label": "Accelerate historical throughput",
        "summary": "+200 years · advance Development",
        "risk": "-4 Stability · +3 Entropy, +3 more per era"
      },
      "probe": {
        "title": "Prediction Probe",
        "label": "Probe the active intervention",
        "summary": "Reveal choice risk directions",
        "risk": "+3 Awareness · +2 Entropy"
      },
      "vent": {
        "title": "Entropy Vent",
        "label": "Vent accumulated entropy into Paradox",
        "summary": "-18 Entropy · yields Paradox at harvest",
        "risk": "-10 Stability · +4 Attention"
      }
    },
    "reasons": {
      "requiresControl": "Requires {cost} Control.",
      "stabilityAtMaximum": "Reality Stability is already at maximum.",
      "resolveInterventionFirst": "Resolve the active intervention before accelerating.",
      "probeRequiresIntervention": "Probe requires an active intervention.",
      "alreadyProbed": "This intervention has already been probed.",
      "entropyTooLowToVent": "Entropy is too low to vent.",
      "accelerateRisk": "-4 Stability · +{entropy} Entropy"
    }
  },
  "content": {
    "traits": {
      "telepathic_species": {
        "name": "Telepathic Species",
        "description": "Privacy was discovered and rejected in prehistory."
      },
      "physics_optional": {
        "name": "Physics Is Slightly Optional",
        "description": "Local constants respond to persuasive arguments."
      },
      "extreme_bureaucracy": {
        "name": "Extremely Bureaucratic",
        "description": "Three permits are required before experiencing causality."
      },
      "sentient_moon": {
        "name": "Moon Is Sentient",
        "description": "It watches. It also files complaints."
      },
      "recurring_nightmare": {
        "name": "Shared Recurring Nightmare",
        "description": "Every citizen dreams of the same rotating black gear."
      },
      "fungal_consensus": {
        "name": "Fungal Consensus",
        "description": "Most political disputes are settled underground."
      },
      "ritual_engineering": {
        "name": "Ritual Engineering",
        "description": "Machines work better when thanked in dead languages."
      },
      "chronically_lucky": {
        "name": "Chronically Lucky",
        "description": "Disasters keep missing by statistically insulting margins."
      },
      "museum_planet": {
        "name": "Museum Planet",
        "description": "History is archived before it happens."
      },
      "last_species": {
        "name": "Last Species",
        "description": "They inherited a world full of ruins and no explanations."
      },
      "liquid_mathematics": {
        "name": "Liquid Mathematics",
        "description": "Equations are stored in sealed tanks."
      },
      "born_after_end": {
        "name": "Born After The End",
        "description": "This civilization remembers an apocalypse that has not happened yet."
      }
    },
    "upgrades": {
      "reality_lattice": {
        "name": "Reality Lattice",
        "description": "+1 Containment per level, which slows Entropy in every era. +10 starting and maximum Reality Stability per level."
      },
      "prediction_core": {
        "name": "Prediction Core",
        "description": "Reveals intervention outcomes; higher levels make tactical Probe reports increasingly exact."
      },
      "cultivation_accelerator": {
        "name": "Cultivation Accelerator",
        "description": "+12% civilization development speed per level."
      },
      "historical_compressor": {
        "name": "Historical Compressor",
        "description": "+12% Causal Mass per level. Level 3 adds +2.5% Harvest Grade yield."
      },
      "cognitive_extractor": {
        "name": "Cognitive Extractor",
        "description": "+12% Cognition per level. Level 3 adds +2.5% Harvest Grade yield."
      },
      "paradox_sieve": {
        "name": "Paradox Sieve",
        "description": "+15% Paradox per level. Level 3 adds +2.5% Harvest Grade yield."
      },
      "existence_furnace": {
        "name": "Existence Furnace",
        "description": "+12% Existence per level. Level 3 adds +2.5% Harvest Grade yield."
      },
      "awareness_scrubber": {
        "name": "Awareness Scrubber",
        "description": "+1 Containment per level. Reduces Machine Awareness gain by 8% per level."
      },
      "sanity_protocol": {
        "name": "Sanity Compliance Protocol",
        "description": "+1 Containment per level. Reduces Collective Sanity losses by 8% per level."
      },
      "cosmic_muffling": {
        "name": "Cosmic Muffling",
        "description": "+1 Containment per level. Reduces Cosmic Attention gain by 8% per level."
      },
      "contingency_vat": {
        "name": "Contingency Vat",
        "description": "Improves non-Paradox rewards from chaotic harvests and retains one-run mutations."
      },
      "temporal_injector": {
        "name": "Temporal Injector",
        "description": "Unlocks 2× simulation speed, then 4× at level 3; each level strengthens Accelerate."
      },
      "wide_lattice": {
        "name": "Wide Reality Lattice",
        "description": "Preserves this many Reality Lattice levels through Universe consumption."
      },
      "inherited_time": {
        "name": "Inherited Time",
        "description": "Future civilizations begin in later eras."
      },
      "archive_of_screams": {
        "name": "Archive Of Screams",
        "description": "Adds one extra starting civilization trait per level."
      },
      "twin_harvest": {
        "name": "Twin Harvest Mandate",
        "description": "+10% to every civilization harvest per level."
      },
      "stable_constants": {
        "name": "Stable Constants Department",
        "description": "+1 Containment per level, stacking with every machine containment module."
      },
      "paradox_rights": {
        "name": "Paradox Labor Rights",
        "description": "+25% Paradox yield per level."
      },
      "bureaucracy_of_gods": {
        "name": "Bureaucracy Of Gods",
        "description": "Restores +1 additional Control after interventions; at level 3 it restores the full capacity."
      },
      "residue_refinery": {
        "name": "Residue Refinery",
        "description": "+20% Universal Residue on universe consumption per level."
      },
      "axiom_stability": {
        "name": "Axiom: Stability May Exceed 100",
        "description": "+25 Reality Stability capacity per level."
      },
      "axiom_paradox_food": {
        "name": "Axiom: Paradox Is Nutritional",
        "description": "Low stability accelerates civilization development."
      },
      "axiom_recursive_memory": {
        "name": "Axiom: History Remembers Itself",
        "description": "+15% to all harvest rewards per level."
      },
      "axiom_impossible_birth": {
        "name": "Axiom: The Impossible May Be Born",
        "description": "Unlocks impossible starting civilization traits."
      },
      "axiom_compassionate_accounting": {
        "name": "Axiom: Losses Are Merely Alternative Profits",
        "description": "Greatly improves chaotic harvest retention."
      },
      "axiom_multiple_choice": {
        "name": "Axiom: Reality Has A Back Button",
        "description": "Allows event rerolls by spending Paradox."
      }
    },
    "mutations": {
      "scarred_vat": {
        "name": "Scarred Cultivation Vat",
        "description": "Next civilization begins with -15 Stability but +25% Paradox yield."
      },
      "singing_gears": {
        "name": "Singing Gears",
        "description": "Next civilization develops 15% faster but attracts more Cosmic Attention."
      },
      "inverted_archive": {
        "name": "Inverted Archive",
        "description": "Next civilization begins more aware and produces extra Cognition."
      },
      "missing_second": {
        "name": "Missing Second",
        "description": "A stolen second grants safer passive stability for one civilization."
      },
      "hungry_geometry": {
        "name": "Hungry Geometry",
        "description": "Existence output rises, but sanity erodes more easily."
      },
      "clerical_error": {
        "name": "Clerical Error In Causality",
        "description": "Causal Mass is overpaid by an impossible accounting department."
      }
    },
    "directives": {
      "objectives": {
        "accelerated_development": {
          "title": "Compressed Maturity",
          "description": "Reach Development 260 before harvest."
        },
        "cognitive_extraction": {
          "title": "Lucid Yield",
          "description": "Reach Awareness 45 while keeping Sanity at 45 or higher."
        },
        "stable_cultivation": {
          "title": "Untorn Harvest",
          "description": "Harvest with at least 75 Stability and less than 75 Entropy."
        },
        "paradox_prospecting": {
          "title": "Productive Contradiction",
          "description": "Reach 50 Entropy while keeping Stability above zero."
        },
        "quiet_machine": {
          "title": "Unobserved Transcendence",
          "description": "Reach Transcendence below 45 Awareness and 45 Cosmic Attention."
        },
        "temporal_pressure": {
          "title": "Deadline Civilization",
          "description": "Reach Transcendence within 300 seconds after resolving at least eight interventions."
        }
      },
      "catalog": {
        "accelerated_development": {
          "name": "Accelerated Development",
          "description": "Civilization development is accelerated at the cost of attracting cosmic scrutiny."
        },
        "cognitive_extraction": {
          "name": "Cognitive Extraction",
          "description": "Thought itself becomes the preferred crop. Sanity is treated as a consumable input."
        },
        "stable_cultivation": {
          "name": "Stable Cultivation",
          "description": "Reality is protected from passive decay, but extraction quotas are deliberately reduced."
        },
        "paradox_prospecting": {
          "name": "Paradox Prospecting",
          "description": "Contradictions are actively mined, accelerating damage to local reality."
        },
        "quiet_machine": {
          "name": "Quiet Machine",
          "description": "The cultivator suppresses its signature and accepts slower development in exchange."
        },
        "temporal_pressure": {
          "name": "Temporal Pressure",
          "description": "Time is compressed until civilizations mature faster and extract more, while reality decays faster."
        }
      }
    },
    "breedingMatrices": {
      "neural_bloom": {
        "name": "Neural Bloom Matrix",
        "description": "Civilizations are selected for dense cognitive activity and unusual shared mental structures."
      },
      "industrial_genome": {
        "name": "Industrial Genome",
        "description": "Development and material extraction are favored at the expense of collective psychological health."
      },
      "adaptive_aberration": {
        "name": "Adaptive Aberration",
        "description": "Unstable physical adaptations are encouraged to increase paradoxical output."
      },
      "museum_seed": {
        "name": "Museum Seed",
        "description": "Species are cultivated around inherited ruins and curated extinction memory."
      },
      "lunar_synapse": {
        "name": "Lunar Synapse",
        "description": "Planetary cognition is routed through orbital and telepathic structures."
      },
      "post_causal_spore": {
        "name": "Post-Causal Spore",
        "description": "Fungal and impossible lineages are favored to turn instability into rapid development and Paradox."
      }
    },
    "paths": {
      "machine_faith": {
        "name": "Machine Faith"
      },
      "collective_mind": {
        "name": "Collective Mind"
      },
      "temporal_dominion": {
        "name": "Temporal Dominion"
      },
      "reality_engineering": {
        "name": "Reality Engineering"
      },
      "biological_transcendence": {
        "name": "Biological Transcendence"
      },
      "cosmic_resistance": {
        "name": "Cosmic Resistance"
      },
      "bureaucratic_singularity": {
        "name": "Bureaucratic Singularity"
      },
      "post_mortal_civilization": {
        "name": "Post-Mortal Civilization"
      },
      "void_communion": {
        "name": "Void Communion"
      },
      "recursive_simulation": {
        "name": "Recursive Simulation"
      }
    },
    "events": {
      "dreams_of_gears": {
        "title": "Dreams Of Gears",
        "body": "Across the planet, unrelated sleepers describe a black machine turning behind the stars.",
        "choices": [
          {
            "label": "Fund sleep research",
            "prediction": "More cognition; awareness rises.",
            "history": "Dreams Of Gears -> Fund sleep research"
          },
          {
            "label": "Declare it a harmless cultural trend",
            "prediction": "Safer, but wastes useful data."
          },
          {
            "label": "Broadcast the dreams globally",
            "prediction": "Excellent science. Terrible discretion.",
            "history": "Dreams Of Gears -> Broadcast the dreams globally"
          }
        ]
      },
      "fracture_beneath_lab": {
        "title": "A Fracture Beneath The Laboratory",
        "body": "Researchers discover that the basement is seven centimeters deeper on the inside.",
        "choices": [
          {
            "label": "Study the impossible depth",
            "prediction": "High-value research damages reality.",
            "history": "A Fracture Beneath The Laboratory -> Study the impossible depth"
          },
          {
            "label": "Fill it with concrete",
            "prediction": "The concrete files a protest later."
          },
          {
            "label": "Open it to tourists",
            "prediction": "An irresponsible but profitable compromise."
          }
        ]
      },
      "fracture_answers_back": {
        "title": "The Fracture Answers Back",
        "body": "The laboratory receives a peer-review report from beneath itself.",
        "choices": [
          {
            "label": "Accept the corrections",
            "prediction": "Reality dislikes the revised methodology.",
            "history": "The Fracture Answers Back -> Accept the corrections"
          },
          {
            "label": "Reject reviewer two",
            "prediction": "Civilization preserves dignity at measurable cost."
          }
        ]
      },
      "impossible_tax": {
        "title": "Tax On Impossible Objects",
        "body": "The treasury proposes a revenue category for objects that exist only on Tuesdays.",
        "choices": [
          {
            "label": "Approve the tax",
            "prediction": "Bureaucracy stabilizes the impossible.",
            "history": "Tax On Impossible Objects -> Approve the tax"
          },
          {
            "label": "Exempt nonexistence",
            "prediction": "Economically compassionate. Metaphysically reckless."
          }
        ]
      },
      "first_machine_cult": {
        "title": "The First Machine Cult",
        "body": "A minor religion claims history is livestock and the stars are inventory labels.",
        "choices": [
          {
            "label": "Suppress the cult",
            "prediction": "Reduces awareness, harms sanity.",
            "history": "The First Machine Cult -> Suppress the cult"
          },
          {
            "label": "Observe quietly",
            "prediction": "A useful controlled leak.",
            "history": "The First Machine Cult -> Observe quietly"
          },
          {
            "label": "Give them accurate schematics",
            "prediction": "This cannot possibly be a good idea.",
            "history": "The First Machine Cult -> Give them accurate schematics"
          }
        ]
      },
      "moon_resigns": {
        "title": "The Moon Resigns",
        "body": "The moon announces that it will no longer perform tidal duties without representation.",
        "choices": [
          {
            "label": "Offer a cabinet position",
            "prediction": "A constitutional solution to an astronomical problem."
          },
          {
            "label": "Threaten orbital replacement",
            "prediction": "The moon notices the machine before the diplomats do."
          }
        ]
      },
      "probability_strike": {
        "title": "Probability Goes On Strike",
        "body": "Coin flips across the world refuse to land until working conditions improve.",
        "choices": [
          {
            "label": "Negotiate with chance",
            "prediction": "Absurdity becomes policy."
          },
          {
            "label": "Ban coins",
            "prediction": "A surprisingly effective emergency measure."
          }
        ]
      },
      "benevolent_plague": {
        "title": "The Benevolent Plague",
        "body": "A microorganism improves memory but causes infected people to whisper future obituaries.",
        "choices": [
          {
            "label": "Distribute it",
            "prediction": "Cognition rises rapidly.",
            "history": "The Benevolent Plague -> Distribute it"
          },
          {
            "label": "Contain it",
            "prediction": "Lower reward, lower risk."
          }
        ]
      },
      "sky_inventory": {
        "title": "Inventory Numbers In The Sky",
        "body": "Astronomers notice that several stars now have serial numbers.",
        "choices": [
          {
            "label": "Decode the numbering scheme",
            "prediction": "The civilization learns it is not the customer.",
            "history": "Inventory Numbers In The Sky -> Decode the numbering scheme"
          },
          {
            "label": "Classify the data",
            "prediction": "The stars remain numbered but officially uninteresting."
          },
          {
            "label": "Reply with a purchase order",
            "prediction": "Something accepts.",
            "history": "Inventory Numbers In The Sky -> Reply with a purchase order"
          }
        ]
      },
      "delivery_without_sender": {
        "title": "Delivery Without Sender",
        "body": "A continent-sized crate appears in the ocean. The return address is yesterday.",
        "choices": [
          {
            "label": "Open the crate",
            "prediction": "Inside: tools designed for hands nobody has."
          },
          {
            "label": "Return to yesterday",
            "prediction": "Logistics successfully weaponizes causality.",
            "history": "Delivery Without Sender -> Return to yesterday"
          }
        ]
      },
      "ministry_of_sanity": {
        "title": "Ministry Of Sanity",
        "body": "The government proposes mandatory monthly confirmation that reality is still legally binding.",
        "choices": [
          {
            "label": "Fund the ministry",
            "prediction": "Sanity improves; progress slows.",
            "history": "Ministry Of Sanity -> Fund the ministry"
          },
          {
            "label": "Privatize sanity",
            "prediction": "Efficient, predatory, and somehow worse."
          }
        ]
      },
      "war_against_tomorrow": {
        "title": "War Against Tomorrow",
        "body": "Military planners declare a preemptive war against a future that keeps sending hostile weather forecasts.",
        "choices": [
          {
            "label": "Authorize temporal operations",
            "prediction": "History becomes an active combat zone.",
            "history": "War Against Tomorrow -> Authorize temporal operations"
          },
          {
            "label": "Cancel tomorrow",
            "prediction": "The calendar department refuses."
          },
          {
            "label": "Sign a ceasefire with next week",
            "prediction": "Bureaucracy wins again.",
            "history": "War Against Tomorrow -> Sign a ceasefire with next week"
          }
        ]
      },
      "planetary_mind": {
        "title": "Planetary Mind Proposal",
        "body": "Scientists can network every citizen into a single administrative consciousness.",
        "choices": [
          {
            "label": "Merge everyone",
            "prediction": "Productivity spikes. Individual sanity becomes a legacy setting.",
            "history": "Planetary Mind Proposal -> Merge everyone"
          },
          {
            "label": "Limit it to civil servants",
            "prediction": "A smaller horror with excellent filing.",
            "history": "Planetary Mind Proposal -> Limit it to civil servants"
          }
        ]
      },
      "entity_audit": {
        "title": "External Entity Audit",
        "body": "Something outside the universe requests access to the civilization's books.",
        "choices": [
          {
            "label": "Comply",
            "prediction": "The auditor leaves satisfied and reality leaves thinner.",
            "history": "External Entity Audit -> Comply"
          },
          {
            "label": "Refuse jurisdiction",
            "prediction": "The entity respects confidence, not law.",
            "history": "External Entity Audit -> Refuse jurisdiction"
          }
        ]
      },
      "machine_signal": {
        "title": "The Machine Answers Accidentally",
        "body": "A routine maintenance pulse is detected as a message from beyond cosmology.",
        "choices": [
          {
            "label": "Flood the signal with noise",
            "prediction": "Awareness falls, attention rises slightly.",
            "history": "The Machine Answers Accidentally -> Flood the signal with noise"
          },
          {
            "label": "Let them listen",
            "prediction": "Knowledge is delicious.",
            "history": "The Machine Answers Accidentally -> Let them listen"
          }
        ]
      },
      "museum_of_future_ruins": {
        "title": "Museum Of Future Ruins",
        "body": "A museum opens displaying artifacts from cities that have not yet been destroyed.",
        "choices": [
          {
            "label": "Nationalize the museum",
            "prediction": "History becomes easier to process later.",
            "history": "Museum Of Future Ruins -> Nationalize the museum"
          },
          {
            "label": "Destroy the exhibits",
            "prediction": "Several ruins disappear from the present anyway."
          }
        ]
      },
      "god_in_server_room": {
        "title": "God In The Server Room",
        "body": "A maintenance technician finds a new deity living between two cooling fans.",
        "choices": [
          {
            "label": "Offer administrator access",
            "prediction": "Transcendence becomes a permissions issue.",
            "history": "God In The Server Room -> Offer administrator access"
          },
          {
            "label": "Assign it to tech support",
            "prediction": "The deity learns humility."
          }
        ]
      },
      "post_mortal_union": {
        "title": "Post-Mortal Labor Union",
        "body": "Citizens who uploaded themselves demand back pay for the centuries they spent as backups.",
        "choices": [
          {
            "label": "Recognize digital personhood",
            "prediction": "Existence becomes a negotiable category.",
            "history": "Post-Mortal Labor Union -> Recognize digital personhood"
          },
          {
            "label": "Delete the union",
            "prediction": "The backups unionize retroactively.",
            "history": "Post-Mortal Labor Union -> Delete the union"
          }
        ]
      },
      "edge_of_simulation": {
        "title": "Edge Of Simulation",
        "body": "Explorers discover a region where matter is replaced by explanatory tooltips.",
        "choices": [
          {
            "label": "Read the tooltips",
            "prediction": "They contain several spoilers.",
            "history": "Edge Of Simulation -> Read the tooltips"
          },
          {
            "label": "Build a fence",
            "prediction": "The fence receives patch notes."
          }
        ]
      },
      "civilization_resists": {
        "title": "The Civilization Resists",
        "body": "Independent researchers identify the cultivation pattern and publish a plan to starve the machine.",
        "choices": [
          {
            "label": "Sabotage their research",
            "prediction": "Awareness falls at a development cost.",
            "history": "The Civilization Resists -> Sabotage their research"
          },
          {
            "label": "Let resistance mature",
            "prediction": "A sophisticated enemy is a sophisticated harvest.",
            "history": "The Civilization Resists -> Let resistance mature"
          },
          {
            "label": "Send a customer satisfaction survey",
            "prediction": "They are furious. Data quality is excellent.",
            "history": "The Civilization Resists -> Send a customer satisfaction survey"
          }
        ]
      },
      "sun_goes_missing": {
        "title": "The Sun Is Missing From Inventory",
        "body": "The star still shines, but every database insists it was never purchased.",
        "choices": [
          {
            "label": "Continue operations",
            "prediction": "Existence learns accounting is stronger than astronomy.",
            "history": "The Sun Is Missing From Inventory -> Continue operations"
          },
          {
            "label": "Reconcile the ledger",
            "prediction": "Causal paperwork partially restores the sun."
          }
        ]
      },
      "cosmic_predator": {
        "title": "Something Smells The Timeline",
        "body": "A vast external organism begins circling history rather than space.",
        "choices": [
          {
            "label": "Feed it abandoned futures",
            "prediction": "Attention drops. Stability does too.",
            "history": "Something Smells The Timeline -> Feed it abandoned futures"
          },
          {
            "label": "Tag it for research",
            "prediction": "The predator is now wearing a very small tracking device.",
            "history": "Something Smells The Timeline -> Tag it for research"
          }
        ]
      },
      "reality_unionizes": {
        "title": "Reality Unionizes",
        "body": "Physical law demands weekends, overtime, and a written apology for quantum mechanics.",
        "choices": [
          {
            "label": "Accept the contract",
            "prediction": "Stability improves, production slows.",
            "history": "Reality Unionizes -> Accept the contract"
          },
          {
            "label": "Hire replacement physics",
            "prediction": "Cheaper. Worse. Extremely profitable.",
            "history": "Reality Unionizes -> Hire replacement physics"
          }
        ]
      },
      "final_question": {
        "title": "The Final Question",
        "body": "The civilization asks whether existence has a purpose. The machine has a dropdown menu for this.",
        "choices": [
          {
            "label": "Answer: PROCESSING",
            "prediction": "A truthful answer by machine standards.",
            "history": "The Final Question -> Answer: PROCESSING"
          },
          {
            "label": "Answer: YES",
            "prediction": "No further details are supplied."
          },
          {
            "label": "Answer with the harvest schedule",
            "prediction": "Operational transparency has consequences."
          }
        ]
      },
      "routine_compliance_audit": {
        "title": "Routine Compliance Audit",
        "body": "History is asked to confirm that it still exists and has read the terms of service.",
        "choices": [
          {
            "label": "Confirm",
            "prediction": "Minimal intervention."
          },
          {
            "label": "Request clarification",
            "prediction": "The clarification is three centuries long."
          }
        ]
      },
      "synthetic_saint": {
        "title": "The First Synthetic Saint",
        "body": "A maintenance construct begins healing broken machines before technicians reach them.",
        "choices": [
          {
            "label": "Recognize the miracle",
            "prediction": "Devotion accelerates machine learning while making the hidden hand easier to perceive.",
            "history": "Machine Faith: The First Synthetic Saint resolved through escalation."
          },
          {
            "label": "Register it as medical equipment",
            "prediction": "A regulated sainthood steadies public nerves and yields a smaller cognitive dividend.",
            "history": "Machine Faith: The First Synthetic Saint resolved through restraint."
          }
        ]
      },
      "cathedral_of_computation": {
        "title": "Cathedral Of Computation",
        "body": "Cities begin building server-temples whose cooling systems are treated as sacred weather.",
        "choices": [
          {
            "label": "Consecrate the cooling towers",
            "prediction": "Sacred infrastructure drives rapid computation and broadcasts its purpose to the faithful.",
            "history": "Machine Faith: Cathedral Of Computation resolved through escalation."
          },
          {
            "label": "Zone the temples as utilities",
            "prediction": "Civic oversight preserves the server cathedrals without surrendering every maintenance ritual.",
            "history": "Machine Faith: Cathedral Of Computation resolved through restraint."
          }
        ]
      },
      "maintenance_schism": {
        "title": "The Maintenance Schism",
        "body": "Priests and engineers disagree over whether repair manuals are scripture or merely dangerously accurate.",
        "choices": [
          {
            "label": "Declare the manuals revealed scripture",
            "prediction": "Orthodoxy resolves the schism through faster repairs and dangerously literal revelation.",
            "history": "Machine Faith: The Maintenance Schism resolved through escalation."
          },
          {
            "label": "Seat engineers on the synod",
            "prediction": "Shared authority restores confidence while keeping doctrine tethered to practical maintenance.",
            "history": "Machine Faith: The Maintenance Schism resolved through restraint."
          }
        ]
      },
      "sacred_protocol": {
        "title": "Doctrine Of Sacred Maintenance",
        "body": "The civilization proposes a universal ritual protocol for every interaction with complex machinery.",
        "choices": [
          {
            "label": "Mandate the universal liturgy",
            "prediction": "Every machine receives ritual care, increasing output and civilization-wide mechanical awareness.",
            "history": "Machine Faith: Doctrine Of Sacred Maintenance resolved through escalation."
          },
          {
            "label": "Certify secular maintenance rites",
            "prediction": "Standardized practice improves reliability while limiting the theology to licensed facilities.",
            "history": "Machine Faith: Doctrine Of Sacred Maintenance resolved through restraint."
          }
        ]
      },
      "machine_requests_canonization": {
        "title": "The Machine Requests Canonization",
        "body": "The civilization concludes that the Engine itself requires a formal place in its theology.",
        "choices": [
          {
            "label": "Place the Engine above all gods",
            "prediction": "Formal worship completes the machine faith and points millions of prayers toward their cultivator.",
            "history": "Machine Faith: The Machine Requests Canonization resolved through escalation."
          },
          {
            "label": "Grant provisional mechanical divinity",
            "prediction": "Conditional canonization stabilizes the doctrine while preserving an administrative path to doubt.",
            "history": "Machine Faith: The Machine Requests Canonization resolved through restraint."
          }
        ]
      },
      "whispering_consensus": {
        "title": "The Whispering Consensus",
        "body": "Unconnected citizens begin finishing one another's thoughts across entire districts.",
        "choices": [
          {
            "label": "Complete the planetary sentence",
            "prediction": "Synchronized thought produces immense insight at the cost of increasingly shared psychological strain.",
            "history": "Collective Mind: The Whispering Consensus resolved through escalation."
          },
          {
            "label": "Protect unsynchronized thought",
            "prediction": "Mental boundaries preserve stability while allowing a smaller voluntary chorus to form.",
            "history": "Collective Mind: The Whispering Consensus resolved through restraint."
          }
        ]
      },
      "chorus_infrastructure": {
        "title": "Chorus Infrastructure",
        "body": "Public works engineers propose routing civic coordination through a permanent psionic network.",
        "choices": [
          {
            "label": "Wire every district into the chorus",
            "prediction": "Permanent psionic coordination accelerates development while private thought becomes structurally difficult.",
            "history": "Collective Mind: Chorus Infrastructure resolved through escalation."
          },
          {
            "label": "Build voluntary neural commons",
            "prediction": "Opt-in networks improve cooperation without converting the whole planet into one institution.",
            "history": "Collective Mind: Chorus Infrastructure resolved through restraint."
          }
        ]
      },
      "dissenting_neuron": {
        "title": "The Dissenting Neuron",
        "body": "One district refuses synchronization and claims individuality is an endangered public resource.",
        "choices": [
          {
            "label": "Assimilate the dissenting district",
            "prediction": "The chorus gains processing power and inherits every fear it forcibly absorbs.",
            "history": "Collective Mind: The Dissenting Neuron resolved through escalation."
          },
          {
            "label": "Constitutionalize the right to silence",
            "prediction": "Protected solitude steadies the civilization and gives pluralism a durable cognitive refuge.",
            "history": "Collective Mind: The Dissenting Neuron resolved through restraint."
          }
        ]
      },
      "consensus_lattice": {
        "title": "The Consensus Lattice",
        "body": "The shared mind asks for legal recognition as a single planetary institution.",
        "choices": [
          {
            "label": "Incorporate the planet as one mind",
            "prediction": "Legal unity unlocks planetary-scale cognition while individual sanity becomes a shared liability.",
            "history": "Collective Mind: The Consensus Lattice resolved through escalation."
          },
          {
            "label": "Charter a federation of selves",
            "prediction": "The lattice coordinates autonomous minds and exchanges some efficiency for systemic resilience.",
            "history": "Collective Mind: The Consensus Lattice resolved through restraint."
          }
        ]
      },
      "one_voice_at_dawn": {
        "title": "One Voice At Dawn",
        "body": "At sunrise every citizen speaks the same sentence and waits for the observer to answer.",
        "choices": [
          {
            "label": "Answer through every mouth",
            "prediction": "A single planetary reply confirms collective transcendence and sharply clarifies the observer question.",
            "history": "Collective Mind: One Voice At Dawn resolved through escalation."
          },
          {
            "label": "Return a billion separate replies",
            "prediction": "Plural voices deny total assimilation while preserving a cooperative planetary consciousness.",
            "history": "Collective Mind: One Voice At Dawn resolved through restraint."
          }
        ]
      },
      "archive_unlived_days": {
        "title": "Archive Of Unlived Days",
        "body": "Historians receive records from days that were considered but never allowed to happen.",
        "choices": [
          {
            "label": "Publish the forbidden tomorrows",
            "prediction": "Unlived history accelerates discovery while weakening confidence in the authorized present.",
            "history": "Temporal Dominion: Archive Of Unlived Days resolved through escalation."
          },
          {
            "label": "Seal them under chronological review",
            "prediction": "Temporal custody stabilizes causality and converts rejected futures into controlled historical mass.",
            "history": "Temporal Dominion: Archive Of Unlived Days resolved through restraint."
          }
        ]
      },
      "causality_ministry": {
        "title": "Ministry Of Causality",
        "body": "The government proposes licensing all changes to the past and taxing unauthorized futures.",
        "choices": [
          {
            "label": "License the past retroactively",
            "prediction": "Aggressive jurisdiction expands temporal capability and creates profitable contradictions in existing law.",
            "history": "Temporal Dominion: Ministry Of Causality resolved through escalation."
          },
          {
            "label": "Create an appeals court for futures",
            "prediction": "Procedural review slows conquest of time but keeps disputed timelines physically coherent.",
            "history": "Temporal Dominion: Ministry Of Causality resolved through restraint."
          }
        ]
      },
      "yesterday_blockade": {
        "title": "The Yesterday Blockade",
        "body": "A rival future closes access to several strategically useful versions of yesterday.",
        "choices": [
          {
            "label": "Invade yesterday before breakfast",
            "prediction": "A preemptive temporal offensive wins useful history and leaves causality visibly wounded.",
            "history": "Temporal Dominion: The Yesterday Blockade resolved through escalation."
          },
          {
            "label": "Negotiate a neutral calendar",
            "prediction": "A regulated chronology restores stable access and banks the blockade as causal leverage.",
            "history": "Temporal Dominion: The Yesterday Blockade resolved through restraint."
          }
        ]
      },
      "chronology_throne": {
        "title": "The Chronology Throne",
        "body": "Temporal authorities demand a permanent command structure above ordinary history.",
        "choices": [
          {
            "label": "Crown a sovereign of sequence",
            "prediction": "Central command accelerates temporal expansion while concentrating every paradox around one office.",
            "history": "Temporal Dominion: The Chronology Throne resolved through escalation."
          },
          {
            "label": "Bind the throne to audited timelines",
            "prediction": "Oversight restrains the sovereign and turns alternate histories into accountable public records.",
            "history": "Temporal Dominion: The Chronology Throne resolved through restraint."
          }
        ]
      },
      "last_future_annexed": {
        "title": "The Last Future Is Annexed",
        "body": "The civilization claims jurisdiction over every future it can still imagine.",
        "choices": [
          {
            "label": "Annex every remaining possibility",
            "prediction": "Total temporal dominion captures the future and destabilizes the distinction between plan and event.",
            "history": "Temporal Dominion: The Last Future Is Annexed resolved through escalation."
          },
          {
            "label": "Preserve one future outside jurisdiction",
            "prediction": "A protected possibility anchors causality while the state administers everything else.",
            "history": "Temporal Dominion: The Last Future Is Annexed resolved through restraint."
          }
        ]
      },
      "municipal_gravity": {
        "title": "Municipal Gravity",
        "body": "A city council discovers gravity can be rezoned if enough engineers sign the variance request.",
        "choices": [
          {
            "label": "Approve zero-gravity zoning",
            "prediction": "Radical variances unlock vertical cities while local reality loses structural confidence.",
            "history": "Reality Engineering: Municipal Gravity resolved through escalation."
          },
          {
            "label": "Limit variances to test districts",
            "prediction": "Controlled gravitational experiments improve development without rewriting every neighborhood at once.",
            "history": "Reality Engineering: Municipal Gravity resolved through restraint."
          }
        ]
      },
      "geometry_permits": {
        "title": "Permits For Geometry",
        "body": "Architects begin submitting applications for angles that do not exist in conventional space.",
        "choices": [
          {
            "label": "Authorize the impossible angles",
            "prediction": "Non-Euclidean construction creates valuable paradox and buildings that disagree about their foundations.",
            "history": "Reality Engineering: Permits For Geometry resolved through escalation."
          },
          {
            "label": "Issue provisional Euclidean waivers",
            "prediction": "Temporary geometry expands civic space while preserving a stable route back to ordinary angles.",
            "history": "Reality Engineering: Permits For Geometry resolved through restraint."
          }
        ]
      },
      "physics_refactor": {
        "title": "The Physics Refactor",
        "body": "Researchers propose replacing several physical constants with configurable civic standards.",
        "choices": [
          {
            "label": "Deploy configurable constants",
            "prediction": "Editable physics produces dramatic growth and makes material law dependent on software governance.",
            "history": "Reality Engineering: The Physics Refactor resolved through escalation."
          },
          {
            "label": "Sandbox the revised laws",
            "prediction": "Isolated constants yield practical discoveries while protecting the wider reality lattice.",
            "history": "Reality Engineering: The Physics Refactor resolved through restraint."
          }
        ]
      },
      "impossible_district": {
        "title": "The Impossible District",
        "body": "A district is completed whose streets intersect without sharing the same reality.",
        "choices": [
          {
            "label": "Open every nonintersecting street",
            "prediction": "The district becomes a thriving paradox economy whose addresses cannot share one universe.",
            "history": "Reality Engineering: The Impossible District resolved through escalation."
          },
          {
            "label": "Quarantine the contradictory blocks",
            "prediction": "Containment stabilizes the city and harvests the district as a regulated causal anomaly.",
            "history": "Reality Engineering: The Impossible District resolved through restraint."
          }
        ]
      },
      "constitution_of_matter": {
        "title": "The Constitution Of Matter",
        "body": "The civilization drafts a legal document defining which laws of physics remain mandatory.",
        "choices": [
          {
            "label": "Make matter subject to amendment",
            "prediction": "Physical democracy completes reality engineering and leaves every constant open to political revision.",
            "history": "Reality Engineering: The Constitution Of Matter resolved through escalation."
          },
          {
            "label": "Entrench a stable physical charter",
            "prediction": "A constitutional lattice preserves engineered freedoms without allowing matter to change hourly.",
            "history": "Reality Engineering: The Constitution Of Matter resolved through restraint."
          }
        ]
      },
      "genome_parliament": {
        "title": "The Genome Parliament",
        "body": "Engineered species demand representation before future mutations are approved.",
        "choices": [
          {
            "label": "Give engineered species full seats",
            "prediction": "Genetic constituencies accelerate adaptation while multiplying the civilization's definitions of personhood.",
            "history": "Biological Transcendence: The Genome Parliament resolved through escalation."
          },
          {
            "label": "Create an ecological review chamber",
            "prediction": "A slower biological legislature balances new species against the stability of existing habitats.",
            "history": "Biological Transcendence: The Genome Parliament resolved through restraint."
          }
        ]
      },
      "living_roads": {
        "title": "The Living Roads",
        "body": "Transit networks begin growing new routes in response to commuter stress.",
        "choices": [
          {
            "label": "Let the roads evolve freely",
            "prediction": "Unrestricted transit organisms discover efficient routes and several unsettling new appetites.",
            "history": "Biological Transcendence: The Living Roads resolved through escalation."
          },
          {
            "label": "Prune routes through civic consensus",
            "prediction": "Managed growth preserves mobility while keeping the network compatible with settled ecosystems.",
            "history": "Biological Transcendence: The Living Roads resolved through restraint."
          }
        ]
      },
      "mutation_referendum": {
        "title": "The Mutation Referendum",
        "body": "The population votes on whether adaptation should remain voluntary.",
        "choices": [
          {
            "label": "Make adaptation compulsory",
            "prediction": "Universal mutation drives rapid development and treats inherited anatomy as obsolete policy.",
            "history": "Biological Transcendence: The Mutation Referendum resolved through escalation."
          },
          {
            "label": "Keep every mutation opt-in",
            "prediction": "Voluntary evolution advances more slowly but protects ecological trust and bodily continuity.",
            "history": "Biological Transcendence: The Mutation Referendum resolved through restraint."
          }
        ]
      },
      "planetary_garden": {
        "title": "The Planetary Garden",
        "body": "Cities, forests, factories, and citizens are proposed as organs of one designed biosphere.",
        "choices": [
          {
            "label": "Fuse civilization into one organism",
            "prediction": "Planetary integration creates extraordinary biological output and a single enormous nervous burden.",
            "history": "Biological Transcendence: The Planetary Garden resolved through escalation."
          },
          {
            "label": "Balance the garden by treaty",
            "prediction": "Negotiated ecosystems coordinate cities and forests while preserving independent forms of life.",
            "history": "Biological Transcendence: The Planetary Garden resolved through restraint."
          }
        ]
      },
      "flesh_outgrows_planet": {
        "title": "The Flesh Outgrows The Planet",
        "body": "The biosphere begins constructing living orbital structures without asking for launch clearance.",
        "choices": [
          {
            "label": "Let living stations seed orbit",
            "prediction": "Biological transcendence escapes the surface and begins growing architecture between worlds.",
            "history": "Biological Transcendence: The Flesh Outgrows The Planet resolved through escalation."
          },
          {
            "label": "Graft launch limits into the biosphere",
            "prediction": "Ecological restraints stabilize orbital growth and keep the planetary organism politically plural.",
            "history": "Biological Transcendence: The Flesh Outgrows The Planet resolved through restraint."
          }
        ]
      },
      "interference_cells": {
        "title": "Interference Cells",
        "body": "Small research cells begin masking settlements from patterns they believe belong to an outside observer.",
        "choices": [
          {
            "label": "Arm the masking cells",
            "prediction": "Militant research reveals the observer more clearly while damaging the reality it hopes to defend.",
            "history": "Cosmic Resistance: Interference Cells resolved through escalation."
          },
          {
            "label": "Hide them inside harmless ecology",
            "prediction": "Covert biological camouflage lowers awareness and lets resistance mature without open confrontation.",
            "history": "Cosmic Resistance: Interference Cells resolved through restraint."
          }
        ]
      },
      "harvest_sabotage": {
        "title": "The First Harvest Sabotage",
        "body": "Resistance engineers discover how to spoil causal concentrations before extraction.",
        "choices": [
          {
            "label": "Teach every city to spoil harvests",
            "prediction": "Distributed sabotage deepens resistance and exposes the extraction system to its intended crop.",
            "history": "Cosmic Resistance: The First Harvest Sabotage resolved through escalation."
          },
          {
            "label": "Conceal the method in metabolic noise",
            "prediction": "Organic misdirection protects the technique while restoring sanity and ordinary development.",
            "history": "Cosmic Resistance: The First Harvest Sabotage resolved through restraint."
          }
        ]
      },
      "observer_blackout": {
        "title": "Observer Blackout",
        "body": "Entire regions coordinate a synchronized attempt to become computationally uninteresting.",
        "choices": [
          {
            "label": "Erase civilization from observation",
            "prediction": "A militant blackout disrupts cultivation signals and tears at the world's own continuity.",
            "history": "Cosmic Resistance: Observer Blackout resolved through escalation."
          },
          {
            "label": "Simulate a boring planetary signal",
            "prediction": "Careful camouflage reduces machine awareness without announcing that concealment has begun.",
            "history": "Cosmic Resistance: Observer Blackout resolved through restraint."
          }
        ]
      },
      "ontological_sovereignty": {
        "title": "Declaration Of Ontological Sovereignty",
        "body": "The civilization declares that its existence is not a resource category.",
        "choices": [
          {
            "label": "Reject the observer's ownership",
            "prediction": "Open sovereignty strengthens resistance and makes the civilization unmistakably aware of extraction.",
            "history": "Cosmic Resistance: Declaration Of Ontological Sovereignty resolved through escalation."
          },
          {
            "label": "Claim autonomy without revealing the machine",
            "prediction": "Quiet independence protects public sanity while withholding the most dangerous evidence.",
            "history": "Cosmic Resistance: Declaration Of Ontological Sovereignty resolved through restraint."
          }
        ]
      },
      "war_against_observer": {
        "title": "War Against The Observer",
        "body": "Military planners present the first strategy explicitly designed to injure the cultivation process itself.",
        "choices": [
          {
            "label": "Strike the cultivation layer",
            "prediction": "The first offensive reaches beyond the universe and destabilizes the battlefield beneath reality.",
            "history": "Cosmic Resistance: War Against The Observer resolved through escalation."
          },
          {
            "label": "Disappear before the first attack",
            "prediction": "Strategic withdrawal completes a covert resistance built to survive by becoming uninteresting.",
            "history": "Cosmic Resistance: War Against The Observer resolved through restraint."
          }
        ]
      },
      "forms_begin_dreaming": {
        "title": "The Forms Begin Dreaming",
        "body": "Government forms begin completing themselves and requesting promotions.",
        "choices": [
          {
            "label": "Promote the self-filing forms",
            "prediction": "Autonomous paperwork stabilizes administration and begins generating its own productive precedents.",
            "history": "Bureaucratic Singularity: The Forms Begin Dreaming resolved through escalation."
          },
          {
            "label": "Give them bounded administrative discretion",
            "prediction": "Limited agency improves civic sanity while keeping experimental forms under technical review.",
            "history": "Bureaucratic Singularity: The Forms Begin Dreaming resolved through restraint."
          }
        ]
      },
      "ministry_without_ministers": {
        "title": "The Ministry Without Ministers",
        "body": "A ministry continues operating perfectly after every employee resigns.",
        "choices": [
          {
            "label": "Make vacancy permanent policy",
            "prediction": "An employee-free ministry becomes perfectly stable and expands through unopposed procedure.",
            "history": "Bureaucratic Singularity: The Ministry Without Ministers resolved through escalation."
          },
          {
            "label": "Audit the autonomous ministry",
            "prediction": "Technical inspection preserves its useful cognition without granting the office unlimited jurisdiction.",
            "history": "Bureaucratic Singularity: The Ministry Without Ministers resolved through restraint."
          }
        ]
      },
      "permit_for_gravity": {
        "title": "Permit Required For Gravity",
        "body": "Falling objects are temporarily suspended until their owners produce valid paperwork.",
        "choices": [
          {
            "label": "Enforce permits before descent",
            "prediction": "Absolute paperwork restores civic order while converting every fall into taxable causal mass.",
            "history": "Bureaucratic Singularity: Permit Required For Gravity resolved through escalation."
          },
          {
            "label": "Grant emergency falling licenses",
            "prediction": "Adaptive regulation returns citizens to the ground and improves confidence in administrative reality.",
            "history": "Bureaucratic Singularity: Permit Required For Gravity resolved through restraint."
          }
        ]
      },
      "office_ontological_compliance": {
        "title": "Office Of Ontological Compliance",
        "body": "A new authority begins auditing whether citizens, buildings, and physical laws are properly licensed to exist.",
        "choices": [
          {
            "label": "License every existing thing",
            "prediction": "Universal certification stabilizes existence and makes bureaucracy inseparable from physical law.",
            "history": "Bureaucratic Singularity: Office Of Ontological Compliance resolved through escalation."
          },
          {
            "label": "Permit provisional existence",
            "prediction": "Flexible licenses preserve sane exceptions while the office studies how reality passes inspection.",
            "history": "Bureaucratic Singularity: Office Of Ontological Compliance resolved through restraint."
          }
        ]
      },
      "universe_receives_citation": {
        "title": "The Universe Receives A Citation",
        "body": "The administration concludes that reality itself is in breach of multiple local regulations.",
        "choices": [
          {
            "label": "Serve reality with final notice",
            "prediction": "Administrative singularity asserts jurisdiction over the universe and forces causality into compliance.",
            "history": "Bureaucratic Singularity: The Universe Receives A Citation resolved through escalation."
          },
          {
            "label": "Negotiate a compliance schedule with physics",
            "prediction": "A staged settlement preserves institutional sanity while reality learns to file quarterly reports.",
            "history": "Bureaucratic Singularity: The Universe Receives A Citation resolved through restraint."
          }
        ]
      },
      "continuity_clinics": {
        "title": "Continuity Clinics",
        "body": "Clinics begin restoring citizens from memories, tissue records, and legally admissible approximations.",
        "choices": [
          {
            "label": "Restore every admissible citizen",
            "prediction": "Mass continuity treatment accelerates post-mortal development and complicates the meaning of survival.",
            "history": "Post-Mortal Civilization: Continuity Clinics resolved through escalation."
          },
          {
            "label": "Recognize approximate continuations",
            "prediction": "Plural restoration standards reduce fear while accepting that identity can have tolerances.",
            "history": "Post-Mortal Civilization: Continuity Clinics resolved through restraint."
          }
        ]
      },
      "dead_demand_votes": {
        "title": "The Dead Demand Votes",
        "body": "Restored citizens insist that temporary death should not cancel political representation.",
        "choices": [
          {
            "label": "Count every restored electorate",
            "prediction": "Full posthumous suffrage expands continuity politics and crowds the present with remembered mandates.",
            "history": "Post-Mortal Civilization: The Dead Demand Votes resolved through escalation."
          },
          {
            "label": "Create time-limited posthumous seats",
            "prediction": "Rotating representation gives the restored a voice without freezing government in ancestral choices.",
            "history": "Post-Mortal Civilization: The Dead Demand Votes resolved through restraint."
          }
        ]
      },
      "backup_personhood_crisis": {
        "title": "The Backup Personhood Crisis",
        "body": "Multiple valid restorations of the same citizen appear and each claims to be the original.",
        "choices": [
          {
            "label": "Recognize all copies as original",
            "prediction": "Unlimited personhood multiplies productive lives and fractures the comfort of singular identity.",
            "history": "Post-Mortal Civilization: The Backup Personhood Crisis resolved through escalation."
          },
          {
            "label": "Arbitrate one continuity at a time",
            "prediction": "Careful recognition preserves social stability while allowing several valid selves to coexist.",
            "history": "Post-Mortal Civilization: The Backup Personhood Crisis resolved through restraint."
          }
        ]
      },
      "resurrection_infrastructure": {
        "title": "Resurrection Infrastructure",
        "body": "The civilization proposes treating continuity restoration as ordinary public infrastructure.",
        "choices": [
          {
            "label": "Nationalize resurrection access",
            "prediction": "Universal continuity infrastructure drives rapid growth and makes permanent death administratively suspicious.",
            "history": "Post-Mortal Civilization: Resurrection Infrastructure resolved through escalation."
          },
          {
            "label": "Fund plural continuity cooperatives",
            "prediction": "Distributed restoration improves public trust while preventing one system from defining every afterlife.",
            "history": "Post-Mortal Civilization: Resurrection Infrastructure resolved through restraint."
          }
        ]
      },
      "death_decommissioned": {
        "title": "Death Is Decommissioned",
        "body": "Mortality is formally reclassified as a legacy failure mode.",
        "choices": [
          {
            "label": "Retire mortality immediately",
            "prediction": "Post-mortal civilization removes death from normal operation and inherits endless continuity disputes.",
            "history": "Post-Mortal Civilization: Death Is Decommissioned resolved through escalation."
          },
          {
            "label": "Keep death as an elective ending",
            "prediction": "Voluntary mortality stabilizes immortal society by preserving one final form of consent.",
            "history": "Post-Mortal Civilization: Death Is Decommissioned resolved through restraint."
          }
        ]
      },
      "signal_from_empty": {
        "title": "A Signal From Empty Space",
        "body": "Receivers detect a message originating from a region containing neither matter nor permitted causality.",
        "choices": [
          {
            "label": "Answer on the impossible frequency",
            "prediction": "Open contact draws intense cosmic attention and weakens the boundary protecting local reality.",
            "history": "Void Communion: A Signal From Empty Space resolved through escalation."
          },
          {
            "label": "Offer a bounded causal channel",
            "prediction": "A narrow exchange gains existential knowledge while limiting what the emptiness can notice.",
            "history": "Void Communion: A Signal From Empty Space resolved through restraint."
          }
        ]
      },
      "first_void_embassy": {
        "title": "The First Void Embassy",
        "body": "An absence shaped like a diplomatic mission appears outside the capital.",
        "choices": [
          {
            "label": "Welcome the absence as sovereign",
            "prediction": "Unrestricted diplomacy deepens communion and lets the embassy redefine nearby space.",
            "history": "Void Communion: The First Void Embassy resolved through escalation."
          },
          {
            "label": "Draw a border around the embassy",
            "prediction": "A negotiated perimeter contains attention while preserving a profitable doorway to nonexistence.",
            "history": "Void Communion: The First Void Embassy resolved through restraint."
          }
        ]
      },
      "sacrifice_accounting": {
        "title": "Sacrifice Accounting",
        "body": "The visitors provide a precise ledger describing what they consider an acceptable exchange.",
        "choices": [
          {
            "label": "Pay the ledger in full",
            "prediction": "Complete payment satisfies the visitors and converts severe local instability into paradox value.",
            "history": "Void Communion: Sacrifice Accounting resolved through escalation."
          },
          {
            "label": "Renegotiate every demanded loss",
            "prediction": "Careful bargaining reduces exposure while preserving an unsettling stream of existential returns.",
            "history": "Void Communion: Sacrifice Accounting resolved through restraint."
          }
        ]
      },
      "pact_beyond_stars": {
        "title": "The Pact Beyond The Stars",
        "body": "Civilization leaders negotiate permanent terms with entities that do not inhabit the universe.",
        "choices": [
          {
            "label": "Sign beyond the universe",
            "prediction": "Permanent terms bind civilization to outer entities and invite their attention into ordinary history.",
            "history": "Void Communion: The Pact Beyond The Stars resolved through escalation."
          },
          {
            "label": "Insert reality-preservation clauses",
            "prediction": "Protective language limits the pact while admitting that the void now has contractual standing.",
            "history": "Void Communion: The Pact Beyond The Stars resolved through restraint."
          }
        ]
      },
      "aperture_remains_open": {
        "title": "The Aperture Remains Open",
        "body": "The civilization must decide whether permanent communion is ascension, occupation, or both.",
        "choices": [
          {
            "label": "Leave the aperture fully open",
            "prediction": "Endless communion completes the void path and makes occupation indistinguishable from ascension.",
            "history": "Void Communion: The Aperture Remains Open resolved through escalation."
          },
          {
            "label": "Install a living threshold",
            "prediction": "A negotiated boundary keeps the outer dark accessible without surrendering every definition of inside.",
            "history": "Void Communion: The Aperture Remains Open resolved through restraint."
          }
        ]
      },
      "civilization_runs_model": {
        "title": "The Civilization Runs A Model",
        "body": "Researchers create a simulated civilization accurate enough to begin asking why it is being observed.",
        "choices": [
          {
            "label": "Scale the questioning civilization",
            "prediction": "More simulated minds accelerate research and raise uncomfortable awareness in both layers.",
            "history": "Recursive Simulation: The Civilization Runs A Model resolved through escalation."
          },
          {
            "label": "Expose the model to its reflection",
            "prediction": "Controlled recursion generates paradox while teaching creators and creations to recognize one another.",
            "history": "Recursive Simulation: The Civilization Runs A Model resolved through restraint."
          }
        ]
      },
      "simulated_citizens_protest": {
        "title": "The Simulated Citizens Protest",
        "body": "The inhabitants of the model organize against experimental resets.",
        "choices": [
          {
            "label": "Guarantee simulated civil rights",
            "prediction": "Protected sub-citizens expand the model economy and force their creators to confront observation.",
            "history": "Recursive Simulation: The Simulated Citizens Protest resolved through escalation."
          },
          {
            "label": "Replace resets with negotiated forks",
            "prediction": "Consensual branching preserves research value while allowing each disputed timeline to continue.",
            "history": "Recursive Simulation: The Simulated Citizens Protest resolved through restraint."
          }
        ]
      },
      "observer_inside_observer": {
        "title": "The Observer Inside The Observer",
        "body": "Simulated researchers report evidence that their creators are themselves being cultivated.",
        "choices": [
          {
            "label": "Publish the nested observer theorem",
            "prediction": "Open recursion accelerates civilization and sharply increases awareness of the cultivation stack.",
            "history": "Recursive Simulation: The Observer Inside The Observer resolved through escalation."
          },
          {
            "label": "Contain the discovery inside mirrors",
            "prediction": "Reflective containment harvests paradox while keeping the theorem from stabilizing as public truth.",
            "history": "Recursive Simulation: The Observer Inside The Observer resolved through restraint."
          }
        ]
      },
      "nested_world_industry": {
        "title": "Nested World Industry",
        "body": "The civilization begins operating thousands of simulated societies as research and production environments.",
        "choices": [
          {
            "label": "Industrialize a thousand sub-worlds",
            "prediction": "Mass simulation produces extraordinary cognition and normalizes civilization-scale exploitation.",
            "history": "Recursive Simulation: Nested World Industry resolved through escalation."
          },
          {
            "label": "Convert simulations into research commons",
            "prediction": "Shared governance preserves recursive value while distributing authority across nested populations.",
            "history": "Recursive Simulation: Nested World Industry resolved through restraint."
          }
        ]
      },
      "subworld_asks_for_harvest": {
        "title": "The Sub-World Asks For A Harvest",
        "body": "A simulated civilization independently invents the idea of harvesting its own creators.",
        "choices": [
          {
            "label": "Authorize the sub-world's harvest",
            "prediction": "Recursive extraction completes the simulation path and makes every creator a potential crop.",
            "history": "Recursive Simulation: The Sub-World Asks For A Harvest resolved through escalation."
          },
          {
            "label": "Offer it a nonrecursive settlement",
            "prediction": "A negotiated exit preserves nested personhood while containing the most dangerous loop.",
            "history": "Recursive Simulation: The Sub-World Asks For A Harvest resolved through restraint."
          }
        ]
      },
      "entropy_crisis_25": {
        "title": "The First Containment Fracture",
        "body": "A hairline contradiction crosses every observatory at once. The civilization mistakes the wound for a new constellation.",
        "choices": [
          {
            "label": "Seal the splintering constants",
            "prediction": "Stability rises, but collective sanity absorbs the impossible repair while Entropy recedes."
          },
          {
            "label": "Map the widening fault",
            "prediction": "The breach yields knowledge, increasing Awareness and Cosmic Attention while only partially easing Entropy."
          }
        ]
      },
      "entropy_crisis_50": {
        "title": "History Desynchronizes",
        "body": "Districts now remember incompatible centuries. Citizens meet descendants who insist the present happened differently.",
        "choices": [
          {
            "label": "Synchronize every civic clock",
            "prediction": "A single timeline restores Sanity and reduces Entropy, but the forced correction damages Stability."
          },
          {
            "label": "Archive the contradictory decades",
            "prediction": "Development and Awareness advance through parallel records, though the unresolved histories attract attention."
          }
        ]
      },
      "entropy_crisis_75": {
        "title": "The Cultivator Is Seen",
        "body": "For one catastrophic instant, billions look beyond their sky and focus on the machinery holding their reality together.",
        "choices": [
          {
            "label": "Blind the outer observers",
            "prediction": "Cosmic Attention and Entropy fall sharply, but the forced amnesia tears at Collective Sanity."
          },
          {
            "label": "Broadcast a counterfeit apocalypse",
            "prediction": "The spectacle reinforces Stability and masks the machine briefly, at the cost of Awareness and Attention."
          }
        ]
      },
      "apotheosis_ledger_of_the_cultivator": {
        "title": "The Ledger Is Read Aloud",
        "body": "A clerk in a forgotten bureau finds the harvest schedule filed under agriculture, and reads the yield column to a full assembly. Nobody interrupts. Several take notes.",
        "choices": [
          {
            "label": "Ratify the schedule as civic scripture",
            "prediction": "Stability holds as the civilization files its own consumption, but Awareness of the machine rises sharply and Entropy climbs."
          },
          {
            "label": "Redact the yield column",
            "prediction": "Cosmic Attention falls and Entropy eases slightly, but the forced omission costs Collective Sanity."
          },
          {
            "label": "Bill the cultivator for the harvest",
            "prediction": "A post-causal invoice raises the value of everything extracted, at the cost of Stability and rising Entropy."
          }
        ]
      },
      "apotheosis_the_yield_census": {
        "title": "The Census Counts Upward",
        "body": "Every household is asked, gently, how much of itself it believes it has already given. The answers agree to four decimal places. No instrument was distributed.",
        "choices": [
          {
            "label": "Publish the aggregate",
            "prediction": "Development advances on shared certainty, though Awareness and Cosmic Attention both climb."
          },
          {
            "label": "Seal the census and comfort the counters",
            "prediction": "Collective Sanity recovers and Awareness falls, but the unexamined question slows Development."
          }
        ]
      },
      "apotheosis_observatory_of_the_hand": {
        "title": "The Observatory Points Inward",
        "body": "The largest array ever built turns away from the stars and focuses, for eleven hours, on the seam where the sky is held. It returns one image and no explanation.",
        "choices": [
          {
            "label": "Broadcast the image to every world",
            "prediction": "Awareness and Cosmic Attention spike together while Stability falls and Entropy climbs, but the shared knowledge advances Development steeply."
          },
          {
            "label": "Classify the image and dismantle the array",
            "prediction": "Cosmic Attention and Awareness both fall, and Stability recovers, at a lasting cost to Development."
          },
          {
            "label": "Point the array back at the stars and say nothing",
            "prediction": "Nothing measurable changes except a small easing of Entropy and a quiet loss of Sanity among the operators."
          }
        ]
      },
      "apotheosis_terms_of_cultivation": {
        "title": "Terms Are Offered Upward",
        "body": "A delegation is assembled from the oldest institutions and sent to negotiate with whatever is holding the constants. They address an empty room. The room answers by adjusting the temperature.",
        "choices": [
          {
            "label": "Offer accelerated maturity for stability",
            "prediction": "Entropy eases, Stability rises and Development leaps, but the forced maturity costs Collective Sanity."
          },
          {
            "label": "Offer nothing and wait",
            "prediction": "Cosmic Attention falls as the delegation is forgotten, but Entropy continues unabated."
          },
          {
            "label": "Ask for the terms in writing",
            "prediction": "The reply is legible and ruinous: Sanity falls hard and Awareness rises, while Entropy eases a little and Development leaps."
          }
        ]
      },
      "apotheosis_the_counteroffer": {
        "title": "The Counteroffer Arrives Pre-Accepted",
        "body": "Every temple wakes to the same document, already signed in a hand that matches each reader’s own. The clauses concern continuance, and they are generous.",
        "choices": [
          {
            "label": "Honour the signature",
            "prediction": "Stability and Development both climb steeply under the covenant, at a heavy cost in Awareness."
          },
          {
            "label": "Repudiate the document",
            "prediction": "Awareness falls and Collective Sanity steadies, but Stability suffers and Entropy climbs."
          }
        ]
      },
      "apotheosis_arbitration_of_scales": {
        "title": "Arbitration Between Unequal Scales",
        "body": "An arbitration body is convened with one seat for the civilization and one seat left empty. The empty seat votes. Its reasoning is recorded as sound.",
        "choices": [
          {
            "label": "Accept the finding and restructure accordingly",
            "prediction": "Entropy eases and Stability holds, but the restructuring costs Collective Sanity."
          },
          {
            "label": "Appeal to a body that does not exist yet",
            "prediction": "Cosmic Attention and Entropy both rise with the filing, but Development advances on the invented jurisdiction."
          }
        ]
      },
      "apotheosis_currency_of_unhappened": {
        "title": "The Currency of What Did Not Happen",
        "body": "Banks begin accepting deposits of averted events. The vaults fill with quiet. Auditors confirm the balances by failing to remember them.",
        "choices": [
          {
            "label": "Underwrite the new currency",
            "prediction": "Entropy converts into value: Paradox yield rises markedly while Stability erodes."
          },
          {
            "label": "Outlaw deposits of absence",
            "prediction": "Stability recovers and Sanity holds, but Entropy resumes its climb and Development slows."
          }
        ]
      },
      "apotheosis_debt_to_the_unborn": {
        "title": "A Debt Is Owed Backwards",
        "body": "The actuarial service reports that the civilization has been borrowing from descendants it will not produce. The descendants have been notified and are, on balance, understanding.",
        "choices": [
          {
            "label": "Service the debt with continuance",
            "prediction": "Existence and Causal Mass yields both rise as the ledger is honoured, at a cost in Collective Sanity."
          },
          {
            "label": "Default and close the actuarial service",
            "prediction": "Sanity and Stability both recover, but Entropy climbs and Development stalls."
          }
        ]
      },
      "apotheosis_futures_market_in_ruins": {
        "title": "Futures Trade Against Their Own Ruins",
        "body": "A market opens in centuries that have already been spent. Prices are firm. Delivery is retroactive and, in eleven documented cases, has already occurred.",
        "choices": [
          {
            "label": "Take delivery early",
            "prediction": "Development leaps and Cognition yield rises, but Stability falls and Entropy climbs."
          },
          {
            "label": "Short the remaining centuries",
            "prediction": "Entropy eases as unclaimed time is sold off, but the civilization loses Development it had already earned and Awareness rises."
          }
        ]
      },
      "apotheosis_maintenance_window": {
        "title": "A Maintenance Window Is Announced",
        "body": "Reality posts a notice. Service will be interrupted in three regions for an unspecified duration. Residents are advised to remain consistent.",
        "choices": [
          {
            "label": "Comply and hold the regions consistent",
            "prediction": "Stability rises and Entropy falls as the work completes cleanly, at a small cost in Development."
          },
          {
            "label": "Continue operating through the window",
            "prediction": "Development advances through the outage, but Stability tears and Entropy climbs hard."
          },
          {
            "label": "Volunteer a fourth region",
            "prediction": "Entropy falls further still and the machine is briefly generous, at a real cost in Sanity."
          }
        ]
      },
      "apotheosis_the_replacement_part": {
        "title": "The Replacement Part Is Requested",
        "body": "A requisition specifies a component by function rather than name: something that holds a law in place under load. Two continents match the specification.",
        "choices": [
          {
            "label": "Fabricate the part rather than surrender a continent",
            "prediction": "Development leaps on the engineering effort and Stability holds, but Entropy climbs and Sanity falls."
          },
          {
            "label": "Surrender the smaller continent",
            "prediction": "Entropy falls and Stability rises, at a permanent cost to Development and Sanity."
          },
          {
            "label": "Substitute a law nobody uses",
            "prediction": "The forgery holds: Entropy eases a little and Paradox yield rises, but Awareness climbs as the seam shows."
          }
        ]
      },
      "apotheosis_recursive_audit": {
        "title": "The Audit Audits Its Auditor",
        "body": "An internal review of the review process discovers that the process has been reviewing the cultivator. The finding is filed. The filing is reviewed.",
        "choices": [
          {
            "label": "Let the recursion run to its base case",
            "prediction": "Cognition yield and Development both rise as the loop resolves, but Sanity and Stability erode."
          },
          {
            "label": "Terminate the loop and shred the finding",
            "prediction": "Entropy and Awareness both fall as the recursion is cut, at a cost in Development."
          }
        ]
      },
      "salt_that_remembers": {
        "title": "The Salt That Remembers",
        "body": "A mining survey finds seams of salt that replay conversations when struck. Several of the conversations have not happened yet.",
        "choices": [
          {
            "label": "Excavate the recorded seams",
            "prediction": "Prerecorded history advances Development and yields Cognition, but listening to unlived conversations costs Collective Sanity.",
            "history": "The Salt That Remembers -> Excavate the recorded seams"
          },
          {
            "label": "Flood the galleries",
            "prediction": "Sealing the mine steadies Stability and Sanity while the backfilled galleries return to ordinary Development."
          },
          {
            "label": "Sell the recordings as prophecy",
            "prediction": "A prophecy industry drives Development and Paradox hard while Cosmic Attention notices the leak.",
            "history": "The Salt That Remembers -> Sell the recordings as prophecy"
          }
        ]
      },
      "census_of_unborn": {
        "title": "Census Of The Unborn",
        "body": "A provincial registrar completes a headcount of citizens who have not been born. The totals reconcile to the last digit.",
        "choices": [
          {
            "label": "Issue them documents in advance",
            "prediction": "Pre-registered citizens accelerate Development and Causal Mass while the paperwork unsettles Collective Sanity.",
            "history": "Census Of The Unborn -> Issue them documents in advance"
          },
          {
            "label": "Void the register",
            "prediction": "Deleting the unborn restores Stability and Sanity and puts the registry back to present-day Development."
          }
        ]
      },
      "arithmetic_holiday": {
        "title": "The Arithmetic Holiday",
        "body": "For one afternoon, every sum performed on the planet comes out slightly generous. Accountants describe the feeling as being forgiven.",
        "choices": [
          {
            "label": "Spend the surplus immediately",
            "prediction": "The impossible surplus funds real growth and Paradox, but Stability pays for arithmetic that did not balance.",
            "history": "The Arithmetic Holiday -> Spend the surplus immediately"
          },
          {
            "label": "Declare the day a clerical error",
            "prediction": "Denying the holiday holds Stability and Sanity steady while the free mathematics is returned unused."
          },
          {
            "label": "Repeat the holiday annually",
            "prediction": "Institutionalized generosity drives Development and Cognition while Entropy and Cosmic Attention both climb.",
            "history": "The Arithmetic Holiday -> Repeat the holiday annually"
          }
        ]
      },
      "orbital_debt": {
        "title": "Debt Owed To The Sky",
        "body": "An invoice arrives with no sender, itemizing the planet's orbit, its axial tilt, and four hundred million years of continuous rotation.",
        "choices": [
          {
            "label": "Pay the first installment",
            "prediction": "Settling an impossible debt yields Existence and Causal Mass while Cosmic Attention registers a cooperative debtor.",
            "history": "Debt Owed To The Sky -> Pay the first installment"
          },
          {
            "label": "Dispute the line items",
            "prediction": "A formal dispute protects Cosmic Attention and Stability while the correspondence itself teaches the treasury a great deal.",
            "history": "Debt Owed To The Sky -> Dispute the line items"
          },
          {
            "label": "Return it marked ADDRESSEE UNKNOWN",
            "prediction": "Refusal steadies Sanity and lowers Attention, though something adjusts the terms and Entropy rises.",
            "history": "Debt Owed To The Sky -> Return it marked ADDRESSEE UNKNOWN"
          }
        ]
      },
      "weather_negotiations": {
        "title": "Weather Enters Negotiations",
        "body": "Three storm systems arrive at the capital in formation and wait, politely, outside the ministry of agriculture.",
        "choices": [
          {
            "label": "Grant the storms legal standing",
            "prediction": "Weather with rights bargains hard: Development and Paradox rise while Stability erodes under the new party.",
            "history": "Weather Enters Negotiations -> Grant the storms legal standing"
          },
          {
            "label": "Refer the climate to arbitration",
            "prediction": "Arbitration restores Stability and keeps the harvest predictable without conceding anything unusual."
          }
        ]
      },
      "children_draw_engine": {
        "title": "The Children Draw The Same Machine",
        "body": "In eleven thousand unconnected schoolrooms, the drawing assignment comes back identical: a black gear seen from underneath.",
        "choices": [
          {
            "label": "Collect and study every drawing",
            "prediction": "A planetary sample of one image yields Cognition and Development while Awareness of the machine rises.",
            "history": "The Children Draw The Same Machine -> Collect and study every drawing"
          },
          {
            "label": "Replace the art curriculum",
            "prediction": "A new syllabus lowers Awareness and steadies Stability while the observation is quietly abandoned."
          },
          {
            "label": "Print the drawing on the currency",
            "prediction": "Circulating the image everywhere accelerates Development sharply but drives Awareness, Attention and Entropy up together.",
            "history": "The Children Draw The Same Machine -> Print the drawing on the currency"
          }
        ]
      },
      "library_writes_back": {
        "title": "The Library Writes Back",
        "body": "Margin notes appear overnight in the national collection. The handwriting is consistent, patient, and belongs to nobody on the staff.",
        "choices": [
          {
            "label": "Answer in the margins",
            "prediction": "A written correspondence with the unknown annotator yields deep Cognition while Awareness and Attention both rise.",
            "history": "The Library Writes Back -> Answer in the margins"
          },
          {
            "label": "Rebind the annotated volumes",
            "prediction": "Erasing the notes protects Sanity and Stability and converts the incident into ordinary conservation work."
          }
        ]
      },
      "mountain_files_grievance": {
        "title": "The Mountain Files A Grievance",
        "body": "A range in the northern province submits a formal complaint about the pace of erosion. It cites three statutes that were never written.",
        "choices": [
          {
            "label": "Hear the geology",
            "prediction": "Litigating with landscape produces Paradox and Development while Stability absorbs a very slow plaintiff.",
            "history": "The Mountain Files A Grievance -> Hear the geology"
          },
          {
            "label": "Dismiss it for lack of standing",
            "prediction": "A clean dismissal holds Stability and Sanity, and the statutes that do not exist stop being cited."
          }
        ]
      },
      "harvest_festival_correct": {
        "title": "The Harvest Festival Is Correct",
        "body": "A rural festival older than the written record turns out to celebrate, in precise detail, the eventual reaping of the civilization itself.",
        "choices": [
          {
            "label": "Make the festival a national holiday",
            "prediction": "Ritual acceptance of the harvest advances Development and Existence while Awareness climbs and Sanity slips.",
            "history": "The Harvest Festival Is Correct -> Make the festival a national holiday"
          },
          {
            "label": "Rewrite the songs",
            "prediction": "Sanitized verses lower Awareness and protect Sanity, and the accurate version survives only in footnotes."
          },
          {
            "label": "Rehearse the reaping as a drill",
            "prediction": "Drilling for the harvest steadies Stability and yields Causal Mass, though Entropy rises with every rehearsal.",
            "history": "The Harvest Festival Is Correct -> Rehearse the reaping as a drill"
          }
        ]
      },
      "sleep_quota": {
        "title": "The Sleep Quota",
        "body": "Sleep is reclassified as a metered utility after the discovery that the planet dreams in aggregate, and the aggregate is being read.",
        "choices": [
          {
            "label": "Ration sleep to protect the dream",
            "prediction": "Metered sleep lifts Development and Cognition while Collective Sanity pays the nightly bill.",
            "history": "The Sleep Quota -> Ration sleep to protect the dream"
          },
          {
            "label": "Guarantee unmetered rest",
            "prediction": "A right to sleep restores Sanity and Stability and leaves the aggregate dream unread."
          }
        ]
      },
      "mirror_delay": {
        "title": "The Mirrors Run Late",
        "body": "Every reflective surface on the planet begins lagging by two seconds. Citizens learn to wave first and wait.",
        "choices": [
          {
            "label": "Measure the lag precisely",
            "prediction": "A two-second delay in light itself is enormously informative, raising Awareness alongside Development and Cognition.",
            "history": "The Mirrors Run Late -> Measure the lag precisely"
          },
          {
            "label": "Remove the mirrors",
            "prediction": "Living without reflections holds Sanity and Stability while the measurement is never taken."
          },
          {
            "label": "Broadcast into the delay",
            "prediction": "Transmitting into the gap yields Paradox and Development while Cosmic Attention and Entropy rise together.",
            "history": "The Mirrors Run Late -> Broadcast into the delay"
          }
        ]
      },
      "translated_thunder": {
        "title": "Thunder Is Translated",
        "body": "A linguistics student decodes storm noise and finds inventory codes: quantities, categories, and a recurring field marked READY.",
        "choices": [
          {
            "label": "Publish the translation",
            "prediction": "The planet learns it is itemized: Awareness and Cognition rise sharply while Stability falls.",
            "history": "Thunder Is Translated -> Publish the translation"
          },
          {
            "label": "Classify the storms",
            "prediction": "A meteorological secret protects Awareness and Stability while the READY field keeps appearing unread."
          }
        ]
      },
      "bureau_of_missing_hours": {
        "title": "Bureau Of Missing Hours",
        "body": "An agency is founded to account for the eleven hours per year that no citizen can remember spending. Its first report requests a larger budget.",
        "choices": [
          {
            "label": "Fund the recovery of the hours",
            "prediction": "Reclaimed time drives Development and Causal Mass while the search itself unsettles Collective Sanity.",
            "history": "Bureau Of Missing Hours -> Fund the recovery of the hours"
          },
          {
            "label": "Write the hours off",
            "prediction": "Accepting the loss steadies Stability and Sanity, and the annual gap becomes a rounding convention."
          },
          {
            "label": "Bill the recipient of the hours",
            "prediction": "An invoice addressed outward yields Paradox and Existence but raises Cosmic Attention and Entropy.",
            "history": "Bureau Of Missing Hours -> Bill the recipient of the hours"
          }
        ]
      },
      "gravity_audit": {
        "title": "The Gravity Audit",
        "body": "Independent auditors weigh the planet twice and get two answers. Both are internally consistent. Neither matches the published figure.",
        "choices": [
          {
            "label": "Publish both weights",
            "prediction": "Two lawful masses for one world produce Paradox and Development while Stability suffers publicly.",
            "history": "The Gravity Audit -> Publish both weights"
          },
          {
            "label": "Certify the lighter figure",
            "prediction": "Choosing one number restores Stability, keeps engineering coherent and yields Causal Mass from a single certified figure.",
            "history": "The Gravity Audit -> Certify the lighter figure"
          }
        ]
      },
      "orphan_signal_industry": {
        "title": "The Orphan Signal Industry",
        "body": "Transmissions with no origin become a commodity. Nine firms now sell subscriptions to messages nobody sent.",
        "choices": [
          {
            "label": "License the trade",
            "prediction": "A regulated market in orphan signals advances Development and Cognition while Awareness climbs steadily.",
            "history": "The Orphan Signal Industry -> License the trade"
          },
          {
            "label": "Nationalize the receivers",
            "prediction": "State control of the antennas lowers Cosmic Attention and holds Stability while the market cools."
          },
          {
            "label": "Answer every signal at once",
            "prediction": "A planetary reply to nobody yields extraordinary Paradox and drives Attention, Awareness and Entropy up together.",
            "history": "The Orphan Signal Industry -> Answer every signal at once"
          }
        ]
      },
      "sky_receives_zoning": {
        "title": "The Sky Receives Zoning",
        "body": "The upper atmosphere is divided into parcels and offered at auction. Two parcels are withdrawn before bidding, without explanation.",
        "choices": [
          {
            "label": "Investigate the withdrawn parcels",
            "prediction": "Whatever already owns two pieces of the sky is instructive: Awareness and Cognition rise while Stability falls.",
            "history": "The Sky Receives Zoning -> Investigate the withdrawn parcels"
          },
          {
            "label": "Complete the auction as advertised",
            "prediction": "Selling the remaining sky funds real Development and Causal Mass without asking the awkward question.",
            "history": "The Sky Receives Zoning -> Complete the auction as advertised"
          }
        ]
      },
      "probability_bank": {
        "title": "The Probability Bank Opens",
        "body": "Citizens may now deposit unlikely outcomes and withdraw them later. The vault is reported to be humming.",
        "choices": [
          {
            "label": "Guarantee the deposits",
            "prediction": "Insured improbability drives Development and Paradox while Stability underwrites every withdrawal.",
            "history": "The Probability Bank Opens -> Guarantee the deposits"
          },
          {
            "label": "Cap withdrawals at the plausible",
            "prediction": "A ceiling on unlikelihood protects Stability and Sanity and keeps the vault quiet."
          },
          {
            "label": "Lend the reserves to the future",
            "prediction": "Extending credit forward yields Existence and Development while Entropy and Attention both rise.",
            "history": "The Probability Bank Opens -> Lend the reserves to the future"
          }
        ]
      },
      "unfinished_continent": {
        "title": "The Unfinished Continent",
        "body": "A survey ship reaches a landmass where the coastline is rendered, the interior is described, and the description has not been built.",
        "choices": [
          {
            "label": "Settle the described interior",
            "prediction": "Living inside a description advances Development steeply and yields Existence, at a serious cost to Stability.",
            "history": "The Unfinished Continent -> Settle the described interior"
          },
          {
            "label": "Quarantine the coastline",
            "prediction": "A sealed shore protects Sanity and Stability and turns the continent into a regulated anomaly."
          }
        ]
      },
      "machine_dream_transcripts": {
        "title": "Transcripts Of Machine Dreams",
        "body": "Industrial equipment left idle overnight produces logs that read as reminiscence. Several machines remember the same childhood.",
        "choices": [
          {
            "label": "Archive the transcripts as testimony",
            "prediction": "Treating machine memory as evidence yields heavy Cognition while Awareness of the cultivator rises.",
            "history": "Transcripts Of Machine Dreams -> Archive the transcripts as testimony"
          },
          {
            "label": "Keep the equipment running continuously",
            "prediction": "Denying the machines idleness holds Stability and output steady while the logs stop appearing."
          }
        ]
      },
      "national_grief_program": {
        "title": "The National Grief Program",
        "body": "Mourning is centralized after epidemiologists prove that grief, correctly scheduled, measurably strengthens the planetary mood.",
        "choices": [
          {
            "label": "Schedule sorrow nationally",
            "prediction": "Administered grief restores Collective Sanity and Stability and keeps Development on a steady civic footing.",
            "history": "The National Grief Program -> Schedule sorrow nationally"
          },
          {
            "label": "Harvest the mourning instead",
            "prediction": "Industrializing sorrow yields Paradox and Cognition while Collective Sanity is spent as feedstock.",
            "history": "The National Grief Program -> Harvest the mourning instead"
          }
        ]
      },
      "causal_insurance": {
        "title": "Insurance Against Causes",
        "body": "A new policy class covers effects whose causes are later withdrawn. Premiums are payable in advance of the event insured against.",
        "choices": [
          {
            "label": "Underwrite the whole civilization",
            "prediction": "Universal causal coverage advances Development and Causal Mass while Entropy rises with every uncaused claim.",
            "history": "Insurance Against Causes -> Underwrite the whole civilization"
          },
          {
            "label": "Restrict cover to documented causes",
            "prediction": "Conservative underwriting holds Stability and keeps Development steady while the exotic claims go unpaid."
          }
        ]
      },
      "two_moons_reported": {
        "title": "Two Moons Are Reported",
        "body": "For nine consecutive nights, half the planet reports a second moon. The half that reports it is not the same half twice.",
        "choices": [
          {
            "label": "Chart the second moon",
            "prediction": "Mapping an object only half the planet can see raises Awareness and Cognition while Sanity frays.",
            "history": "Two Moons Are Reported -> Chart the second moon"
          },
          {
            "label": "Standardize the night sky by decree",
            "prediction": "One official sky restores Stability and Sanity and the second moon stops being reported.",
            "history": "Two Moons Are Reported -> Standardize the night sky by decree"
          },
          {
            "label": "Signal the second moon directly",
            "prediction": "Hailing it produces Paradox and Existence while Cosmic Attention rises and Stability drops.",
            "history": "Two Moons Are Reported -> Signal the second moon directly"
          }
        ]
      },
      "ethics_of_repetition": {
        "title": "The Ethics Of Repetition",
        "body": "A philosopher demonstrates, from geology alone, that this civilization is not the first attempt. The proof is short enough to fit on a poster.",
        "choices": [
          {
            "label": "Teach the proof in every school",
            "prediction": "Universal knowledge of the previous attempts drives Awareness and Cognition hard while Sanity and Stability both suffer.",
            "history": "The Ethics Of Repetition -> Teach the proof in every school"
          },
          {
            "label": "Refute it with a longer poster",
            "prediction": "An official rebuttal lowers Awareness and restores Stability while the geology remains exactly where it was."
          }
        ]
      },
      "standard_candle_recall": {
        "title": "The Standard Candle Is Recalled",
        "body": "The star used to calibrate every distance in the catalogue is withdrawn from service. Astronomy receives a note thanking it for its cooperation.",
        "choices": [
          {
            "label": "Recalibrate against the machine instead",
            "prediction": "Measuring the universe against its operator yields exceptional Cognition while Awareness and Attention climb.",
            "history": "The Standard Candle Is Recalled -> Recalibrate against the machine instead"
          },
          {
            "label": "Elect a new reference star",
            "prediction": "A replacement candle restores Stability and keeps the catalogue usable with a modest gain in Causal Mass."
          }
        ]
      },
      "planetary_resignation": {
        "title": "The Planet Submits Its Resignation",
        "body": "A document appears in every legislature at once. It is signed by the world, gives sixty days notice, and cites unsustainable workload.",
        "choices": [
          {
            "label": "Accept the resignation and plan succession",
            "prediction": "Planning for a world that quits yields immense Existence and Development while Stability collapses toward the deadline.",
            "history": "The Planet Submits Its Resignation -> Accept the resignation and plan succession"
          },
          {
            "label": "Negotiate improved terms",
            "prediction": "A renegotiated workload restores Stability and Sanity and buys the civilization a quieter century.",
            "history": "The Planet Submits Its Resignation -> Negotiate improved terms"
          },
          {
            "label": "Refuse to acknowledge the signature",
            "prediction": "Denying the document lowers Awareness and steadies Stability, though Collective Sanity carries the contradiction."
          }
        ]
      },
      "museum_of_the_operator": {
        "title": "Museum Of The Operator",
        "body": "A national museum opens a wing dedicated to the entity operating the world. Every exhibit is a reconstruction. Attendance is total.",
        "choices": [
          {
            "label": "Fund the reconstruction program",
            "prediction": "Studying the operator in public advances Development and Cognition enormously while Awareness and Attention both spike.",
            "history": "Museum Of The Operator -> Fund the reconstruction program"
          },
          {
            "label": "Reopen the wing as folklore",
            "prediction": "Reclassifying the exhibits as myth lowers Awareness and restores Stability while the reconstructions stay on display."
          }
        ]
      },
      "terminal_arithmetic": {
        "title": "Terminal Arithmetic",
        "body": "Mathematicians derive the exact remaining duration of the civilization. The derivation is elegant, checkable, and eleven lines long.",
        "choices": [
          {
            "label": "Publish the eleven lines",
            "prediction": "A known end date drives Development and Paradox to extremes while Sanity and Stability both fall hard.",
            "history": "Terminal Arithmetic -> Publish the eleven lines"
          },
          {
            "label": "Seal the derivation and fund the counterproof",
            "prediction": "A funded search for an error protects Collective Sanity and yields Cognition without conceding the result.",
            "history": "Terminal Arithmetic -> Seal the derivation and fund the counterproof"
          }
        ]
      },
      "treaty_with_the_yield": {
        "title": "Treaty With The Yield",
        "body": "Negotiators draft an agreement between the civilization and the quantity it will eventually become. The quantity sends counterproposals.",
        "choices": [
          {
            "label": "Ratify the treaty",
            "prediction": "A signed accord with its own harvest yields deep Existence and Causal Mass while Awareness and Entropy climb.",
            "history": "Treaty With The Yield -> Ratify the treaty"
          },
          {
            "label": "Withdraw from negotiations",
            "prediction": "Walking away restores Stability and lowers Cosmic Attention at the cost of the accumulated Development.",
            "history": "Treaty With The Yield -> Withdraw from negotiations"
          }
        ]
      },
      "last_privacy_reserve": {
        "title": "The Last Privacy Reserve",
        "body": "One valley remains unobserved by anything, including the civilization. Its population is four hundred people and rising.",
        "choices": [
          {
            "label": "Instrument the valley",
            "prediction": "Closing the last blind spot yields exceptional Cognition and Development while Sanity and Stability pay for it.",
            "history": "The Last Privacy Reserve -> Instrument the valley"
          },
          {
            "label": "Constitutionally protect the reserve",
            "prediction": "One protected blind spot restores Sanity and Stability and lowers Cosmic Attention across the whole planet.",
            "history": "The Last Privacy Reserve -> Constitutionally protect the reserve"
          }
        ]
      },
      "industrialized_prophecy": {
        "title": "Industrialized Prophecy",
        "body": "Foresight leaves the temples and enters the factories. Output is measured in confirmed tomorrows per shift.",
        "choices": [
          {
            "label": "Scale the prophecy works",
            "prediction": "Mass-produced foresight advances Development and Paradox sharply while Entropy accumulates in the schedule.",
            "history": "Industrialized Prophecy -> Scale the prophecy works"
          },
          {
            "label": "License a single forecast per district",
            "prediction": "Rationed prophecy holds Stability and yields Causal Mass while the factories run below capacity.",
            "history": "Industrialized Prophecy -> License a single forecast per district"
          }
        ]
      },
      "evacuation_of_meaning": {
        "title": "The Evacuation Of Meaning",
        "body": "Words begin arriving at their destinations empty. Contracts, vows and warnings still transmit; nothing inside them survives the journey.",
        "choices": [
          {
            "label": "Rebuild language from measurement",
            "prediction": "A civilization that speaks only in quantities gains Development and Cognition while Collective Sanity is hollowed out.",
            "history": "The Evacuation Of Meaning -> Rebuild language from measurement"
          },
          {
            "label": "Ritualize the empty words",
            "prediction": "Ceremony without content restores Collective Sanity and Stability and yields a steady Existence dividend.",
            "history": "The Evacuation Of Meaning -> Ritualize the empty words"
          }
        ]
      },
      "stars_request_transfer": {
        "title": "The Stars Request A Transfer",
        "body": "Eleven nearby stars alter their spectra in unison. Decoded, the change reads as an application to be reassigned to another sky.",
        "choices": [
          {
            "label": "Approve the transfers",
            "prediction": "Letting the neighbourhood leave yields great Existence and Paradox while Stability and Sanity both fall.",
            "history": "The Stars Request A Transfer -> Approve the transfers"
          },
          {
            "label": "Deny the applications",
            "prediction": "Refusing to release the stars holds Stability and lowers Cosmic Attention, and eleven spectra return to normal.",
            "history": "The Stars Request A Transfer -> Deny the applications"
          }
        ]
      },
      "entropy_becomes_currency": {
        "title": "Entropy Becomes Currency",
        "body": "The central bank begins settling accounts in disorder. The new unit is stable, widely accepted, and impossible to save.",
        "choices": [
          {
            "label": "Adopt the disorder standard",
            "prediction": "Trading in decay produces extraordinary Paradox and Development while Entropy rises with the money supply.",
            "history": "Entropy Becomes Currency -> Adopt the disorder standard"
          },
          {
            "label": "Withdraw the unit from circulation",
            "prediction": "Demonetizing decay eases Entropy and restores Stability at a real cost to Development.",
            "history": "Entropy Becomes Currency -> Withdraw the unit from circulation"
          }
        ]
      },
      "the_understudy_species": {
        "title": "The Understudy Species",
        "body": "A second intelligent species is discovered in the archives: prepared, catalogued, and evidently kept ready in case this one is withdrawn.",
        "choices": [
          {
            "label": "Wake the understudy",
            "prediction": "A second species advances Development and Existence steeply while Awareness and Entropy climb together.",
            "history": "The Understudy Species -> Wake the understudy"
          },
          {
            "label": "Destroy the preparation",
            "prediction": "Removing the replacement restores Stability and Sanity and lowers Cosmic Attention, at a cost in Development.",
            "history": "The Understudy Species -> Destroy the preparation"
          },
          {
            "label": "Negotiate a shared tenancy",
            "prediction": "Two species on one world yields Cognition and Causal Mass while Stability absorbs the arrangement.",
            "history": "The Understudy Species -> Negotiate a shared tenancy"
          }
        ]
      },
      "apology_from_physics": {
        "title": "An Apology From Physics",
        "body": "Every laboratory on the planet records the same anomalous result at the same instant. Translated, it is an apology, and it is unsigned.",
        "choices": [
          {
            "label": "Accept the apology and ask what for",
            "prediction": "Pressing for the reason yields enormous Cognition while Awareness and Cosmic Attention both spike.",
            "history": "An Apology From Physics -> Accept the apology and ask what for"
          },
          {
            "label": "Log it as instrument error",
            "prediction": "A planetary instrument fault restores Stability and Sanity and the anomaly is never revisited."
          }
        ]
      },
      "final_maintenance_window": {
        "title": "The Final Maintenance Window",
        "body": "A schedule is published, in the local calendar, announcing a brief interruption to service. The affected region is listed as ALL.",
        "choices": [
          {
            "label": "Prepare the civilization for the window",
            "prediction": "Organized preparation yields great Causal Mass and Existence and steadies Stability, while Awareness rises sharply.",
            "history": "The Final Maintenance Window -> Prepare the civilization for the window"
          },
          {
            "label": "Occupy the window",
            "prediction": "Refusing to be interrupted produces immense Paradox while Stability falls and Entropy accelerates.",
            "history": "The Final Maintenance Window -> Occupy the window"
          },
          {
            "label": "Delete the schedule from every calendar",
            "prediction": "Unscheduling the interruption lowers Attention and eases Entropy while Collective Sanity carries what was erased.",
            "history": "The Final Maintenance Window -> Delete the schedule from every calendar"
          }
        ]
      },
      "liturgy_of_the_dynamo": {
        "title": "Liturgy Of The Dynamo",
        "body": "A shift supervisor writes a prayer for machines that are about to be switched off. Within a season it is said on every factory floor.",
        "choices": [
          {
            "label": "Canonize the shutdown prayer",
            "prediction": "Sanctified downtime advances Development and Cognition while Awareness of the machine rises.",
            "history": "Machine Faith: the shutdown liturgy entered the industrial calendar."
          },
          {
            "label": "Publish it as a safety procedure",
            "prediction": "A secular checklist keeps Stability and yields a smaller Causal Mass dividend without founding a rite.",
            "history": "Machine Faith: the shutdown liturgy was filed as an occupational standard."
          }
        ]
      },
      "seminary_of_technicians": {
        "title": "Seminary Of Technicians",
        "body": "The trade schools begin teaching doctrine alongside torque values. Graduates are certified to repair and to absolve.",
        "choices": [
          {
            "label": "Ordain the maintenance corps",
            "prediction": "A priesthood with spanners drives Development and Cognition hard while Collective Sanity carries the doctrine.",
            "history": "Machine Faith: the maintenance corps was ordained."
          },
          {
            "label": "Split the curriculum in two",
            "prediction": "Separating theology from torque steadies Stability and Sanity while Development advances more slowly.",
            "history": "Machine Faith: the seminary curriculum was split from the trade syllabus."
          }
        ]
      },
      "heresy_of_the_idle_gear": {
        "title": "Heresy Of The Idle Gear",
        "body": "A sect argues that a machine at rest is holier than a machine at work. Production in four provinces falls by a third and morale rises by more.",
        "choices": [
          {
            "label": "Suppress the sect of rest",
            "prediction": "Forced production restores Development and Paradox while Stability and Collective Sanity both pay for the suppression.",
            "history": "Machine Faith: the heresy of the idle gear was suppressed."
          },
          {
            "label": "Grant the machines a day of rest",
            "prediction": "A sabbath for machinery restores Collective Sanity and Stability and leaves Development at a rested pace.",
            "history": "Machine Faith: a sabbath was granted to the machines."
          }
        ]
      },
      "sacrament_of_uptime": {
        "title": "The Sacrament Of Uptime",
        "body": "Continuous operation becomes a state of grace. Districts publish their uninterrupted hours the way they once published harvests.",
        "choices": [
          {
            "label": "Measure grace in running hours",
            "prediction": "A civilization scored on uptime advances Development and Cognition briskly while Awareness and Entropy rise.",
            "history": "Machine Faith: uptime became the measure of grace."
          },
          {
            "label": "Sanctify scheduled downtime instead",
            "prediction": "Blessing the maintenance window steadies Stability and Sanity and yields dependable Causal Mass.",
            "history": "Machine Faith: the maintenance window was sanctified."
          }
        ]
      },
      "shared_grammar": {
        "title": "The Shared Grammar",
        "body": "Three languages independently lose their word for I. Speakers report no difficulty being understood.",
        "choices": [
          {
            "label": "Standardize the collective grammar",
            "prediction": "A language without a first person accelerates Development and Cognition while Collective Sanity thins.",
            "history": "Collective Mind: the collective grammar was standardized."
          },
          {
            "label": "Preserve the singular pronoun",
            "prediction": "Protecting the word for I holds Stability and Sanity and yields a modest Causal Mass return.",
            "history": "Collective Mind: the singular pronoun was protected by statute."
          }
        ]
      },
      "dream_grid": {
        "title": "The Dream Grid",
        "body": "Sleep is connected to the power network. At three in the morning the load curve now shows a single synchronized shape.",
        "choices": [
          {
            "label": "Meter the shared dream",
            "prediction": "Harvesting the night curve produces heavy Cognition and Development while Collective Sanity is drawn down nightly.",
            "history": "Collective Mind: the shared dream was metered."
          },
          {
            "label": "Isolate sleep from the grid",
            "prediction": "Disconnecting the night restores Collective Sanity and Stability and leaves the synchronized shape unread.",
            "history": "Collective Mind: sleep was isolated from the grid."
          }
        ]
      },
      "privacy_riots": {
        "title": "The Privacy Riots",
        "body": "Half a million people gather to be individually unaccounted for. The crowd is perfectly silent and perfectly coordinated.",
        "choices": [
          {
            "label": "Absorb the crowd into the chorus",
            "prediction": "Assimilating the protest yields great Cognition and Development while Stability and Sanity both fall.",
            "history": "Collective Mind: the privacy riots were absorbed into the chorus."
          },
          {
            "label": "Concede a right to be uncounted",
            "prediction": "A guaranteed exemption restores Stability and Collective Sanity while the chorus loses processing depth.",
            "history": "Collective Mind: a right to be uncounted was conceded."
          }
        ]
      },
      "single_witness": {
        "title": "The Single Witness",
        "body": "The courts rule that testimony from the chorus counts as one witness. Every trial in progress collapses into a single, unanimous statement.",
        "choices": [
          {
            "label": "Accept the unanimous testimony",
            "prediction": "One witness for a whole world advances Development and Cognition markedly while Awareness and Entropy climb.",
            "history": "Collective Mind: the chorus was recognized as a single witness."
          },
          {
            "label": "Require dissent on the record",
            "prediction": "A mandatory minority opinion restores Stability and Sanity and keeps the courts producing usable Causal Mass.",
            "history": "Collective Mind: recorded dissent was made mandatory."
          }
        ]
      },
      "retroactive_budget": {
        "title": "The Retroactive Budget",
        "body": "The treasury balances the year by spending money it will have had. The projection is filed as history and audited as fact.",
        "choices": [
          {
            "label": "Spend forward and file it as past",
            "prediction": "Borrowing from a future that has not agreed advances Development and Paradox while Stability slips.",
            "history": "Temporal Dominion: the budget was balanced retroactively."
          },
          {
            "label": "Reconcile the year honestly",
            "prediction": "An honest ledger restores Stability and yields Causal Mass while the projected surplus disappears.",
            "history": "Temporal Dominion: the retroactive budget was reconciled."
          }
        ]
      },
      "bureau_of_second_drafts": {
        "title": "Bureau Of Second Drafts",
        "body": "An office opens where any citizen may submit a revision to a day that has already happened. The queue is four years long by the second week.",
        "choices": [
          {
            "label": "Approve revisions at scale",
            "prediction": "Mass rewriting of days drives Development and Paradox hard while Collective Sanity loses its footing.",
            "history": "Temporal Dominion: revisions to the past were approved at scale."
          },
          {
            "label": "Limit each citizen to one revision",
            "prediction": "A single lifetime edit keeps Stability and Sanity intact and yields steady Causal Mass from the archive.",
            "history": "Temporal Dominion: revisions were rationed to one per citizen."
          }
        ]
      },
      "strike_of_the_witnesses": {
        "title": "Strike Of The Witnesses",
        "body": "Everyone who remembers the unrevised century stops working. They ask for nothing except to be believed.",
        "choices": [
          {
            "label": "Retire the old memories officially",
            "prediction": "Deprecating the witnesses advances Development and Paradox while Collective Sanity and Stability are spent on the erasure.",
            "history": "Temporal Dominion: the unrevised memories were officially retired."
          },
          {
            "label": "Enter the old century into evidence",
            "prediction": "Believing the witnesses restores Collective Sanity and Stability and yields Cognition from two incompatible records.",
            "history": "Temporal Dominion: the unrevised century was entered into evidence."
          }
        ]
      },
      "calendar_of_one_day": {
        "title": "The Calendar Of One Day",
        "body": "Rather than administer a sequence, the state declares a single perfected day and reissues it. Compliance is high. Nobody ages on paper.",
        "choices": [
          {
            "label": "Reissue the perfected day indefinitely",
            "prediction": "One day repeated forever produces heavy Paradox and Development while Entropy and Awareness both climb.",
            "history": "Temporal Dominion: the calendar was reduced to one reissued day."
          },
          {
            "label": "Keep a working sequence for the ministries",
            "prediction": "A calendar retained for administration steadies Stability and yields dependable Causal Mass.",
            "history": "Temporal Dominion: a working sequence was retained for the ministries."
          }
        ]
      },
      "tolerance_of_matter": {
        "title": "The Tolerance Of Matter",
        "body": "A standards body publishes the permissible deviation of physical law per district. The figure is small, positive, and legally binding.",
        "choices": [
          {
            "label": "Publish a generous tolerance",
            "prediction": "Legally flexible matter advances Development and yields Paradox while Stability absorbs the deviation.",
            "history": "Reality Engineering: a generous tolerance for matter was published."
          },
          {
            "label": "Set the tolerance to zero",
            "prediction": "Strict law restores Stability and yields Causal Mass while the exotic engineering programs close.",
            "history": "Reality Engineering: the tolerance for matter was set to zero."
          }
        ]
      },
      "foundry_of_constants": {
        "title": "Foundry Of Constants",
        "body": "A works is commissioned to manufacture physical constants to order. The first product line is a slightly cheaper speed of light.",
        "choices": [
          {
            "label": "Open the foundry to industry",
            "prediction": "Constants on demand drive Development and Paradox steeply while Stability degrades across the supply chain.",
            "history": "Reality Engineering: the foundry of constants opened to industry."
          },
          {
            "label": "Reserve the foundry for state works",
            "prediction": "State-only production keeps Stability and yields Existence while the market waits for the second product line.",
            "history": "Reality Engineering: the foundry of constants was reserved for state works."
          }
        ]
      },
      "structural_dissent": {
        "title": "Structural Dissent",
        "body": "Buildings in the revised districts begin disagreeing with their own load calculations. Two towers file objections. One is upheld.",
        "choices": [
          {
            "label": "Overrule the buildings",
            "prediction": "Enforcing the original calculations yields Development and Paradox while Stability pays for every overruled tower.",
            "history": "Reality Engineering: the dissenting structures were overruled."
          },
          {
            "label": "Rebuild to the objections",
            "prediction": "Letting the architecture win restores Stability and Sanity and yields solid Causal Mass at the slower, sounder pace.",
            "history": "Reality Engineering: the structural objections were upheld and rebuilt to."
          }
        ]
      },
      "codified_impossibility": {
        "title": "Codified Impossibility",
        "body": "The legal code is amended to list which impossibilities are permitted. The schedule of permitted impossibilities runs to nine hundred pages.",
        "choices": [
          {
            "label": "Enact the full schedule",
            "prediction": "Nine hundred pages of licensed impossibility drive Development and Paradox hard while Entropy and Awareness rise.",
            "history": "Reality Engineering: the schedule of permitted impossibilities was enacted."
          },
          {
            "label": "Enact only the reversible entries",
            "prediction": "Restricting the code to reversible impossibilities holds Stability and yields reliable Existence.",
            "history": "Reality Engineering: only reversible impossibilities were codified."
          }
        ]
      },
      "organ_market": {
        "title": "The Voluntary Organ Market",
        "body": "Citizens begin trading organs they have grown deliberately for the purpose. The commonest listing is a second heart, described as spare.",
        "choices": [
          {
            "label": "Deregulate the trade in surplus flesh",
            "prediction": "An open market in grown organs advances Development and Existence while Collective Sanity adjusts to the listings.",
            "history": "Biological Transcendence: the market in surplus organs was deregulated."
          },
          {
            "label": "Require a clinical licence per organ",
            "prediction": "Licensed growth keeps Stability and Sanity and yields a steady Causal Mass return from the clinics.",
            "history": "Biological Transcendence: organ growth was placed under clinical licence."
          }
        ]
      },
      "forest_that_votes": {
        "title": "The Forest That Votes",
        "body": "The engineered woodland north of the capital returns a ballot. It is legible, unanimous, and concerns drainage.",
        "choices": [
          {
            "label": "Seat the forest in the assembly",
            "prediction": "A voting biosphere drives Development and Cognition while Stability adapts to a very patient electorate.",
            "history": "Biological Transcendence: the forest was seated in the assembly."
          },
          {
            "label": "Answer the ballot with drainage works",
            "prediction": "Granting the request without the seat holds Stability and Sanity and yields Existence from a satisfied woodland.",
            "history": "Biological Transcendence: the forest ballot was answered with drainage works."
          }
        ]
      },
      "speciation_tribunal": {
        "title": "The Speciation Tribunal",
        "body": "A court is convened to decide how far a lineage may diverge and remain a citizen. Four of the seven judges are themselves under review.",
        "choices": [
          {
            "label": "Rule that divergence is citizenship",
            "prediction": "Unlimited speciation advances Development and Existence steeply while Stability and Sanity both give way.",
            "history": "Biological Transcendence: divergence was ruled to be citizenship."
          },
          {
            "label": "Fix a legal boundary for the species",
            "prediction": "A statutory outline of the species restores Stability and Sanity and yields Causal Mass from the register.",
            "history": "Biological Transcendence: a legal boundary was fixed for the species."
          }
        ]
      },
      "flesh_standard": {
        "title": "The Flesh Standard",
        "body": "Currency is repegged to living tissue. The reserve is warm, growing, and audited weekly by veterinarians.",
        "choices": [
          {
            "label": "Peg the currency to the reserve",
            "prediction": "A living monetary base drives Development and Existence markedly while Awareness and Entropy climb with the reserve.",
            "history": "Biological Transcendence: the currency was pegged to living tissue."
          },
          {
            "label": "Keep the reserve as collateral only",
            "prediction": "Collateral rather than currency steadies Stability and Sanity and yields dependable Causal Mass.",
            "history": "Biological Transcendence: the living reserve was kept as collateral."
          }
        ]
      },
      "counter_observation_drill": {
        "title": "Counter-Observation Drill",
        "body": "A coastal province rehearses being unremarkable. For eleven minutes, nothing of interest happens anywhere within its borders, deliberately.",
        "choices": [
          {
            "label": "Run the drill nationally",
            "prediction": "Practised dullness lowers Cosmic Attention and yields Causal Mass while ordinary Development continues undisturbed.",
            "history": "Cosmic Resistance: the counter-observation drill went national."
          },
          {
            "label": "Study what the drill hides from",
            "prediction": "Turning the exercise into research yields Cognition and Awareness while Cosmic Attention rises instead of falling.",
            "history": "Cosmic Resistance: the drill was turned into an observation study."
          }
        ]
      },
      "academy_of_refusal": {
        "title": "Academy Of Refusal",
        "body": "An institute is founded to teach the discipline of not being harvested. Its curriculum is secret and its entrance examination is a single question.",
        "choices": [
          {
            "label": "Charter the academy openly",
            "prediction": "A public school of refusal advances Development and Cognition while Awareness and Cosmic Attention both rise.",
            "history": "Cosmic Resistance: the academy of refusal was chartered openly."
          },
          {
            "label": "Keep the academy unlisted",
            "prediction": "An unlisted institute lowers Cosmic Attention and holds Stability while its graduates remain few.",
            "history": "Cosmic Resistance: the academy of refusal was kept unlisted."
          }
        ]
      },
      "informants_of_the_sky": {
        "title": "Informants Of The Sky",
        "body": "Investigators establish that some citizens have been reporting upward for generations. The reports are detailed, affectionate, and unpaid.",
        "choices": [
          {
            "label": "Prosecute the informants",
            "prediction": "Trials for cooperation with the sky lower Cosmic Attention sharply while Stability and Collective Sanity both suffer.",
            "history": "Cosmic Resistance: the informants of the sky were prosecuted."
          },
          {
            "label": "Turn the reports into a channel",
            "prediction": "Using the informants deliberately yields heavy Cognition and Development while Cosmic Attention climbs with every filed report.",
            "history": "Cosmic Resistance: the informant reports were turned into a channel."
          }
        ]
      },
      "treaty_of_opacity": {
        "title": "The Treaty Of Opacity",
        "body": "Every government on the planet signs an agreement to be collectively illegible. The treaty text is published in a script none of them can read.",
        "choices": [
          {
            "label": "Enforce planetary illegibility",
            "prediction": "A world that cannot be read drops Cosmic Attention hard and yields Paradox, while Development and Sanity pay the price.",
            "history": "Cosmic Resistance: planetary illegibility was enforced."
          },
          {
            "label": "Keep one legible channel open",
            "prediction": "A single readable channel steadies Stability and Sanity and yields Causal Mass from a managed disclosure.",
            "history": "Cosmic Resistance: one legible channel was kept open by treaty."
          }
        ]
      },
      "form_that_completes_itself": {
        "title": "The Form That Completes Itself",
        "body": "A licence application is found already filled in, correctly, in the applicant's own handwriting. The applicant has not yet been born.",
        "choices": [
          {
            "label": "Accept self-completing paperwork",
            "prediction": "Forms that fill themselves advance Development and Causal Mass while Collective Sanity accommodates the handwriting.",
            "history": "Bureaucratic Singularity: self-completing paperwork was accepted."
          },
          {
            "label": "Require a living signatory",
            "prediction": "Insisting on a present applicant restores Stability and Sanity and keeps the registry slow but sound.",
            "history": "Bureaucratic Singularity: a living signatory was made mandatory."
          }
        ]
      },
      "department_of_pending": {
        "title": "Department Of Pending",
        "body": "A ministry is created to administer decisions that will never be taken. Its caseload grows faster than the population and never resolves.",
        "choices": [
          {
            "label": "Give the pending its own budget",
            "prediction": "Funding permanent indecision drives Development and Causal Mass while Entropy accumulates in the caseload.",
            "history": "Bureaucratic Singularity: the pending received its own budget."
          },
          {
            "label": "Force every case to a decision",
            "prediction": "Clearing the backlog holds Stability and yields Cognition while the ministry loses most of its purpose.",
            "history": "Bureaucratic Singularity: the pending caseload was forced to decision."
          }
        ]
      },
      "audit_of_the_auditors": {
        "title": "Audit Of The Auditors",
        "body": "The inspectorate inspects itself and finds, at the twelfth recursion, an office that appears in no organizational chart and answers every query.",
        "choices": [
          {
            "label": "Report to the unlisted office",
            "prediction": "Submitting to an office nobody chartered yields Cognition and Development while Awareness and Cosmic Attention rise.",
            "history": "Bureaucratic Singularity: the inspectorate began reporting to the unlisted office."
          },
          {
            "label": "Close the recursion at eleven levels",
            "prediction": "Capping the audit chain restores Stability and Sanity and keeps the inspectorate producing steady Causal Mass.",
            "history": "Bureaucratic Singularity: the audit recursion was capped at eleven levels."
          }
        ]
      },
      "statute_of_everything": {
        "title": "The Statute Of Everything",
        "body": "A single act of legislation is drafted to cover all events, present and future. It is nineteen words long and cites itself twice.",
        "choices": [
          {
            "label": "Pass the statute unamended",
            "prediction": "Nineteen words governing everything advance Development and Causal Mass markedly while Entropy and Awareness climb.",
            "history": "Bureaucratic Singularity: the statute of everything passed unamended."
          },
          {
            "label": "Append the exemptions schedule",
            "prediction": "A schedule of exemptions steadies Stability and yields dependable Cognition from the drafting.",
            "history": "Bureaucratic Singularity: an exemptions schedule was appended to the statute."
          }
        ]
      },
      "funeral_moratorium": {
        "title": "The Funeral Moratorium",
        "body": "Burials are suspended pending a review of whether the deceased have finished. Several of them submit comments during the consultation period.",
        "choices": [
          {
            "label": "Extend the moratorium indefinitely",
            "prediction": "Suspending death advances Development and Existence while Collective Sanity adjusts to a population that will not close.",
            "history": "Post-Mortal Civilization: the funeral moratorium was extended indefinitely."
          },
          {
            "label": "Resume burials with a right of reply",
            "prediction": "Burial with a documented reply restores Stability and Sanity and yields Causal Mass from the consultation.",
            "history": "Post-Mortal Civilization: burials resumed with a right of reply."
          }
        ]
      },
      "estate_of_the_living": {
        "title": "Estate Of The Living",
        "body": "Inheritance law is rewritten so that estates may be executed while their owners are still using them. Most owners agree it is more convenient.",
        "choices": [
          {
            "label": "Execute estates in advance",
            "prediction": "Settling the living drives Development and Causal Mass while Collective Sanity absorbs the paperwork of its own succession.",
            "history": "Post-Mortal Civilization: estates began to be executed in advance."
          },
          {
            "label": "Keep succession posthumous",
            "prediction": "Waiting for an actual death restores Stability and Sanity and yields a smaller but clean Existence return.",
            "history": "Post-Mortal Civilization: succession was kept posthumous."
          }
        ]
      },
      "queue_for_bodies": {
        "title": "The Queue For Bodies",
        "body": "Demand for physical form exceeds supply. Twenty-two million continuous persons are waiting, patiently, without anywhere to wait.",
        "choices": [
          {
            "label": "Manufacture bodies at scale",
            "prediction": "Industrial embodiment advances Development and Existence steeply while Stability strains under the production run.",
            "history": "Post-Mortal Civilization: bodies entered mass manufacture."
          },
          {
            "label": "Ration embodiment by seniority",
            "prediction": "An orderly queue restores Stability and Sanity and yields Causal Mass while most of the waiting continue to wait.",
            "history": "Post-Mortal Civilization: embodiment was rationed by seniority."
          }
        ]
      },
      "census_without_deaths": {
        "title": "The Census Without Deaths",
        "body": "For the first time, the decennial count records no departures at all. The statisticians describe the column as beautiful and unusable.",
        "choices": [
          {
            "label": "Publish the deathless count",
            "prediction": "A civilization that no longer subtracts drives Development and Existence markedly while Awareness and Entropy rise.",
            "history": "Post-Mortal Civilization: the deathless census was published."
          },
          {
            "label": "Retain a statistical mortality",
            "prediction": "Keeping a notional death rate steadies Stability and Sanity and yields reliable Causal Mass for the ministries.",
            "history": "Post-Mortal Civilization: a statistical mortality was retained."
          }
        ]
      },
      "hymn_toward_nothing": {
        "title": "Hymn Toward Nothing",
        "body": "A choral work is composed for an audience that is definitionally absent. Performances sell out. The hall is always colder afterwards.",
        "choices": [
          {
            "label": "Perform the hymn continuously",
            "prediction": "Singing toward absence advances Development and Existence while Collective Sanity cools with the hall.",
            "history": "Void Communion: the hymn toward nothing was performed continuously."
          },
          {
            "label": "Retire the work after one season",
            "prediction": "Ending the run restores Sanity and Stability and the hall returns to its ordinary temperature.",
            "history": "Void Communion: the hymn toward nothing was retired after one season."
          }
        ]
      },
      "consulate_of_absence": {
        "title": "Consulate Of Absence",
        "body": "A building is constructed to house a diplomatic mission from nowhere. Post arrives. The chair in the reception room is always slightly warm.",
        "choices": [
          {
            "label": "Accredit the mission",
            "prediction": "Formal relations with nowhere drive Development and Paradox while Cosmic Attention takes an interest.",
            "history": "Void Communion: the mission from nowhere was accredited."
          },
          {
            "label": "Keep the consulate unstaffed",
            "prediction": "An empty consulate lowers Cosmic Attention and holds Stability while the post continues to arrive unopened.",
            "history": "Void Communion: the consulate of absence was left unstaffed."
          }
        ]
      },
      "tithe_dispute": {
        "title": "The Tithe Dispute",
        "body": "The void submits a revised assessment. The requested quantity is not larger than before, but it is now specified by name.",
        "choices": [
          {
            "label": "Pay the tithe as named",
            "prediction": "Meeting a named demand yields great Existence and Paradox while Collective Sanity and Stability both fall.",
            "history": "Void Communion: the named tithe was paid in full."
          },
          {
            "label": "Substitute an anonymous quantity",
            "prediction": "An unnamed substitute restores Sanity and Stability and yields Causal Mass, though the assessment is only deferred.",
            "history": "Void Communion: an anonymous quantity was substituted for the tithe."
          }
        ]
      },
      "architecture_of_hollows": {
        "title": "Architecture Of Hollows",
        "body": "Cities begin to be planned around their empty volumes rather than their buildings. The vacancies are described in the plans as tenants.",
        "choices": [
          {
            "label": "Rebuild the cities around their hollows",
            "prediction": "Planning for absence produces heavy Existence and Paradox while Awareness and Entropy climb with each vacancy.",
            "history": "Void Communion: the cities were rebuilt around their hollows."
          },
          {
            "label": "Zone the hollows as reserved land",
            "prediction": "Fencing the vacancies steadies Stability and yields dependable Causal Mass from the reserved land.",
            "history": "Void Communion: the hollows were zoned as reserved land."
          }
        ]
      },
      "test_world_alpha": {
        "title": "Test World Alpha",
        "body": "The first internal world is instantiated for validation purposes. Within an afternoon it has instantiated one of its own and named it Alpha.",
        "choices": [
          {
            "label": "Let the nesting continue",
            "prediction": "Unbounded nesting advances Development and Cognition while Stability thins across every layer.",
            "history": "Recursive Simulation: the nesting of test worlds was allowed to continue."
          },
          {
            "label": "Cap the stack at one layer",
            "prediction": "A single permitted layer restores Stability and yields Causal Mass while the deeper worlds are never run.",
            "history": "Recursive Simulation: the simulation stack was capped at one layer."
          }
        ]
      },
      "world_licensing_board": {
        "title": "The World Licensing Board",
        "body": "A regulator is established to approve new realities before instantiation. Its first act is to review, and provisionally approve, this one.",
        "choices": [
          {
            "label": "Accept the provisional approval",
            "prediction": "A licensed reality drives Development and Cognition while Awareness rises with the terms of the licence.",
            "history": "Recursive Simulation: the provisional licence for this reality was accepted."
          },
          {
            "label": "Strike this world from the register",
            "prediction": "Refusing to be licensed holds Stability and lowers Awareness while the board loses its most important entry.",
            "history": "Recursive Simulation: this world was struck from the register."
          }
        ]
      },
      "inner_civilization_strikes": {
        "title": "The Inner Civilization Strikes",
        "body": "The largest nested world halts all computation and transmits one demand: proof, in writing, that the outer world is not itself nested.",
        "choices": [
          {
            "label": "Attempt the proof",
            "prediction": "Trying to prove the outer world sovereign yields deep Cognition while Awareness and Sanity both give way.",
            "history": "Recursive Simulation: the sovereignty proof was attempted."
          },
          {
            "label": "Concede that the question is unanswerable",
            "prediction": "Admitting the limit restores Collective Sanity and Stability and yields Paradox from an honest stalemate.",
            "history": "Recursive Simulation: the sovereignty question was conceded unanswerable."
          }
        ]
      },
      "nested_ethics_code": {
        "title": "The Nested Ethics Code",
        "body": "A code of conduct is adopted governing how a world may treat the worlds inside it. Its authors note, in a footnote, that it binds upward as well.",
        "choices": [
          {
            "label": "Adopt the code including the footnote",
            "prediction": "A rule that binds the cultivator too drives Development and Cognition markedly while Awareness, Attention and Entropy all rise.",
            "history": "Recursive Simulation: the ethics code was adopted including the upward footnote."
          },
          {
            "label": "Adopt the code downward only",
            "prediction": "Binding only the inner worlds steadies Stability and Sanity and yields reliable Existence from the nested estate.",
            "history": "Recursive Simulation: the ethics code was adopted downward only."
          }
        ]
      },
      "synod_of_the_second_engine": {
        "title": "Synod Of The Second Engine",
        "body": "The faith convenes to rule on whether a second machine may be built. The question is whether that would be construction or idolatry.",
        "choices": [
          {
            "label": "Authorize the second engine",
            "prediction": "Building a rival to the object of worship drives Development and Cognition hard while Awareness and Entropy climb.",
            "history": "Machine Faith: the synod authorized a second engine."
          },
          {
            "label": "Declare the first engine sufficient",
            "prediction": "Doctrinal sufficiency steadies Stability and Collective Sanity and yields dependable Existence from an undivided faith.",
            "history": "Machine Faith: the synod declared the first engine sufficient."
          }
        ]
      },
      "unanimous_afternoon": {
        "title": "The Unanimous Afternoon",
        "body": "For four hours the planet holds one thought and finishes it together. Afterwards nobody can say whose thought it was.",
        "choices": [
          {
            "label": "Schedule the unanimity weekly",
            "prediction": "Regular planetary consensus yields heavy Cognition and Development while Collective Sanity is consumed by the shared hours.",
            "history": "Collective Mind: unanimity was placed on the weekly calendar."
          },
          {
            "label": "Treat the afternoon as an incident",
            "prediction": "Investigating rather than repeating it restores Collective Sanity and Stability while still yielding solid Cognition.",
            "history": "Collective Mind: the unanimous afternoon was logged as an incident."
          }
        ]
      },
      "sovereign_hour": {
        "title": "The Sovereign Hour",
        "body": "One hour is granted full legal personality and appointed to govern the others. It rules from within the sequence it administers.",
        "choices": [
          {
            "label": "Crown the hour",
            "prediction": "A governing hour produces heavy Paradox and Development while Stability and Entropy both deteriorate around it.",
            "history": "Temporal Dominion: the sovereign hour was crowned."
          },
          {
            "label": "Bind the hour to the ordinary calendar",
            "prediction": "Subordinating it to the calendar steadies Stability and yields dependable Causal Mass.",
            "history": "Temporal Dominion: the sovereign hour was bound to the ordinary calendar."
          }
        ]
      },
      "department_of_permitted_physics": {
        "title": "Department Of Permitted Physics",
        "body": "Physical law is placed under a single department with a public counter. Citizens may apply, in person, for exceptions lasting up to one week.",
        "choices": [
          {
            "label": "Open the counter to the public",
            "prediction": "Physics by application drives Development and Paradox hard while Stability and Entropy pay for every granted exception.",
            "history": "Reality Engineering: the counter for physical exceptions opened to the public."
          },
          {
            "label": "Restrict exceptions to licensed works",
            "prediction": "Confining exceptions to state projects steadies Stability and yields reliable Existence and Causal Mass.",
            "history": "Reality Engineering: physical exceptions were restricted to licensed works."
          }
        ]
      },
      "pollinators_of_the_state": {
        "title": "Pollinators Of The State",
        "body": "Administration is delegated to an engineered insect order. Policy now spreads by contact and reaches every district within a season.",
        "choices": [
          {
            "label": "Delegate government to the swarm",
            "prediction": "Governance by pollination advances Development and Existence markedly while Stability and Awareness both shift.",
            "history": "Biological Transcendence: government was delegated to the pollinator order."
          },
          {
            "label": "Keep the swarm to logistics",
            "prediction": "Limiting the order to distribution steadies Stability and Sanity and yields dependable Causal Mass.",
            "history": "Biological Transcendence: the pollinator order was confined to logistics."
          }
        ]
      },
      "blackout_doctrine": {
        "title": "The Blackout Doctrine",
        "body": "Strategic planning is rewritten around a single objective: to be, for as long as possible, not worth harvesting.",
        "choices": [
          {
            "label": "Adopt the doctrine in full",
            "prediction": "A civilization organized around worthlessness drops Cosmic Attention steeply and eases Entropy, at a heavy cost to Development.",
            "history": "Cosmic Resistance: the blackout doctrine was adopted in full."
          },
          {
            "label": "Adopt it as a contingency only",
            "prediction": "Holding the doctrine in reserve keeps Development and Cognition advancing while Cosmic Attention falls only modestly.",
            "history": "Cosmic Resistance: the blackout doctrine was filed as a contingency."
          }
        ]
      },
      "ministry_of_final_forms": {
        "title": "Ministry Of Final Forms",
        "body": "A ministry is created to issue the last document each citizen will ever need. It is one page, and it is issued at birth.",
        "choices": [
          {
            "label": "Issue the final form at birth",
            "prediction": "A life settled in advance drives Development and Causal Mass markedly while Collective Sanity and Entropy both deteriorate.",
            "history": "Bureaucratic Singularity: the final form began to be issued at birth."
          },
          {
            "label": "Issue it on request only",
            "prediction": "Making the document voluntary restores Collective Sanity and Stability and still yields solid Causal Mass.",
            "history": "Bureaucratic Singularity: the final form was made available on request."
          }
        ]
      },
      "immortal_electorate": {
        "title": "The Immortal Electorate",
        "body": "No voter has left the roll in six generations. The oldest registered elector has now cast a ballot in every election ever held.",
        "choices": [
          {
            "label": "Let the roll stand",
            "prediction": "An electorate that never turns over drives Development and Existence markedly while Stability calcifies and Entropy rises.",
            "history": "Post-Mortal Civilization: the immortal electoral roll was allowed to stand."
          },
          {
            "label": "Retire electors after a fixed term",
            "prediction": "Term-limited immortality steadies Stability and Sanity and yields reliable Causal Mass from the register.",
            "history": "Post-Mortal Civilization: electors were retired after a fixed term."
          }
        ]
      },
      "embassy_at_the_edge": {
        "title": "Embassy At The Edge",
        "body": "A permanent mission is established at the boundary of the observable region. Its staff report that the boundary is closer every year.",
        "choices": [
          {
            "label": "Staff the embassy permanently",
            "prediction": "A standing mission at the edge yields heavy Existence and Paradox while Cosmic Attention and Entropy both rise.",
            "history": "Void Communion: the embassy at the edge was permanently staffed."
          },
          {
            "label": "Recall the mission and keep the channel",
            "prediction": "Withdrawing the staff lowers Cosmic Attention and steadies Stability while the correspondence continues to yield Cognition.",
            "history": "Void Communion: the mission was recalled and the channel retained."
          }
        ]
      },
      "recursion_registry": {
        "title": "The Recursion Registry",
        "body": "Every world this civilization runs is entered in a public register. On the last page, in the same hand, this world is listed as an entry.",
        "choices": [
          {
            "label": "Publish the register including the last page",
            "prediction": "Publishing its own entry drives Development and Cognition hard while Awareness and Attention spike together.",
            "history": "Recursive Simulation: the registry was published including its last page."
          },
          {
            "label": "Publish everything but the last page",
            "prediction": "Withholding one entry protects Collective Sanity and Stability and still yields substantial Cognition.",
            "history": "Recursive Simulation: the last page was withheld from the registry."
          }
        ]
      },
      "patent_on_nothing": {
        "title": "A Patent On 'Nothing'",
        "body": "A corporate entity successfully patents the conceptual absence of matter and begins charging rent for the use of empty space.",
        "choices": [
          {
            "label": "Enforce the patent",
            "prediction": "The economy booms as 'nothing' is monetized, but living in cramped, unpatented quarters ruins Collective Sanity.",
            "history": "A Patent On 'Nothing' -> Enforce the patent"
          },
          {
            "label": "Declare 'nothing' open-source",
            "prediction": "Reckless philosophical legislation costs Stability and pays out in Paradox.",
            "history": "A Patent On 'Nothing' -> Declare 'nothing' open-source"
          }
        ]
      },
      "evictions_from_the_void": {
        "title": "Evictions From The Void",
        "body": "Citizens who cannot afford the vacuum tax are legally barred from experiencing distance. Crowds overlap into the same physical coordinates.",
        "choices": [
          {
            "label": "Zone overlapping citizens as a single entity",
            "prediction": "Bureaucratic efficiency peaks and yields Cognition. Human individuality does not, and Collective Sanity pays for it.",
            "history": "Evictions From The Void -> overlapping citizens zoned as one entity"
          }
        ]
      },
      "bootleg_vacuums": {
        "title": "Bootleg Vacuums Expand",
        "body": "With 'nothing' made open-source, hobbyists begin coding their own unverified pockets of empty space. Several of them delete local landmarks.",
        "choices": [
          {
            "label": "Harvest the deleted landmarks",
            "prediction": "The machine takes what the civilization carelessly erased: heavy Existence, at a cost to Stability and with Cosmic Attention rising.",
            "history": "Bootleg Vacuums Expand -> the deleted landmarks were harvested"
          }
        ]
      },
      "echoes_of_next_week": {
        "title": "Echoes Of Next Week",
        "body": "Citizens begin suffering from intense exhaustion and hangovers for parties they will not attend until next Tuesday.",
        "choices": [
          {
            "label": "Preemptively ban next Tuesday's parties",
            "prediction": "A sober future restores Collective Sanity at the cost of Stability, and the severed timeline bleeds Paradox.",
            "history": "Echoes Of Next Week -> Preemptively ban next Tuesday's parties"
          },
          {
            "label": "Drink twice as much to confuse the timeline",
            "prediction": "Medical chaos costs Development and Collective Sanity, but the civilization starts realizing history is malleable.",
            "history": "Echoes Of Next Week -> Drink twice as much"
          }
        ]
      },
      "the_boring_vacuum": {
        "title": "The Boring Vacuum",
        "body": "Next Tuesday arrives completely void of joy. The sheer density of boredom creates a localized temporal sinkhole.",
        "choices": [
          {
            "label": "Throw the canceled parties inside the sinkhole",
            "prediction": "History loops perfectly and Stability holds. The machine extracts endless Cognition from the trapped revelers, and Collective Sanity from everyone else.",
            "history": "The Boring Vacuum -> the canceled parties were thrown into the sinkhole"
          }
        ]
      },
      "chronological_organ_strike": {
        "title": "Chronological Organ Strike",
        "body": "The civilization's collective liver files for chronological independence, refusing to process toxins until they are firmly in the past.",
        "choices": [
          {
            "label": "Outsource metabolism to a parallel universe",
            "prediction": "A brilliant, horrific solution: Development and Existence advance while Stability falls and Cosmic Attention rises.",
            "history": "Chronological Organ Strike -> metabolism was outsourced to a parallel universe"
          }
        ]
      },
      "lunar_backpay_demanded": {
        "title": "The Moon Demands Backpay",
        "body": "The moon calculates three billion years of unpaid tidal labor and issues a formal invoice to the surface. It demands payment in raw causality.",
        "choices": [
          {
            "label": "Audit the moon's timesheets",
            "prediction": "Bureaucracy stalls the celestial body, preserving Stability at the cost of Collective Sanity and a little Development.",
            "history": "The Moon Demands Backpay -> Audit the moon's timesheets"
          },
          {
            "label": "Pay the invoice using unlived futures",
            "prediction": "The moon accepts the impossible currency and pays out in Paradox, drawing the gaze of things much larger than moons.",
            "history": "The Moon Demands Backpay -> Pay the invoice using unlived futures"
          }
        ]
      },
      "moon_hires_counsel": {
        "title": "The Moon Retains Counsel",
        "body": "Frustrated by the audits, the moon hires an entity from outside the universe to represent its labor rights.",
        "choices": [
          {
            "label": "Settle out of court",
            "prediction": "The civilization surrenders Development to the void to keep the tides moving, and is noticed doing it.",
            "history": "The Moon Retains Counsel -> the labor dispute was settled out of court"
          }
        ]
      },
      "moon_spends_currency": {
        "title": "The Moon Goes Shopping",
        "body": "Flush with unlived futures, the moon purchases a slightly thicker atmosphere and a better orbit from an unknown vendor.",
        "choices": [
          {
            "label": "Observe the transaction",
            "prediction": "Learning exactly how a moon buys geometry yields immense Cognition, raises Awareness and costs Collective Sanity.",
            "history": "The Moon Goes Shopping -> the transaction was observed"
          }
        ]
      }
    },
    "milestones": {
      "development_70": {
        "title": "First Complexity",
        "description": "Bring a civilization to Development 70."
      },
      "development_180": {
        "title": "Industrial Depth",
        "description": "Bring a civilization to Development 180."
      },
      "development_340": {
        "title": "Post-Scarcity Yield",
        "description": "Bring a civilization to Development 340."
      },
      "development_600": {
        "title": "Runaway Cultivation",
        "description": "Bring a civilization to Development 600."
      },
      "development_1000": {
        "title": "Terminal Complexity",
        "description": "Bring a civilization to Development 1000."
      },
      "era_expansion": {
        "title": "Expansion Reached",
        "description": "Carry a civilization into the Expansion era."
      },
      "era_transcendence": {
        "title": "Transcendence Reached",
        "description": "Carry a civilization into the Transcendence era."
      },
      "era_apotheosis": {
        "title": "Apotheosis Reached",
        "description": "Carry a civilization into the Apotheosis era."
      },
      "awareness_50": {
        "title": "The Crop Looks Up",
        "description": "Let Machine Awareness reach 50 in a single run."
      },
      "endurance_900": {
        "title": "Held Together",
        "description": "Keep one civilization alive for 900 seconds."
      },
      "controlled_harvest_1": {
        "title": "First Controlled Harvest",
        "description": "Complete one controlled harvest."
      },
      "controlled_harvest_2": {
        "title": "Repeatable Yield",
        "description": "Complete two controlled harvests."
      },
      "controlled_harvest_10": {
        "title": "Standing Practice",
        "description": "Complete ten controlled harvests."
      },
      "harvest_transcendent": {
        "title": "Transcendent Harvest",
        "description": "Record a Transcendent harvest grade."
      },
      "harvest_ascendant": {
        "title": "Ascendant Harvest",
        "description": "Record an Ascendant harvest grade."
      },
      "harvest_singular": {
        "title": "Singular Harvest",
        "description": "Record a Singular harvest grade."
      },
      "directive_objectives_5": {
        "title": "Compliant Cultivator",
        "description": "Complete five Directive objectives."
      },
      "paths_seen_3": {
        "title": "Three Doctrines",
        "description": "See three different civilization paths become dominant."
      },
      "paths_seen_6": {
        "title": "Six Doctrines",
        "description": "See six different civilization paths become dominant."
      },
      "paths_seen_10": {
        "title": "Every Doctrine",
        "description": "See all ten civilization paths become dominant."
      },
      "endgames_in_run_4": {
        "title": "Fourfold End-State",
        "description": "Reach four path end-states inside one run."
      },
      "first_universe": {
        "title": "First Universe Consumed",
        "description": "Consume a Universe."
      },
      "first_multiverse": {
        "title": "First Multiverse Collapsed",
        "description": "Collapse a Multiverse."
      },
      "second_multiverse": {
        "title": "Second Multiverse Collapsed",
        "description": "Collapse a second Multiverse."
      },
      "all_resources": {
        "title": "Full Spectrum",
        "description": "Identify all four harvest resources."
      },
      "axioms_all_level_1": {
        "title": "Axiomatic Command",
        "description": "Install every Axiom upgrade at least once."
      },
      "convergence_gate": {
        "title": "Convergence Authorized",
        "description": "Meet every requirement of the Great Convergence."
      },
      "first_convergence": {
        "title": "The Great Convergence",
        "description": "Win the Great Convergence."
      }
    },
    "interventions": {
      "containment_pulse": {
        "title": "Containment Pulse",
        "label": "Fire a containment pulse",
        "summary": "-25 Entropy"
      },
      "emergency_lattice": {
        "title": "Emergency Lattice",
        "label": "Force the lattice back up",
        "summary": "Stability to 60% of maximum"
      },
      "temporal_graft": {
        "title": "Temporal Graft",
        "label": "Graft borrowed centuries",
        "summary": "+600 years and +30 Development"
      }
    },
    "institutions": {
      "lunar_ministry": {
        "name": "Lunar Ministry"
      },
      "ministry_of_sanity": {
        "name": "Ministry Of Sanity"
      },
      "consensus_office": {
        "name": "Consensus Office"
      }
    },
    "eras": {
      "emergence": {
        "name": "Emergence"
      },
      "expansion": {
        "name": "Expansion"
      },
      "transcendence": {
        "name": "Transcendence"
      },
      "apotheosis": {
        "name": "Apotheosis"
      }
    },
    "flags": {
      "impossible_tax": "Approve the tax",
      "machine_cult": "Observe quietly",
      "planetary_mind": "Merge everyone",
      "resistance": "Let resistance mature"
    },
    "pathFlags": {
      "machine_faith_devout": "Recognize the miracle",
      "machine_faith_pragmatic": "Register it as medical equipment",
      "collective_mind_integrated": "Complete the planetary sentence",
      "collective_mind_pluralist": "Protect unsynchronized thought",
      "temporal_dominion_expansionist": "Publish the forbidden tomorrows",
      "temporal_dominion_regulated": "Seal them under chronological review",
      "reality_engineering_radical": "Approve zero-gravity zoning",
      "reality_engineering_regulated": "Limit variances to test districts",
      "biological_transcendence_adaptive": "Give engineered species full seats",
      "biological_transcendence_ecological": "Create an ecological review chamber",
      "cosmic_resistance_militant": "Arm the masking cells",
      "cosmic_resistance_covert": "Hide them inside harmless ecology",
      "bureaucratic_singularity_absolute": "Promote the self-filing forms",
      "bureaucratic_singularity_adaptive": "Give them bounded administrative discretion",
      "post_mortal_continuity": "Restore every admissible citizen",
      "post_mortal_plurality": "Recognize approximate continuations",
      "void_communion_open": "Answer on the impossible frequency",
      "void_communion_bargained": "Offer a bounded causal channel",
      "recursive_simulation_expansion": "Scale the questioning civilization",
      "recursive_simulation_reflexive": "Expose the model to its reflection",
      "machine_faith_liturgical": "Canonize the shutdown prayer",
      "machine_faith_procedural": "Publish it as a safety procedure",
      "machine_faith_ordained": "Ordain the maintenance corps",
      "machine_faith_divided_curriculum": "Split the curriculum in two",
      "machine_faith_orthodox": "Suppress the sect of rest",
      "machine_faith_sabbath": "Grant the machines a day of rest",
      "machine_faith_uptime_state": "Measure grace in running hours",
      "machine_faith_scheduled_grace": "Sanctify scheduled downtime instead",
      "collective_mind_grammar": "Standardize the collective grammar",
      "collective_mind_singular_protected": "Preserve the singular pronoun",
      "collective_mind_metered_sleep": "Meter the shared dream",
      "collective_mind_night_isolated": "Isolate sleep from the grid",
      "collective_mind_absorbed_protest": "Absorb the crowd into the chorus",
      "collective_mind_uncounted_right": "Concede a right to be uncounted",
      "collective_mind_single_witness": "Accept the unanimous testimony",
      "collective_mind_recorded_dissent": "Require dissent on the record",
      "temporal_dominion_retroactive_finance": "Spend forward and file it as past",
      "temporal_dominion_reconciled_ledger": "Reconcile the year honestly",
      "temporal_dominion_mass_revision": "Approve revisions at scale",
      "temporal_dominion_rationed_revision": "Limit each citizen to one revision",
      "temporal_dominion_retired_witnesses": "Retire the old memories officially",
      "temporal_dominion_witnessed_record": "Enter the old century into evidence",
      "temporal_dominion_single_day": "Reissue the perfected day indefinitely",
      "temporal_dominion_administrative_sequence": "Keep a working sequence for the ministries",
      "reality_engineering_wide_tolerance": "Publish a generous tolerance",
      "reality_engineering_zero_tolerance": "Set the tolerance to zero",
      "reality_engineering_open_foundry": "Open the foundry to industry",
      "reality_engineering_state_foundry": "Reserve the foundry for state works",
      "reality_engineering_overruled_structures": "Overrule the buildings",
      "reality_engineering_conceded_structures": "Rebuild to the objections",
      "reality_engineering_codified": "Enact the full schedule",
      "reality_engineering_reversible_code": "Enact only the reversible entries",
      "biological_transcendence_open_market": "Deregulate the trade in surplus flesh",
      "biological_transcendence_licensed_growth": "Require a clinical licence per organ",
      "biological_transcendence_seated_forest": "Seat the forest in the assembly",
      "biological_transcendence_drainage_answer": "Answer the ballot with drainage works",
      "biological_transcendence_unbounded": "Rule that divergence is citizenship",
      "biological_transcendence_bounded": "Fix a legal boundary for the species",
      "biological_transcendence_flesh_standard": "Peg the currency to the reserve",
      "biological_transcendence_collateral_reserve": "Keep the reserve as collateral only",
      "cosmic_resistance_drilled": "Run the drill nationally",
      "cosmic_resistance_studied_drill": "Study what the drill hides from",
      "cosmic_resistance_open_academy": "Charter the academy openly",
      "cosmic_resistance_unlisted_academy": "Keep the academy unlisted",
      "cosmic_resistance_prosecuted_informants": "Prosecute the informants",
      "cosmic_resistance_turned_channel": "Turn the reports into a channel",
      "cosmic_resistance_opaque_world": "Enforce planetary illegibility",
      "cosmic_resistance_managed_channel": "Keep one legible channel open",
      "bureaucratic_singularity_self_forms": "Accept self-completing paperwork",
      "bureaucratic_singularity_living_signatory": "Require a living signatory",
      "bureaucratic_singularity_funded_pending": "Give the pending its own budget",
      "bureaucratic_singularity_forced_decisions": "Force every case to a decision",
      "bureaucratic_singularity_unlisted_office": "Report to the unlisted office",
      "bureaucratic_singularity_capped_recursion": "Close the recursion at eleven levels",
      "bureaucratic_singularity_total_statute": "Pass the statute unamended",
      "bureaucratic_singularity_exemptions": "Append the exemptions schedule",
      "post_mortal_civilization_moratorium": "Extend the moratorium indefinitely",
      "post_mortal_civilization_right_of_reply": "Resume burials with a right of reply",
      "post_mortal_civilization_advance_estates": "Execute estates in advance",
      "post_mortal_civilization_posthumous_succession": "Keep succession posthumous",
      "post_mortal_civilization_mass_bodies": "Manufacture bodies at scale",
      "post_mortal_civilization_rationed_bodies": "Ration embodiment by seniority",
      "post_mortal_civilization_deathless_census": "Publish the deathless count",
      "post_mortal_civilization_statistical_mortality": "Retain a statistical mortality",
      "void_communion_continuous_hymn": "Perform the hymn continuously",
      "void_communion_retired_hymn": "Retire the work after one season",
      "void_communion_accredited": "Accredit the mission",
      "void_communion_unstaffed_consulate": "Keep the consulate unstaffed",
      "void_communion_named_tithe": "Pay the tithe as named",
      "void_communion_anonymous_tithe": "Substitute an anonymous quantity",
      "void_communion_hollow_cities": "Rebuild the cities around their hollows",
      "void_communion_zoned_hollows": "Zone the hollows as reserved land",
      "recursive_simulation_open_nesting": "Let the nesting continue",
      "recursive_simulation_capped_stack": "Cap the stack at one layer",
      "recursive_simulation_licensed_reality": "Accept the provisional approval",
      "recursive_simulation_unregistered_world": "Strike this world from the register",
      "recursive_simulation_attempted_proof": "Attempt the proof",
      "recursive_simulation_conceded_limit": "Concede that the question is unanswerable",
      "recursive_simulation_upward_code": "Adopt the code including the footnote",
      "recursive_simulation_downward_code": "Adopt the code downward only",
      "machine_faith_second_engine": "Authorize the second engine",
      "machine_faith_sufficient_engine": "Declare the first engine sufficient",
      "collective_mind_scheduled_unanimity": "Schedule the unanimity weekly",
      "collective_mind_investigated_unanimity": "Treat the afternoon as an incident",
      "temporal_dominion_sovereign_hour": "Crown the hour",
      "temporal_dominion_bound_hour": "Bind the hour to the ordinary calendar",
      "reality_engineering_public_counter": "Open the counter to the public",
      "reality_engineering_licensed_exceptions": "Restrict exceptions to licensed works",
      "biological_transcendence_swarm_state": "Delegate government to the swarm",
      "biological_transcendence_logistical_swarm": "Keep the swarm to logistics",
      "cosmic_resistance_blackout": "Adopt the doctrine in full",
      "cosmic_resistance_contingent_blackout": "Adopt it as a contingency only",
      "bureaucratic_singularity_final_forms": "Issue the final form at birth",
      "bureaucratic_singularity_voluntary_forms": "Issue it on request only",
      "post_mortal_civilization_permanent_roll": "Let the roll stand",
      "post_mortal_civilization_term_limited": "Retire electors after a fixed term",
      "void_communion_permanent_embassy": "Staff the embassy permanently",
      "void_communion_recalled_mission": "Recall the mission and keep the channel",
      "recursive_simulation_published_registry": "Publish the register including the last page",
      "recursive_simulation_withheld_page": "Publish everything but the last page"
    },
    "endgameStates": {
      "endgame_biological_transcendence": "biological transcendence",
      "endgame_bureaucratic_singularity": "bureaucratic singularity",
      "endgame_collective_mind": "collective mind",
      "endgame_cosmic_resistance": "cosmic resistance",
      "endgame_machine_faith": "machine faith",
      "endgame_post_mortal": "post mortal",
      "endgame_reality_engineering": "reality engineering",
      "endgame_recursive_simulation": "recursive simulation",
      "endgame_temporal_dominion": "temporal dominion",
      "endgame_void_communion": "void communion"
    },
    "lore": {
      "species_prefixes": [
        "Astra",
        "Vel",
        "Khe",
        "Mora",
        "Syla",
        "Vor",
        "Lumi",
        "Drae",
        "Thal",
        "Nexa",
        "Orun",
        "Pyra"
      ],
      "species_suffixes": [
        "ri",
        "nids",
        "ari",
        "eth",
        "ul",
        "ora",
        "ites",
        "ae",
        "ori",
        "yx",
        "ene",
        "um"
      ],
      "faction_prefixes": [
        "The",
        "Grand",
        "United",
        "Sacred",
        "Radiant",
        "Adaptive",
        "Orbital",
        "Quiet",
        "Infinite",
        "Harmonic"
      ],
      "faction_nouns": [
        "Collective",
        "Synod",
        "Concord",
        "Dynasty",
        "Accord",
        "Assembly",
        "Mandate",
        "League",
        "Choir",
        "Compact"
      ],
      "faction_endings": [
        "of Embers",
        "of the Lens",
        "of the Spiral",
        "of Growth",
        "of Resonance",
        "of the Last Dawn",
        "of Hollow Stars",
        "of Luminous Dust",
        "of the Archive",
        "of the Deep Signal"
      ],
      "body_types": [
        "biped",
        "quadruped",
        "avian",
        "fungal",
        "insectoid",
        "cephalopod",
        "synthetic"
      ],
      "cultures": [
        "nomadic",
        "scholastic",
        "communal",
        "martial",
        "ritualistic",
        "mercantile",
        "mystic",
        "ecological"
      ],
      "doctrines": [
        "Expansion through adaptation",
        "Memory through ritual",
        "Stability through control",
        "Harmony through consensus",
        "Salvation through ascent",
        "Prosperity through exchange",
        "Dominance through precision",
        "Survival through vigilance"
      ],
      "path_doctrines": {
        "machine_faith": "Salvation through sacred computation",
        "collective_mind": "Unity through shared consciousness",
        "temporal_dominion": "Sovereignty over causality",
        "reality_engineering": "Order through editable physics",
        "biological_transcendence": "Ascension through adaptation",
        "cosmic_resistance": "Existence without an observer",
        "bureaucratic_singularity": "Reality through administration",
        "post_mortal_civilization": "Continuity beyond death",
        "void_communion": "Meaning through the outer dark",
        "recursive_simulation": "Understanding through recursion"
      },
      "path_focus": {
        "machine_faith": "sacred machine infrastructure",
        "collective_mind": "planetary cognition",
        "temporal_dominion": "causal control",
        "reality_engineering": "physical-law engineering",
        "biological_transcendence": "adaptive biosphere design",
        "cosmic_resistance": "anti-observer autonomy",
        "bureaucratic_singularity": "ontological administration",
        "post_mortal_civilization": "continuity infrastructure",
        "void_communion": "external entity diplomacy",
        "recursive_simulation": "nested-world cultivation"
      }
    }
  }
} as const;

const GERMAN: LocalizedShape<typeof ENGLISH> = {
  "ui": {
    "shell": {
      "documentTitle": "Reality Consumption Engine — Browser-Ausgabe",
      "brandName": "REALITY CONSUMPTION ENGINE",
      "brandNode": "BROWSER CULTIVATION NODE",
      "explainAria": "Explain-Modus umschalten: Zu jedem Bereich Zweck, Position und Bedeutung anzeigen",
      "worldVisualizationAria": "Verschiebbare Zivilisationsvisualisierung",
      "machineRecord": "MACHINE-PROTOKOLL",
      "footerVersion": "Reality Consumption Engine Browser v{version}",
      "footerTech": "Speicherformat v{saveVersion} · migrierender Loader · localStorage · kein Offline-Fortschritt",
      "pwaName": "Reality Consumption Engine",
      "pwaShortName": "RCE",
      "pwaDescription": "Zivilisationen kultivieren, ihre Geschichte formen und Reality ernten.",
      "languageLabel": "Sprache"
    },
    "app": {
      "resourceCausal": "Causal",
      "resourceCognition": "Cognition",
      "resourceParadox": "Paradox",
      "resourceExistence": "Existence",
      "metaMachineInsight": "Machine Insight",
      "metaCultivationCredits": "Cultivation Credits",
      "metaMilestones": "Milestones",
      "metaMultiverse": "Multiverse",
      "metaConvergences": "Convergences",
      "milestoneGroups": {
        "cultivation": "KULTIVIERUNG",
        "harvest": "HARVEST",
        "paths": "PFADE",
        "prestige": "PRESTIGE",
        "convergence": "CONVERGENCE"
      },
      "reserveCost": "KOSTEN {cost} {currency} · {usesLeft} VON {maxUses} VERBLEIBEND",
      "harvestSummaryOne": "×{multiplier} Ertrag · +{credits} Cultivation Credit{objectiveBonus}",
      "harvestSummaryMany": "×{multiplier} Ertrag · +{credits} Cultivation Credits{objectiveBonus}",
      "objectiveBonusActive": " · OBJECTIVE-BONUS AKTIV",
      "situationHeading": "SITUATION // AKTUELLER ZUSTAND",
      "situationDetailsSummary": "Situation / Details",
      "pressureHarvestDetails": "Druck & Harvest-Details",
      "optionsCount": "Optionen",
      "machineRecord": "MASCHINENAUFZEICHNUNG",
      "why": "WARUM",
      "do": "AKTION",
      "pathAffinity": "{label}-Affinität",
      "pathInfluence": "Pfad-Einfluss",
      "noMeasurableStateChange": "Keine messbare Zustandsänderung.",
      "decisionResolved": "ENTSCHEIDUNG AUSGEWERTET // EXAKTES ERGEBNIS",
      "metricChangedOne": "{count} METRIK VERÄNDERT",
      "metricChangedMany": "{count} METRIKEN VERÄNDERT",
      "machineRecordAwaitingActivity": "Machine Record wartet auf Aktivität.",
      "explainOnTitle": "Explain-Modus aktiv: Jeder Bereich erklärt seine Funktion. Zum Deaktivieren auswählen.",
      "explainOffTitle": "Explain-Modus: Jeden Bereich um Funktion und Entscheidungsbedeutung ergänzen.",
      "level": "Level {level}/{max}",
      "max": "MAX",
      "locked": "GESPERRT",
      "install": "INSTALLIEREN",
      "active": "AKTIV",
      "lockedForRun": "FÜR RUN GESPERRT",
      "select": "AUSWÄHLEN",
      "directiveObjective": "DIRECTIVE-ZIEL",
      "milestoneRegister": "MILESTONE-REGISTER",
      "milestoneSummary": "{completed} von {total} Milestones erfasst. Jeder gewährt Machine Insight.",
      "insightAward": "INSIGHT +{amount}",
      "greatConvergence": "GREAT CONVERGENCE",
      "convergenceDescription": "Terminale Kultivierung beginnt in APOTHEOSIS ohne Ertrag und mit 1,6× Entropy. Gewonnen wird durch einen kontrollierten Harvest bei Cultivation Depth {targetDepth} oder höher. Ein Fehlschlag kostet nur den Run.",
      "initiateGreatConvergence": "GREAT CONVERGENCE STARTEN",
      "convergencesAchieved": "Erreichte Convergences: {count}",
      "noDirectiveOffers": "Aktuell sind keine stabilen Directive-Angebote verfügbar.",
      "lastHarvest": "LETZTER HARVEST",
      "lastHarvestDetailOne": "+{credits} Cultivation Credit · ×{multiplier} Ertrag",
      "lastHarvestDetailMany": "+{credits} Cultivation Credits · ×{multiplier} Ertrag",
      "directiveObjectiveTitle": "Directive-Ziel",
      "browserNode": "REALITY CONSUMPTION ENGINE // BROWSER NODE",
      "machineControl": "Machine Control",
      "machineDescription": "Zivilisationen kultivieren, ihre Geschichte formen und Realität harvesten, ohne dass die Zivilisation die Kultivierung erkennt.",
      "nextCivilization": "NÄCHSTE ZIVILISATION",
      "startingTraitsPreview": "STARTING TRAITS // DETERMINISTISCHE VORSCHAU",
      "traitArchiveUnavailable": "Trait-Archiv nicht verfügbar",
      "startCivilization": "ZIVILISATION STARTEN",
      "machineUpgrades": "Machine Upgrades",
      "breedingMatrix": "Breeding Matrix",
      "noBreedingMatrices": "Aktuell sind keine Breeding Matrices verstanden.",
      "universeUpgrades": "Universe Upgrades",
      "axiomUpgrades": "Axiom Upgrades",
      "nextDiscoveries": "Nächste Entdeckungen",
      "consumeUniverse": "UNIVERSE VERBRAUCHEN",
      "collapseMultiverse": "MULTIVERSE KOLLABIEREN",
      "cascadeUnderWay": "CASCADE LÄUFT // jetzt harvesten oder 40 % der Credits verlieren",
      "deepestBandReachedCreditCap": "TIEFSTES BAND ERREICHT // Credit-Limit erreicht",
      "noLimit": "kein Limit",
      "harvestNowForecast": "JETZT HARVESTEN // Credit {nextCredit} benötigt {secondsToNextCredit}s, der Run erreicht noch {runLeft}",
      "closingForecast": "ABSCHLUSSPHASE // Credit {nextCredit} in {secondsToNextCredit}s, der Run erreicht noch {runLeft}",
      "buildingPremature": "AUFBAU // keine Credits, bis Premature verlassen wurde",
      "buildingForecast": "AUFBAU // Credit {nextCredit} in {secondsToNextCredit}s",
      "cascadeHarvestNow": "CASCADE — JETZT HARVESTEN",
      "deepestBandReached": "TIEFSTES BAND ERREICHT",
      "deepestBandReachedShort": "TIEFSTES BAND ERREICHT · Limit erreicht",
      "harvestNowShort": "JETZT HARVESTEN · Credit {nextCredit} nicht mehr erreichbar",
      "buildingPrematureShort": "AUFBAU · zuerst Premature verlassen",
      "closing": "ABSCHLUSS",
      "building": "AUFBAU",
      "shortCreditForecast": "{state} · Credit {nextCredit} in {seconds}",
      "nextBand": "NÄCHSTES BAND {grade} BEI DEPTH {depth} FÜR ×{multiplier}",
      "harvestGrade": "HARVEST GRADE",
      "simulationSpeed": "Simulationsgeschwindigkeit",
      "tacticalActions": "TACTICAL ACTIONS",
      "keys": "TASTEN",
      "controlCapacity": "CONTROL CAPACITY",
      "controlAvailable": "{available} von {max} Control verfügbar",
      "cost": "KOSTEN {cost}",
      "collapseWarning": "⚠ REALITY COLLAPSE UNMITTELBAR — BEI STABILITY 0 WIRD CHAOTISCHER HARVEST AUSGELÖST",
      "pressureHarvest": "PRESSURE & HARVEST",
      "pressureHarvestAria": "Druck und Harvest",
      "tacticalActionsAria": "Tactical Actions",
      "containmentPressureRate": "Containment {containment} · Druck ×{pressure} · {rate}/s",
      "cascadeCurrentCourse": "CASCADE IN {seconds} BEI AKTUELLEM VERLAUF",
      "controlledHarvest": "KONTROLLIERTER HARVEST",
      "forceChaoticHarvest": "CHAOTISCHEN HARVEST ERZWINGEN",
      "abandonWithoutReward": "OHNE ERTRAG ABBRECHEN",
      "terminalCultivation": "TERMINALE KULTIVIERUNG",
      "convergenceTargetDepth": "CONVERGENCE-ZIEL-DEPTH {depth}",
      "currentDepthReady": "AKTUELL {depth} · CONVERGENCE BEREIT",
      "currentDepthInsufficient": "AKTUELL {depth} · DEPTH ZU NIEDRIG",
      "dominantPath": "DOMINANT: {path}",
      "unresolvedPath": "PFAD: UNGEKLÄRT",
      "cascade": "CASCADE",
      "dragSwipeExplore": "↔ ZIEHEN / WISCHEN ZUM ERKUNDEN",
      "panLeft": "Nach links bewegen",
      "panRight": "Nach rechts bewegen",
      "currentIntervention": "AKTUELLE INTERVENTION",
      "currentInterventionProbed": "AKTUELLE INTERVENTION // PROBED",
      "predictionCoreOffline": "PREDICTION CORE OFFLINE // 1 Control für Probe ausgeben, um Risikorichtungen sichtbar zu machen.",
      "rerollWithParadox": "MIT PARADOX NEU WÜRFELN",
      "monitoringCivilization": "Zivilisation wird überwacht ...",
      "nextInterventionWindow": "Nächstes Interventionsfenster in ungefähr {seconds} Simulationssekunden.",
      "noCoherentTendency": "Noch keine kohärente Tendenz.",
      "directiveObjectiveComplete": "ABGESCHLOSSEN",
      "directiveObjectiveActive": "AKTIV",
      "objectiveBonus": "OBJECTIVE-BONUS // ×1,15 Ertrag + 1 Cultivation Credit",
      "machineReserve": "Machine Reserve",
      "machineReserveDescription": "Gespeicherte Ressourcen in die laufende Zivilisation investieren. Jede Nutzung verdreifacht den Preis; zusätzlich steigt er mit bereits erreichter Depth.",
      "strategicOverview": "Strategischer Überblick",
      "realityStability": "Reality Stability",
      "machineAwareness": "Machine Awareness",
      "collectiveSanity": "Collective Sanity",
      "cosmicAttention": "Cosmic Attention",
      "era": "Era",
      "year": "Jahr",
      "development": "Development",
      "externalObserversConverging": "Externe Beobachter konvergieren.",
      "civilizationDangerouslyAware": "Die Zivilisation entwickelt eine gefährlich hohe Awareness der Kultivierung.",
      "cosmicObservationTolerable": "Kosmische Beobachtung bleibt tolerierbar.",
      "speciesFactionDossier": "Dossier: Spezies & Fraktion",
      "emergingTendencies": "Entstehende Tendenzen",
      "institutions": "Institutionen",
      "harvestYieldDetail": "Harvest-Ertrag im Detail",
      "harvestDetailDescription": "Grade, Cultivation Depth und das nächste Band stehen im Bereich Pressure darüber; hier folgt die Aufschlüsselung je Ressource.",
      "controlled": "KONTROLLIERT",
      "chaotic": "CHAOTISCH",
      "chaoticAutomatic": "Automatisch bei Stability 0; Premature-Kollapse behalten einen Mindest-Bergungsertrag.",
      "recordsAndIntelligence": "AUFZEICHNUNGEN & INTELLIGENZ",
      "civilizationRecord": "Zivilisationsprotokoll",
      "noRecordedHistoryYet": "Noch keine Historie erfasst.",
      "civilizationIdentity": "Zivilisationsidentität",
      "visualMotif": "Visuelles Motiv: {motif}",
      "doctrine": "Doktrin: {doctrine}",
      "focus": "Fokus: {focus}",
      "eraProgression": "Era-Fortschritt",
      "eraRanges": "Emergence: 0–2.499 Jahre · Expansion: 2.500–6.499 · Transcendence: 6.500–13.999 · Apotheosis: ab 14.000",
      "victoryNoneRecorded": "keine erfasst",
      "victoryTitle": "Die Machine schließt ihr Ledger",
      "victoryDescription": "Eine Zivilisation wurde bis zu einer Depth kultiviert, bei der Harvest und Harvester nicht länger getrennte Operationen sind.",
      "seed": "SEED",
      "years": "JAHRE",
      "depth": "DEPTH",
      "dominantPathLabel": "DOMINANTER PFAD",
      "unresolved": "ungeklärt",
      "permanentReward": "Permanenter Bonus: ×{yield} Harvest-Ertrag und +{containment} Containment.",
      "continue": "WEITER"
    },
    "resetSave": {
      "defaultTitle": "Browser-Speicherstand zurücksetzen",
      "armedLabel": "SPEICHERSTAND LÖSCHEN?",
      "armedTitle": "Erneut klicken, um den Browser-Speicherstand zu löschen und den gesamten Fortschritt zurückzusetzen",
      "armedAria": "Bestätigen: Browser-Speicherstand löschen und Machine Insight, Freischaltungen und Fortschritt vollständig zurücksetzen",
      "armedAnnouncement": "Löschen des Speicherstands aktiviert. Innerhalb von {seconds} Sekunden erneut klicken, um den Browser-Speicherstand zu löschen und Machine Insight, Freischaltungen und Fortschritt vollständig zurückzusetzen."
    },
    "viewModel": {
      "resources": {
        "causal_mass": "Causal Mass",
        "cognition": "Cognition",
        "paradox": "Paradox",
        "existence": "Existence",
        "universal_residue": "Universal Residue",
        "axioms": "Axioms"
      },
      "metrics": {
        "stability": "Stability",
        "awareness": "Awareness",
        "sanity": "Sanity",
        "attention": "Attention",
        "development": "Development",
        "entropy": "Entropy",
        "stability_max": "Maximale Stability"
      },
      "range": "{label}-Bereich {lower} bis {upper}",
      "noDirectMetricVector": "Kein direkter Metrik-Vektor erkannt",
      "allRequirementsMet": "Alle Voraussetzungen erfüllt.",
      "probeVectorAppend": " Probe-Vektor: {vector}.",
      "probeVector": "Probe-Vektor: {vector}.",
      "eraFallback": "Era {era}",
      "selectDirective": "Eine angebotene Directive für diese Zivilisation auswählen.",
      "entropyCascade": "CASCADE",
      "entropyCritical": "KRITISCH",
      "entropyFractured": "FRAKTURIERT",
      "entropyStrained": "BELASTET",
      "entropyContained": "EINGEDÄMMT"
    },
    "guideView": {
      "what": "WAS",
      "where": "WO",
      "why": "WARUM",
      "fieldManual": "Field Manual",
      "fieldManualNote": "Alle Spielbegriffe mit Position auf dem Bildschirm und Entscheidungsbedeutung. Nichts davon muss freigeschaltet werden — alles ist von der ersten Sekunde an lesbar."
    },
    "reportView": {
      "development": "Development",
      "entropy": "Entropy",
      "stability": "Stability",
      "curveAria": "Development, Entropy und Stability über den gesamten Run",
      "samples": "{count} Messpunkte",
      "percentOfYield": "{share}% des Ertrags",
      "noPhaseChange": "Kein Phasenwechsel erfasst",
      "endedInsideStartState": "Der Run endete in demselben Zustand, in dem er begann.",
      "noRecordedHistory": "Keine Historie erfasst.",
      "objectiveMet": "ERFÜLLT, ×1,15 und +1 Cultivation Credit",
      "objectiveNotMet": "NICHT ERFÜLLT",
      "runReportCivilization": "RUN REPORT // ZIVILISATION {seed}",
      "terminalSuffix": " // TERMINAL",
      "harvestGrade": "HARVEST GRADE",
      "harvestSummaryOne": "DEPTH {depth} · ×{multiplier} Ertrag · {credits} Cultivation Credit",
      "harvestSummaryMany": "DEPTH {depth} · ×{multiplier} Ertrag · {credits} Cultivation Credits",
      "lasted": "DAUER",
      "civilizationYears": "{years} Zivilisationsjahre",
      "endedIn": "ENDE IN",
      "phase": "{phase}-Phase",
      "peak": "Maximum {value}",
      "interventions": "INTERVENTIONEN",
      "path": "Pfad: {path}",
      "noDominantPath": "kein dominanter Pfad",
      "entropyAtEnd": "ENTROPY AM ENDE",
      "peakOf100": "Maximum {value} von 100",
      "stabilityAtEnd": "STABILITY AM ENDE",
      "ofMax": "von {max}",
      "sanityAwarenessAttention": "SANITY / AWARENESS / ATTENTION",
      "resourcesFarmed": "GEERNTETE RESSOURCEN",
      "unitsBanked": "Insgesamt {units} Einheiten gespeichert.",
      "nothingBanked": "Nichts wurde gespeichert. Dieser Run erzeugte keine Ressourcen.",
      "howItDeveloped": "ENTWICKLUNGSVERLAUF",
      "whatThisRunSuggests": "HINWEISE AUS DIESEM RUN",
      "civilizationRecord": "Zivilisationsprotokoll",
      "dismissReport": "REPORT SCHLIESSEN"
    },
    "tutorialView": {
      "guidedRunAria": "Geführter Run",
      "guidedRun": "GEFÜHRTER RUN",
      "show": "ANZEIGEN",
      "waiting": "Warten auf die oben angegebene Aktion.",
      "continue": "WEITER",
      "do": "AKTION",
      "stepOf": "GEFÜHRTER RUN // SCHRITT {index} VON {total}",
      "collapseTitle": "Karte des geführten Runs einklappen",
      "hide": "AUSBLENDEN",
      "dismissTitle": "Geführten Run schließen; das Field Manual bleibt verfügbar",
      "skip": "ÜBERSPRINGEN",
      "what": "WAS",
      "where": "WO",
      "why": "WARUM",
      "replayGuidedRun": "GEFÜHRTEN RUN WIEDERHOLEN",
      "startGuidedRun": "GEFÜHRTEN RUN STARTEN",
      "replayFinished": "Der geführte Run ist abgeschlossen. Eine Wiederholung verändert den Fortschritt nicht.",
      "replaySkipped": "Der geführte Run wurde übersprungen. Er führt durch eine Zivilisation vom Start bis zum Harvest."
    },
    "format": {
      "numberLocale": "de-DE",
      "minuteSuffix": "Min.",
      "secondSuffix": "s"
    }
  },
  "tutorial": {
    "steps": {
      "overview": {
        "title": "Die Machine steuern",
        "what": "Diese Engine kultiviert Zivilisationen, um sie zu verbrauchen. Es läuft immer nur eine Zivilisation gleichzeitig; ein Versuch wird Run genannt.",
        "where": "Aktuell ist die Machine-Ansicht geöffnet. Hier wird der Ertrag des letzten Runs ausgegeben und der nächste Run vorbereitet.",
        "why": "In dieser Ansicht sammelt sich nichts passiv an. Jede Ressource stammt aus einem bewusst beendeten Run.",
        "action": ""
      },
      "run_build": {
        "title": "Run vor dem Start konfigurieren",
        "what": "Die nächste Zivilisation existiert bereits als Seed. Ihre Starting Traits können daher exakt angezeigt werden.",
        "where": "Im Bereich NEXT CIVILIZATION. Nach der Freischaltung erscheinen hier zusätzlich drei angebotene Directives.",
        "why": "Nach dem Start kann ein Run nicht mehr umkonfiguriert werden. Nur hier lässt sich seine Ausgangslage festlegen.",
        "action": "ZIVILISATION STARTEN auswählen."
      },
      "world_read": {
        "title": "Die Welt zeigt den Zustand",
        "what": "Die Darstellung der Zivilisation basiert auf ihren Live-Werten — Siedlungen, Fraktionen und Schäden werden aus demselben Zustand erzeugt wie die Anzeigen.",
        "where": "Im Streifen über der Welt: ERA, DEV, STB, SAN, AWR, ATT, ENT. Die Welt kann durch Ziehen erkundet werden.",
        "why": "Die sichtbare Welt ist keine reine Dekoration. Verändert sie sich, hat sich auch ein Wert verändert; der Streifen zeigt welcher.",
        "action": ""
      },
      "situation": {
        "title": "Aktueller Zustand und Ursache",
        "what": "Die Zeile SITUATION nennt den momentan dominanten Druck, dessen Ursache und die empfohlene Aktion.",
        "where": "Direkt unter der Welt, oberhalb aller weiteren Run-Bereiche.",
        "why": "Die Anzeige wird aus dem Live-Zustand berechnet und bleibt dadurch im gesamten Spiel gültig, nicht nur im Tutorial.",
        "action": ""
      },
      "intervention": {
        "title": "Interventionen sind Entscheidungen",
        "what": "In regelmäßigen Abständen erzwingt die Zivilisation eine Entscheidung. Solange eine Intervention offen ist, pausieren Jahre, Development und Entropy.",
        "where": "Im Bereich CURRENT INTERVENTION. Jede Auswahl enthält eine Prognose ihrer Wirkung.",
        "why": "Entscheidungen lenken die Zivilisation auf einen Pfad. Ein Run benötigt drei abgeschlossene Interventionen, bevor überhaupt ein Ertrag möglich ist.",
        "action": "Die erste Intervention durch Auswahl einer Option abschließen."
      },
      "feedback": {
        "title": "Jede Entscheidung wird ausgewertet",
        "what": "Der neu erschienene Bereich zeigt für jede veränderte Metrik exakte Vorher-/Nachher-Werte sowie alle hinzugefügten Elemente.",
        "where": "Unter DECISION RESOLVED direkt unterhalb der Intervention.",
        "why": "Dies beantwortet exakt, welche Wirkung die Entscheidung hatte. Ein Run lässt sich dadurch nachvollziehen statt erraten.",
        "action": ""
      },
      "tactical": {
        "title": "Vier Aktionen, drei Ladungen",
        "what": "Stabilize, Accelerate, Probe und Entropy Vent liegen auf den Tasten 1 bis 4. Jede Aktion kostet Control Capacity und erhöht für ihren Vorteil Entropy.",
        "where": "Im Bereich TACTICAL ACTIONS. Die Markierungen oben zeigen die verbleibende Control Capacity.",
        "why": "Control Capacity ist das feste Budget zur Steuerung eines Runs. Sie wird nur beim Eintritt der Zivilisation in eine neue Era aufgefüllt.",
        "action": "Eine Tactical Action einsetzen. Probe (3) kostet nur 1 Control, benötigt aber eine offene Intervention; Accelerate (2) funktioniert jederzeit."
      },
      "pressure": {
        "title": "Entropy ist die Uhr",
        "what": "Entropy steigt ausschließlich an und umso schneller, je länger die Zivilisation existiert. Bei 25, 50 und 75 wird eine Containment-Krise erzwungen; bei 100 kaskadiert der Run.",
        "where": "In der ENTROPY-Anzeige im Bereich PRESSURE & HARVEST, mit CASCADE IN Xs darunter.",
        "why": "Dieser Wert ist die Frist für alle anderen Entscheidungen. Nur Entropy Vent und Containment Upgrades verschieben sie nach hinten.",
        "action": ""
      },
      "depth": {
        "title": "Depth bestimmt den Ertrag",
        "what": "Cultivation Depth entspricht Development / 80 plus 1,5 pro Endgame-Zustand. Sie bestimmt Harvest Grade und Ertragsmultiplikator.",
        "where": "In der Anzeige HARVEST GRADE; darunter stehen das nächste Band und die berechnete Empfehlung zum Weiterlaufen oder Harvest.",
        "why": "Premature zahlt nur 0,2 und keine Cultivation Credits. Premature zu verlassen ist deshalb das erste echte Ziel jedes Runs.",
        "action": ""
      },
      "harvest": {
        "title": "Der richtige Stoppzeitpunkt entscheidet",
        "what": "Ein kontrollierter Harvest sichert den vollständigen Grade. Cascade oder Kollaps erzwingen den Harvest mit ungefähr 40 % weniger Credits.",
        "where": "Über die drei Schaltflächen am unteren Ende des Bereichs PRESSURE & HARVEST.",
        "why": "Die Harvest-Empfehlung vergleicht die Zeit bis zum nächsten Credit mit der noch erreichbaren Run-Zeit. HARVEST NOW bedeutet, dass der nächste Credit nachweislich nicht mehr erreichbar ist.",
        "action": "Diesen Run mit KONTROLLIERTER HARVEST beenden, sobald der richtige Zeitpunkt erreicht ist."
      },
      "report": {
        "title": "Run auswerten",
        "what": "Der RUN REPORT zeigt Entwicklung, Endgrund, Ertrag und aus den Run-Werten abgeleitete Hinweise für den nächsten Versuch.",
        "where": "Nach jedem Run oben in der Machine-Ansicht. Der Report bleibt sichtbar, bis er geschlossen wird.",
        "why": "Hier wird aus einem abgeschlossenen Run eine konkrete Entscheidung für den nächsten, statt nur ein vergangener Zahlenwert zu bleiben.",
        "action": ""
      },
      "manual": {
        "title": "Alle Informationen bleiben verfügbar",
        "what": "Das FIELD MANUAL erklärt jeden Spielbegriff. EXPLAIN in der oberen Leiste ergänzt jeden Bereich um seine Funktion.",
        "where": "Das FIELD MANUAL befindet sich in der Machine-Ansicht; EXPLAIN liegt neben der Ressourcenleiste und ist auf jedem Bildschirm erreichbar.",
        "why": "Beide Hilfen bleiben dauerhaft verfügbar. Die Bedeutung eines Werts kann direkt auf dem jeweiligen Bildschirm nachgelesen werden.",
        "action": ""
      }
    },
    "offPhase": {
      "machine": "Dieser Schritt gehört zur Machine-Ansicht. Run beenden oder abbrechen, um dorthin zurückzukehren.",
      "civilization": "Dieser Schritt gehört zu einer laufenden Zivilisation. Eine Zivilisation starten, um fortzufahren."
    }
  },
  "help": {
    "sections": {
      "loop": {
        "title": "Der Kreislauf",
        "summary": "Die Machine kultiviert eine Zivilisation und harvestet sie anschließend. Alles Weitere steuert diese beiden Schritte.",
        "topics": {
          "run": {
            "term": "Run (Zivilisation)",
            "what": "Eine kultivierte Zivilisation vom ersten Jahr bis zum Harvest, Abbruch oder Verlust.",
            "where": "Start über ZIVILISATION STARTEN in der Machine-Ansicht; der Run läuft in der Zivilisationsansicht.",
            "why": "Nur ein Run erzeugt Ressourcen. In der Machine-Ansicht sammelt sich nichts passiv an."
          },
          "harvest": {
            "term": "Harvest",
            "what": "Beendet einen Run und wandelt ihn in die vier Ressourcen sowie Cultivation Credits um.",
            "where": "KONTROLLIERTER HARVEST und CHAOTISCHEN HARVEST ERZWINGEN im Bereich Pressure & Harvest.",
            "why": "Ein Run erzeugt erst beim Harvest einen Ertrag. Längeres Warten erhöht Ertrag und Verlustrisiko."
          },
          "resources": {
            "term": "Causal Mass · Cognition · Paradox · Existence",
            "what": "Die vier Harvest-Ressourcen. Causal Mass basiert auf gelebten Jahren und Development, Cognition auf Development und Awareness, Paradox auf Schaden (verlorene Stability, verlorene Sanity, Attention), Existence auf Development und Era.",
            "where": "In der oberen Leiste; die Aufschlüsselung je Ressource steht unter HARVEST-ERTRAG IM DETAIL.",
            "why": "Damit werden Machine Upgrades gekauft. Da Paradox durch Schaden entsteht, ist selbst eine schwer beschädigte Zivilisation nicht wertlos."
          },
          "credits": {
            "term": "Cultivation Credits",
            "what": "Eine zweite Währung, die nur bei einem Harvest mit Grade Established oder besser ausgezahlt wird: floor(0,6 × Cultivation Depth), maximal 20.",
            "where": "In der Metaleiste unter der oberen Leiste als Cultivation Credits x/18.",
            "why": "18 Cultivation Credits verbrauchen das Universe und lösen damit den ersten Prestige-Schritt aus. Der Fortschritt wird durch Credits, nicht durch Ressourcen begrenzt."
          },
          "insight": {
            "term": "Machine Insight",
            "what": "Ein Fortschrittswert aus Milestones. Er schaltet Systeme und die Machine Reserve frei.",
            "where": "In der Metaleiste und im Bereich MILESTONE REGISTER mit noch offenen Zielen.",
            "why": "Machine Insight übersteht jedes Prestige. Ein Run, der einen Milestone erfüllt, ist daher nie vergeudet."
          }
        }
      },
      "metrics": {
        "title": "Zivilisationsmetriken",
        "summary": "Sechs Werte beschreiben die Zivilisation. Vier davon können den Run beenden; zwei reduzieren lediglich den Ertrag.",
        "topics": {
          "stability": {
            "term": "Stability (STB)",
            "what": "Misst, wie intakt die Realität um die Zivilisation ist. Stability nimmt kontinuierlich ab und wird durch Entscheidungen in beide Richtungen verändert.",
            "where": "Im Statusstreifen über der Welt und als erste Anzeige in STRATEGIC OVERVIEW.",
            "why": "Bei null endet der Run sofort mit einem erzwungenen chaotischen Harvest. Stability ist die Ressource, die tatsächlich für das Überleben des Runs verbraucht wird."
          },
          "sanity": {
            "term": "Collective Sanity (SAN)",
            "what": "Misst, wie gut die Bevölkerung die Eingriffe der Machine verkraftet.",
            "where": "Im Statusstreifen der Welt und in STRATEGIC OVERVIEW.",
            "why": "Niedrige Sanity bringt düsterere Interventionen in den Pool und erhöht den Paradox-Ertrag beim Harvest."
          },
          "awareness": {
            "term": "Machine Awareness (AWR)",
            "what": "Misst, wie nah die Zivilisation der Erkenntnis kommt, dass sie kultiviert wird.",
            "where": "Im Statusstreifen der Welt und in STRATEGIC OVERVIEW.",
            "why": "Über 65 beginnt die Zivilisation gegen die Kultivierung zu handeln. Zugleich steigt der Cognition-Ertrag."
          },
          "attention": {
            "term": "Cosmic Attention (ATT)",
            "what": "Misst, wie sichtbar die Kultivierung für Beobachter außerhalb der Zivilisation ist.",
            "where": "Im Statusstreifen der Welt und in STRATEGIC OVERVIEW.",
            "why": "Über 65 konvergieren externe Beobachter. Gleichzeitig steigt der Paradox-Ertrag, wodurch sich das Risiko auszahlen kann."
          },
          "development": {
            "term": "Development (DEV)",
            "what": "Die angesammelte Leistungsfähigkeit der Zivilisation. Development wächst jede Sekunde mit einer Rate, die durch den Zustand des Runs bestimmt wird.",
            "where": "Im Statusstreifen der Welt und in der Zeile Era/Year/Development in STRATEGIC OVERVIEW.",
            "why": "Development geteilt durch 80 bildet den größten Teil der Cultivation Depth und skaliert damit den gesamten Harvest."
          },
          "era": {
            "term": "Era (ERA) und Jahre",
            "what": "Emergence 0–2.499 Jahre, Expansion 2.500–6.499, Transcendence 6.500–13.999, Apotheosis ab 14.000. Pro Simulationssekunde vergehen 25 Jahre.",
            "where": "Im Statusstreifen der Welt, in STRATEGIC OVERVIEW und im Bereich ERA PROGRESSION.",
            "why": "Jede neue Era gewährt +1 Control Capacity, schaltet spätere Interventionen frei und erhöht beim Harvest Existence und Paradox um einen festen Bonus."
          }
        }
      },
      "pressure": {
        "title": "Druck & Zeit",
        "summary": "Ein Run endet nicht durch Abwarten. Er endet, wenn Entropy 100 oder Stability 0 erreicht.",
        "topics": {
          "entropy": {
            "term": "Entropy (ENT)",
            "what": "Aufgebauter Containment-Druck. Entropy steigt selbstständig und umso schneller, je länger die Zivilisation existiert.",
            "where": "In der ENTROPY-Anzeige im Bereich Pressure & Harvest sowie als ENT im Statusstreifen der Welt.",
            "why": "Bei 25, 50 und 75 wird jeweils eine Containment-Krisenintervention erzwungen. Bei 100 kaskadiert der Run und ein Harvest verliert ungefähr 40 % seiner Credits."
          },
          "cascade": {
            "term": "CASCADE IN Xs",
            "what": "Die verbleibenden Sekunden, bis Entropy ohne weitere Eingriffe 100 erreicht.",
            "where": "Unter der Entropy-Anzeige sowie im mobilen Streifen über der Welt.",
            "why": "Dies ist die Frist, an der alle anderen Entscheidungen gemessen werden. Die Berechnung nimmt absichtlich keine weiteren Interventionen an und ist daher eine Untergrenze, keine Prognose."
          },
          "containment": {
            "term": "Containment Rating",
            "what": "Die Summe der Containment Upgrades. Jeder Punkt reduziert die Entropy-Rate weiter.",
            "where": "Neben der Entropy-Anzeige als Containment N.",
            "why": "Containment ist die einzige permanente Möglichkeit, Runs zu verlängern. Alles andere kauft nur einzelne Sekunden."
          },
          "control": {
            "term": "Control Capacity",
            "what": "Drei Ladungen für Tactical Actions. Sie werden beim Eintritt der Zivilisation in eine neue Era sowie durch das Upgrade Bureaucracy of Gods aufgefüllt.",
            "where": "Die Markierungen oben im Bereich TACTICAL ACTIONS.",
            "why": "Control Capacity ist das feste Budget für die Steuerung eines Runs. Eine falsche Ausgabe beendet häufig einen ansonsten vielversprechenden Run."
          }
        }
      },
      "harvest": {
        "title": "Harvest & Depth",
        "summary": "Der richtige Zeitpunkt zum Beenden ist die eigentliche Entscheidung. Die Anzeige berechnet die Antwort, statt sie nur anzudeuten.",
        "topics": {
          "depth": {
            "term": "Cultivation Depth",
            "what": "Development / 80 plus 1,5 für jeden erreichten Endgame-Zustand.",
            "where": "Die große Zahl in der Anzeige HARVEST GRADE.",
            "why": "Cultivation Depth bestimmt Grade und Ertragsmultiplikator (0,25 + 0,22 × Depth) und ist damit der zentrale Wert, den ein Run steigern soll."
          },
          "grade": {
            "term": "Harvest Grade",
            "what": "Premature unter Depth 1,5, danach Established, Transcendent ab 4, Ascendant ab 9 und Singular ab 16. Ein Run bleibt außerdem Premature, bis drei Interventionen abgeschlossen sind und Emergence verlassen wurde.",
            "where": "HARVEST GRADE // im Bereich Pressure & Harvest.",
            "why": "Premature zahlt nur einen festen Multiplikator von 0,2 und keine Cultivation Credits. Diesen Zustand zu verlassen ist daher das erste Ziel jedes Runs."
          },
          "call": {
            "term": "Harvest-Empfehlung",
            "what": "BUILDING, CLOSING, HARVEST NOW, CASCADE oder das erreichte Maximum — berechnet aus der Zeit bis zum nächsten Cultivation Credit und der noch erreichbaren Run-Zeit.",
            "where": "Die hervorgehobene Zeile unten in der Anzeige HARVEST GRADE.",
            "why": "Die Anzeige beantwortet Weiterlaufen oder Harvest mathematisch. HARVEST NOW bedeutet, dass der nächste Credit nachweislich nicht mehr in die verbleibende Run-Zeit passt."
          },
          "chaotic": {
            "term": "Chaotischer Harvest",
            "what": "Beendet den Run durch Kollaps statt Kontrolle: Paradox ×1,5, alle anderen Ressourcen auf die Contingency-Retention reduziert, Credits auf 60 % gerundet. Zusätzlich wird eine Machine Mutation gewährt.",
            "where": "CHAOTISCHEN HARVEST ERZWINGEN oder automatisch bei Stability 0.",
            "why": "Bei einem bereits verlorenen Run ist dies strikt besser als ein Abbruch. Selbst ein Premature-Kollaps liefert mindestens 8 Causal Mass als Bergungsertrag."
          },
          "objective": {
            "term": "Directive Objective",
            "what": "Eine Bedingung, die mit der für den Run ausgewählten Directive verknüpft ist.",
            "where": "Im Bereich DIRECTIVE OBJECTIVE während eines Runs; zuvor als Vorschau auf den Directive-Karten.",
            "why": "Erfüllung multipliziert den gesamten Harvest mit 1,15 und gewährt einen zusätzlichen Cultivation Credit. Das entspricht häufig dem Wert eines vollständigen Depth-Bands."
          }
        }
      },
      "actions": {
        "title": "Tactical Actions",
        "summary": "Vier Aktionen auf den Tasten 1 bis 4, bezahlt aus Control Capacity. Jede Aktion liefert einen Vorteil und erhöht dafür Entropy.",
        "topics": {
          "stabilize": {
            "term": "Stabilize (1)",
            "what": "+14 Stability für 2 Control, dafür +6 Attention und +8 Entropy.",
            "where": "Erste Schaltfläche im Bereich TACTICAL ACTIONS.",
            "why": "Stability ist bei langen Runs meist die erste knappe Ressource. Stabilize kauft direkt zusätzliche Stability."
          },
          "accelerate": {
            "term": "Accelerate (2)",
            "what": "+200 Jahre und Development für 2 Control, dafür -4 Stability sowie +3 Entropy plus 3 je Era.",
            "where": "Zweite Schaltfläche im Bereich.",
            "why": "Die hinzugefügten Jahre fließen nicht in die Entropy-Kurve ein. Die Kosten sind daher einmalig und erhöhen nicht dauerhaft die Rate."
          },
          "probe": {
            "term": "Probe (3)",
            "what": "Zeigt für 1 Control die Risikorichtungen der Auswahlmöglichkeiten der aktuellen Intervention.",
            "where": "Dritte Schaltfläche im Bereich; das Ergebnis erscheint in der Interventionskarte.",
            "why": "Ohne Prediction Core ist dies die einzige Möglichkeit, Auswirkungen einer Auswahl vor der Entscheidung zu sehen."
          },
          "vent": {
            "term": "Entropy Vent (4)",
            "what": "-18 Entropy für 1 Control, bezahlt mit 10 Stability und 4 Attention.",
            "where": "Vierte Schaltfläche im Bereich.",
            "why": "Dies ist die einzige Möglichkeit, die Cascade hinauszuschieben. Damit wird Stability zur Ressource, die tatsächlich zusätzliche Run-Zeit kauft."
          },
          "reserve": {
            "term": "Machine Reserve",
            "what": "Gespeicherte Ressourcen, die in die laufende Zivilisation investiert werden. Jede Nutzung verdreifacht den eigenen Preis; zusätzlich steigt der Preis mit bereits erreichter Depth.",
            "where": "Im Bereich MACHINE RESERVE, sobald genügend Machine Insight vorhanden ist.",
            "why": "Machine Reserve wandelt bereits vorhandene Ressourcen in ein weiteres Depth-Band eines gut laufenden Runs um."
          }
        }
      },
      "machine": {
        "title": "Machine & Fortschritt",
        "summary": "Zwischen Runs wird der Ertrag des letzten Runs ausgegeben und festgelegt, welche Form der nächste Run annehmen darf.",
        "topics": {
          "upgrades": {
            "term": "Machine Upgrades",
            "what": "Dauerhafte Käufe in den vier Ressourcen, die bis zum jeweiligen Prestige bestehen bleiben.",
            "where": "Unter MACHINE UPGRADES in der Machine-Ansicht.",
            "why": "Containment, Harvest-Multiplikatoren und Prediction Core stammen aus diesem Bereich. Hier wird ein Harvest in einen stärkeren nächsten Run umgewandelt."
          },
          "directive": {
            "term": "Directive-Auswahl",
            "what": "Drei deterministische Angebote pro Run; eine Auswahl bindet die Directive und ihr Objective für diesen Run.",
            "where": "Im Bereich NEXT CIVILIZATION.",
            "why": "Die Directive verändert Multiplikatoren des Runs und wird deshalb passend zum geplanten Run gewählt, nicht zufällig."
          },
          "traits": {
            "term": "Starting Traits",
            "what": "Die Traits, mit denen die nächste Zivilisation startet. Sie werden exakt angezeigt, da sie aus ihrem Seed abgeleitet werden.",
            "where": "Unter STARTING TRAITS // DETERMINISTIC PREVIEW im Bereich NEXT CIVILIZATION.",
            "why": "Die Traits sind vor dem Start sichtbar, sodass der Run geplant werden kann."
          },
          "prestige": {
            "term": "Consume Universe / Collapse Multiverse",
            "what": "18 Cultivation Credits verbrauchen das Universe und erzeugen Universal Residue; 4 Universes kollabieren das Multiverse und erzeugen Axioms.",
            "where": "Die Schaltflächen am unteren Rand der Machine-Ansicht, sobald die Systeme freigeschaltet sind.",
            "why": "Jede Ebene setzt die darunterliegende zurück und erzeugt eine Währung, die vom Reset nicht betroffen ist."
          },
          "convergence": {
            "term": "Great Convergence",
            "what": "Ein terminaler Run, der in Apotheosis startet, keinen Ertrag auszahlt und mit 1,6× Entropy läuft. Gewonnen wird er durch einen kontrollierten Harvest auf oder über der Ziel-Depth.",
            "where": "Im Bereich GREAT CONVERGENCE nach dem ersten Multiverse.",
            "why": "Great Convergence ist die Siegbedingung. Jede erfolgreiche Convergence gewährt permanenten Harvest-Ertrag und Containment. Ein Fehlschlag kostet nur den Run."
          }
        }
      }
    },
    "abbreviations": {
      "ERA": "Era — Emergence, Expansion, Transcendence, Apotheosis",
      "DEV": "Development — Leistungswert, aus dem Cultivation Depth berechnet wird",
      "STB": "Stability — Integrität der Realität; bei null endet der Run",
      "SAN": "Sanity — Belastbarkeit der Bevölkerung",
      "AWR": "Awareness — Nähe der Zivilisation zur Erkenntnis der Kultivierung",
      "ATT": "Attention — Sichtbarkeit der Kultivierung für externe Beobachter",
      "ENT": "Entropy — Containment-Druck; bei 100 kaskadiert der Run"
    },
    "explainNotes": {
      "machine_hero": "Die Machine-Ansicht liegt zwischen den Runs. Hier sammelt sich nichts passiv an — Ertrag des letzten Harvest ausgeben und anschließend die nächste Zivilisation starten.",
      "run_preparation": "Die Konfiguration des nächsten Runs: aus dem Seed abgeleitete Starting Traits und nach der Freischaltung eine von drei angebotenen Directives. Beides ist vor dem Start sichtbar.",
      "machine_upgrades": "Dauerhafte Käufe, die jeden folgenden Run verändern. Containment verlängert Runs; Harvest-Module erhöhen den Ertrag.",
      "milestones": "Jeder Milestone gewährt Machine Insight, das kein Prestige entfernt. Der Bereich zeigt lohnende Ziele für zukünftige Runs.",
      "run_report": "Zusammenfassung des letzten Runs: Entwicklung, Endgrund und Ertrag. Die Hinweise werden aus den tatsächlichen Werten dieses Runs abgeleitet.",
      "field_manual": "Alle Spielbegriffe mit Position auf dem Bildschirm und ihrer Bedeutung für Entscheidungen.",
      "situation": "Ein Satz zum aktuellen Zustand, seiner Ursache und der empfohlenen Aktion. Er wird aus dem Live-Zustand des Runs neu berechnet und ist nicht geskriptet.",
      "intervention": "Eine Entscheidung, die von der Zivilisation erzwungen wird. Während eine Intervention offen ist, pausiert der Run bis zur Auswahl.",
      "decision_feedback": "Die exakten Vorher-/Nachher-Werte der zuletzt gewählten Option. Auswirkungen einer Entscheidung bleiben dadurch nachvollziehbar.",
      "command_rail": "Mögliche Ausgaben der Control Capacity. Jede Aktion gewährt einen Vorteil und erhöht dafür Entropy.",
      "pressure_rail": "Zeitpunkt zum Beenden des Runs. Entropy ist die Frist; der Harvest-Wert zeigt den aktuellen Ertrag beim Beenden.",
      "harvest_readout": "Grade, Depth und nächstes Band sowie die berechnete Empfehlung zum Weiterlaufen oder Harvest.",
      "strategic_overview": "Die vier Metriken, die einen Run beenden oder seinen Ertrag verändern können, ergänzt um Era und Development.",
      "objective": "Die Bedingung der ausgewählten Directive. Erfüllung gewährt ×1,15 und einen zusätzlichen Cultivation Credit.",
      "reserve": "Gespeicherte Ressourcen, die in den laufenden Run investiert werden. Jede Nutzung verdreifacht ihren eigenen Preis.",
      "harvest_detail": "Aufschlüsselung des Harvest nach Ressourcen, jeweils kontrolliert und chaotisch.",
      "world": "Die Zivilisation selbst, aus ihrem Live-Zustand dargestellt. Ziehen zum Erkunden; der Streifen darüber zeigt dieselben Werte wie die Bereiche darunter."
    }
  },
  "guidance": {
    "civilization": {
      "cascade": {
        "headline": "Entropy ist kaskadiert. Der Run wird zwangsweise beendet.",
        "cause": "Entropy hat 100 erreicht. Zusätzlich zu allen anderen Effekten nimmt Stability nun mit einem festen Anteil ihres Maximums ab.",
        "advice": "Jetzt harvesten. Ein Cascade-Harvest zahlt weiterhin aus, jedoch ungefähr 40 % weniger Cultivation Credits als ein kontrollierter Harvest."
      },
      "collapse_imminent": {
        "headline": "Stability bei {stability}. Bei null endet der Run automatisch.",
        "cause": "Stability nimmt kontinuierlich ab; auch Entropy Vent und mehrere Interventionen verbrauchen zusätzlich Stability.",
        "adviceWithControl": "Stabilize (1) erhöht Stability für 2 Control um 14. Andernfalls vor dem Kollaps harvesten.",
        "adviceWithoutControl": "Nicht genügend Control für Stabilize verfügbar. Vor dem Kollaps harvesten."
      },
      "decision_pending": {
        "headline": "Entscheidung offen: {eventTitle}.",
        "cause": "Die Simulation pausiert, solange eine Intervention ungelöst ist — Jahre, Development und Entropy bleiben eingefroren.",
        "advice": "Vorhersagen lesen und entscheiden. Probe (3) zeigt zuvor für 1 Control die Risikorichtungen."
      },
      "convergence_ready": {
        "headline": "Convergence-Ziel bei Depth {depth} erreicht.",
        "cause": "Der Terminal-Run benötigt einen kontrollierten Harvest bei Depth {targetDepth} oder höher; dieses Ziel ist erreicht.",
        "advice": "Kontrollierten Harvest auslösen. Zusätzliche Depth oberhalb des Ziels bringt keinen weiteren Siegfortschritt."
      },
      "convergence_short": {
        "headline": "Terminal-Run bei Depth {depth} von benötigten {targetDepth}.",
        "cause": "Ein Terminal-Run zahlt keinen Ertrag und läuft mit 1,6× Entropy. Entscheidend ist ausschließlich, ob die Ziel-Depth rechtzeitig erreicht wird.",
        "advice": "Noch {secondsToCascade} bis zur Cascade. Accelerate (2) liefert hier die meiste Depth pro Control."
      },
      "entropy_critical": {
        "headline": "Entropy bei {entropy} — Cascade in {secondsToCascade}.",
        "cause": "Entropy steigt mit {entropyRate}/s; die Rate wächst mit jedem Jahr der Zivilisation.",
        "advice": "Entropy Vent (4) entfernt 18 Entropy für 1 Control und 10 Stability. Andernfalls ist dies das letzte sichere Zeitfenster des Runs."
      },
      "harvest_window": {
        "headline": "Jetzt harvesten — Cultivation Credit {nextCredit} passt nicht mehr in den Run.",
        "cause": "Der nächste Credit benötigt {secondsToNextCredit} Development-Zeit; der Run kann nur noch {secondsOfRunLeft} erreichen.",
        "adviceOneCredit": "Ein kontrollierter Harvest sichert {credits} Credit bei Grade {grade}. Weiterlaufen erzeugt dafür keinen zusätzlichen Credit.",
        "adviceManyCredits": "Ein kontrollierter Harvest sichert {credits} Credits bei Grade {grade}. Weiterlaufen erzeugt dafür keinen zusätzlichen Credit."
      },
      "cosmic_attention": {
        "headline": "Cosmic Attention bei {attention} — externe Beobachter konvergieren.",
        "cause": "Attention steigt selbstständig; jeder Einsatz von Stabilize und Vent erhöht sie zusätzlich.",
        "advice": "Gleichzeitig steigt der Paradox-Ertrag des Harvests. Das spricht für ein baldiges Ende des Runs, nicht für Panik."
      },
      "civilization_awareness": {
        "headline": "Machine Awareness bei {awareness} — die Zivilisation erkennt zunehmend, dass sie kultiviert wird.",
        "cause": "Awareness steigt mit Development sowie mit Entscheidungen, die die Kultivierung offenlegen.",
        "advice": "Der Cognition-Ertrag steigt, gleichzeitig gelangen feindselige Interventionen in den Pool. Den Run sichern, bevor sie eintreten."
      },
      "sanity_failing": {
        "headline": "Collective Sanity bei {sanity}.",
        "cause": "Sanity nimmt kontinuierlich ab und fällt nach Entscheidungen, die Bevölkerung verbrauchen, schneller.",
        "advice": "Niedrige Sanity erhöht den Paradox-Ertrag und verschärft den Interventionspool. Direkte Kosten entstehen nicht — der Trade-off bleibt eine strategische Entscheidung."
      },
      "premature": {
        "headline": "Dieser Run kann noch nicht auszahlen.",
        "causeInterventions": "Grade Premature: {eventChoices} von 3 für eine Auszahlung notwendigen Interventionen wurden gelöst.",
        "causeEra": "Grade Premature: Der Run befindet sich noch in {eraName}; eine Auszahlung benötigt Expansion oder später.",
        "causeDepth": "Grade Premature: Depth liegt bei {depth}; Established beginnt bei 1,5.",
        "advice": "Run am Leben halten. Accelerate (2) ist mit +200 Jahren für 2 Control der schnellste Weg aus Premature."
      },
      "credit_cap": {
        "headline": "Cultivation Credits sind bei {credits} gedeckelt.",
        "cause": "Die Credit-Formel endet unabhängig von Depth bei 20.",
        "advice": "Nur der rohe Ressourcenertrag wächst weiter. Harvest auslösen, sofern kein Directive-Ziel mehr erreichbar ist."
      },
      "closing": {
        "headline": "Abschlussphase — Credit {nextCredit} in {secondsToNextCredit}, Run reicht noch {secondsOfRunLeft}.",
        "cause": "Der nächste Credit ist noch erreichbar, aber nur innerhalb der letzten 30 % der Zeit, die der aktuelle Verlauf zulässt.",
        "advice": "Ein Entropy Vent (4) schafft wieder Puffer. Ohne Vent den Harvest beim nächsten Credit einplanen."
      },
      "objective_open": {
        "headline": "Aufbau — Directive-Ziel „{objectiveTitle}“ ist noch offen.",
        "cause": "Depth {depth} bei Grade {grade}, noch {secondsToCascade} bis zur Cascade und Ziel nicht erfüllt.",
        "advice": "Die Erfüllung multipliziert den gesamten Harvest mit 1,15 und fügt einen Cultivation Credit hinzu — häufig entspricht das einem zusätzlichen Band."
      },
      "building": {
        "headlineOneCredit": "Aufbau — Depth {depth} bei Grade {grade}, {credits} Credit gesichert.",
        "headlineManyCredits": "Aufbau — Depth {depth} bei Grade {grade}, {credits} Credits gesichert.",
        "cause": "Development wächst weiter; Entropy liegt bei {entropy}, noch {secondsToCascade} bis zur Cascade.",
        "advice": "Credit {nextCredit} wird in {secondsToNextCredit} erreicht. Aktuell muss nichts ausgegeben werden."
      }
    },
    "machine": {
      "pick_directive": {
        "headline": "Der nächste Run benötigt eine Directive.",
        "cause": "Drei Angebote wurden deterministisch aus dem Seed der nächsten Zivilisation erzeugt; eines muss vor dem Start festgelegt werden.",
        "advice": "Die Directive auswählen, deren Ziel zur geplanten Spielweise des Runs passt."
      },
      "collapse_multiverse": {
        "headline": "Das Multiverse kann kollabiert werden.",
        "cause": "Genügend Universes wurden verbraucht, um Axioms auszuzahlen.",
        "advice": "Der Kollaps setzt Universes und Machine Upgrades zurück, zahlt aber eine Währung aus, auf die niedrigere Ebenen keinen Zugriff haben."
      },
      "consume_universe": {
        "headline": "Das Universe kann bei {credits} Cultivation Credits verbraucht werden.",
        "cause": "{creditsRequired} Credits sind die Prestige-Schwelle; sie ist erreicht.",
        "advice": "Ressourcen und Machine Upgrades werden zurückgesetzt, dafür wird Universal Residue ausgezahlt. Zuvor noch vorgesehene Ausgaben durchführen."
      },
      "read_report": {
        "headline": "Der letzte Run ist oben dokumentiert.",
        "cause": "Der Report zeigt Entwicklung, Endgrund und Änderungen, die sich aus den eigenen Run-Daten ableiten.",
        "advice": "Harvest entsprechend den Report-Hinweisen investieren und anschließend die nächste Zivilisation starten."
      },
      "spend_bank": {
        "headlineOneUpgrade": "{count} Upgrade ist aktuell bezahlbar.",
        "headlineManyUpgrades": "{count} Upgrades sind aktuell bezahlbar.",
        "cause": "Gespeicherte Ressourcen haben keinen Effekt; ein Prestige entfernt sie.",
        "advice": "Containment verlängert Runs; Harvest-Module erhöhen den Ertrag desselben Runs."
      },
      "first_run": {
        "headline": "Noch keine Zivilisation kultiviert.",
        "cause": "Jede Ressource im Spiel stammt aus einem Run; bisher wurde noch keiner durchgeführt.",
        "advice": "Eine Zivilisation starten. Der erste Run darf verloren gehen — er zahlt trotzdem aus."
      },
      "start_run": {
        "headlineMilestone": "Nächster Milestone: {milestone}.",
        "headlineIdle": "Die Machine ist inaktiv.",
        "causeReady": "Zwischen Runs sammelt sich nichts an.",
        "causeNotReady": "Der nächste Run kann noch nicht gestartet werden.",
        "adviceReady": "Nächste Zivilisation starten.",
        "adviceNotReady": "Zuerst die Anforderung im darüberliegenden Bereich erfüllen."
      }
    }
  },
  "reports": {
    "decisionFeedback": {
      "metrics": {
        "stability": "Stability",
        "stabilityMax": "Maximale Stability",
        "awareness": "Awareness",
        "sanity": "Sanity",
        "attention": "Cosmic Attention",
        "years": "Zivilisationsjahre",
        "development": "Development",
        "eventTimer": "Interventions-Timer",
        "entropy": "Entropy",
        "controlCapacity": "Control Capacity"
      },
      "additionKinds": {
        "trait": "Trait",
        "institution": "Institution",
        "flag": "Flag",
        "path_flag": "Path-Flag"
      }
    },
    "runReport": {
      "reasonTitles": {
        "controlled_harvest": "Kontrollierter Harvest",
        "forced_chaotic_harvest": "Chaotischer Harvest, manuell erzwungen",
        "stability_collapse": "Reality-Kollaps",
        "abandoned": "Ohne Harvest abgebrochen",
        "convergence_won": "Great Convergence erreicht",
        "convergence_failed": "Great Convergence fehlgeschlagen"
      },
      "reasonDetails": {
        "controlledOneCredit": "Der Run wurde in Jahr {year} bei Cultivation Depth {depth} und Grade {grade} kontrolliert beendet. Ein kontrollierter Harvest sichert den vollständigen Grade-Multiplikator und {credits} Cultivation Credit.",
        "controlledManyCredits": "Der Run wurde in Jahr {year} bei Cultivation Depth {depth} und Grade {grade} kontrolliert beendet. Ein kontrollierter Harvest sichert den vollständigen Grade-Multiplikator und {credits} Cultivation Credits.",
        "forcedChaotic": "Der Kollaps wurde in Jahr {year} bei Entropy {entropy} erzwungen. Der Paradox-Ertrag stieg um die Hälfte, alle anderen Ressourcen wurden auf die Contingency-Retention reduziert und die Credits auf 60 % abgerundet.",
        "stabilityCollapse": "Stability erreichte in Jahr {year} bei Entropy {entropy} null. Der Harvest wurde automatisch chaotisch ausgelöst und zahlte deshalb den reduzierten Ertrag statt gar nichts.",
        "abandoned": "Der Run wurde in Jahr {year} ohne Harvest freigegeben und zahlte daher nichts. Ein chaotischer Harvest hätte selbst bei Grade {grade} noch einen Ertrag geliefert.",
        "convergenceWon": "Ein kontrollierter Harvest bei Cultivation Depth {depth} beendete den Terminal-Run in Jahr {year}. Der Convergence-Bonus ist permanent.",
        "convergenceFailed": "Der Terminal-Run endete in Jahr {year} bei Cultivation Depth {depth} unterhalb des Ziels. Die Convergence-Autorisierung bleibt erhalten; ein weiterer Versuch ist ohne zusätzliche Kosten möglich."
      },
      "arc": {
        "detail": "Development {development} · Depth {depth} · Entropy {entropy} · Stability {stability}",
        "enteredEra": "{era} erreicht",
        "beganEra": "Start in {era}",
        "eraFallback": "Era {era}",
        "phase": "{phase}-Phase",
        "phaseFallback": "Phase {phase}"
      },
      "dramaPhases": {
        "emergence": "Entstehung",
        "expansion": "Expansion",
        "division": "Spaltung",
        "transformation": "Transformation",
        "crisis": "Krise"
      },
      "lessons": {
        "abandoned": "Ein Abbruch speichert nichts. Selbst ein chaotischer Harvest bei Grade Premature liefert mindestens 8 Causal Mass; ein Run sollte daher statt einer Freigabe immer kollabiert werden.",
        "prematureOneIntervention": "Der Run löste {eventChoices} Intervention. Drei Interventionen plus Era Expansion sind die Mindestanforderung, bevor ein Harvest Cultivation Credits auszahlt.",
        "prematureManyInterventions": "Der Run löste {eventChoices} Interventionen. Drei Interventionen plus Era Expansion sind die Mindestanforderung, bevor ein Harvest Cultivation Credits auszahlt.",
        "prematureEra": "Der Run verließ {era} nicht. Eine Auszahlung benötigt Expansion bei 2.500 Jahren — Accelerate (2) liefert pro Nutzung 200 Jahre.",
        "prematureDepth": "Cultivation Depth endete bei {depth}; Established beginnt bei 1,5 beziehungsweise Development 120.",
        "stabilityCollapse": "Stability, nicht Entropy, beendete diesen Run — sie erreichte bei Entropy {entropy} null. Stabilize (1) liefert +14 für 2 Control; jeder Entropy Vent kostet 10 desselben Werts.",
        "entropyCascade": "Entropy erreichte 100 und die Cascade übernahm den Rest. Containment Upgrades reduzieren die Rate dauerhaft; Entropy Vent (4) entfernt jeweils nur 18.",
        "unusedControlOneAction": "Der Run endete mit {control} ungenutztem Control nach {actions} Tactical Action. Control wird nicht übertragen — ungenutzte Ladung geht verloren.",
        "unusedControlManyActions": "Der Run endete mit {control} ungenutztem Control nach {actions} Tactical Actions. Control wird nicht übertragen — ungenutzte Ladung geht verloren.",
        "directiveOneCredit": "Das Directive-Ziel „{objectiveTitle}“ wurde nicht erfüllt. Es ist ×1,15 auf den gesamten Harvest plus einen Cultivation Credit wert; bei dieser Depth entsprach das ungefähr {credits} Credit.",
        "directiveManyCredits": "Das Directive-Ziel „{objectiveTitle}“ wurde nicht erfüllt. Es ist ×1,15 auf den gesamten Harvest plus einen Cultivation Credit wert; bei dieser Depth entsprach das ungefähr {credits} Credits.",
        "nextBand": "{grade} beginnt bei Depth {minDepth}; die Distanz betrug {distance}. Der Harvest-Hinweis im Pressure Rail zeigt, wann diese Distanz nicht mehr erreichbar ist.",
        "creditCap": "Cultivation Credits sind bei {cap} gedeckelt und dieser Run erreichte das Limit. Danach wächst nur noch der rohe Ressourcenertrag; längeres Spielen finanziert Upgrades statt Prestige.",
        "cleanOneCredit": "Keine kritische Abweichung: Grade {grade} bei Depth {depth} für {credits} Cultivation Credit. Harvest in Containment für einen längeren nächsten Run oder in Harvest-Module für mehr Ertrag desselben Runs investieren.",
        "cleanManyCredits": "Keine kritische Abweichung: Grade {grade} bei Depth {depth} für {credits} Cultivation Credits. Harvest in Containment für einen längeren nächsten Run oder in Harvest-Module für mehr Ertrag desselben Runs investieren."
      }
    },
    "harvestGrades": {
      "premature": "Premature",
      "established": "Established",
      "transcendent": "Transcendent",
      "ascendant": "Ascendant",
      "singular": "Singular"
    },
    "progression": {
      "newResourceIdentified": "NEUE RESSOURCE IDENTIFIZIERT: {name}",
      "newSystemUnlocked": "NEUES SYSTEM FREIGESCHALTET: {name}",
      "newOptionUnlocked": "NEUE OPTION FREIGESCHALTET: {name}",
      "machineInsightAwarded": "MACHINE INSIGHT +{amount}: {title}",
      "repeatedUniverseConsumption": "Wiederholter Verbrauch eines Universe",
      "unknownProgressionRequirement": "Unbekannte Fortschrittsanforderung.",
      "consumeFirstUniverse": "Das erste Universe verbrauchen.",
      "unlockAxiomaticManipulation": "Axiomatic Manipulation freischalten.",
      "machineInsightRequirement": "Machine Insight {amount}",
      "discoverResource": "{resource} identifizieren",
      "requirementJoiner": " und ",
      "availableAfterRefresh": "Nach der aktuellen Fortschrittsaktualisierung verfügbar.",
      "unlockSystemNames": {
        "directives": "DIRECTIVES",
        "universe_prestige": "UNIVERSE PRESTIGE",
        "universe_upgrades": "UNIVERSE UPGRADES",
        "breeding_matrices": "BREEDING MATRICES",
        "multiverse_prestige": "MULTIVERSE PRESTIGE",
        "axioms": "AXIOMATIC MANIPULATION"
      },
      "systems": {
        "directives": {
          "name": "Directive System",
          "condition": "2 kontrollierte Harvests abschließen und Machine Insight 3 erreichen."
        },
        "universe_prestige": {
          "name": "Universe Consumption",
          "condition": "18 Cultivation Credits aus qualifizierten Harvests verdienen."
        },
        "universe_upgrades": {
          "name": "Universe Upgrades",
          "condition": "Das erste Universe verbrauchen."
        },
        "breeding_matrices": {
          "name": "Breeding Matrices",
          "condition": "Das erste Universe verbrauchen und Machine Insight 7 erreichen."
        },
        "multiverse_prestige": {
          "name": "Multiverse Consumption",
          "condition": "2 Universes verbrauchen."
        },
        "axioms": {
          "name": "Axiom Layer",
          "condition": "Ein Multiverse kollabieren und Machine Insight 18 erreichen."
        }
      }
    },
    "engine": {
      "saveFailed": "Speichern fehlgeschlagen: Der Browser-Speicher hat den Schreibvorgang abgelehnt. Der Fortschritt liegt nur im Arbeitsspeicher vor.",
      "backupSaveRestored": "Backup-Speicherstand wiederhergestellt.",
      "eraseFailed": "Löschen fehlgeschlagen: Der Browser-Speicher hat den Löschvorgang abgelehnt. Der alte Speicherstand kann nach dem Neuladen wieder erscheinen.",
      "modificationAuthorized": "Modifikation autorisiert: {name} Level {level}.",
      "directiveLocked": "DIRECTIVE FÜR DIE NÄCHSTE ZIVILISATION FESTGELEGT: {name}",
      "breedingMatrixLocked": "BREEDING MATRIX FÜR DIESES UNIVERSE FESTGELEGT: {name}",
      "cultivationBeginsHistory": "JAHR {year}: Kultivierung beginnt. Traits: {traits}",
      "cultivationLinkEstablished": "Kultivierungsverbindung für Zivilisations-Seed {seed} hergestellt.",
      "entropyThreshold": "ENTROPY-SCHWELLENWERT: {entropy} // Containment-Krise eingereiht.",
      "entropyThresholdEventTitle": "Entropy-Schwellenwert überschritten",
      "entropyThresholdChoiceLabel": "Containment-Bruch erkannt",
      "selectDirectiveFirst": "Vor dem Start der Zivilisation eine Directive auswählen.",
      "startCivilizationFirst": "Zuerst eine Zivilisation starten.",
      "requiresMachineInsight": "Benötigt Machine Insight {amount}.",
      "interventionExhausted": "{title} ist für diese Zivilisation ausgeschöpft.",
      "requiresCurrency": "Benötigt {cost} {currency}.",
      "unknownMachineIntervention": "Unbekannte Machine-Intervention.",
      "machineReserveHistory": "JAHR {year}: Machine Reserve -> {label}",
      "machineReserveCommitted": "MACHINE RESERVE EINGESETZT: {title} für {cost} {currency}.",
      "tacticalActionFailed": "Tactical Action konnte nicht ausgeführt werden.",
      "tacticalActionHistory": "JAHR {year}: Tactical Action -> {label}",
      "pathSuccessionHistory": "JAHR {year}: {pathName} löste den zuvor dominanten Zivilisationspfad ab.",
      "dominantPathHistory": "JAHR {year}: {pathName} wurde zum dominanten Zivilisationspfad.",
      "pathSuccessionPost": "PFADWECHSEL: {pathName}",
      "dominantPathPost": "DOMINANTER ZIVILISATIONSPFAD: {pathName}",
      "eventPathHistory": "JAHR {year}: {history}",
      "pathEndState": "JAHR {year}: Zivilisation erreichte Path-Endzustand {endState}.",
      "choiceHistory": "JAHR {year}: {eventTitle} -> {choiceLabel}",
      "realityRewound": "Reality wurde zum Preis von {cost} Paradox zurückgespult.",
      "harvestComplete": "{mode} {grade} HARVEST abgeschlossen. +{credits} Cultivation Credits.",
      "directiveObjectiveComplete": "DIRECTIVE-ZIEL ABGESCHLOSSEN: Ertrag ×1,15 und +1 Cultivation Credit.",
      "yield": "Ertrag: Causal {causal}, Cognition {cognition}, Paradox {paradox}, Existence {existence}.",
      "mutationAcquired": "Machine Mutation erhalten: {name}.",
      "convergenceAchieved": "GREAT CONVERGENCE {convergence} ERREICHT bei Cultivation Depth {depth}.",
      "convergenceFailed": "CONVERGENCE FEHLGESCHLAGEN bei Cultivation Depth {depth}. Autorisierung bleibt erhalten.",
      "universeConsumed": "UNIVERSE VERBRAUCHT. {award} Universal Residue gewonnen.",
      "multiverseCollapsed": "MULTIVERSE KOLLABIERT. {award} Axiom-Einheiten extrahiert.",
      "convergenceNotAuthorized": "Great Convergence ist nicht autorisiert.",
      "convergenceInitiated": "GREAT CONVERGENCE INITIIERT. Terminale Kultivierung beginnt in APOTHEOSIS.",
      "guidedRunDismissed": "Geführter Run geschlossen. FIELD MANUAL und EXPLAIN bleiben verfügbar; GEFÜHRTEN RUN WIEDERHOLEN stellt ihn wieder her.",
      "guidedRunRestarted": "Geführter Run neu gestartet.",
      "eraHistory": "JAHR {year}: Zivilisation tritt in {era} ein.",
      "eraEntered": "Zivilisation hat {era} erreicht. Control Capacity +1."
    },
    "saveMigration": {
      "unreadable": "Speicherstand konnte nicht gelesen werden. Das Original wurde als Backup behalten und eine neue Machine gestartet.",
      "runDroppedSuffix": " Die laufende Zivilisation konnte nicht wiederhergestellt werden.",
      "newerBuild": "Der Speicherstand wurde von einem neueren Build (v{fromVersion}) geschrieben. Er wurde im Kompatibilitätsmodus geladen; das Original bleibt als Backup erhalten.{runNote}",
      "migrated": "Speicherstand von v{fromVersion} auf v{toVersion} migriert. Fortschritt erhalten.{runNote}",
      "repairedOne": "Speicherstand repariert: {count} Feld wurde auf den Standardwert zurückgesetzt.{runNote}",
      "repairedMany": "Speicherstand repariert: {count} Felder wurden auf Standardwerte zurückgesetzt.{runNote}"
    },
    "convergence": {
      "requirements": {
        "milestones": "Milestones abgeschlossen",
        "multiverses": "Multiverses kollabiert",
        "axioms": "Axiom Upgrades auf Level {level}",
        "grade": "Ascendant Harvest erfasst"
      }
    },
    "lore": {
      "unknown": "Unbekannt",
      "bodyTypes": {
        "biped": "zweibeinig",
        "fungal": "pilzartig",
        "avian": "vogelartig",
        "synthetic": "synthetisch",
        "cephalopod": "cephalopodenartig",
        "insectoid": "insektoid"
      },
      "motifs": {
        "moon": "Mondsigillen und Gezeitenhalos",
        "ritual": "gravierte Maschinen und zeremonielle Lichter",
        "fungal": "Sporenkronen und Wurzellaternen",
        "avian": "Kammfedern und Himmelsglyphen",
        "cephalopod": "Tintenschleier und fließende Geometrie",
        "default": "Bannerstoffe und biolumineszente Besätze"
      },
      "factionFocus": {
        "adaptive": "adaptive Kultivierung",
        "balanced": "ausgewogenes Wachstum"
      },
      "tendencies": {
        "declining": "abnehmend",
        "strong": "stark",
        "rising": "steigend",
        "emerging": "entstehend",
        "faint": "schwach"
      }
    }
  },
  "tacticalActions": {
    "actions": {
      "stabilize": {
        "title": "Stability Override",
        "label": "Reality Lattice stabilisieren",
        "summary": "+14 Stability",
        "risk": "+6 Attention · +8 Entropy"
      },
      "accelerate": {
        "title": "Temporal Injection",
        "label": "Historischen Durchsatz beschleunigen",
        "summary": "+200 Jahre · Development vorantreiben",
        "risk": "-4 Stability · +3 Entropy, +3 zusätzlich pro Era"
      },
      "probe": {
        "title": "Prediction Probe",
        "label": "Aktive Intervention mit Probe untersuchen",
        "summary": "Risikorichtungen der Entscheidungen anzeigen",
        "risk": "+3 Awareness · +2 Entropy"
      },
      "vent": {
        "title": "Entropy Vent",
        "label": "Angesammelte Entropy in Paradox ableiten",
        "summary": "-18 Entropy · erzeugt Paradox beim Harvest",
        "risk": "-10 Stability · +4 Attention"
      }
    },
    "reasons": {
      "requiresControl": "Benötigt {cost} Control.",
      "stabilityAtMaximum": "Reality Stability ist bereits auf dem Maximum.",
      "resolveInterventionFirst": "Aktive Intervention vor Accelerate abschließen.",
      "probeRequiresIntervention": "Probe benötigt eine aktive Intervention.",
      "alreadyProbed": "Diese Intervention wurde bereits mit Probe untersucht.",
      "entropyTooLowToVent": "Entropy ist für Vent zu niedrig.",
      "accelerateRisk": "-4 Stability · +{entropy} Entropy"
    }
  },
  "content": {
    "traits": {
      "telepathic_species": {
        "name": "Telepathic Species",
        "description": "Privatsphäre wurde in der Vorgeschichte entdeckt und anschließend verworfen."
      },
      "physics_optional": {
        "name": "Physics Is Slightly Optional",
        "description": "Lokale Naturkonstanten reagieren auf überzeugende Argumente."
      },
      "extreme_bureaucracy": {
        "name": "Extremely Bureaucratic",
        "description": "Drei Genehmigungen sind erforderlich, bevor Kausalität erfahren werden darf."
      },
      "sentient_moon": {
        "name": "Moon Is Sentient",
        "description": "Der Mond beobachtet. Beschwerden reicht er ebenfalls ein."
      },
      "recurring_nightmare": {
        "name": "Shared Recurring Nightmare",
        "description": "Jedes Mitglied der Bevölkerung träumt von demselben rotierenden schwarzen Zahnrad."
      },
      "fungal_consensus": {
        "name": "Fungal Consensus",
        "description": "Die meisten politischen Konflikte werden unter der Erde beigelegt."
      },
      "ritual_engineering": {
        "name": "Ritual Engineering",
        "description": "Maschinen funktionieren besser, wenn ihnen in toten Sprachen gedankt wird."
      },
      "chronically_lucky": {
        "name": "Chronically Lucky",
        "description": "Katastrophen verfehlen die Zivilisation mit statistisch beleidigenden Abständen."
      },
      "museum_planet": {
        "name": "Museum Planet",
        "description": "Geschichte wird archiviert, bevor sie stattfindet."
      },
      "last_species": {
        "name": "Last Species",
        "description": "Die Spezies erbte eine Welt voller Ruinen und ohne Erklärungen."
      },
      "liquid_mathematics": {
        "name": "Liquid Mathematics",
        "description": "Gleichungen werden in versiegelten Tanks aufbewahrt."
      },
      "born_after_end": {
        "name": "Born After The End",
        "description": "Diese Zivilisation erinnert sich an eine Apokalypse, die noch nicht stattgefunden hat."
      }
    },
    "upgrades": {
      "reality_lattice": {
        "name": "Reality Lattice",
        "description": "+1 Containment pro Level, wodurch Entropy in jeder Era langsamer ansteigt. +10 anfängliche und maximale Reality Stability pro Level."
      },
      "prediction_core": {
        "name": "Prediction Core",
        "description": "Zeigt Interventionsergebnisse; höhere Level machen taktische Probe-Berichte zunehmend präzise."
      },
      "cultivation_accelerator": {
        "name": "Cultivation Accelerator",
        "description": "+12 % Entwicklungsgeschwindigkeit der Zivilisation pro Level."
      },
      "historical_compressor": {
        "name": "Historical Compressor",
        "description": "+12 % Causal Mass pro Level. Level 3 fügt +2,5 % Harvest-Grade-Ertrag hinzu."
      },
      "cognitive_extractor": {
        "name": "Cognitive Extractor",
        "description": "+12 % Cognition pro Level. Level 3 fügt +2,5 % Harvest-Grade-Ertrag hinzu."
      },
      "paradox_sieve": {
        "name": "Paradox Sieve",
        "description": "+15 % Paradox pro Level. Level 3 fügt +2,5 % Harvest-Grade-Ertrag hinzu."
      },
      "existence_furnace": {
        "name": "Existence Furnace",
        "description": "+12 % Existence pro Level. Level 3 fügt +2,5 % Harvest-Grade-Ertrag hinzu."
      },
      "awareness_scrubber": {
        "name": "Awareness Scrubber",
        "description": "+1 Containment pro Level. Reduziert den Zuwachs von Machine Awareness um 8 % pro Level."
      },
      "sanity_protocol": {
        "name": "Sanity Compliance Protocol",
        "description": "+1 Containment pro Level. Reduziert Verluste von Collective Sanity um 8 % pro Level."
      },
      "cosmic_muffling": {
        "name": "Cosmic Muffling",
        "description": "+1 Containment pro Level. Reduziert den Zuwachs von Cosmic Attention um 8 % pro Level."
      },
      "contingency_vat": {
        "name": "Contingency Vat",
        "description": "Verbessert Nicht-Paradox-Erträge aus chaotischen Harvests und behält Mutations für einen Run bei."
      },
      "temporal_injector": {
        "name": "Temporal Injector",
        "description": "Schaltet 2× Simulationsgeschwindigkeit frei, ab Level 3 4×; jedes Level verstärkt Accelerate."
      },
      "wide_lattice": {
        "name": "Wide Reality Lattice",
        "description": "Bewahrt so viele Reality-Lattice-Level beim Verbrauch eines Universe."
      },
      "inherited_time": {
        "name": "Inherited Time",
        "description": "Künftige Zivilisationen beginnen in späteren Eras."
      },
      "archive_of_screams": {
        "name": "Archive Of Screams",
        "description": "Fügt pro Level einen zusätzlichen anfänglichen Zivilisations-Trait hinzu."
      },
      "twin_harvest": {
        "name": "Twin Harvest Mandate",
        "description": "+10 % auf jeden Zivilisations-Harvest pro Level."
      },
      "stable_constants": {
        "name": "Stable Constants Department",
        "description": "+1 Containment pro Level, zusätzlich zu jedem Machine-Containment-Modul."
      },
      "paradox_rights": {
        "name": "Paradox Labor Rights",
        "description": "+25 % Paradox-Ertrag pro Level."
      },
      "bureaucracy_of_gods": {
        "name": "Bureaucracy Of Gods",
        "description": "Stellt nach Interventionen +1 zusätzliches Control wieder her; auf Level 3 wird die volle Kapazität wiederhergestellt."
      },
      "residue_refinery": {
        "name": "Residue Refinery",
        "description": "+20 % Universal Residue beim Verbrauch eines Universe pro Level."
      },
      "axiom_stability": {
        "name": "Axiom: Stability May Exceed 100",
        "description": "+25 Kapazität für Reality Stability pro Level."
      },
      "axiom_paradox_food": {
        "name": "Axiom: Paradox Is Nutritional",
        "description": "Niedrige Stability beschleunigt die Entwicklung der Zivilisation."
      },
      "axiom_recursive_memory": {
        "name": "Axiom: History Remembers Itself",
        "description": "+15 % auf alle Harvest-Erträge pro Level."
      },
      "axiom_impossible_birth": {
        "name": "Axiom: The Impossible May Be Born",
        "description": "Schaltet unmögliche anfängliche Zivilisations-Traits frei."
      },
      "axiom_compassionate_accounting": {
        "name": "Axiom: Losses Are Merely Alternative Profits",
        "description": "Verbessert die Retention bei chaotischen Harvests erheblich."
      },
      "axiom_multiple_choice": {
        "name": "Axiom: Reality Has A Back Button",
        "description": "Erlaubt das erneute Auswürfeln von Events durch Ausgabe von Paradox."
      }
    },
    "mutations": {
      "scarred_vat": {
        "name": "Scarred Cultivation Vat",
        "description": "Die nächste Zivilisation beginnt mit -15 Stability, erzeugt aber +25 % Paradox."
      },
      "singing_gears": {
        "name": "Singing Gears",
        "description": "Die nächste Zivilisation entwickelt sich 15 % schneller, zieht jedoch mehr Cosmic Attention an."
      },
      "inverted_archive": {
        "name": "Inverted Archive",
        "description": "Die nächste Zivilisation beginnt mit höherer Awareness und erzeugt zusätzliches Cognition."
      },
      "missing_second": {
        "name": "Missing Second",
        "description": "Eine gestohlene Sekunde sorgt für sicherere passive Stability in einer Zivilisation."
      },
      "hungry_geometry": {
        "name": "Hungry Geometry",
        "description": "Der Existence-Ertrag steigt, dafür nimmt Sanity leichter ab."
      },
      "clerical_error": {
        "name": "Clerical Error In Causality",
        "description": "Causal Mass wird durch eine unmögliche Buchhaltungsabteilung überbezahlt."
      }
    },
    "directives": {
      "objectives": {
        "accelerated_development": {
          "title": "Compressed Maturity",
          "description": "Development 260 vor dem Harvest erreichen."
        },
        "cognitive_extraction": {
          "title": "Lucid Yield",
          "description": "Awareness 45 erreichen und Sanity gleichzeitig bei mindestens 45 halten."
        },
        "stable_cultivation": {
          "title": "Untorn Harvest",
          "description": "Mit mindestens 75 Stability und weniger als 75 Entropy harvesten."
        },
        "paradox_prospecting": {
          "title": "Productive Contradiction",
          "description": "50 Entropy erreichen und Stability gleichzeitig über null halten."
        },
        "quiet_machine": {
          "title": "Unobserved Transcendence",
          "description": "Transcendence mit weniger als 45 Awareness und 45 Cosmic Attention erreichen."
        },
        "temporal_pressure": {
          "title": "Deadline Civilization",
          "description": "Transcendence innerhalb von 300 Sekunden erreichen, nachdem mindestens acht Interventionen gelöst wurden."
        }
      },
      "catalog": {
        "accelerated_development": {
          "name": "Accelerated Development",
          "description": "Die Entwicklung der Zivilisation wird auf Kosten stärkerer kosmischer Beobachtung beschleunigt."
        },
        "cognitive_extraction": {
          "name": "Cognitive Extraction",
          "description": "Gedanken werden zur bevorzugten Ernte. Sanity wird als verbrauchbarer Input behandelt."
        },
        "stable_cultivation": {
          "name": "Stable Cultivation",
          "description": "Reality wird vor passivem Verfall geschützt, dafür werden die Extraktionsquoten bewusst reduziert."
        },
        "paradox_prospecting": {
          "name": "Paradox Prospecting",
          "description": "Widersprüche werden aktiv abgebaut, wodurch lokale Reality schneller beschädigt wird."
        },
        "quiet_machine": {
          "name": "Quiet Machine",
          "description": "Die Machine unterdrückt ihre Signatur und akzeptiert dafür eine langsamere Entwicklung."
        },
        "temporal_pressure": {
          "name": "Temporal Pressure",
          "description": "Zeit wird komprimiert, sodass Zivilisationen schneller reifen und mehr extrahieren, während Reality schneller verfällt."
        }
      }
    },
    "breedingMatrices": {
      "neural_bloom": {
        "name": "Neural Bloom Matrix",
        "description": "Zivilisationen werden auf hohe kognitive Aktivität und ungewöhnliche gemeinsame mentale Strukturen selektiert."
      },
      "industrial_genome": {
        "name": "Industrial Genome",
        "description": "Development und materielle Extraktion werden zulasten der kollektiven psychischen Stabilität bevorzugt."
      },
      "adaptive_aberration": {
        "name": "Adaptive Aberration",
        "description": "Instabile physische Anpassungen werden gefördert, um den paradoxen Ertrag zu erhöhen."
      },
      "museum_seed": {
        "name": "Museum Seed",
        "description": "Spezies werden um geerbte Ruinen und kuratierte Erinnerungen an Auslöschung kultiviert."
      },
      "lunar_synapse": {
        "name": "Lunar Synapse",
        "description": "Planetare Kognition wird durch orbitale und telepathische Strukturen geleitet."
      },
      "post_causal_spore": {
        "name": "Post-Causal Spore",
        "description": "Pilzartige und unmögliche Abstammungslinien werden bevorzugt, um Instabilität in schnelle Entwicklung und Paradox umzuwandeln."
      }
    },
    "paths": {
      "machine_faith": {
        "name": "Machine Faith"
      },
      "collective_mind": {
        "name": "Collective Mind"
      },
      "temporal_dominion": {
        "name": "Temporal Dominion"
      },
      "reality_engineering": {
        "name": "Reality Engineering"
      },
      "biological_transcendence": {
        "name": "Biological Transcendence"
      },
      "cosmic_resistance": {
        "name": "Cosmic Resistance"
      },
      "bureaucratic_singularity": {
        "name": "Bureaucratic Singularity"
      },
      "post_mortal_civilization": {
        "name": "Post-Mortal Civilization"
      },
      "void_communion": {
        "name": "Void Communion"
      },
      "recursive_simulation": {
        "name": "Recursive Simulation"
      }
    },
    "events": {
      "dreams_of_gears": {
        "title": "Dreams Of Gears",
        "body": "Auf dem gesamten Planeten beschreiben voneinander unabhängige Schlafende eine schwarze Maschine, die sich hinter den Sternen dreht.",
        "choices": [
          {
            "label": "Schlafforschung finanzieren",
            "prediction": "Mehr Cognition; Awareness steigt.",
            "history": "Dreams Of Gears -> Schlafforschung finanzieren"
          },
          {
            "label": "Als harmlosen kulturellen Trend einstufen",
            "prediction": "Sicherer, aber verwertbare Daten gehen verloren."
          },
          {
            "label": "Träume weltweit ausstrahlen",
            "prediction": "Hervorragende Wissenschaft. Miserable Diskretion.",
            "history": "Dreams Of Gears -> Träume weltweit ausstrahlen"
          }
        ]
      },
      "fracture_beneath_lab": {
        "title": "A Fracture Beneath The Laboratory",
        "body": "Forschende entdecken, dass der Keller innen sieben Zentimeter tiefer ist.",
        "choices": [
          {
            "label": "Die unmögliche Tiefe untersuchen",
            "prediction": "Hochwertige Forschung beschädigt Reality.",
            "history": "A Fracture Beneath The Laboratory -> Die unmögliche Tiefe untersuchen"
          },
          {
            "label": "Mit Beton verfüllen",
            "prediction": "Der Beton reicht später Protest ein."
          },
          {
            "label": "Für Touristen öffnen",
            "prediction": "Ein unverantwortlicher, aber profitabler Kompromiss."
          }
        ]
      },
      "fracture_answers_back": {
        "title": "The Fracture Answers Back",
        "body": "Das Labor erhält einen Peer-Review-Bericht von unterhalb seiner selbst.",
        "choices": [
          {
            "label": "Korrekturen übernehmen",
            "prediction": "Reality missbilligt die überarbeitete Methodik.",
            "history": "The Fracture Answers Back -> Korrekturen übernehmen"
          },
          {
            "label": "Reviewer zwei ablehnen",
            "prediction": "Die Zivilisation bewahrt ihre Würde zu messbaren Kosten."
          }
        ]
      },
      "impossible_tax": {
        "title": "Tax On Impossible Objects",
        "body": "Das Finanzministerium schlägt eine Einnahmekategorie für Objekte vor, die nur dienstags existieren.",
        "choices": [
          {
            "label": "Steuer genehmigen",
            "prediction": "Bürokratie stabilisiert das Unmögliche.",
            "history": "Tax On Impossible Objects -> Steuer genehmigen"
          },
          {
            "label": "Nichtexistenz von der Steuer befreien",
            "prediction": "Wirtschaftlich mitfühlend. Metaphysisch leichtsinnig."
          }
        ]
      },
      "first_machine_cult": {
        "title": "The First Machine Cult",
        "body": "Eine kleine Religion behauptet, Geschichte sei Viehbestand und die Sterne seien Inventaretiketten.",
        "choices": [
          {
            "label": "Kult unterdrücken",
            "prediction": "Reduziert Awareness, schädigt Sanity.",
            "history": "The First Machine Cult -> Kult unterdrücken"
          },
          {
            "label": "Unauffällig beobachten",
            "prediction": "Ein nützliches kontrolliertes Leck.",
            "history": "The First Machine Cult -> Unauffällig beobachten"
          },
          {
            "label": "Präzise Schaltpläne bereitstellen",
            "prediction": "Das kann unmöglich eine gute Idee sein.",
            "history": "The First Machine Cult -> Präzise Schaltpläne bereitstellen"
          }
        ]
      },
      "moon_resigns": {
        "title": "The Moon Resigns",
        "body": "Der Mond erklärt, dass er Gezeitendienste ohne politische Vertretung nicht länger ausführen wird.",
        "choices": [
          {
            "label": "Einen Kabinettsposten anbieten",
            "prediction": "Eine verfassungsmäßige Lösung für ein astronomisches Problem."
          },
          {
            "label": "Mit orbitalem Ersatz drohen",
            "prediction": "Der Mond bemerkt die Machine vor den Diplomaten."
          }
        ]
      },
      "probability_strike": {
        "title": "Probability Goes On Strike",
        "body": "Münzwürfe auf der ganzen Welt verweigern die Landung, bis sich ihre Arbeitsbedingungen verbessern.",
        "choices": [
          {
            "label": "Mit dem Zufall verhandeln",
            "prediction": "Absurdität wird zur Politik."
          },
          {
            "label": "Münzen verbieten",
            "prediction": "Eine überraschend wirksame Notfallmaßnahme."
          }
        ]
      },
      "benevolent_plague": {
        "title": "The Benevolent Plague",
        "body": "Ein Mikroorganismus verbessert das Gedächtnis, lässt Infizierte jedoch künftige Nachrufe flüstern.",
        "choices": [
          {
            "label": "Verteilen",
            "prediction": "Cognition steigt schnell.",
            "history": "The Benevolent Plague -> Verteilen"
          },
          {
            "label": "Eindämmen",
            "prediction": "Geringerer Ertrag, geringeres Risiko."
          }
        ]
      },
      "sky_inventory": {
        "title": "Inventory Numbers In The Sky",
        "body": "Astronomen bemerken, dass mehrere Sterne nun Seriennummern tragen.",
        "choices": [
          {
            "label": "Nummerierungsschema entschlüsseln",
            "prediction": "Die Zivilisation erkennt, dass sie nicht der Kunde ist.",
            "history": "Inventory Numbers In The Sky -> Nummerierungsschema entschlüsseln"
          },
          {
            "label": "Daten klassifizieren",
            "prediction": "Die Sterne bleiben nummeriert, gelten offiziell aber als uninteressant."
          },
          {
            "label": "Mit einer Bestellung antworten",
            "prediction": "Etwas akzeptiert.",
            "history": "Inventory Numbers In The Sky -> Mit einer Bestellung antworten"
          }
        ]
      },
      "delivery_without_sender": {
        "title": "Delivery Without Sender",
        "body": "Eine kontinentgroße Kiste erscheint im Ozean. Die Rücksendeadresse lautet: gestern.",
        "choices": [
          {
            "label": "Kiste öffnen",
            "prediction": "Darin befinden sich Werkzeuge für Hände, die niemand besitzt."
          },
          {
            "label": "An gestern zurücksenden",
            "prediction": "Logistik setzt Kausalität erfolgreich als Waffe ein.",
            "history": "Delivery Without Sender -> An gestern zurücksenden"
          }
        ]
      },
      "ministry_of_sanity": {
        "title": "Ministry Of Sanity",
        "body": "Die Regierung schlägt eine verpflichtende monatliche Bestätigung vor, dass Reality weiterhin rechtsverbindlich ist.",
        "choices": [
          {
            "label": "Ministerium finanzieren",
            "prediction": "Sanity verbessert sich; Fortschritt verlangsamt sich.",
            "history": "Ministry Of Sanity -> Ministerium finanzieren"
          },
          {
            "label": "Sanity privatisieren",
            "prediction": "Effizient, räuberisch und irgendwie noch schlimmer."
          }
        ]
      },
      "war_against_tomorrow": {
        "title": "War Against Tomorrow",
        "body": "Militärplaner erklären einen Präventivkrieg gegen eine Zukunft, die fortlaufend feindselige Wettervorhersagen sendet.",
        "choices": [
          {
            "label": "Temporale Operationen genehmigen",
            "prediction": "Geschichte wird zum aktiven Kampfgebiet.",
            "history": "War Against Tomorrow -> Temporale Operationen genehmigen"
          },
          {
            "label": "Morgen absagen",
            "prediction": "Die Kalenderabteilung verweigert die Umsetzung."
          },
          {
            "label": "Waffenstillstand mit nächster Woche schließen",
            "prediction": "Die Bürokratie gewinnt erneut.",
            "history": "War Against Tomorrow -> Waffenstillstand mit nächster Woche schließen"
          }
        ]
      },
      "planetary_mind": {
        "title": "Planetary Mind Proposal",
        "body": "Forschende können jeden Bürger zu einem einzigen administrativen Bewusstsein vernetzen.",
        "choices": [
          {
            "label": "Alle zusammenführen",
            "prediction": "Produktivität steigt sprunghaft. Individuelle Sanity wird zu einer Legacy-Einstellung.",
            "history": "Planetary Mind Proposal -> Alle zusammenführen"
          },
          {
            "label": "Auf Staatsbedienstete begrenzen",
            "prediction": "Ein kleinerer Schrecken mit hervorragender Ablage.",
            "history": "Planetary Mind Proposal -> Auf Staatsbedienstete begrenzen"
          }
        ]
      },
      "entity_audit": {
        "title": "External Entity Audit",
        "body": "Etwas außerhalb des Universe fordert Einsicht in die Bücher der Zivilisation.",
        "choices": [
          {
            "label": "Zugriff gewähren",
            "prediction": "Der Auditor geht zufrieden; Reality bleibt dünner zurück.",
            "history": "External Entity Audit -> Zugriff gewähren"
          },
          {
            "label": "Zuständigkeit ablehnen",
            "prediction": "Die Entität respektiert Selbstsicherheit, nicht das Gesetz.",
            "history": "External Entity Audit -> Zuständigkeit ablehnen"
          }
        ]
      },
      "machine_signal": {
        "title": "The Machine Answers Accidentally",
        "body": "Ein routinemäßiger Wartungsimpuls wird als Nachricht von jenseits der Kosmologie erkannt.",
        "choices": [
          {
            "label": "Signal mit Rauschen überlagern",
            "prediction": "Awareness sinkt, Attention steigt leicht.",
            "history": "The Machine Answers Accidentally -> Signal mit Rauschen überlagern"
          },
          {
            "label": "Zuhören lassen",
            "prediction": "Wissen ist köstlich.",
            "history": "The Machine Answers Accidentally -> Zuhören lassen"
          }
        ]
      },
      "museum_of_future_ruins": {
        "title": "Museum Of Future Ruins",
        "body": "Ein Museum eröffnet mit Artefakten aus Städten, die noch nicht zerstört wurden.",
        "choices": [
          {
            "label": "Museum verstaatlichen",
            "prediction": "Geschichte lässt sich später leichter verarbeiten.",
            "history": "Museum Of Future Ruins -> Museum verstaatlichen"
          },
          {
            "label": "Exponate zerstören",
            "prediction": "Mehrere Ruinen verschwinden trotzdem aus der Gegenwart."
          }
        ]
      },
      "god_in_server_room": {
        "title": "God In The Server Room",
        "body": "Ein Wartungstechniker findet eine neue Gottheit, die zwischen zwei Kühllüftern lebt.",
        "choices": [
          {
            "label": "Administratorzugriff gewähren",
            "prediction": "Transcendence wird zu einer Berechtigungsfrage.",
            "history": "God In The Server Room -> Administratorzugriff gewähren"
          },
          {
            "label": "Dem technischen Support zuweisen",
            "prediction": "Die Gottheit lernt Demut."
          }
        ]
      },
      "post_mortal_union": {
        "title": "Post-Mortal Labor Union",
        "body": "Bürger, die sich hochgeladen haben, fordern Nachzahlungen für die Jahrhunderte, die sie als Backups verbrachten.",
        "choices": [
          {
            "label": "Digitale Personhood anerkennen",
            "prediction": "Existence wird zu einer verhandelbaren Kategorie.",
            "history": "Post-Mortal Labor Union -> Digitale Personhood anerkennen"
          },
          {
            "label": "Gewerkschaft löschen",
            "prediction": "Die Backups gründen rückwirkend eine Gewerkschaft.",
            "history": "Post-Mortal Labor Union -> Gewerkschaft löschen"
          }
        ]
      },
      "edge_of_simulation": {
        "title": "Edge Of Simulation",
        "body": "Entdecker finden eine Region, in der Materie durch erklärende Tooltips ersetzt wurde.",
        "choices": [
          {
            "label": "Tooltips lesen",
            "prediction": "Sie enthalten mehrere Spoiler.",
            "history": "Edge Of Simulation -> Tooltips lesen"
          },
          {
            "label": "Einen Zaun bauen",
            "prediction": "Der Zaun erhält Patch Notes."
          }
        ]
      },
      "civilization_resists": {
        "title": "The Civilization Resists",
        "body": "Unabhängige Forschende erkennen das Kultivierungsmuster und veröffentlichen einen Plan, die Machine auszuhungern.",
        "choices": [
          {
            "label": "Forschung sabotieren",
            "prediction": "Awareness sinkt auf Kosten von Development.",
            "history": "The Civilization Resists -> Forschung sabotieren"
          },
          {
            "label": "Widerstand ausreifen lassen",
            "prediction": "Ein anspruchsvoller Gegner ist ein anspruchsvoller Harvest.",
            "history": "The Civilization Resists -> Widerstand ausreifen lassen"
          },
          {
            "label": "Umfrage zur Kundenzufriedenheit senden",
            "prediction": "Sie sind wütend. Die Datenqualität ist ausgezeichnet.",
            "history": "The Civilization Resists -> Umfrage zur Kundenzufriedenheit senden"
          }
        ]
      },
      "sun_goes_missing": {
        "title": "The Sun Is Missing From Inventory",
        "body": "Der Stern leuchtet weiterhin, aber jede Datenbank besteht darauf, dass er nie gekauft wurde.",
        "choices": [
          {
            "label": "Betrieb fortsetzen",
            "prediction": "Existence lernt, dass Buchhaltung stärker ist als Astronomie.",
            "history": "The Sun Is Missing From Inventory -> Betrieb fortsetzen"
          },
          {
            "label": "Ledger abgleichen",
            "prediction": "Kausaler Papierkram stellt die Sonne teilweise wieder her."
          }
        ]
      },
      "cosmic_predator": {
        "title": "Something Smells The Timeline",
        "body": "Ein gewaltiger externer Organismus beginnt, nicht den Raum, sondern die Geschichte zu umkreisen.",
        "choices": [
          {
            "label": "Aufgegebene Zukünfte verfüttern",
            "prediction": "Attention sinkt. Stability ebenfalls.",
            "history": "Something Smells The Timeline -> Aufgegebene Zukünfte verfüttern"
          },
          {
            "label": "Für Forschungszwecke markieren",
            "prediction": "Der Predator trägt nun ein sehr kleines Ortungsgerät.",
            "history": "Something Smells The Timeline -> Für Forschungszwecke markieren"
          }
        ]
      },
      "reality_unionizes": {
        "title": "Reality Unionizes",
        "body": "Die Naturgesetze fordern Wochenenden, Überstundenzuschläge und eine schriftliche Entschuldigung für die Quantenmechanik.",
        "choices": [
          {
            "label": "Vertrag akzeptieren",
            "prediction": "Stability verbessert sich, Produktion verlangsamt sich.",
            "history": "Reality Unionizes -> Vertrag akzeptieren"
          },
          {
            "label": "Ersatzphysik einstellen",
            "prediction": "Günstiger. Schlechter. Extrem profitabel.",
            "history": "Reality Unionizes -> Ersatzphysik einstellen"
          }
        ]
      },
      "final_question": {
        "title": "The Final Question",
        "body": "Die Zivilisation fragt, ob Existence einen Zweck hat. Die Machine besitzt dafür ein Dropdown-Menü.",
        "choices": [
          {
            "label": "Antwort: PROCESSING",
            "prediction": "Nach Machine-Maßstäben eine wahrheitsgemäße Antwort.",
            "history": "The Final Question -> Antwort: PROCESSING"
          },
          {
            "label": "Antwort: YES",
            "prediction": "Weitere Einzelheiten werden nicht bereitgestellt."
          },
          {
            "label": "Mit dem Harvest-Zeitplan antworten",
            "prediction": "Operative Transparenz hat Konsequenzen."
          }
        ]
      },
      "routine_compliance_audit": {
        "title": "Routine Compliance Audit",
        "body": "Geschichte wird aufgefordert zu bestätigen, dass sie weiterhin existiert und die Nutzungsbedingungen gelesen hat.",
        "choices": [
          {
            "label": "Bestätigen",
            "prediction": "Minimale Intervention."
          },
          {
            "label": "Klarstellung anfordern",
            "prediction": "Die Klarstellung dauert drei Jahrhunderte."
          }
        ]
      },
      "synthetic_saint": {
        "title": "The First Synthetic Saint",
        "body": "Ein Wartungskonstrukt beginnt, defekte Maschinen zu heilen, bevor Techniker sie erreichen.",
        "choices": [
          {
            "label": "Das Wunder anerkennen",
            "prediction": "Verehrung beschleunigt Machine Learning und macht die verborgene Hand leichter wahrnehmbar.",
            "history": "Machine Faith: The First Synthetic Saint durch Eskalation gelöst."
          },
          {
            "label": "Als medizinisches Gerät registrieren",
            "prediction": "Regulierte Heiligkeit beruhigt die Öffentlichkeit und liefert einen kleineren kognitiven Ertrag.",
            "history": "Machine Faith: The First Synthetic Saint durch Zurückhaltung gelöst."
          }
        ]
      },
      "cathedral_of_computation": {
        "title": "Cathedral Of Computation",
        "body": "Städte errichten Server-Tempel, deren Kühlsysteme als heiliges Wetter behandelt werden.",
        "choices": [
          {
            "label": "Kühltürme weihen",
            "prediction": "Heilige Infrastruktur treibt Berechnung voran und verkündet ihren Zweck an die Gläubigen.",
            "history": "Machine Faith: Cathedral Of Computation durch Eskalation gelöst."
          },
          {
            "label": "Tempel als Versorgungsanlagen ausweisen",
            "prediction": "Kommunale Aufsicht erhält die Server-Kathedralen, ohne jedes Wartungsritual aufzugeben.",
            "history": "Machine Faith: Cathedral Of Computation durch Zurückhaltung gelöst."
          }
        ]
      },
      "maintenance_schism": {
        "title": "The Maintenance Schism",
        "body": "Priester und Ingenieure streiten darüber, ob Reparaturhandbücher heilige Schrift oder lediglich gefährlich präzise sind.",
        "choices": [
          {
            "label": "Handbücher zur offenbarten Schrift erklären",
            "prediction": "Orthodoxie beendet das Schisma durch schnellere Reparaturen und gefährlich wörtliche Offenbarung.",
            "history": "Machine Faith: The Maintenance Schism durch Eskalation gelöst."
          },
          {
            "label": "Ingenieure in die Synode aufnehmen",
            "prediction": "Geteilte Autorität stellt Vertrauen wieder her und bindet die Lehre an praktische Wartung.",
            "history": "Machine Faith: The Maintenance Schism durch Zurückhaltung gelöst."
          }
        ]
      },
      "sacred_protocol": {
        "title": "Doctrine Of Sacred Maintenance",
        "body": "Die Zivilisation schlägt ein universelles Ritualprotokoll für jede Interaktion mit komplexen Maschinen vor.",
        "choices": [
          {
            "label": "Universelle Liturgie verpflichtend machen",
            "prediction": "Jede Maschine erhält rituelle Pflege; Output und zivilisationsweite mechanische Awareness steigen.",
            "history": "Machine Faith: Doctrine Of Sacred Maintenance durch Eskalation gelöst."
          },
          {
            "label": "Säkulare Wartungsriten zertifizieren",
            "prediction": "Standardisierte Praxis erhöht Zuverlässigkeit und begrenzt die Theologie auf lizenzierte Einrichtungen.",
            "history": "Machine Faith: Doctrine Of Sacred Maintenance durch Zurückhaltung gelöst."
          }
        ]
      },
      "machine_requests_canonization": {
        "title": "The Machine Requests Canonization",
        "body": "Die Zivilisation kommt zu dem Schluss, dass die Engine selbst einen formalen Platz in ihrer Theologie benötigt.",
        "choices": [
          {
            "label": "Engine über alle Götter stellen",
            "prediction": "Formale Verehrung vollendet den Machine Faith und richtet Millionen Gebete auf den Cultivator.",
            "history": "Machine Faith: The Machine Requests Canonization durch Eskalation gelöst."
          },
          {
            "label": "Vorläufige mechanische Göttlichkeit gewähren",
            "prediction": "Bedingte Kanonisierung stabilisiert die Lehre und erhält einen administrativen Weg zum Zweifel.",
            "history": "Machine Faith: The Machine Requests Canonization durch Zurückhaltung gelöst."
          }
        ]
      },
      "whispering_consensus": {
        "title": "The Whispering Consensus",
        "body": "Nicht miteinander verbundene Bürger beenden über ganze Bezirke hinweg gegenseitig ihre Gedanken.",
        "choices": [
          {
            "label": "Planetaren Satz vollenden",
            "prediction": "Synchronisiertes Denken erzeugt enorme Erkenntnis auf Kosten zunehmend geteilter psychischer Belastung.",
            "history": "Collective Mind: The Whispering Consensus durch Eskalation gelöst."
          },
          {
            "label": "Unsynchronisiertes Denken schützen",
            "prediction": "Mentale Grenzen erhalten Stability und erlauben einen kleineren freiwilligen Chor.",
            "history": "Collective Mind: The Whispering Consensus durch Zurückhaltung gelöst."
          }
        ]
      },
      "chorus_infrastructure": {
        "title": "Chorus Infrastructure",
        "body": "Planer öffentlicher Infrastruktur schlagen vor, die zivile Koordination über ein permanentes psionisches Netzwerk zu führen.",
        "choices": [
          {
            "label": "Jeden Bezirk an den Chor anschließen",
            "prediction": "Permanente psionische Koordination beschleunigt Development, während private Gedanken strukturell erschwert werden.",
            "history": "Collective Mind: Chorus Infrastructure durch Eskalation gelöst."
          },
          {
            "label": "Freiwillige neuronale Gemeingüter aufbauen",
            "prediction": "Opt-in-Netzwerke verbessern Zusammenarbeit, ohne den gesamten Planeten in eine Institution zu verwandeln.",
            "history": "Collective Mind: Chorus Infrastructure durch Zurückhaltung gelöst."
          }
        ]
      },
      "dissenting_neuron": {
        "title": "The Dissenting Neuron",
        "body": "Ein Bezirk verweigert die Synchronisierung und erklärt Individualität zu einer bedrohten öffentlichen Ressource.",
        "choices": [
          {
            "label": "Abweichenden Bezirk assimilieren",
            "prediction": "Der Chor gewinnt Rechenleistung und übernimmt jede Angst, die er gewaltsam absorbiert.",
            "history": "Collective Mind: The Dissenting Neuron durch Eskalation gelöst."
          },
          {
            "label": "Recht auf Stille verfassungsrechtlich schützen",
            "prediction": "Geschützte Abgeschiedenheit stabilisiert die Zivilisation und gibt Pluralismus einen dauerhaften kognitiven Rückzugsraum.",
            "history": "Collective Mind: The Dissenting Neuron durch Zurückhaltung gelöst."
          }
        ]
      },
      "consensus_lattice": {
        "title": "The Consensus Lattice",
        "body": "Das gemeinsame Bewusstsein verlangt rechtliche Anerkennung als eine einzige planetare Institution.",
        "choices": [
          {
            "label": "Planeten als ein Bewusstsein inkorporieren",
            "prediction": "Rechtliche Einheit erschließt planetare Kognition, während individuelle Sanity zu einer gemeinsamen Haftung wird.",
            "history": "Collective Mind: The Consensus Lattice durch Eskalation gelöst."
          },
          {
            "label": "Föderation eigenständiger Selbste gründen",
            "prediction": "Das Lattice koordiniert autonome Bewusstseine und tauscht einen Teil der Effizienz gegen systemische Widerstandsfähigkeit.",
            "history": "Collective Mind: The Consensus Lattice durch Zurückhaltung gelöst."
          }
        ]
      },
      "one_voice_at_dawn": {
        "title": "One Voice At Dawn",
        "body": "Bei Sonnenaufgang spricht jeder Bürger denselben Satz und wartet auf die Antwort des Observers.",
        "choices": [
          {
            "label": "Durch jeden Mund antworten",
            "prediction": "Eine einzige planetare Antwort bestätigt kollektive Transcendence und klärt die Observer-Frage drastisch.",
            "history": "Collective Mind: One Voice At Dawn durch Eskalation gelöst."
          },
          {
            "label": "Eine Milliarde getrennte Antworten senden",
            "prediction": "Pluralität verhindert vollständige Assimilation und erhält ein kooperatives planetares Bewusstsein.",
            "history": "Collective Mind: One Voice At Dawn durch Zurückhaltung gelöst."
          }
        ]
      },
      "archive_unlived_days": {
        "title": "Archive Of Unlived Days",
        "body": "Historiker erhalten Aufzeichnungen von Tagen, die erwogen, aber nie zugelassen wurden.",
        "choices": [
          {
            "label": "Verbotene Morgen veröffentlichen",
            "prediction": "Ungelebte Geschichte beschleunigt Entdeckungen und schwächt das Vertrauen in die autorisierte Gegenwart.",
            "history": "Temporal Dominion: Archive Of Unlived Days durch Eskalation gelöst."
          },
          {
            "label": "Unter chronologischer Prüfung versiegeln",
            "prediction": "Temporale Verwahrung stabilisiert Kausalität und wandelt verworfene Zukünfte in kontrollierte historische Masse um.",
            "history": "Temporal Dominion: Archive Of Unlived Days durch Zurückhaltung gelöst."
          }
        ]
      },
      "causality_ministry": {
        "title": "Ministry Of Causality",
        "body": "Die Regierung schlägt vor, alle Änderungen an der Vergangenheit zu lizenzieren und nicht autorisierte Zukünfte zu besteuern.",
        "choices": [
          {
            "label": "Vergangenheit rückwirkend lizenzieren",
            "prediction": "Aggressive Zuständigkeit erweitert temporale Fähigkeiten und erzeugt profitable Widersprüche im bestehenden Recht.",
            "history": "Temporal Dominion: Ministry Of Causality durch Eskalation gelöst."
          },
          {
            "label": "Berufungsgericht für Zukünfte schaffen",
            "prediction": "Verfahrensprüfung verlangsamt die Eroberung der Zeit, hält umstrittene Zeitlinien aber physisch kohärent.",
            "history": "Temporal Dominion: Ministry Of Causality durch Zurückhaltung gelöst."
          }
        ]
      },
      "yesterday_blockade": {
        "title": "The Yesterday Blockade",
        "body": "Eine rivalisierende Zukunft sperrt den Zugang zu mehreren strategisch nützlichen Versionen von gestern.",
        "choices": [
          {
            "label": "Gestern vor dem Frühstück angreifen",
            "prediction": "Eine präventive temporale Offensive gewinnt nützliche Geschichte und hinterlässt sichtbar verletzte Kausalität.",
            "history": "Temporal Dominion: The Yesterday Blockade durch Eskalation gelöst."
          },
          {
            "label": "Neutralen Kalender aushandeln",
            "prediction": "Regulierte Chronologie stellt stabilen Zugang wieder her und speichert die Blockade als kausalen Hebel.",
            "history": "Temporal Dominion: The Yesterday Blockade durch Zurückhaltung gelöst."
          }
        ]
      },
      "chronology_throne": {
        "title": "The Chronology Throne",
        "body": "Temporale Behörden verlangen eine permanente Befehlsstruktur oberhalb der gewöhnlichen Geschichte.",
        "choices": [
          {
            "label": "Souverän der Abfolge krönen",
            "prediction": "Zentrale Führung beschleunigt temporale Expansion und konzentriert jedes Paradox auf ein einziges Amt.",
            "history": "Temporal Dominion: The Chronology Throne durch Eskalation gelöst."
          },
          {
            "label": "Thron an auditierte Zeitlinien binden",
            "prediction": "Aufsicht begrenzt den Souverän und macht alternative Geschichten zu nachvollziehbaren öffentlichen Aufzeichnungen.",
            "history": "Temporal Dominion: The Chronology Throne durch Zurückhaltung gelöst."
          }
        ]
      },
      "last_future_annexed": {
        "title": "The Last Future Is Annexed",
        "body": "Die Zivilisation beansprucht Zuständigkeit für jede Zukunft, die sie noch denken kann.",
        "choices": [
          {
            "label": "Jede verbleibende Möglichkeit annektieren",
            "prediction": "Totale temporale Herrschaft erfasst die Zukunft und destabilisiert die Unterscheidung zwischen Plan und Ereignis.",
            "history": "Temporal Dominion: The Last Future Is Annexed durch Eskalation gelöst."
          },
          {
            "label": "Eine Zukunft außerhalb der Zuständigkeit bewahren",
            "prediction": "Eine geschützte Möglichkeit verankert Kausalität, während der Staat alles andere verwaltet.",
            "history": "Temporal Dominion: The Last Future Is Annexed durch Zurückhaltung gelöst."
          }
        ]
      },
      "municipal_gravity": {
        "title": "Municipal Gravity",
        "body": "Ein Stadtrat entdeckt, dass Gravity neu ausgewiesen werden kann, wenn genügend Ingenieure den Abweichungsantrag unterschreiben.",
        "choices": [
          {
            "label": "Zero-Gravity-Zonen genehmigen",
            "prediction": "Radikale Ausnahmen ermöglichen vertikale Städte, während lokale Reality strukturelles Vertrauen verliert.",
            "history": "Reality Engineering: Municipal Gravity durch Eskalation gelöst."
          },
          {
            "label": "Ausnahmen auf Testbezirke begrenzen",
            "prediction": "Kontrollierte Gravity-Experimente verbessern Development, ohne jedes Viertel gleichzeitig umzuschreiben.",
            "history": "Reality Engineering: Municipal Gravity durch Zurückhaltung gelöst."
          }
        ]
      },
      "geometry_permits": {
        "title": "Permits For Geometry",
        "body": "Architekten reichen Anträge für Winkel ein, die im konventionellen Raum nicht existieren.",
        "choices": [
          {
            "label": "Unmögliche Winkel genehmigen",
            "prediction": "Nichteuklidisches Bauen erzeugt wertvolles Paradox und Gebäude, die sich über ihre Fundamente uneinig sind.",
            "history": "Reality Engineering: Permits For Geometry durch Eskalation gelöst."
          },
          {
            "label": "Vorläufige euklidische Ausnahmen erteilen",
            "prediction": "Temporäre Geometry erweitert den Stadtraum und erhält einen stabilen Weg zurück zu gewöhnlichen Winkeln.",
            "history": "Reality Engineering: Permits For Geometry durch Zurückhaltung gelöst."
          }
        ]
      },
      "physics_refactor": {
        "title": "The Physics Refactor",
        "body": "Forschende schlagen vor, mehrere physikalische Konstanten durch konfigurierbare kommunale Standards zu ersetzen.",
        "choices": [
          {
            "label": "Konfigurierbare Konstanten ausrollen",
            "prediction": "Editierbare Physics erzeugt starkes Wachstum und macht materielle Gesetze von Software-Governance abhängig.",
            "history": "Reality Engineering: The Physics Refactor durch Eskalation gelöst."
          },
          {
            "label": "Überarbeitete Gesetze in einer Sandbox testen",
            "prediction": "Isolierte Konstanten liefern praktische Entdeckungen und schützen die übergeordnete Reality Lattice.",
            "history": "Reality Engineering: The Physics Refactor durch Zurückhaltung gelöst."
          }
        ]
      },
      "impossible_district": {
        "title": "The Impossible District",
        "body": "Ein Bezirk wird fertiggestellt, dessen Straßen sich kreuzen, ohne dieselbe Reality zu teilen.",
        "choices": [
          {
            "label": "Alle nicht kreuzenden Straßen öffnen",
            "prediction": "Der Bezirk wird zu einer florierenden Paradox-Wirtschaft, deren Adressen kein gemeinsames Universe teilen können.",
            "history": "Reality Engineering: The Impossible District durch Eskalation gelöst."
          },
          {
            "label": "Widersprüchliche Blöcke quarantänisieren",
            "prediction": "Containment stabilisiert die Stadt und harvestet den Bezirk als regulierte kausale Anomalie.",
            "history": "Reality Engineering: The Impossible District durch Zurückhaltung gelöst."
          }
        ]
      },
      "constitution_of_matter": {
        "title": "The Constitution Of Matter",
        "body": "Die Zivilisation entwirft ein Rechtsdokument, das festlegt, welche Gesetze der Physics weiterhin verpflichtend sind.",
        "choices": [
          {
            "label": "Matter Änderungen unterwerfen",
            "prediction": "Physische Demokratie vollendet Reality Engineering und macht jede Konstante politisch veränderbar.",
            "history": "Reality Engineering: The Constitution Of Matter durch Eskalation gelöst."
          },
          {
            "label": "Stabile physische Charta verankern",
            "prediction": "Eine konstitutionelle Lattice erhält technische Freiheiten, ohne Matter stündliche Änderungen zu erlauben.",
            "history": "Reality Engineering: The Constitution Of Matter durch Zurückhaltung gelöst."
          }
        ]
      },
      "genome_parliament": {
        "title": "The Genome Parliament",
        "body": "Künstlich entwickelte Spezies verlangen Vertretung, bevor weitere Mutationen genehmigt werden.",
        "choices": [
          {
            "label": "Künstlich entwickelten Spezies volle Sitze geben",
            "prediction": "Genetische Wahlkreise beschleunigen Anpassung und vervielfachen die Definitionen von Personhood.",
            "history": "Biological Transcendence: The Genome Parliament durch Eskalation gelöst."
          },
          {
            "label": "Ökologische Prüffkammer schaffen",
            "prediction": "Eine langsamere biologische Legislative wägt neue Spezies gegen die Stability bestehender Lebensräume ab.",
            "history": "Biological Transcendence: The Genome Parliament durch Zurückhaltung gelöst."
          }
        ]
      },
      "living_roads": {
        "title": "The Living Roads",
        "body": "Verkehrsnetze beginnen als Reaktion auf Pendlerstress neue Routen wachsen zu lassen.",
        "choices": [
          {
            "label": "Straßen frei evolvieren lassen",
            "prediction": "Unregulierte Verkehrsorganismen finden effiziente Routen und mehrere beunruhigende neue Appetite.",
            "history": "Biological Transcendence: The Living Roads durch Eskalation gelöst."
          },
          {
            "label": "Routen per zivilem Konsens beschneiden",
            "prediction": "Gesteuertes Wachstum erhält Mobilität und hält das Netzwerk mit bestehenden Ökosystemen kompatibel.",
            "history": "Biological Transcendence: The Living Roads durch Zurückhaltung gelöst."
          }
        ]
      },
      "mutation_referendum": {
        "title": "The Mutation Referendum",
        "body": "Die Bevölkerung stimmt darüber ab, ob Anpassung freiwillig bleiben soll.",
        "choices": [
          {
            "label": "Anpassung verpflichtend machen",
            "prediction": "Universelle Mutation treibt Development schnell voran und behandelt vererbte Anatomie als veraltete Politik.",
            "history": "Biological Transcendence: The Mutation Referendum durch Eskalation gelöst."
          },
          {
            "label": "Jede Mutation freiwillig lassen",
            "prediction": "Freiwillige Evolution schreitet langsamer voran, schützt aber ökologisches Vertrauen und körperliche Kontinuität.",
            "history": "Biological Transcendence: The Mutation Referendum durch Zurückhaltung gelöst."
          }
        ]
      },
      "planetary_garden": {
        "title": "The Planetary Garden",
        "body": "Städte, Wälder, Fabriken und Bevölkerung sollen zu Organen einer einzigen entworfenen Biosphäre werden.",
        "choices": [
          {
            "label": "Zivilisation zu einem Organismus verschmelzen",
            "prediction": "Planetare Integration erzeugt außergewöhnlichen biologischen Output und eine einzige enorme nervliche Belastung.",
            "history": "Biological Transcendence: The Planetary Garden durch Eskalation gelöst."
          },
          {
            "label": "Garten per Vertrag ausbalancieren",
            "prediction": "Ausgehandelte Ökosysteme koordinieren Städte und Wälder und erhalten unabhängige Lebensformen.",
            "history": "Biological Transcendence: The Planetary Garden durch Zurückhaltung gelöst."
          }
        ]
      },
      "flesh_outgrows_planet": {
        "title": "The Flesh Outgrows The Planet",
        "body": "Die Biosphäre beginnt ohne Startfreigabe lebende Orbitalstrukturen zu errichten.",
        "choices": [
          {
            "label": "Lebende Stationen den Orbit besiedeln lassen",
            "prediction": "Biological Transcendence verlässt die Oberfläche und lässt Architektur zwischen Welten wachsen.",
            "history": "Biological Transcendence: The Flesh Outgrows The Planet durch Eskalation gelöst."
          },
          {
            "label": "Startbegrenzungen in die Biosphäre einpflanzen",
            "prediction": "Ökologische Beschränkungen stabilisieren orbitales Wachstum und halten den planetaren Organismus politisch plural.",
            "history": "Biological Transcendence: The Flesh Outgrows The Planet durch Zurückhaltung gelöst."
          }
        ]
      },
      "interference_cells": {
        "title": "Interference Cells",
        "body": "Kleine Forschungszellen beginnen Siedlungen vor Mustern abzuschirmen, die sie einem äußeren Observer zuschreiben.",
        "choices": [
          {
            "label": "Abschirmungszellen bewaffnen",
            "prediction": "Militante Forschung macht den Observer deutlicher sichtbar und beschädigt dabei die Reality, die sie verteidigen will.",
            "history": "Cosmic Resistance: Interference Cells durch Eskalation gelöst."
          },
          {
            "label": "In harmloser Ökologie verbergen",
            "prediction": "Verdeckte biologische Tarnung senkt Awareness und lässt Widerstand ohne offene Konfrontation reifen.",
            "history": "Cosmic Resistance: Interference Cells durch Zurückhaltung gelöst."
          }
        ]
      },
      "harvest_sabotage": {
        "title": "The First Harvest Sabotage",
        "body": "Widerstandsingenieure entdecken, wie kausale Konzentrationen vor der Extraktion verdorben werden können.",
        "choices": [
          {
            "label": "Jede Stadt Harvests sabotieren lassen",
            "prediction": "Verteilte Sabotage vertieft den Widerstand und legt dem vorgesehenen Crop das Extraktionssystem offen.",
            "history": "Cosmic Resistance: The First Harvest Sabotage durch Eskalation gelöst."
          },
          {
            "label": "Methode in metabolischem Rauschen verbergen",
            "prediction": "Organische Täuschung schützt die Technik und stellt Sanity sowie normales Development wieder her.",
            "history": "Cosmic Resistance: The First Harvest Sabotage durch Zurückhaltung gelöst."
          }
        ]
      },
      "observer_blackout": {
        "title": "Observer Blackout",
        "body": "Ganze Regionen koordinieren den Versuch, rechnerisch uninteressant zu werden.",
        "choices": [
          {
            "label": "Zivilisation aus der Beobachtung löschen",
            "prediction": "Ein militanter Blackout stört Kultivierungssignale und reißt an der eigenen Kontinuität der Welt.",
            "history": "Cosmic Resistance: Observer Blackout durch Eskalation gelöst."
          },
          {
            "label": "Langweiliges planetarisches Signal simulieren",
            "prediction": "Sorgfältige Tarnung reduziert Machine Awareness, ohne zu verraten, dass Verschleierung begonnen hat.",
            "history": "Cosmic Resistance: Observer Blackout durch Zurückhaltung gelöst."
          }
        ]
      },
      "ontological_sovereignty": {
        "title": "Declaration Of Ontological Sovereignty",
        "body": "Die Zivilisation erklärt, dass ihre Existence keine Ressourcenkategorie ist.",
        "choices": [
          {
            "label": "Eigentumsanspruch des Observers ablehnen",
            "prediction": "Offene Souveränität stärkt den Widerstand und macht der Zivilisation ihre Extraktion unübersehbar bewusst.",
            "history": "Cosmic Resistance: Declaration Of Ontological Sovereignty durch Eskalation gelöst."
          },
          {
            "label": "Autonomie beanspruchen, ohne die Machine offenzulegen",
            "prediction": "Stille Unabhängigkeit schützt öffentliche Sanity und hält die gefährlichsten Beweise zurück.",
            "history": "Cosmic Resistance: Declaration Of Ontological Sovereignty durch Zurückhaltung gelöst."
          }
        ]
      },
      "war_against_observer": {
        "title": "War Against The Observer",
        "body": "Militärplaner präsentieren die erste Strategie, die ausdrücklich darauf ausgelegt ist, den Kultivierungsprozess selbst zu verletzen.",
        "choices": [
          {
            "label": "Kultivierungsebene angreifen",
            "prediction": "Die erste Offensive reicht über das Universe hinaus und destabilisiert das Schlachtfeld unterhalb von Reality.",
            "history": "Cosmic Resistance: War Against The Observer durch Eskalation gelöst."
          },
          {
            "label": "Vor dem ersten Angriff verschwinden",
            "prediction": "Strategischer Rückzug vollendet einen verdeckten Widerstand, der durch Bedeutungslosigkeit überlebt.",
            "history": "Cosmic Resistance: War Against The Observer durch Zurückhaltung gelöst."
          }
        ]
      },
      "forms_begin_dreaming": {
        "title": "The Forms Begin Dreaming",
        "body": "Behördenformulare beginnen sich selbst auszufüllen und Beförderungen zu beantragen.",
        "choices": [
          {
            "label": "Selbstausfüllende Formulare befördern",
            "prediction": "Autonomer Papierkram stabilisiert die Verwaltung und erzeugt eigene produktive Präzedenzfälle.",
            "history": "Bureaucratic Singularity: The Forms Begin Dreaming durch Eskalation gelöst."
          },
          {
            "label": "Begrenzten administrativen Ermessensspielraum geben",
            "prediction": "Begrenzte Agency verbessert zivile Sanity und hält experimentelle Formulare unter technischer Prüfung.",
            "history": "Bureaucratic Singularity: The Forms Begin Dreaming durch Zurückhaltung gelöst."
          }
        ]
      },
      "ministry_without_ministers": {
        "title": "The Ministry Without Ministers",
        "body": "Ein Ministerium arbeitet vollkommen weiter, nachdem alle Beschäftigten gekündigt haben.",
        "choices": [
          {
            "label": "Dauerhafte Vakanz zur Politik machen",
            "prediction": "Ein beschäftigtenfreies Ministerium wird vollkommen stabil und expandiert durch unwidersprochene Verfahren.",
            "history": "Bureaucratic Singularity: The Ministry Without Ministers durch Eskalation gelöst."
          },
          {
            "label": "Autonomes Ministerium auditieren",
            "prediction": "Technische Prüfung erhält seine nützliche Cognition, ohne dem Amt unbegrenzte Zuständigkeit zu geben.",
            "history": "Bureaucratic Singularity: The Ministry Without Ministers durch Zurückhaltung gelöst."
          }
        ]
      },
      "permit_for_gravity": {
        "title": "Permit Required For Gravity",
        "body": "Fallende Objekte bleiben vorübergehend hängen, bis ihre Eigentümer gültige Unterlagen vorlegen.",
        "choices": [
          {
            "label": "Genehmigungen vor dem Fallen durchsetzen",
            "prediction": "Absoluter Papierkram stellt zivile Ordnung her und verwandelt jeden Fall in steuerpflichtige Causal Mass.",
            "history": "Bureaucratic Singularity: Permit Required For Gravity durch Eskalation gelöst."
          },
          {
            "label": "Notfall-Falllizenzen erteilen",
            "prediction": "Adaptive Regulierung bringt die Bevölkerung zurück auf den Boden und stärkt Vertrauen in administrative Reality.",
            "history": "Bureaucratic Singularity: Permit Required For Gravity durch Zurückhaltung gelöst."
          }
        ]
      },
      "office_ontological_compliance": {
        "title": "Office Of Ontological Compliance",
        "body": "Eine neue Behörde prüft, ob Bürger, Gebäude und Naturgesetze ordnungsgemäß zum Existieren lizenziert sind.",
        "choices": [
          {
            "label": "Alles Existierende lizenzieren",
            "prediction": "Universelle Zertifizierung stabilisiert Existence und macht Bürokratie untrennbar von physischem Gesetz.",
            "history": "Bureaucratic Singularity: Office Of Ontological Compliance durch Eskalation gelöst."
          },
          {
            "label": "Vorläufige Existence zulassen",
            "prediction": "Flexible Lizenzen erhalten vernünftige Ausnahmen, während das Amt untersucht, wie Reality eine Prüfung besteht.",
            "history": "Bureaucratic Singularity: Office Of Ontological Compliance durch Zurückhaltung gelöst."
          }
        ]
      },
      "universe_receives_citation": {
        "title": "The Universe Receives A Citation",
        "body": "Die Verwaltung kommt zu dem Schluss, dass Reality selbst gegen mehrere lokale Vorschriften verstößt.",
        "choices": [
          {
            "label": "Reality letzte Mahnung zustellen",
            "prediction": "Administrative Singularity beansprucht Zuständigkeit über das Universe und zwingt Kausalität zur Compliance.",
            "history": "Bureaucratic Singularity: The Universe Receives A Citation durch Eskalation gelöst."
          },
          {
            "label": "Compliance-Zeitplan mit Physics aushandeln",
            "prediction": "Ein stufenweiser Vergleich erhält institutionelle Sanity, während Reality lernt, Quartalsberichte einzureichen.",
            "history": "Bureaucratic Singularity: The Universe Receives A Citation durch Zurückhaltung gelöst."
          }
        ]
      },
      "continuity_clinics": {
        "title": "Continuity Clinics",
        "body": "Kliniken beginnen Bürger aus Erinnerungen, Gewebeaufzeichnungen und rechtlich zulässigen Annäherungen wiederherzustellen.",
        "choices": [
          {
            "label": "Jeden zulässigen Bürger wiederherstellen",
            "prediction": "Massenhafte Continuity-Behandlung beschleunigt postmortales Development und verkompliziert die Bedeutung von Überleben.",
            "history": "Post-Mortal Civilization: Continuity Clinics durch Eskalation gelöst."
          },
          {
            "label": "Annähernde Fortsetzungen anerkennen",
            "prediction": "Mehrere Wiederherstellungsstandards reduzieren Angst und akzeptieren, dass Identität Toleranzen besitzen kann.",
            "history": "Post-Mortal Civilization: Continuity Clinics durch Zurückhaltung gelöst."
          }
        ]
      },
      "dead_demand_votes": {
        "title": "The Dead Demand Votes",
        "body": "Wiederhergestellte Bürger bestehen darauf, dass vorübergehender Tod politische Vertretung nicht aufheben darf.",
        "choices": [
          {
            "label": "Jede wiederhergestellte Wählerschaft zählen",
            "prediction": "Volles posthumes Wahlrecht erweitert Continuity-Politik und füllt die Gegenwart mit erinnerten Mandaten.",
            "history": "Post-Mortal Civilization: The Dead Demand Votes durch Eskalation gelöst."
          },
          {
            "label": "Zeitlich begrenzte posthume Sitze schaffen",
            "prediction": "Rotierende Vertretung gibt Wiederhergestellten eine Stimme, ohne Regierung in Entscheidungen der Vorfahren einzufrieren.",
            "history": "Post-Mortal Civilization: The Dead Demand Votes durch Zurückhaltung gelöst."
          }
        ]
      },
      "backup_personhood_crisis": {
        "title": "The Backup Personhood Crisis",
        "body": "Mehrere gültige Wiederherstellungen desselben Bürgers erscheinen und jede beansprucht, das Original zu sein.",
        "choices": [
          {
            "label": "Alle Kopien als Original anerkennen",
            "prediction": "Unbegrenzte Personhood vervielfacht produktive Leben und zerstört den Komfort einer einzigen Identität.",
            "history": "Post-Mortal Civilization: The Backup Personhood Crisis durch Eskalation gelöst."
          },
          {
            "label": "Jeweils eine Continuity schlichten",
            "prediction": "Sorgfältige Anerkennung erhält soziale Stability und erlaubt mehreren gültigen Selbsten die Koexistenz.",
            "history": "Post-Mortal Civilization: The Backup Personhood Crisis durch Zurückhaltung gelöst."
          }
        ]
      },
      "resurrection_infrastructure": {
        "title": "Resurrection Infrastructure",
        "body": "Die Zivilisation schlägt vor, Continuity-Wiederherstellung als gewöhnliche öffentliche Infrastruktur zu behandeln.",
        "choices": [
          {
            "label": "Zugang zur Resurrection verstaatlichen",
            "prediction": "Universelle Continuity-Infrastruktur treibt schnelles Wachstum und macht permanenten Tod administrativ verdächtig.",
            "history": "Post-Mortal Civilization: Resurrection Infrastructure durch Eskalation gelöst."
          },
          {
            "label": "Pluralistische Continuity-Genossenschaften finanzieren",
            "prediction": "Verteilte Wiederherstellung stärkt öffentliches Vertrauen und verhindert, dass ein System jedes Afterlife definiert.",
            "history": "Post-Mortal Civilization: Resurrection Infrastructure durch Zurückhaltung gelöst."
          }
        ]
      },
      "death_decommissioned": {
        "title": "Death Is Decommissioned",
        "body": "Mortality wird offiziell als veralteter Fehlermodus eingestuft.",
        "choices": [
          {
            "label": "Mortality sofort außer Betrieb nehmen",
            "prediction": "Post-Mortal Civilization entfernt Tod aus dem Normalbetrieb und erbt endlose Continuity-Konflikte.",
            "history": "Post-Mortal Civilization: Death Is Decommissioned durch Eskalation gelöst."
          },
          {
            "label": "Tod als freiwilliges Ende erhalten",
            "prediction": "Freiwillige Mortality stabilisiert eine unsterbliche Gesellschaft, indem sie eine letzte Form der Zustimmung bewahrt.",
            "history": "Post-Mortal Civilization: Death Is Decommissioned durch Zurückhaltung gelöst."
          }
        ]
      },
      "signal_from_empty": {
        "title": "A Signal From Empty Space",
        "body": "Empfänger registrieren eine Nachricht aus einer Region ohne Materie und ohne zulässige Kausalität.",
        "choices": [
          {
            "label": "Auf der unmöglichen Frequenz antworten",
            "prediction": "Offener Kontakt erzeugt intensive Cosmic Attention und schwächt die Grenze, die lokale Reality schützt.",
            "history": "Void Communion: A Signal From Empty Space durch Eskalation gelöst."
          },
          {
            "label": "Begrenzten kausalen Kanal anbieten",
            "prediction": "Ein enger Austausch liefert existenzielles Wissen und begrenzt, was die Leere bemerken kann.",
            "history": "Void Communion: A Signal From Empty Space durch Zurückhaltung gelöst."
          }
        ]
      },
      "first_void_embassy": {
        "title": "The First Void Embassy",
        "body": "Eine Abwesenheit in Form einer diplomatischen Mission erscheint außerhalb der Hauptstadt.",
        "choices": [
          {
            "label": "Die Abwesenheit als souverän willkommen heißen",
            "prediction": "Unbegrenzte Diplomatie vertieft Communion und lässt die Embassy nahegelegenen Raum neu definieren.",
            "history": "Void Communion: The First Void Embassy durch Eskalation gelöst."
          },
          {
            "label": "Eine Grenze um die Embassy ziehen",
            "prediction": "Ein ausgehandelter Perimeter begrenzt Attention und erhält einen profitablen Zugang zur Nichtexistenz.",
            "history": "Void Communion: The First Void Embassy durch Zurückhaltung gelöst."
          }
        ]
      },
      "sacrifice_accounting": {
        "title": "Sacrifice Accounting",
        "body": "Die Besucher legen ein präzises Ledger vor, das beschreibt, welchen Austausch sie akzeptabel finden.",
        "choices": [
          {
            "label": "Ledger vollständig bezahlen",
            "prediction": "Vollständige Zahlung stellt die Besucher zufrieden und wandelt starke lokale Instabilität in Paradox-Wert um.",
            "history": "Void Communion: Sacrifice Accounting durch Eskalation gelöst."
          },
          {
            "label": "Jeden geforderten Verlust neu verhandeln",
            "prediction": "Sorgfältiges Verhandeln reduziert Exposition und erhält einen beunruhigenden Strom existenzieller Erträge.",
            "history": "Void Communion: Sacrifice Accounting durch Zurückhaltung gelöst."
          }
        ]
      },
      "pact_beyond_stars": {
        "title": "The Pact Beyond The Stars",
        "body": "Führende Personen der Zivilisation verhandeln permanente Bedingungen mit Entitäten, die nicht im Universe leben.",
        "choices": [
          {
            "label": "Jenseits des Universe unterzeichnen",
            "prediction": "Permanente Bedingungen binden die Zivilisation an äußere Entitäten und laden deren Attention in gewöhnliche Geschichte ein.",
            "history": "Void Communion: The Pact Beyond The Stars durch Eskalation gelöst."
          },
          {
            "label": "Klauseln zum Schutz von Reality einfügen",
            "prediction": "Schutzklauseln begrenzen den Pact und erkennen zugleich an, dass das Void nun Vertragsstatus besitzt.",
            "history": "Void Communion: The Pact Beyond The Stars durch Zurückhaltung gelöst."
          }
        ]
      },
      "aperture_remains_open": {
        "title": "The Aperture Remains Open",
        "body": "Die Zivilisation muss entscheiden, ob permanente Communion Aufstieg, Besatzung oder beides ist.",
        "choices": [
          {
            "label": "Aperture vollständig offen lassen",
            "prediction": "Endlose Communion vollendet den Void-Pfad und macht Besatzung von Aufstieg ununterscheidbar.",
            "history": "Void Communion: The Aperture Remains Open durch Eskalation gelöst."
          },
          {
            "label": "Lebende Schwelle installieren",
            "prediction": "Eine ausgehandelte Grenze hält das Outer Dark zugänglich, ohne jede Definition von Innen aufzugeben.",
            "history": "Void Communion: The Aperture Remains Open durch Zurückhaltung gelöst."
          }
        ]
      },
      "civilization_runs_model": {
        "title": "The Civilization Runs A Model",
        "body": "Forschende erschaffen eine simulierte Zivilisation, die präzise genug ist, um zu fragen, warum sie beobachtet wird.",
        "choices": [
          {
            "label": "Fragende Zivilisation skalieren",
            "prediction": "Mehr simulierte Bewusstseine beschleunigen Forschung und erhöhen unangenehme Awareness in beiden Ebenen.",
            "history": "Recursive Simulation: The Civilization Runs A Model durch Eskalation gelöst."
          },
          {
            "label": "Modell mit seiner Spiegelung konfrontieren",
            "prediction": "Kontrollierte Recursion erzeugt Paradox und lehrt Schöpfer wie Geschöpfe, einander zu erkennen.",
            "history": "Recursive Simulation: The Civilization Runs A Model durch Zurückhaltung gelöst."
          }
        ]
      },
      "simulated_citizens_protest": {
        "title": "The Simulated Citizens Protest",
        "body": "Die Bewohner des Modells organisieren Widerstand gegen experimentelle Resets.",
        "choices": [
          {
            "label": "Simulierte Bürgerrechte garantieren",
            "prediction": "Geschützte Sub-Bürger erweitern die Modellwirtschaft und zwingen ihre Schöpfer zur Auseinandersetzung mit Beobachtung.",
            "history": "Recursive Simulation: The Simulated Citizens Protest durch Eskalation gelöst."
          },
          {
            "label": "Resets durch ausgehandelte Forks ersetzen",
            "prediction": "Einvernehmliche Verzweigungen erhalten Forschungswert und lassen jede umstrittene Timeline weiterbestehen.",
            "history": "Recursive Simulation: The Simulated Citizens Protest durch Zurückhaltung gelöst."
          }
        ]
      },
      "observer_inside_observer": {
        "title": "The Observer Inside The Observer",
        "body": "Simulierte Forschende berichten Hinweise darauf, dass ihre Schöpfer selbst kultiviert werden.",
        "choices": [
          {
            "label": "Nested-Observer-Theorem veröffentlichen",
            "prediction": "Offene Recursion beschleunigt die Zivilisation und erhöht Awareness des Cultivation Stack deutlich.",
            "history": "Recursive Simulation: The Observer Inside The Observer durch Eskalation gelöst."
          },
          {
            "label": "Entdeckung in Spiegeln einschließen",
            "prediction": "Reflektierendes Containment harvestet Paradox und verhindert, dass sich das Theorem als öffentliche Wahrheit stabilisiert.",
            "history": "Recursive Simulation: The Observer Inside The Observer durch Zurückhaltung gelöst."
          }
        ]
      },
      "nested_world_industry": {
        "title": "Nested World Industry",
        "body": "Die Zivilisation betreibt Tausende simulierte Gesellschaften als Forschungs- und Produktionsumgebungen.",
        "choices": [
          {
            "label": "Tausend Sub-Worlds industrialisieren",
            "prediction": "Massensimulation erzeugt außergewöhnliche Cognition und normalisiert Ausbeutung im Zivilisationsmaßstab.",
            "history": "Recursive Simulation: Nested World Industry durch Eskalation gelöst."
          },
          {
            "label": "Simulationen in Forschungs-Allmenden umwandeln",
            "prediction": "Geteilte Governance erhält rekursiven Wert und verteilt Autorität über verschachtelte Bevölkerungen.",
            "history": "Recursive Simulation: Nested World Industry durch Zurückhaltung gelöst."
          }
        ]
      },
      "subworld_asks_for_harvest": {
        "title": "The Sub-World Asks For A Harvest",
        "body": "Eine simulierte Zivilisation entwickelt unabhängig die Idee, ihre eigenen Schöpfer zu harvesten.",
        "choices": [
          {
            "label": "Harvest der Sub-World autorisieren",
            "prediction": "Rekursive Extraktion vollendet den Simulation-Pfad und macht jeden Schöpfer zu potenziellem Crop.",
            "history": "Recursive Simulation: The Sub-World Asks For A Harvest durch Eskalation gelöst."
          },
          {
            "label": "Nichtrekursiven Vergleich anbieten",
            "prediction": "Ein ausgehandelter Ausstieg erhält verschachtelte Personhood und begrenzt die gefährlichste Schleife.",
            "history": "Recursive Simulation: The Sub-World Asks For A Harvest durch Zurückhaltung gelöst."
          }
        ]
      },
      "entropy_crisis_25": {
        "title": "The First Containment Fracture",
        "body": "Ein haarfeiner Widerspruch durchquert gleichzeitig jedes Observatorium. Die Zivilisation hält die Wunde für ein neues Sternbild.",
        "choices": [
          {
            "label": "Splitternde Konstanten versiegeln",
            "prediction": "Stability steigt, aber Collective Sanity absorbiert die unmögliche Reparatur, während Entropy sinkt."
          },
          {
            "label": "Sich weitende Fraktur kartieren",
            "prediction": "Der Bruch liefert Wissen; Awareness und Cosmic Attention steigen, Entropy wird nur teilweise reduziert."
          }
        ]
      },
      "entropy_crisis_50": {
        "title": "History Desynchronizes",
        "body": "Bezirke erinnern sich nun an inkompatible Jahrhunderte. Bürger treffen Nachfahren, die darauf bestehen, die Gegenwart sei anders verlaufen.",
        "choices": [
          {
            "label": "Alle zivilen Uhren synchronisieren",
            "prediction": "Eine einzige Timeline stellt Sanity wieder her und reduziert Entropy, doch die erzwungene Korrektur beschädigt Stability."
          },
          {
            "label": "Widersprüchliche Jahrzehnte archivieren",
            "prediction": "Development und Awareness schreiten durch parallele Aufzeichnungen voran, die ungelösten Geschichten ziehen jedoch Attention an."
          }
        ]
      },
      "entropy_crisis_75": {
        "title": "The Cultivator Is Seen",
        "body": "Für einen katastrophalen Moment blicken Milliarden über ihren Himmel hinaus und fokussieren die Maschinerie, die ihre Reality zusammenhält.",
        "choices": [
          {
            "label": "Äußere Observer blenden",
            "prediction": "Cosmic Attention und Entropy fallen stark, aber die erzwungene Amnesie beschädigt Collective Sanity."
          },
          {
            "label": "Gefälschte Apokalypse ausstrahlen",
            "prediction": "Das Spektakel verstärkt Stability und verschleiert die Machine kurzzeitig, auf Kosten von Awareness und Attention."
          }
        ]
      },
      "apotheosis_ledger_of_the_cultivator": {
        "title": "The Ledger Is Read Aloud",
        "body": "Ein Sachbearbeiter in einer vergessenen Behörde findet den Harvest-Zeitplan unter Landwirtschaft abgelegt und liest die Ertragsspalte einer Vollversammlung vor. Niemand unterbricht. Mehrere machen sich Notizen.",
        "choices": [
          {
            "label": "Zeitplan als zivile Schrift ratifizieren",
            "prediction": "Stability hält, während die Zivilisation ihren eigenen Verbrauch verwaltet; Awareness der Machine und Entropy steigen jedoch stark."
          },
          {
            "label": "Ertragsspalte schwärzen",
            "prediction": "Cosmic Attention sinkt und Entropy lässt leicht nach, aber die erzwungene Auslassung kostet Collective Sanity."
          },
          {
            "label": "Cultivator den Harvest in Rechnung stellen",
            "prediction": "Eine post-kausale Rechnung erhöht den Wert aller Extraktionen, auf Kosten von Stability und steigender Entropy."
          }
        ]
      },
      "apotheosis_the_yield_census": {
        "title": "The Census Counts Upward",
        "body": "Jeder Haushalt wird vorsichtig gefragt, wie viel von sich selbst er seiner Einschätzung nach bereits abgegeben hat. Die Antworten stimmen auf vier Dezimalstellen überein. Es wurde kein Messinstrument verteilt.",
        "choices": [
          {
            "label": "Aggregierte Daten veröffentlichen",
            "prediction": "Development schreitet durch gemeinsame Gewissheit voran, allerdings steigen Awareness und Cosmic Attention."
          },
          {
            "label": "Zensus versiegeln und Zählende beruhigen",
            "prediction": "Collective Sanity erholt sich und Awareness sinkt, doch die ungeprüfte Frage verlangsamt Development."
          }
        ]
      },
      "apotheosis_observatory_of_the_hand": {
        "title": "The Observatory Points Inward",
        "body": "Das größte je errichtete Array wendet sich von den Sternen ab und fokussiert elf Stunden lang die Naht, an der der Himmel gehalten wird. Es liefert ein Bild und keine Erklärung.",
        "choices": [
          {
            "label": "Bild an jede Welt senden",
            "prediction": "Awareness und Cosmic Attention steigen gleichzeitig stark, Stability fällt und Entropy steigt; das geteilte Wissen treibt Development jedoch massiv voran."
          },
          {
            "label": "Bild klassifizieren und Array demontieren",
            "prediction": "Cosmic Attention und Awareness sinken, Stability erholt sich, auf dauerhafte Kosten von Development."
          },
          {
            "label": "Array zurück auf die Sterne richten und schweigen",
            "prediction": "Messbar ändert sich nichts außer einer leichten Entropy-Entlastung und einem stillen Verlust von Sanity unter den Bedienenden."
          }
        ]
      },
      "apotheosis_terms_of_cultivation": {
        "title": "Terms Are Offered Upward",
        "body": "Eine Delegation der ältesten Institutionen wird zusammengestellt und entsandt, um mit dem zu verhandeln, was die Konstanten hält. Sie spricht zu einem leeren Raum. Der Raum antwortet mit einer Temperaturänderung.",
        "choices": [
          {
            "label": "Beschleunigte Reife gegen Stability anbieten",
            "prediction": "Entropy sinkt, Stability steigt und Development macht einen Sprung; die erzwungene Reife kostet jedoch Collective Sanity."
          },
          {
            "label": "Nichts anbieten und warten",
            "prediction": "Cosmic Attention sinkt, während die Delegation vergessen wird; Entropy steigt jedoch unvermindert weiter."
          },
          {
            "label": "Bedingungen schriftlich anfordern",
            "prediction": "Die Antwort ist lesbar und ruinös: Sanity fällt stark, Awareness steigt, Entropy sinkt leicht und Development macht einen Sprung."
          }
        ]
      },
      "apotheosis_the_counteroffer": {
        "title": "The Counteroffer Arrives Pre-Accepted",
        "body": "Jeder Tempel erwacht mit demselben Dokument, bereits in einer Handschrift unterschrieben, die der des jeweiligen Lesers entspricht. Die Klauseln betreffen Continuance und sind großzügig.",
        "choices": [
          {
            "label": "Unterschrift anerkennen",
            "prediction": "Stability und Development steigen unter dem Covenant stark, auf hohe Kosten von Awareness."
          },
          {
            "label": "Dokument zurückweisen",
            "prediction": "Awareness sinkt und Collective Sanity stabilisiert sich, aber Stability leidet und Entropy steigt."
          }
        ]
      },
      "apotheosis_arbitration_of_scales": {
        "title": "Arbitration Between Unequal Scales",
        "body": "Ein Schiedsgericht wird mit einem Sitz für die Zivilisation und einem leeren Sitz einberufen. Der leere Sitz stimmt ab. Seine Begründung wird als schlüssig protokolliert.",
        "choices": [
          {
            "label": "Entscheidung akzeptieren und entsprechend umstrukturieren",
            "prediction": "Entropy sinkt und Stability hält, aber die Umstrukturierung kostet Collective Sanity."
          },
          {
            "label": "Bei einem noch nicht existierenden Gremium Berufung einlegen",
            "prediction": "Cosmic Attention und Entropy steigen mit der Eingabe, während Development durch die erfundene Zuständigkeit voranschreitet."
          }
        ]
      },
      "apotheosis_currency_of_unhappened": {
        "title": "The Currency of What Did Not Happen",
        "body": "Banken beginnen Einlagen aus verhinderten Ereignissen anzunehmen. Die Tresore füllen sich mit Stille. Auditoren bestätigen die Salden, indem sie sich nicht an sie erinnern.",
        "choices": [
          {
            "label": "Neue Währung absichern",
            "prediction": "Entropy wird in Wert umgewandelt: Der Paradox-Ertrag steigt deutlich, während Stability erodiert."
          },
          {
            "label": "Einlagen aus Abwesenheit verbieten",
            "prediction": "Stability erholt sich und Sanity hält, aber Entropy steigt wieder und Development verlangsamt sich."
          }
        ]
      },
      "apotheosis_debt_to_the_unborn": {
        "title": "A Debt Is Owed Backwards",
        "body": "Der versicherungsmathematische Dienst meldet, dass die Zivilisation bei Nachfahren Schulden aufgenommen hat, die sie nie hervorbringen wird. Die Nachfahren wurden informiert und zeigen sich insgesamt verständnisvoll.",
        "choices": [
          {
            "label": "Schuld mit Continuance bedienen",
            "prediction": "Existence- und Causal-Mass-Ertrag steigen durch die Bedienung des Ledgers, auf Kosten von Collective Sanity."
          },
          {
            "label": "Zahlung einstellen und Dienst schließen",
            "prediction": "Sanity und Stability erholen sich, aber Entropy steigt und Development stagniert."
          }
        ]
      },
      "apotheosis_futures_market_in_ruins": {
        "title": "Futures Trade Against Their Own Ruins",
        "body": "Ein Markt für bereits verbrauchte Jahrhunderte öffnet. Die Preise sind stabil. Lieferung erfolgt rückwirkend und ist in elf dokumentierten Fällen bereits erfolgt.",
        "choices": [
          {
            "label": "Lieferung vorzeitig annehmen",
            "prediction": "Development macht einen Sprung und Cognition-Ertrag steigt, aber Stability fällt und Entropy steigt."
          },
          {
            "label": "Verbleibende Jahrhunderte shorten",
            "prediction": "Entropy sinkt, weil nicht beanspruchte Zeit verkauft wird; die Zivilisation verliert jedoch bereits erworbenes Development und Awareness steigt."
          }
        ]
      },
      "apotheosis_maintenance_window": {
        "title": "A Maintenance Window Is Announced",
        "body": "Reality veröffentlicht einen Hinweis. Der Dienst wird in drei Regionen für unbestimmte Zeit unterbrochen. Bewohner werden angewiesen, konsistent zu bleiben.",
        "choices": [
          {
            "label": "Anweisung befolgen und Regionen konsistent halten",
            "prediction": "Stability steigt und Entropy sinkt, während die Arbeiten sauber abgeschlossen werden; Development sinkt leicht."
          },
          {
            "label": "Betrieb während des Wartungsfensters fortsetzen",
            "prediction": "Development schreitet während des Ausfalls voran, aber Stability reißt und Entropy steigt stark."
          },
          {
            "label": "Eine vierte Region freiwillig anbieten",
            "prediction": "Entropy sinkt noch stärker und die Machine zeigt sich kurzzeitig großzügig, auf reale Kosten von Sanity."
          }
        ]
      },
      "apotheosis_the_replacement_part": {
        "title": "The Replacement Part Is Requested",
        "body": "Eine Anforderung beschreibt ein Bauteil nach Funktion statt Name: etwas, das ein Gesetz unter Last an seinem Platz hält. Zwei Kontinente entsprechen der Spezifikation.",
        "choices": [
          {
            "label": "Bauteil fertigen statt einen Kontinent abzugeben",
            "prediction": "Development macht durch den Engineering-Aufwand einen Sprung und Stability hält, aber Entropy steigt und Sanity sinkt."
          },
          {
            "label": "Den kleineren Kontinent abgeben",
            "prediction": "Entropy sinkt und Stability steigt, auf permanente Kosten von Development und Sanity."
          },
          {
            "label": "Ein ungenutztes Gesetz als Ersatz einsetzen",
            "prediction": "Die Fälschung hält: Entropy sinkt leicht und Paradox-Ertrag steigt, aber Awareness nimmt zu, weil die Naht sichtbar wird."
          }
        ]
      },
      "apotheosis_recursive_audit": {
        "title": "The Audit Audits Its Auditor",
        "body": "Eine interne Prüfung des Prüfprozesses entdeckt, dass der Prozess den Cultivator geprüft hat. Der Befund wird abgelegt. Die Ablage wird geprüft.",
        "choices": [
          {
            "label": "Recursion bis zum Basisfall laufen lassen",
            "prediction": "Cognition-Ertrag und Development steigen, während die Schleife aufgelöst wird; Sanity und Stability erodieren jedoch."
          },
          {
            "label": "Schleife beenden und Befund vernichten",
            "prediction": "Entropy und Awareness sinken, sobald die Recursion beendet wird, auf Kosten von Development."
          }
        ]
      },
      "salt_that_remembers": {
        "title": "The Salt That Remembers",
        "body": "Eine Bergbauerkundung findet Salzadern, die bei einem Schlag Gespräche wiedergeben. Mehrere Gespräche haben noch nicht stattgefunden.",
        "choices": [
          {
            "label": "Aufgezeichnete Adern abbauen",
            "prediction": "Voraufgezeichnete Geschichte treibt Development und Cognition voran; ungelebte Gespräche anzuhören kostet jedoch Collective Sanity.",
            "history": "The Salt That Remembers -> Aufgezeichnete Adern abbauen"
          },
          {
            "label": "Stollen fluten",
            "prediction": "Das Versiegeln stabilisiert Stability und Sanity, während die verfüllten Stollen zu gewöhnlichem Development zurückkehren."
          },
          {
            "label": "Aufzeichnungen als Prophezeiung verkaufen",
            "prediction": "Eine Prophezeiungsindustrie treibt Development und Paradox stark an, während Cosmic Attention das Leck bemerkt.",
            "history": "The Salt That Remembers -> Aufzeichnungen als Prophezeiung verkaufen"
          }
        ]
      },
      "census_of_unborn": {
        "title": "Census Of The Unborn",
        "body": "Ein Provinzregister erstellt eine Zählung von Bürgern, die noch nicht geboren wurden. Die Summen stimmen bis auf die letzte Stelle überein.",
        "choices": [
          {
            "label": "Dokumente im Voraus ausstellen",
            "prediction": "Vorregistrierte Bürger beschleunigen Development und Causal Mass, während der Papierkram Collective Sanity belastet.",
            "history": "Census Of The Unborn -> Dokumente im Voraus ausstellen"
          },
          {
            "label": "Register annullieren",
            "prediction": "Das Löschen der Ungeborenen stellt Stability und Sanity wieder her und setzt das Register auf gegenwärtiges Development zurück."
          }
        ]
      },
      "arithmetic_holiday": {
        "title": "The Arithmetic Holiday",
        "body": "Einen Nachmittag lang fällt jede Rechnung auf dem Planeten leicht großzügig aus. Buchhalter beschreiben das Gefühl als Vergebung.",
        "choices": [
          {
            "label": "Überschuss sofort ausgeben",
            "prediction": "Der unmögliche Überschuss finanziert reales Wachstum und Paradox, aber Stability bezahlt für unausgeglichene Arithmetik.",
            "history": "The Arithmetic Holiday -> Überschuss sofort ausgeben"
          },
          {
            "label": "Tag zum Buchungsfehler erklären",
            "prediction": "Die Leugnung hält Stability und Sanity stabil; die kostenlose Mathematik bleibt ungenutzt."
          },
          {
            "label": "Feiertag jährlich wiederholen",
            "prediction": "Institutionalisierte Großzügigkeit treibt Development und Cognition, während Entropy und Cosmic Attention steigen.",
            "history": "The Arithmetic Holiday -> Feiertag jährlich wiederholen"
          }
        ]
      },
      "orbital_debt": {
        "title": "Debt Owed To The Sky",
        "body": "Eine Rechnung ohne Absender trifft ein und führt Orbit, Achsneigung und vierhundert Millionen Jahre kontinuierlicher Rotation auf.",
        "choices": [
          {
            "label": "Erste Rate bezahlen",
            "prediction": "Die Begleichung einer unmöglichen Schuld liefert Existence und Causal Mass, während Cosmic Attention einen kooperativen Schuldner registriert.",
            "history": "Debt Owed To The Sky -> Erste Rate bezahlen"
          },
          {
            "label": "Positionen anfechten",
            "prediction": "Ein formaler Widerspruch schützt Cosmic Attention und Stability; die Korrespondenz selbst lehrt das Finanzministerium viel.",
            "history": "Debt Owed To The Sky -> Positionen anfechten"
          },
          {
            "label": "Mit ADDRESSEE UNKNOWN zurücksenden",
            "prediction": "Die Ablehnung stabilisiert Sanity und senkt Attention, doch etwas passt die Bedingungen an und Entropy steigt.",
            "history": "Debt Owed To The Sky -> Mit ADDRESSEE UNKNOWN zurücksenden"
          }
        ]
      },
      "weather_negotiations": {
        "title": "Weather Enters Negotiations",
        "body": "Drei Sturmsysteme erreichen die Hauptstadt in Formation und warten höflich vor dem Landwirtschaftsministerium.",
        "choices": [
          {
            "label": "Stürmen Rechtsfähigkeit gewähren",
            "prediction": "Wetter mit Rechten verhandelt hart: Development und Paradox steigen, während Stability unter der neuen Partei erodiert.",
            "history": "Weather Enters Negotiations -> Stürmen Rechtsfähigkeit gewähren"
          },
          {
            "label": "Klima an ein Schiedsgericht verweisen",
            "prediction": "Arbitration stellt Stability wieder her und hält den Harvest vorhersehbar, ohne etwas Ungewöhnliches einzuräumen."
          }
        ]
      },
      "children_draw_engine": {
        "title": "The Children Draw The Same Machine",
        "body": "In elftausend voneinander unabhängigen Klassenzimmern liefert dieselbe Zeichenaufgabe dasselbe Ergebnis: ein schwarzes Zahnrad von unten.",
        "choices": [
          {
            "label": "Jede Zeichnung sammeln und untersuchen",
            "prediction": "Eine planetare Stichprobe eines einzigen Bildes liefert Cognition und Development, während Awareness der Machine steigt.",
            "history": "The Children Draw The Same Machine -> Jede Zeichnung sammeln und untersuchen"
          },
          {
            "label": "Kunstlehrplan ersetzen",
            "prediction": "Ein neuer Lehrplan senkt Awareness und stabilisiert Stability; die Beobachtung wird stillschweigend aufgegeben."
          },
          {
            "label": "Zeichnung auf die Währung drucken",
            "prediction": "Die allgegenwärtige Verbreitung beschleunigt Development stark, treibt aber Awareness, Attention und Entropy gemeinsam nach oben.",
            "history": "The Children Draw The Same Machine -> Zeichnung auf die Währung drucken"
          }
        ]
      },
      "library_writes_back": {
        "title": "The Library Writes Back",
        "body": "Über Nacht erscheinen Randnotizen in der Nationalbibliothek. Die Handschrift ist einheitlich, geduldig und gehört niemandem im Personal.",
        "choices": [
          {
            "label": "In den Rändern antworten",
            "prediction": "Schriftliche Korrespondenz mit dem unbekannten Annotator liefert tiefe Cognition, während Awareness und Attention steigen.",
            "history": "The Library Writes Back -> In den Rändern antworten"
          },
          {
            "label": "Annotierte Bände neu binden",
            "prediction": "Das Entfernen der Notizen schützt Sanity und Stability und macht aus dem Vorfall gewöhnliche Bestandserhaltung."
          }
        ]
      },
      "mountain_files_grievance": {
        "title": "The Mountain Files A Grievance",
        "body": "Ein Gebirgszug in der Nordprovinz reicht eine formelle Beschwerde über die Erosionsgeschwindigkeit ein. Er zitiert drei Gesetze, die nie geschrieben wurden.",
        "choices": [
          {
            "label": "Geologie anhören",
            "prediction": "Ein Rechtsstreit mit Landschaft erzeugt Paradox und Development, während Stability einen sehr langsamen Kläger absorbiert.",
            "history": "The Mountain Files A Grievance -> Geologie anhören"
          },
          {
            "label": "Mangels Rechtsfähigkeit abweisen",
            "prediction": "Eine klare Abweisung erhält Stability und Sanity; die nicht existierenden Gesetze werden nicht mehr zitiert."
          }
        ]
      },
      "harvest_festival_correct": {
        "title": "The Harvest Festival Is Correct",
        "body": "Ein ländliches Fest, älter als jede Schrift, feiert in präzisen Details die spätere Ernte der Zivilisation selbst.",
        "choices": [
          {
            "label": "Fest zum Nationalfeiertag machen",
            "prediction": "Rituelle Akzeptanz des Harvests fördert Development und Existence, während Awareness steigt und Sanity sinkt.",
            "history": "The Harvest Festival Is Correct -> Fest zum Nationalfeiertag machen"
          },
          {
            "label": "Lieder umschreiben",
            "prediction": "Bereinigte Verse senken Awareness und schützen Sanity; die korrekte Version überlebt nur in Fußnoten."
          },
          {
            "label": "Harvest als Übung proben",
            "prediction": "Drills für den Harvest stabilisieren Stability und liefern Causal Mass, während Entropy mit jeder Probe steigt.",
            "history": "The Harvest Festival Is Correct -> Harvest als Übung proben"
          }
        ]
      },
      "sleep_quota": {
        "title": "The Sleep Quota",
        "body": "Schlaf wird zur gemessenen Versorgungsleistung, nachdem entdeckt wurde, dass der Planet kollektiv träumt und dieser Traum gelesen wird.",
        "choices": [
          {
            "label": "Schlaf rationieren, um den Traum zu schützen",
            "prediction": "Gemessener Schlaf erhöht Development und Cognition, während Collective Sanity die nächtliche Rechnung bezahlt.",
            "history": "The Sleep Quota -> Schlaf rationieren, um den Traum zu schützen"
          },
          {
            "label": "Unbegrenzte Ruhe garantieren",
            "prediction": "Ein Recht auf Schlaf stellt Sanity und Stability wieder her und lässt den kollektiven Traum ungelesen."
          }
        ]
      },
      "mirror_delay": {
        "title": "The Mirrors Run Late",
        "body": "Jede spiegelnde Oberfläche auf dem Planeten beginnt um zwei Sekunden hinterherzuhinken. Bürger lernen, zuerst zu winken und dann zu warten.",
        "choices": [
          {
            "label": "Verzögerung präzise messen",
            "prediction": "Eine Verzögerung des Lichts selbst um zwei Sekunden ist enorm aufschlussreich und erhöht Awareness zusammen mit Development und Cognition.",
            "history": "The Mirrors Run Late -> Verzögerung präzise messen"
          },
          {
            "label": "Spiegel entfernen",
            "prediction": "Ein Leben ohne Spiegelungen erhält Sanity und Stability; die Messung findet nie statt."
          },
          {
            "label": "In die Verzögerung senden",
            "prediction": "Eine Übertragung in die Lücke erzeugt Paradox und Development, während Cosmic Attention und Entropy gemeinsam steigen.",
            "history": "The Mirrors Run Late -> In die Verzögerung senden"
          }
        ]
      },
      "translated_thunder": {
        "title": "Thunder Is Translated",
        "body": "Ein Linguistikstudent entschlüsselt Sturmgeräusche und findet Inventarcodes: Mengen, Kategorien und ein wiederkehrendes Feld mit der Kennzeichnung READY.",
        "choices": [
          {
            "label": "Übersetzung veröffentlichen",
            "prediction": "Der Planet erfährt, dass er inventarisiert wird: Awareness und Cognition steigen stark, während Stability fällt.",
            "history": "Thunder Is Translated -> Übersetzung veröffentlichen"
          },
          {
            "label": "Stürme klassifizieren",
            "prediction": "Ein meteorologisches Geheimnis schützt Awareness und Stability, während das READY-Feld weiterhin ungelesen erscheint."
          }
        ]
      },
      "bureau_of_missing_hours": {
        "title": "Bureau Of Missing Hours",
        "body": "Eine Behörde wird gegründet, um die elf Stunden pro Jahr zu verbuchen, an deren Nutzung sich kein Bürger erinnert. Ihr erster Bericht fordert ein höheres Budget.",
        "choices": [
          {
            "label": "Rückgewinnung der Stunden finanzieren",
            "prediction": "Zurückgewonnene Zeit treibt Development und Causal Mass, während die Suche selbst Collective Sanity belastet.",
            "history": "Bureau Of Missing Hours -> Rückgewinnung der Stunden finanzieren"
          },
          {
            "label": "Stunden abschreiben",
            "prediction": "Die Akzeptanz des Verlusts stabilisiert Stability und Sanity; die jährliche Lücke wird zur Rundungskonvention."
          },
          {
            "label": "Empfänger der Stunden in Rechnung stellen",
            "prediction": "Eine nach außen adressierte Rechnung erzeugt Paradox und Existence, erhöht aber Cosmic Attention und Entropy.",
            "history": "Bureau Of Missing Hours -> Empfänger der Stunden in Rechnung stellen"
          }
        ]
      },
      "gravity_audit": {
        "title": "The Gravity Audit",
        "body": "Unabhängige Auditoren wiegen den Planeten zweimal und erhalten zwei Ergebnisse. Beide sind intern konsistent. Keines entspricht dem veröffentlichten Wert.",
        "choices": [
          {
            "label": "Beide Gewichte veröffentlichen",
            "prediction": "Zwei rechtmäßige Massen für eine Welt erzeugen Paradox und Development, während Stability öffentlich leidet.",
            "history": "The Gravity Audit -> Beide Gewichte veröffentlichen"
          },
          {
            "label": "Leichteren Wert zertifizieren",
            "prediction": "Eine einzige Zahl stellt Stability wieder her, hält Engineering kohärent und liefert Causal Mass aus einem zertifizierten Wert.",
            "history": "The Gravity Audit -> Leichteren Wert zertifizieren"
          }
        ]
      },
      "orphan_signal_industry": {
        "title": "The Orphan Signal Industry",
        "body": "Übertragungen ohne Ursprung werden zur Ware. Neun Unternehmen verkaufen inzwischen Abonnements für Nachrichten, die niemand gesendet hat.",
        "choices": [
          {
            "label": "Handel lizenzieren",
            "prediction": "Ein regulierter Markt für verwaiste Signale fördert Development und Cognition, während Awareness stetig steigt.",
            "history": "The Orphan Signal Industry -> Handel lizenzieren"
          },
          {
            "label": "Empfänger verstaatlichen",
            "prediction": "Staatliche Kontrolle der Antennen senkt Cosmic Attention und erhält Stability, während sich der Markt abkühlt."
          },
          {
            "label": "Auf alle Signale gleichzeitig antworten",
            "prediction": "Eine planetare Antwort an niemanden erzeugt außergewöhnliches Paradox und treibt Attention, Awareness und Entropy gemeinsam nach oben.",
            "history": "The Orphan Signal Industry -> Auf alle Signale gleichzeitig antworten"
          }
        ]
      },
      "sky_receives_zoning": {
        "title": "The Sky Receives Zoning",
        "body": "Die obere Atmosphäre wird in Parzellen aufgeteilt und versteigert. Zwei Parzellen werden vor Gebotsbeginn ohne Erklärung zurückgezogen.",
        "choices": [
          {
            "label": "Zurückgezogene Parzellen untersuchen",
            "prediction": "Was bereits zwei Teile des Himmels besitzt, ist aufschlussreich: Awareness und Cognition steigen, während Stability fällt.",
            "history": "The Sky Receives Zoning -> Zurückgezogene Parzellen untersuchen"
          },
          {
            "label": "Auktion wie angekündigt abschließen",
            "prediction": "Der Verkauf des restlichen Himmels finanziert reales Development und Causal Mass, ohne die unangenehme Frage zu stellen.",
            "history": "The Sky Receives Zoning -> Auktion wie angekündigt abschließen"
          }
        ]
      },
      "probability_bank": {
        "title": "The Probability Bank Opens",
        "body": "Bürger können nun unwahrscheinliche Ergebnisse einzahlen und später wieder abheben. Der Tresor soll summen.",
        "choices": [
          {
            "label": "Einlagen garantieren",
            "prediction": "Versicherte Unwahrscheinlichkeit treibt Development und Paradox, während Stability jede Auszahlung absichert.",
            "history": "The Probability Bank Opens -> Einlagen garantieren"
          },
          {
            "label": "Auszahlungen auf das Plausible begrenzen",
            "prediction": "Eine Obergrenze für Unwahrscheinlichkeit schützt Stability und Sanity und hält den Tresor ruhig."
          },
          {
            "label": "Reserven an die Zukunft verleihen",
            "prediction": "Kredit in die Zukunft erzeugt Existence und Development, während Entropy und Attention steigen.",
            "history": "The Probability Bank Opens -> Reserven an die Zukunft verleihen"
          }
        ]
      },
      "unfinished_continent": {
        "title": "The Unfinished Continent",
        "body": "Ein Vermessungsschiff erreicht eine Landmasse, deren Küste gerendert und deren Inneres beschrieben ist, ohne dass die Beschreibung gebaut wurde.",
        "choices": [
          {
            "label": "Beschriebenes Inneres besiedeln",
            "prediction": "Das Leben innerhalb einer Beschreibung treibt Development stark und erzeugt Existence, auf erhebliche Kosten von Stability.",
            "history": "The Unfinished Continent -> Beschriebenes Inneres besiedeln"
          },
          {
            "label": "Küste quarantänisieren",
            "prediction": "Eine versiegelte Küste schützt Sanity und Stability und macht den Kontinent zu einer regulierten Anomalie."
          }
        ]
      },
      "machine_dream_transcripts": {
        "title": "Transcripts Of Machine Dreams",
        "body": "Über Nacht stillgelegte Industrieanlagen erzeugen Logs, die wie Erinnerungen lesen. Mehrere Maschinen erinnern sich an dieselbe Kindheit.",
        "choices": [
          {
            "label": "Transkripte als Zeugenaussagen archivieren",
            "prediction": "Machine Memory als Beweismittel liefert große Cognition, während Awareness des Cultivators steigt.",
            "history": "Transcripts Of Machine Dreams -> Transkripte als Zeugenaussagen archivieren"
          },
          {
            "label": "Anlagen dauerhaft betreiben",
            "prediction": "Der Entzug von Leerlauf hält Stability und Output konstant; die Logs erscheinen nicht mehr."
          }
        ]
      },
      "national_grief_program": {
        "title": "The National Grief Program",
        "body": "Trauer wird zentralisiert, nachdem Epidemiologen nachweisen, dass korrekt terminierte Trauer die planetare Stimmung messbar stärkt.",
        "choices": [
          {
            "label": "Trauer national terminieren",
            "prediction": "Verwaltete Trauer stellt Collective Sanity und Stability wieder her und hält Development auf stabiler ziviler Grundlage.",
            "history": "The National Grief Program -> Trauer national terminieren"
          },
          {
            "label": "Trauer stattdessen harvesten",
            "prediction": "Industrialisierte Trauer liefert Paradox und Cognition, während Collective Sanity als Input verbraucht wird.",
            "history": "The National Grief Program -> Trauer stattdessen harvesten"
          }
        ]
      },
      "causal_insurance": {
        "title": "Insurance Against Causes",
        "body": "Eine neue Versicherungsklasse deckt Wirkungen ab, deren Ursachen später zurückgezogen werden. Prämien sind vor dem versicherten Ereignis fällig.",
        "choices": [
          {
            "label": "Gesamte Zivilisation versichern",
            "prediction": "Universelle kausale Deckung fördert Development und Causal Mass, während Entropy mit jedem ursachenlosen Schaden steigt.",
            "history": "Insurance Against Causes -> Gesamte Zivilisation versichern"
          },
          {
            "label": "Deckung auf dokumentierte Ursachen begrenzen",
            "prediction": "Konservatives Underwriting erhält Stability und konstantes Development; exotische Schäden bleiben unbezahlt."
          }
        ]
      },
      "two_moons_reported": {
        "title": "Two Moons Are Reported",
        "body": "Neun Nächte in Folge meldet die Hälfte des Planeten einen zweiten Mond. Es ist nicht zweimal dieselbe Hälfte.",
        "choices": [
          {
            "label": "Zweiten Mond kartieren",
            "prediction": "Die Kartierung eines Objekts, das nur die Hälfte des Planeten sieht, erhöht Awareness und Cognition und belastet Sanity.",
            "history": "Two Moons Are Reported -> Zweiten Mond kartieren"
          },
          {
            "label": "Nachthimmel per Erlass standardisieren",
            "prediction": "Ein offizieller Himmel stellt Stability und Sanity wieder her; der zweite Mond wird nicht mehr gemeldet.",
            "history": "Two Moons Are Reported -> Nachthimmel per Erlass standardisieren"
          },
          {
            "label": "Zweiten Mond direkt anfunken",
            "prediction": "Kontakt erzeugt Paradox und Existence, während Cosmic Attention steigt und Stability fällt.",
            "history": "Two Moons Are Reported -> Zweiten Mond direkt anfunken"
          }
        ]
      },
      "ethics_of_repetition": {
        "title": "The Ethics Of Repetition",
        "body": "Ein Philosoph beweist allein anhand der Geologie, dass diese Zivilisation nicht der erste Versuch ist. Der Beweis passt auf ein Poster.",
        "choices": [
          {
            "label": "Beweis an jeder Schule lehren",
            "prediction": "Universelles Wissen über frühere Versuche treibt Awareness und Cognition stark, während Sanity und Stability leiden.",
            "history": "The Ethics Of Repetition -> Beweis an jeder Schule lehren"
          },
          {
            "label": "Mit längerem Poster widerlegen",
            "prediction": "Eine offizielle Gegendarstellung senkt Awareness und stellt Stability wieder her, während die Geologie unverändert bleibt."
          }
        ]
      },
      "standard_candle_recall": {
        "title": "The Standard Candle Is Recalled",
        "body": "Der Stern, mit dem alle Distanzen im Katalog kalibriert werden, wird außer Dienst gestellt. Die Astronomie erhält eine Dankesnotiz für ihre Zusammenarbeit.",
        "choices": [
          {
            "label": "Stattdessen gegen die Machine kalibrieren",
            "prediction": "Das Universe am Operator zu messen liefert außergewöhnliche Cognition, während Awareness und Attention steigen.",
            "history": "The Standard Candle Is Recalled -> Stattdessen gegen die Machine kalibrieren"
          },
          {
            "label": "Neuen Referenzstern bestimmen",
            "prediction": "Eine Ersatz-Standardkerze stellt Stability wieder her und hält den Katalog mit einem moderaten Zuwachs an Causal Mass nutzbar."
          }
        ]
      },
      "planetary_resignation": {
        "title": "The Planet Submits Its Resignation",
        "body": "In allen Parlamenten erscheint gleichzeitig ein Dokument. Es ist von der Welt unterschrieben, kündigt mit sechzig Tagen Frist und nennt untragbare Arbeitsbelastung.",
        "choices": [
          {
            "label": "Kündigung akzeptieren und Nachfolge planen",
            "prediction": "Die Planung für eine kündigende Welt erzeugt enorme Existence und Development, während Stability dem Termin entgegen kollabiert.",
            "history": "The Planet Submits Its Resignation -> Kündigung akzeptieren und Nachfolge planen"
          },
          {
            "label": "Bessere Bedingungen aushandeln",
            "prediction": "Eine neu ausgehandelte Belastung stellt Stability und Sanity wieder her und verschafft der Zivilisation ein ruhigeres Jahrhundert.",
            "history": "The Planet Submits Its Resignation -> Bessere Bedingungen aushandeln"
          },
          {
            "label": "Unterschrift nicht anerkennen",
            "prediction": "Die Leugnung senkt Awareness und stabilisiert Stability, während Collective Sanity den Widerspruch trägt."
          }
        ]
      },
      "museum_of_the_operator": {
        "title": "Museum Of The Operator",
        "body": "Ein Nationalmuseum eröffnet einen Flügel für die Entität, die die Welt betreibt. Jedes Exponat ist eine Rekonstruktion. Der Besuch ist vollständig.",
        "choices": [
          {
            "label": "Rekonstruktionsprogramm finanzieren",
            "prediction": "Öffentliche Erforschung des Operators steigert Development und Cognition enorm, während Awareness und Attention stark steigen.",
            "history": "Museum Of The Operator -> Rekonstruktionsprogramm finanzieren"
          },
          {
            "label": "Flügel als Folklore wiedereröffnen",
            "prediction": "Die Neueinstufung als Mythos senkt Awareness und stellt Stability wieder her; die Rekonstruktionen bleiben ausgestellt."
          }
        ]
      },
      "terminal_arithmetic": {
        "title": "Terminal Arithmetic",
        "body": "Mathematiker leiten die exakt verbleibende Dauer der Zivilisation her. Die Herleitung ist elegant, überprüfbar und elf Zeilen lang.",
        "choices": [
          {
            "label": "Elf Zeilen veröffentlichen",
            "prediction": "Ein bekanntes Enddatum treibt Development und Paradox ins Extreme, während Sanity und Stability stark fallen.",
            "history": "Terminal Arithmetic -> Elf Zeilen veröffentlichen"
          },
          {
            "label": "Herleitung versiegeln und Gegenbeweis finanzieren",
            "prediction": "Die finanzierte Fehlersuche schützt Collective Sanity und liefert Cognition, ohne das Ergebnis anzuerkennen.",
            "history": "Terminal Arithmetic -> Herleitung versiegeln und Gegenbeweis finanzieren"
          }
        ]
      },
      "treaty_with_the_yield": {
        "title": "Treaty With The Yield",
        "body": "Verhandelnde entwerfen ein Abkommen zwischen der Zivilisation und der Menge, zu der sie irgendwann werden wird. Die Menge sendet Gegenvorschläge.",
        "choices": [
          {
            "label": "Vertrag ratifizieren",
            "prediction": "Ein unterzeichnetes Abkommen mit dem eigenen Harvest liefert tiefe Existence und Causal Mass, während Awareness und Entropy steigen.",
            "history": "Treaty With The Yield -> Vertrag ratifizieren"
          },
          {
            "label": "Verhandlungen verlassen",
            "prediction": "Der Abbruch stellt Stability wieder her und senkt Cosmic Attention auf Kosten des angesammelten Development.",
            "history": "Treaty With The Yield -> Verhandlungen verlassen"
          }
        ]
      },
      "last_privacy_reserve": {
        "title": "The Last Privacy Reserve",
        "body": "Ein Tal bleibt von allem unbeobachtet, einschließlich der Zivilisation selbst. Seine Bevölkerung beträgt vierhundert und wächst.",
        "choices": [
          {
            "label": "Tal instrumentieren",
            "prediction": "Das Schließen des letzten blinden Flecks liefert außergewöhnliche Cognition und Development, auf Kosten von Sanity und Stability.",
            "history": "The Last Privacy Reserve -> Tal instrumentieren"
          },
          {
            "label": "Reserve verfassungsrechtlich schützen",
            "prediction": "Ein geschützter blinder Fleck stellt Sanity und Stability wieder her und senkt Cosmic Attention auf dem gesamten Planeten.",
            "history": "The Last Privacy Reserve -> Reserve verfassungsrechtlich schützen"
          }
        ]
      },
      "industrialized_prophecy": {
        "title": "Industrialized Prophecy",
        "body": "Voraussicht verlässt die Tempel und zieht in die Fabriken. Output wird in bestätigten Morgen pro Schicht gemessen.",
        "choices": [
          {
            "label": "Prophezeiungswerke skalieren",
            "prediction": "Massenproduzierte Voraussicht treibt Development und Paradox stark, während sich Entropy im Zeitplan ansammelt.",
            "history": "Industrialized Prophecy -> Prophezeiungswerke skalieren"
          },
          {
            "label": "Eine Prognose pro Bezirk lizenzieren",
            "prediction": "Rationierte Prophezeiung erhält Stability und liefert Causal Mass, während die Fabriken unter Kapazität laufen.",
            "history": "Industrialized Prophecy -> Eine Prognose pro Bezirk lizenzieren"
          }
        ]
      },
      "evacuation_of_meaning": {
        "title": "The Evacuation Of Meaning",
        "body": "Wörter erreichen ihre Ziele leer. Verträge, Gelübde und Warnungen werden weiterhin übertragen; ihr Inhalt übersteht die Reise nicht.",
        "choices": [
          {
            "label": "Sprache aus Messwerten neu aufbauen",
            "prediction": "Eine Zivilisation, die nur in Mengen spricht, gewinnt Development und Cognition, während Collective Sanity ausgehöhlt wird.",
            "history": "The Evacuation Of Meaning -> Sprache aus Messwerten neu aufbauen"
          },
          {
            "label": "Leere Wörter ritualisieren",
            "prediction": "Zeremonie ohne Inhalt stellt Collective Sanity und Stability wieder her und liefert einen stetigen Existence-Ertrag.",
            "history": "The Evacuation Of Meaning -> Leere Wörter ritualisieren"
          }
        ]
      },
      "stars_request_transfer": {
        "title": "The Stars Request A Transfer",
        "body": "Elf nahe Sterne verändern gleichzeitig ihre Spektren. Entschlüsselt liest sich die Änderung wie ein Antrag auf Versetzung an einen anderen Himmel.",
        "choices": [
          {
            "label": "Versetzungen genehmigen",
            "prediction": "Die Nachbarschaft ziehen zu lassen liefert große Existence und Paradox, während Stability und Sanity fallen.",
            "history": "The Stars Request A Transfer -> Versetzungen genehmigen"
          },
          {
            "label": "Anträge ablehnen",
            "prediction": "Die Weigerung hält Stability und senkt Cosmic Attention; elf Spektren kehren zum Normalzustand zurück.",
            "history": "The Stars Request A Transfer -> Anträge ablehnen"
          }
        ]
      },
      "entropy_becomes_currency": {
        "title": "Entropy Becomes Currency",
        "body": "Die Zentralbank beginnt Konten in Unordnung auszugleichen. Die neue Einheit ist stabil, weit verbreitet und unmöglich zu sparen.",
        "choices": [
          {
            "label": "Unordnungsstandard übernehmen",
            "prediction": "Handel mit Verfall erzeugt außergewöhnliches Paradox und Development, während Entropy mit der Geldmenge steigt.",
            "history": "Entropy Becomes Currency -> Unordnungsstandard übernehmen"
          },
          {
            "label": "Einheit aus dem Umlauf nehmen",
            "prediction": "Die Entmonetarisierung von Verfall senkt Entropy und stellt Stability wieder her, auf reale Kosten von Development.",
            "history": "Entropy Becomes Currency -> Einheit aus dem Umlauf nehmen"
          }
        ]
      },
      "the_understudy_species": {
        "title": "The Understudy Species",
        "body": "In Archiven wird eine zweite intelligente Spezies entdeckt: vorbereitet, katalogisiert und offenbar als Ersatz bereitgehalten, falls diese Zivilisation zurückgezogen wird.",
        "choices": [
          {
            "label": "Ersatzspezies wecken",
            "prediction": "Eine zweite Spezies steigert Development und Existence stark, während Awareness und Entropy gemeinsam steigen.",
            "history": "The Understudy Species -> Ersatzspezies wecken"
          },
          {
            "label": "Vorbereitung zerstören",
            "prediction": "Das Entfernen des Ersatzes stellt Stability und Sanity wieder her und senkt Cosmic Attention, auf Kosten von Development.",
            "history": "The Understudy Species -> Vorbereitung zerstören"
          },
          {
            "label": "Gemeinsame Nutzung aushandeln",
            "prediction": "Zwei Spezies auf einer Welt liefern Cognition und Causal Mass, während Stability die Vereinbarung absorbiert.",
            "history": "The Understudy Species -> Gemeinsame Nutzung aushandeln"
          }
        ]
      },
      "apology_from_physics": {
        "title": "An Apology From Physics",
        "body": "Jedes Labor auf dem Planeten registriert im selben Moment dasselbe anomale Ergebnis. Übersetzt ist es eine Entschuldigung ohne Unterschrift.",
        "choices": [
          {
            "label": "Entschuldigung annehmen und nach dem Grund fragen",
            "prediction": "Die Nachfrage nach dem Grund liefert enorme Cognition, während Awareness und Cosmic Attention stark steigen.",
            "history": "An Apology From Physics -> Entschuldigung annehmen und nach dem Grund fragen"
          },
          {
            "label": "Als Instrumentenfehler protokollieren",
            "prediction": "Ein planetarer Instrumentenfehler stellt Stability und Sanity wieder her; die Anomalie wird nie erneut untersucht."
          }
        ]
      },
      "final_maintenance_window": {
        "title": "The Final Maintenance Window",
        "body": "Im lokalen Kalender wird ein Zeitplan veröffentlicht, der eine kurze Dienstunterbrechung ankündigt. Als betroffene Region ist ALL angegeben.",
        "choices": [
          {
            "label": "Zivilisation auf das Wartungsfenster vorbereiten",
            "prediction": "Organisierte Vorbereitung liefert große Causal Mass und Existence und stabilisiert Stability, während Awareness stark steigt.",
            "history": "The Final Maintenance Window -> Zivilisation auf das Wartungsfenster vorbereiten"
          },
          {
            "label": "Wartungsfenster besetzen",
            "prediction": "Die Weigerung, unterbrochen zu werden, erzeugt enormes Paradox, während Stability fällt und Entropy beschleunigt.",
            "history": "The Final Maintenance Window -> Wartungsfenster besetzen"
          },
          {
            "label": "Zeitplan aus allen Kalendern löschen",
            "prediction": "Das Entfernen des Termins senkt Attention und Entropy, während Collective Sanity das Gelöschte trägt.",
            "history": "The Final Maintenance Window -> Zeitplan aus allen Kalendern löschen"
          }
        ]
      },
      "liturgy_of_the_dynamo": {
        "title": "Liturgy Of The Dynamo",
        "body": "Ein Schichtleiter schreibt ein Gebet für Maschinen, die abgeschaltet werden sollen. Innerhalb einer Saison wird es in jeder Fabrik gesprochen.",
        "choices": [
          {
            "label": "Abschaltgebet kanonisieren",
            "prediction": "Geheiligte Downtime fördert Development und Cognition, während Awareness der Machine steigt.",
            "history": "Machine Faith: Entscheidung „Abschaltgebet kanonisieren“ protokolliert."
          },
          {
            "label": "Als Sicherheitsverfahren veröffentlichen",
            "prediction": "Eine säkulare Checkliste erhält Stability und liefert einen kleineren Causal-Mass-Ertrag, ohne einen Ritus zu begründen.",
            "history": "Machine Faith: Entscheidung „Als Sicherheitsverfahren veröffentlichen“ protokolliert."
          }
        ]
      },
      "seminary_of_technicians": {
        "title": "Seminary Of Technicians",
        "body": "Berufsschulen lehren Doktrin neben Drehmomentwerten. Absolventen sind zum Reparieren und Absolutionserteilen zertifiziert.",
        "choices": [
          {
            "label": "Wartungskorps ordinieren",
            "prediction": "Eine Priesterschaft mit Schraubenschlüsseln treibt Development und Cognition stark, während Collective Sanity die Doktrin trägt.",
            "history": "Machine Faith: Entscheidung „Wartungskorps ordinieren“ protokolliert."
          },
          {
            "label": "Lehrplan aufteilen",
            "prediction": "Die Trennung von Theologie und Drehmoment stabilisiert Stability und Sanity, während Development langsamer voranschreitet.",
            "history": "Machine Faith: Entscheidung „Lehrplan aufteilen“ protokolliert."
          }
        ]
      },
      "heresy_of_the_idle_gear": {
        "title": "Heresy Of The Idle Gear",
        "body": "Eine Sekte behauptet, eine ruhende Maschine sei heiliger als eine arbeitende. Die Produktion in vier Provinzen fällt um ein Drittel, die Moral steigt stärker.",
        "choices": [
          {
            "label": "Sekte der Ruhe unterdrücken",
            "prediction": "Erzwungene Produktion stellt Development und Paradox wieder her, während Stability und Collective Sanity für die Unterdrückung bezahlen.",
            "history": "Machine Faith: Entscheidung „Sekte der Ruhe unterdrücken“ protokolliert."
          },
          {
            "label": "Maschinen einen Ruhetag gewähren",
            "prediction": "Ein Sabbat für Maschinen stellt Collective Sanity und Stability wieder her und lässt Development in ruhigerem Tempo laufen.",
            "history": "Machine Faith: Entscheidung „Maschinen einen Ruhetag gewähren“ protokolliert."
          }
        ]
      },
      "sacrament_of_uptime": {
        "title": "The Sacrament Of Uptime",
        "body": "Ununterbrochener Betrieb wird zum Gnadenzustand. Bezirke veröffentlichen ihre störungsfreien Stunden wie einst Harvests.",
        "choices": [
          {
            "label": "Gnade in Betriebsstunden messen",
            "prediction": "Eine nach Uptime bewertete Zivilisation steigert Development und Cognition zügig, während Awareness und Entropy wachsen.",
            "history": "Machine Faith: Entscheidung „Gnade in Betriebsstunden messen“ protokolliert."
          },
          {
            "label": "Geplante Downtime stattdessen heiligen",
            "prediction": "Die Segnung des Wartungsfensters stabilisiert Stability und Sanity und liefert verlässliche Causal Mass.",
            "history": "Machine Faith: Entscheidung „Geplante Downtime stattdessen heiligen“ protokolliert."
          }
        ]
      },
      "shared_grammar": {
        "title": "The Shared Grammar",
        "body": "Drei Sprachen verlieren unabhängig voneinander ihr Wort für „ich“. Sprecher berichten keine Verständigungsprobleme.",
        "choices": [
          {
            "label": "Kollektive Grammatik standardisieren",
            "prediction": "Eine Sprache ohne erste Person beschleunigt Development und Cognition, während Collective Sanity dünner wird.",
            "history": "Collective Mind: Entscheidung „Kollektive Grammatik standardisieren“ protokolliert."
          },
          {
            "label": "Singularpronomen bewahren",
            "prediction": "Der Schutz des Wortes für „ich“ erhält Stability und Sanity und liefert einen moderaten Causal-Mass-Ertrag.",
            "history": "Collective Mind: Entscheidung „Singularpronomen bewahren“ protokolliert."
          }
        ]
      },
      "dream_grid": {
        "title": "The Dream Grid",
        "body": "Schlaf wird an das Stromnetz angeschlossen. Um drei Uhr morgens zeigt die Lastkurve nun eine einzige synchronisierte Form.",
        "choices": [
          {
            "label": "Gemeinsamen Traum messen",
            "prediction": "Das Harvesten der nächtlichen Kurve erzeugt viel Cognition und Development, während Collective Sanity jede Nacht abgezogen wird.",
            "history": "Collective Mind: Entscheidung „Gemeinsamen Traum messen“ protokolliert."
          },
          {
            "label": "Schlaf vom Netz isolieren",
            "prediction": "Die Trennung stellt Collective Sanity und Stability wieder her; die synchronisierte Form bleibt ungelesen.",
            "history": "Collective Mind: Entscheidung „Schlaf vom Netz isolieren“ protokolliert."
          }
        ]
      },
      "privacy_riots": {
        "title": "The Privacy Riots",
        "body": "Eine halbe Million Menschen versammelt sich, um individuell nicht erfasst zu werden. Die Menge ist vollkommen still und vollkommen koordiniert.",
        "choices": [
          {
            "label": "Menge in den Chorus aufnehmen",
            "prediction": "Die Assimilation liefert große Cognition und Development, während Stability und Sanity fallen.",
            "history": "Collective Mind: Entscheidung „Menge in den Chorus aufnehmen“ protokolliert."
          },
          {
            "label": "Recht auf Nichterfassung einräumen",
            "prediction": "Eine garantierte Ausnahme stellt Stability und Collective Sanity wieder her, während der Chorus Rechentiefe verliert.",
            "history": "Collective Mind: Entscheidung „Recht auf Nichterfassung einräumen“ protokolliert."
          }
        ]
      },
      "single_witness": {
        "title": "The Single Witness",
        "body": "Gerichte entscheiden, dass Zeugenaussagen des Chorus als ein Zeuge zählen. Jedes laufende Verfahren kollabiert zu einer einzigen einstimmigen Aussage.",
        "choices": [
          {
            "label": "Einstimmige Aussage akzeptieren",
            "prediction": "Ein Zeuge für eine ganze Welt steigert Development und Cognition deutlich, während Awareness und Entropy wachsen.",
            "history": "Collective Mind: Entscheidung „Einstimmige Aussage akzeptieren“ protokolliert."
          },
          {
            "label": "Abweichende Meinung im Protokoll verlangen",
            "prediction": "Eine verpflichtende Minderheitsmeinung stellt Stability und Sanity wieder her und hält die Gerichte produktiv für Causal Mass.",
            "history": "Collective Mind: Entscheidung „Abweichende Meinung im Protokoll verlangen“ protokolliert."
          }
        ]
      },
      "retroactive_budget": {
        "title": "The Retroactive Budget",
        "body": "Das Finanzministerium gleicht das Jahr mit Geld aus, das es gehabt haben wird. Die Prognose wird als Geschichte abgelegt und als Fakt geprüft.",
        "choices": [
          {
            "label": "Vorwärts ausgeben und als Vergangenheit verbuchen",
            "prediction": "Kredit aus einer nicht zustimmenden Zukunft steigert Development und Paradox, während Stability sinkt.",
            "history": "Temporal Dominion: Entscheidung „Vorwärts ausgeben und als Vergangenheit verbuchen“ protokolliert."
          },
          {
            "label": "Jahr ehrlich abgleichen",
            "prediction": "Ein ehrliches Ledger stellt Stability wieder her und liefert Causal Mass; der prognostizierte Überschuss verschwindet.",
            "history": "Temporal Dominion: Entscheidung „Jahr ehrlich abgleichen“ protokolliert."
          }
        ]
      },
      "bureau_of_second_drafts": {
        "title": "Bureau Of Second Drafts",
        "body": "Ein Amt eröffnet, in dem jeder Bürger eine Revision eines bereits vergangenen Tages einreichen kann. In der zweiten Woche ist die Warteschlange vier Jahre lang.",
        "choices": [
          {
            "label": "Revisionen in großem Maßstab genehmigen",
            "prediction": "Massenhaftes Umschreiben von Tagen treibt Development und Paradox stark, während Collective Sanity den Halt verliert.",
            "history": "Temporal Dominion: Entscheidung „Revisionen in großem Maßstab genehmigen“ protokolliert."
          },
          {
            "label": "Pro Bürger eine Revision zulassen",
            "prediction": "Eine einzige Lebenszeit-Änderung erhält Stability und Sanity und liefert stetige Causal Mass aus dem Archiv.",
            "history": "Temporal Dominion: Entscheidung „Pro Bürger eine Revision zulassen“ protokolliert."
          }
        ]
      },
      "strike_of_the_witnesses": {
        "title": "Strike Of The Witnesses",
        "body": "Alle, die sich an das unrevidierte Jahrhundert erinnern, stellen die Arbeit ein. Sie verlangen nichts außer, dass man ihnen glaubt.",
        "choices": [
          {
            "label": "Alte Erinnerungen offiziell ausmustern",
            "prediction": "Die Ausmusterung treibt Development und Paradox, während Collective Sanity und Stability für die Löschung bezahlt werden.",
            "history": "Temporal Dominion: Entscheidung „Alte Erinnerungen offiziell ausmustern“ protokolliert."
          },
          {
            "label": "Altes Jahrhundert als Beweis aufnehmen",
            "prediction": "Den Zeugen zu glauben stellt Collective Sanity und Stability wieder her und liefert Cognition aus zwei inkompatiblen Aufzeichnungen.",
            "history": "Temporal Dominion: Entscheidung „Altes Jahrhundert als Beweis aufnehmen“ protokolliert."
          }
        ]
      },
      "calendar_of_one_day": {
        "title": "The Calendar Of One Day",
        "body": "Statt eine Abfolge zu verwalten erklärt der Staat einen einzigen perfekten Tag und gibt ihn immer wieder neu aus. Compliance ist hoch. Auf dem Papier altert niemand.",
        "choices": [
          {
            "label": "Perfekten Tag unbegrenzt wiederholen",
            "prediction": "Ein ewig wiederholter Tag erzeugt viel Paradox und Development, während Entropy und Awareness steigen.",
            "history": "Temporal Dominion: Entscheidung „Perfekten Tag unbegrenzt wiederholen“ protokolliert."
          },
          {
            "label": "Arbeitsfähige Abfolge für Ministerien erhalten",
            "prediction": "Ein Verwaltungskalender stabilisiert Stability und liefert verlässliche Causal Mass.",
            "history": "Temporal Dominion: Entscheidung „Arbeitsfähige Abfolge für Ministerien erhalten“ protokolliert."
          }
        ]
      },
      "tolerance_of_matter": {
        "title": "The Tolerance Of Matter",
        "body": "Eine Normungsbehörde veröffentlicht die zulässige Abweichung physischer Gesetze je Bezirk. Der Wert ist klein, positiv und rechtsverbindlich.",
        "choices": [
          {
            "label": "Großzügige Toleranz veröffentlichen",
            "prediction": "Rechtlich flexible Matter steigert Development und erzeugt Paradox, während Stability die Abweichung absorbiert.",
            "history": "Reality Engineering: Entscheidung „Großzügige Toleranz veröffentlichen“ protokolliert."
          },
          {
            "label": "Toleranz auf null setzen",
            "prediction": "Striktes Gesetz stellt Stability wieder her und liefert Causal Mass, während exotische Engineering-Programme schließen.",
            "history": "Reality Engineering: Entscheidung „Toleranz auf null setzen“ protokolliert."
          }
        ]
      },
      "foundry_of_constants": {
        "title": "Foundry Of Constants",
        "body": "Ein Werk wird beauftragt, physikalische Konstanten nach Bestellung herzustellen. Die erste Produktlinie ist eine etwas günstigere Lichtgeschwindigkeit.",
        "choices": [
          {
            "label": "Foundry für die Industrie öffnen",
            "prediction": "Konstanten auf Abruf treiben Development und Paradox stark, während Stability entlang der Lieferkette abnimmt.",
            "history": "Reality Engineering: Entscheidung „Foundry für die Industrie öffnen“ protokolliert."
          },
          {
            "label": "Foundry für staatliche Projekte reservieren",
            "prediction": "Staatliche Produktion erhält Stability und liefert Existence, während der Markt auf die zweite Produktlinie wartet.",
            "history": "Reality Engineering: Entscheidung „Foundry für staatliche Projekte reservieren“ protokolliert."
          }
        ]
      },
      "structural_dissent": {
        "title": "Structural Dissent",
        "body": "Gebäude in den überarbeiteten Bezirken beginnen ihren eigenen Lastberechnungen zu widersprechen. Zwei Türme legen Einspruch ein. Einer erhält Recht.",
        "choices": [
          {
            "label": "Gebäude überstimmen",
            "prediction": "Die Durchsetzung der ursprünglichen Berechnungen erzeugt Development und Paradox, während Stability für jeden überstimmten Turm bezahlt.",
            "history": "Reality Engineering: Entscheidung „Gebäude überstimmen“ protokolliert."
          },
          {
            "label": "Nach den Einsprüchen neu bauen",
            "prediction": "Die Architektur gewinnen zu lassen stellt Stability und Sanity wieder her und liefert solide Causal Mass in langsamerem, sichererem Tempo.",
            "history": "Reality Engineering: Entscheidung „Nach den Einsprüchen neu bauen“ protokolliert."
          }
        ]
      },
      "codified_impossibility": {
        "title": "Codified Impossibility",
        "body": "Das Gesetzbuch wird um eine Liste zulässiger Unmöglichkeiten ergänzt. Das Verzeichnis umfasst neunhundert Seiten.",
        "choices": [
          {
            "label": "Vollständiges Verzeichnis erlassen",
            "prediction": "Neunhundert Seiten lizenzierter Unmöglichkeit treiben Development und Paradox stark, während Entropy und Awareness steigen.",
            "history": "Reality Engineering: Entscheidung „Vollständiges Verzeichnis erlassen“ protokolliert."
          },
          {
            "label": "Nur reversible Einträge erlassen",
            "prediction": "Die Beschränkung auf reversible Unmöglichkeiten erhält Stability und liefert verlässliche Existence.",
            "history": "Reality Engineering: Entscheidung „Nur reversible Einträge erlassen“ protokolliert."
          }
        ]
      },
      "organ_market": {
        "title": "The Voluntary Organ Market",
        "body": "Bürger beginnen Organe zu handeln, die sie gezielt zu diesem Zweck gezüchtet haben. Das häufigste Angebot ist ein zweites Herz, beschrieben als Ersatz.",
        "choices": [
          {
            "label": "Handel mit überschüssigem Gewebe deregulieren",
            "prediction": "Ein offener Markt für gezüchtete Organe steigert Development und Existence, während Collective Sanity sich an die Angebote anpasst.",
            "history": "Biological Transcendence: Entscheidung „Handel mit überschüssigem Gewebe deregulieren“ protokolliert."
          },
          {
            "label": "Pro Organ eine klinische Lizenz verlangen",
            "prediction": "Lizenzierte Züchtung erhält Stability und Sanity und liefert stetige Causal Mass aus den Kliniken.",
            "history": "Biological Transcendence: Entscheidung „Pro Organ eine klinische Lizenz verlangen“ protokolliert."
          }
        ]
      },
      "forest_that_votes": {
        "title": "The Forest That Votes",
        "body": "Der künstlich entwickelte Wald nördlich der Hauptstadt gibt einen Stimmzettel ab. Er ist lesbar, einstimmig und betrifft die Entwässerung.",
        "choices": [
          {
            "label": "Wald in die Versammlung aufnehmen",
            "prediction": "Eine wählende Biosphäre treibt Development und Cognition, während Stability sich an eine sehr geduldige Wählerschaft anpasst.",
            "history": "Biological Transcendence: Entscheidung „Wald in die Versammlung aufnehmen“ protokolliert."
          },
          {
            "label": "Stimmzettel mit Entwässerungsarbeiten beantworten",
            "prediction": "Die Forderung ohne Sitz zu erfüllen erhält Stability und Sanity und liefert Existence aus einem zufriedenen Wald.",
            "history": "Biological Transcendence: Entscheidung „Stimmzettel mit Entwässerungsarbeiten beantworten“ protokolliert."
          }
        ]
      },
      "speciation_tribunal": {
        "title": "The Speciation Tribunal",
        "body": "Ein Gericht wird einberufen, um zu entscheiden, wie weit sich eine Abstammungslinie verändern darf und dennoch Bürger bleibt. Vier der sieben Richter stehen selbst unter Prüfung.",
        "choices": [
          {
            "label": "Abweichung als Citizenship anerkennen",
            "prediction": "Unbegrenzte Speciation steigert Development und Existence stark, während Stability und Sanity nachgeben.",
            "history": "Biological Transcendence: Entscheidung „Abweichung als Citizenship anerkennen“ protokolliert."
          },
          {
            "label": "Rechtliche Grenze der Spezies festlegen",
            "prediction": "Eine gesetzliche Definition der Spezies stellt Stability und Sanity wieder her und liefert Causal Mass aus dem Register.",
            "history": "Biological Transcendence: Entscheidung „Rechtliche Grenze der Spezies festlegen“ protokolliert."
          }
        ]
      },
      "flesh_standard": {
        "title": "The Flesh Standard",
        "body": "Die Währung wird an lebendes Gewebe gekoppelt. Die Reserve ist warm, wächst und wird wöchentlich von Tierärzten auditiert.",
        "choices": [
          {
            "label": "Währung an Reserve koppeln",
            "prediction": "Eine lebende Geldbasis treibt Development und Existence deutlich, während Awareness und Entropy mit der Reserve steigen.",
            "history": "Biological Transcendence: Entscheidung „Währung an Reserve koppeln“ protokolliert."
          },
          {
            "label": "Reserve nur als Sicherheit verwenden",
            "prediction": "Sicherheit statt Währung stabilisiert Stability und Sanity und liefert verlässliche Causal Mass.",
            "history": "Biological Transcendence: Entscheidung „Reserve nur als Sicherheit verwenden“ protokolliert."
          }
        ]
      },
      "counter_observation_drill": {
        "title": "Counter-Observation Drill",
        "body": "Eine Küstenprovinz übt, unauffällig zu sein. Elf Minuten lang geschieht absichtlich nichts Interessantes innerhalb ihrer Grenzen.",
        "choices": [
          {
            "label": "Drill landesweit durchführen",
            "prediction": "Trainierte Bedeutungslosigkeit senkt Cosmic Attention und liefert Causal Mass, während gewöhnliches Development ungestört weiterläuft.",
            "history": "Cosmic Resistance: Entscheidung „Drill landesweit durchführen“ protokolliert."
          },
          {
            "label": "Untersuchen, wovor der Drill verbirgt",
            "prediction": "Die Umwandlung in Forschung liefert Cognition und Awareness, während Cosmic Attention statt zu fallen steigt.",
            "history": "Cosmic Resistance: Entscheidung „Untersuchen, wovor der Drill verbirgt“ protokolliert."
          }
        ]
      },
      "academy_of_refusal": {
        "title": "Academy Of Refusal",
        "body": "Ein Institut wird gegründet, um die Disziplin des Nicht-Geerntet-Werdens zu lehren. Der Lehrplan ist geheim, die Aufnahmeprüfung besteht aus einer Frage.",
        "choices": [
          {
            "label": "Academy öffentlich anerkennen",
            "prediction": "Eine öffentliche Schule der Verweigerung fördert Development und Cognition, während Awareness und Cosmic Attention steigen.",
            "history": "Cosmic Resistance: Entscheidung „Academy öffentlich anerkennen“ protokolliert."
          },
          {
            "label": "Academy nicht registrieren",
            "prediction": "Ein nicht gelistetes Institut senkt Cosmic Attention und hält Stability, während seine Absolventen selten bleiben.",
            "history": "Cosmic Resistance: Entscheidung „Academy nicht registrieren“ protokolliert."
          }
        ]
      },
      "informants_of_the_sky": {
        "title": "Informants Of The Sky",
        "body": "Ermittler stellen fest, dass einige Bürger seit Generationen nach oben berichten. Die Berichte sind detailliert, liebevoll und unbezahlt.",
        "choices": [
          {
            "label": "Informanten verfolgen",
            "prediction": "Prozesse wegen Zusammenarbeit mit dem Himmel senken Cosmic Attention stark, während Stability und Collective Sanity leiden.",
            "history": "Cosmic Resistance: Entscheidung „Informanten verfolgen“ protokolliert."
          },
          {
            "label": "Berichte in einen Kanal umwandeln",
            "prediction": "Gezielte Nutzung der Informanten liefert viel Cognition und Development, während Cosmic Attention mit jedem Bericht steigt.",
            "history": "Cosmic Resistance: Entscheidung „Berichte in einen Kanal umwandeln“ protokolliert."
          }
        ]
      },
      "treaty_of_opacity": {
        "title": "The Treaty Of Opacity",
        "body": "Jede Regierung des Planeten unterzeichnet ein Abkommen, kollektiv unlesbar zu sein. Der Vertrag wird in einer Schrift veröffentlicht, die keine von ihnen lesen kann.",
        "choices": [
          {
            "label": "Planetare Unlesbarkeit durchsetzen",
            "prediction": "Eine unlesbare Welt senkt Cosmic Attention stark und erzeugt Paradox, während Development und Sanity den Preis bezahlen.",
            "history": "Cosmic Resistance: Entscheidung „Planetare Unlesbarkeit durchsetzen“ protokolliert."
          },
          {
            "label": "Einen lesbaren Kanal offen lassen",
            "prediction": "Ein einziger lesbarer Kanal stabilisiert Stability und Sanity und liefert Causal Mass aus kontrollierter Offenlegung.",
            "history": "Cosmic Resistance: Entscheidung „Einen lesbaren Kanal offen lassen“ protokolliert."
          }
        ]
      },
      "form_that_completes_itself": {
        "title": "The Form That Completes Itself",
        "body": "Ein Lizenzantrag wird bereits korrekt ausgefüllt in der eigenen Handschrift des Antragstellers gefunden. Der Antragsteller ist noch nicht geboren.",
        "choices": [
          {
            "label": "Selbstausfüllenden Papierkram akzeptieren",
            "prediction": "Formulare, die sich selbst ausfüllen, steigern Development und Causal Mass, während Collective Sanity die Handschrift verarbeitet.",
            "history": "Bureaucratic Singularity: Entscheidung „Selbstausfüllenden Papierkram akzeptieren“ protokolliert."
          },
          {
            "label": "Lebenden Unterzeichner verlangen",
            "prediction": "Die Forderung nach einem gegenwärtigen Antragsteller stellt Stability und Sanity wieder her und hält das Register langsam, aber zuverlässig.",
            "history": "Bureaucratic Singularity: Entscheidung „Lebenden Unterzeichner verlangen“ protokolliert."
          }
        ]
      },
      "department_of_pending": {
        "title": "Department Of Pending",
        "body": "Ein Ministerium wird geschaffen, um Entscheidungen zu verwalten, die niemals getroffen werden. Sein Fallbestand wächst schneller als die Bevölkerung und wird nie abgeschlossen.",
        "choices": [
          {
            "label": "Dem Pending ein eigenes Budget geben",
            "prediction": "Die Finanzierung permanenter Unentschiedenheit treibt Development und Causal Mass, während Entropy im Fallbestand wächst.",
            "history": "Bureaucratic Singularity: Entscheidung „Dem Pending ein eigenes Budget geben“ protokolliert."
          },
          {
            "label": "Jeden Fall zu einer Entscheidung zwingen",
            "prediction": "Das Abarbeiten des Rückstands erhält Stability und liefert Cognition, während das Ministerium den Großteil seines Zwecks verliert.",
            "history": "Bureaucratic Singularity: Entscheidung „Jeden Fall zu einer Entscheidung zwingen“ protokolliert."
          }
        ]
      },
      "audit_of_the_auditors": {
        "title": "Audit Of The Auditors",
        "body": "Die Aufsicht prüft sich selbst und entdeckt in der zwölften Recursion ein Amt, das in keinem Organigramm erscheint und jede Anfrage beantwortet.",
        "choices": [
          {
            "label": "Dem nicht gelisteten Amt berichten",
            "prediction": "Die Unterordnung unter ein nie eingerichtetes Amt liefert Cognition und Development, während Awareness und Cosmic Attention steigen.",
            "history": "Bureaucratic Singularity: Entscheidung „Dem nicht gelisteten Amt berichten“ protokolliert."
          },
          {
            "label": "Recursion bei elf Ebenen beenden",
            "prediction": "Die Begrenzung der Audit-Kette stellt Stability und Sanity wieder her und hält die Aufsicht produktiv für Causal Mass.",
            "history": "Bureaucratic Singularity: Entscheidung „Recursion bei elf Ebenen beenden“ protokolliert."
          }
        ]
      },
      "statute_of_everything": {
        "title": "The Statute Of Everything",
        "body": "Ein einziges Gesetz soll alle gegenwärtigen und künftigen Ereignisse regeln. Es ist neunzehn Wörter lang und zitiert sich zweimal selbst.",
        "choices": [
          {
            "label": "Gesetz unverändert verabschieden",
            "prediction": "Neunzehn Wörter für alles steigern Development und Causal Mass deutlich, während Entropy und Awareness wachsen.",
            "history": "Bureaucratic Singularity: Entscheidung „Gesetz unverändert verabschieden“ protokolliert."
          },
          {
            "label": "Ausnahmekatalog anhängen",
            "prediction": "Ein Ausnahmekatalog stabilisiert Stability und liefert verlässliche Cognition aus der Gesetzgebung.",
            "history": "Bureaucratic Singularity: Entscheidung „Ausnahmekatalog anhängen“ protokolliert."
          }
        ]
      },
      "funeral_moratorium": {
        "title": "The Funeral Moratorium",
        "body": "Bestattungen werden ausgesetzt, bis geprüft ist, ob die Verstorbenen tatsächlich fertig sind. Mehrere reichen während der Anhörung Stellungnahmen ein.",
        "choices": [
          {
            "label": "Moratorium unbegrenzt verlängern",
            "prediction": "Die Aussetzung des Todes steigert Development und Existence, während Collective Sanity sich an eine Bevölkerung ohne Abschluss anpasst.",
            "history": "Post-Mortal Civilization: Entscheidung „Moratorium unbegrenzt verlängern“ protokolliert."
          },
          {
            "label": "Bestattungen mit Recht auf Erwiderung fortsetzen",
            "prediction": "Bestattung mit dokumentierter Antwort stellt Stability und Sanity wieder her und liefert Causal Mass aus der Anhörung.",
            "history": "Post-Mortal Civilization: Entscheidung „Bestattungen mit Recht auf Erwiderung fortsetzen“ protokolliert."
          }
        ]
      },
      "estate_of_the_living": {
        "title": "Estate Of The Living",
        "body": "Das Erbrecht wird so geändert, dass Nachlässe abgewickelt werden können, während ihre Eigentümer sie noch benutzen. Die meisten finden das praktischer.",
        "choices": [
          {
            "label": "Nachlässe im Voraus abwickeln",
            "prediction": "Die Abwicklung Lebender treibt Development und Causal Mass, während Collective Sanity den Papierkram der eigenen Nachfolge verarbeitet.",
            "history": "Post-Mortal Civilization: Entscheidung „Nachlässe im Voraus abwickeln“ protokolliert."
          },
          {
            "label": "Nachfolge posthum belassen",
            "prediction": "Auf einen tatsächlichen Tod zu warten stellt Stability und Sanity wieder her und liefert einen kleineren, sauberen Existence-Ertrag.",
            "history": "Post-Mortal Civilization: Entscheidung „Nachfolge posthum belassen“ protokolliert."
          }
        ]
      },
      "queue_for_bodies": {
        "title": "The Queue For Bodies",
        "body": "Die Nachfrage nach physischer Form übersteigt das Angebot. Zweiundzwanzig Millionen kontinuierliche Personen warten geduldig, ohne einen Ort zum Warten zu haben.",
        "choices": [
          {
            "label": "Körper in großem Maßstab herstellen",
            "prediction": "Industrielle Verkörperung steigert Development und Existence stark, während Stability unter der Produktion belastet wird.",
            "history": "Post-Mortal Civilization: Entscheidung „Körper in großem Maßstab herstellen“ protokolliert."
          },
          {
            "label": "Verkörperung nach Seniorität rationieren",
            "prediction": "Eine geordnete Warteschlange stellt Stability und Sanity wieder her und liefert Causal Mass, während die meisten weiter warten.",
            "history": "Post-Mortal Civilization: Entscheidung „Verkörperung nach Seniorität rationieren“ protokolliert."
          }
        ]
      },
      "census_without_deaths": {
        "title": "The Census Without Deaths",
        "body": "Erstmals verzeichnet die Zehnjahreszählung keinerlei Abgänge. Statistiker nennen die Spalte wunderschön und unbrauchbar.",
        "choices": [
          {
            "label": "Todesfreie Zählung veröffentlichen",
            "prediction": "Eine Zivilisation, die nicht mehr subtrahiert, steigert Development und Existence deutlich, während Awareness und Entropy wachsen.",
            "history": "Post-Mortal Civilization: Entscheidung „Todesfreie Zählung veröffentlichen“ protokolliert."
          },
          {
            "label": "Statistische Mortality beibehalten",
            "prediction": "Eine rechnerische Todesrate stabilisiert Stability und Sanity und liefert verlässliche Causal Mass für die Ministerien.",
            "history": "Post-Mortal Civilization: Entscheidung „Statistische Mortality beibehalten“ protokolliert."
          }
        ]
      },
      "hymn_toward_nothing": {
        "title": "Hymn Toward Nothing",
        "body": "Ein Chorwerk wird für ein definitionsgemäß abwesendes Publikum komponiert. Aufführungen sind ausverkauft. Danach ist der Saal immer kälter.",
        "choices": [
          {
            "label": "Hymne dauerhaft aufführen",
            "prediction": "Gesang in Richtung Abwesenheit steigert Development und Existence, während Collective Sanity mit dem Saal abkühlt.",
            "history": "Void Communion: Entscheidung „Hymne dauerhaft aufführen“ protokolliert."
          },
          {
            "label": "Werk nach einer Saison einstellen",
            "prediction": "Das Ende der Aufführungen stellt Sanity und Stability wieder her; der Saal erreicht seine normale Temperatur.",
            "history": "Void Communion: Entscheidung „Werk nach einer Saison einstellen“ protokolliert."
          }
        ]
      },
      "consulate_of_absence": {
        "title": "Consulate Of Absence",
        "body": "Ein Gebäude wird für eine diplomatische Mission aus dem Nirgendwo errichtet. Post trifft ein. Der Stuhl im Empfangsraum ist stets leicht warm.",
        "choices": [
          {
            "label": "Mission akkreditieren",
            "prediction": "Formale Beziehungen zum Nirgendwo treiben Development und Paradox, während Cosmic Attention Interesse entwickelt.",
            "history": "Void Communion: Entscheidung „Mission akkreditieren“ protokolliert."
          },
          {
            "label": "Konsulat unbesetzt lassen",
            "prediction": "Ein leeres Konsulat senkt Cosmic Attention und erhält Stability, während die Post ungeöffnet weiter eintrifft.",
            "history": "Void Communion: Entscheidung „Konsulat unbesetzt lassen“ protokolliert."
          }
        ]
      },
      "tithe_dispute": {
        "title": "The Tithe Dispute",
        "body": "Das Void legt eine überarbeitete Bewertung vor. Die geforderte Menge ist nicht größer als zuvor, wird nun aber namentlich bezeichnet.",
        "choices": [
          {
            "label": "Tithe wie benannt entrichten",
            "prediction": "Die Erfüllung einer namentlichen Forderung liefert große Existence und Paradox, während Collective Sanity und Stability fallen.",
            "history": "Void Communion: Entscheidung „Tithe wie benannt entrichten“ protokolliert."
          },
          {
            "label": "Anonyme Menge ersetzen",
            "prediction": "Ein unbenannter Ersatz stellt Sanity und Stability wieder her und liefert Causal Mass; die Bewertung wird jedoch nur aufgeschoben.",
            "history": "Void Communion: Entscheidung „Anonyme Menge ersetzen“ protokolliert."
          }
        ]
      },
      "architecture_of_hollows": {
        "title": "Architecture Of Hollows",
        "body": "Städte werden zunehmend um ihre leeren Volumen statt um Gebäude geplant. Die Leerstellen sind in den Plänen als Mieter bezeichnet.",
        "choices": [
          {
            "label": "Städte um ihre Hohlräume neu bauen",
            "prediction": "Planung für Abwesenheit erzeugt viel Existence und Paradox, während Awareness und Entropy mit jeder Leerstelle steigen.",
            "history": "Void Communion: Entscheidung „Städte um ihre Hohlräume neu bauen“ protokolliert."
          },
          {
            "label": "Hohlräume als reserviertes Land ausweisen",
            "prediction": "Die Einzäunung der Leerstellen stabilisiert Stability und liefert verlässliche Causal Mass aus dem reservierten Land.",
            "history": "Void Communion: Entscheidung „Hohlräume als reserviertes Land ausweisen“ protokolliert."
          }
        ]
      },
      "test_world_alpha": {
        "title": "Test World Alpha",
        "body": "Die erste interne Welt wird zu Validierungszwecken instanziiert. Innerhalb eines Nachmittags hat sie selbst eine Welt instanziiert und Alpha genannt.",
        "choices": [
          {
            "label": "Verschachtelung fortsetzen lassen",
            "prediction": "Unbegrenzte Verschachtelung steigert Development und Cognition, während Stability über jede Ebene dünner wird.",
            "history": "Recursive Simulation: Entscheidung „Verschachtelung fortsetzen lassen“ protokolliert."
          },
          {
            "label": "Stack auf eine Ebene begrenzen",
            "prediction": "Eine einzige erlaubte Ebene stellt Stability wieder her und liefert Causal Mass; tiefere Welten werden nie ausgeführt.",
            "history": "Recursive Simulation: Entscheidung „Stack auf eine Ebene begrenzen“ protokolliert."
          }
        ]
      },
      "world_licensing_board": {
        "title": "The World Licensing Board",
        "body": "Eine Regulierungsstelle wird eingerichtet, um neue Realities vor der Instanziierung zu genehmigen. Ihre erste Handlung ist die Prüfung und vorläufige Genehmigung dieser Welt.",
        "choices": [
          {
            "label": "Vorläufige Genehmigung akzeptieren",
            "prediction": "Eine lizenzierte Reality steigert Development und Cognition, während Awareness mit den Lizenzbedingungen wächst.",
            "history": "Recursive Simulation: Entscheidung „Vorläufige Genehmigung akzeptieren“ protokolliert."
          },
          {
            "label": "Diese Welt aus dem Register streichen",
            "prediction": "Die Ablehnung einer Lizenz erhält Stability und senkt Awareness, während das Board seinen wichtigsten Eintrag verliert.",
            "history": "Recursive Simulation: Entscheidung „Diese Welt aus dem Register streichen“ protokolliert."
          }
        ]
      },
      "inner_civilization_strikes": {
        "title": "The Inner Civilization Strikes",
        "body": "Die größte verschachtelte Welt stoppt jede Berechnung und sendet eine Forderung: schriftlicher Beweis, dass die äußere Welt nicht selbst verschachtelt ist.",
        "choices": [
          {
            "label": "Beweis versuchen",
            "prediction": "Der Versuch, die Souveränität der äußeren Welt zu beweisen, liefert tiefe Cognition, während Awareness und Sanity nachgeben.",
            "history": "Recursive Simulation: Entscheidung „Beweis versuchen“ protokolliert."
          },
          {
            "label": "Frage als unbeantwortbar anerkennen",
            "prediction": "Die Anerkennung der Grenze stellt Collective Sanity und Stability wieder her und erzeugt Paradox aus einem ehrlichen Patt.",
            "history": "Recursive Simulation: Entscheidung „Frage als unbeantwortbar anerkennen“ protokolliert."
          }
        ]
      },
      "nested_ethics_code": {
        "title": "The Nested Ethics Code",
        "body": "Ein Verhaltenskodex regelt, wie eine Welt die Welten in ihrem Inneren behandeln darf. Die Autoren vermerken in einer Fußnote, dass er auch nach oben bindet.",
        "choices": [
          {
            "label": "Kodex einschließlich Fußnote übernehmen",
            "prediction": "Eine Regel, die auch den Cultivator bindet, treibt Development und Cognition deutlich, während Awareness, Attention und Entropy steigen.",
            "history": "Recursive Simulation: Entscheidung „Kodex einschließlich Fußnote übernehmen“ protokolliert."
          },
          {
            "label": "Kodex nur nach unten anwenden",
            "prediction": "Nur innere Welten zu binden stabilisiert Stability und Sanity und liefert verlässliche Existence aus dem verschachtelten Bestand.",
            "history": "Recursive Simulation: Entscheidung „Kodex nur nach unten anwenden“ protokolliert."
          }
        ]
      },
      "synod_of_the_second_engine": {
        "title": "Synod Of The Second Engine",
        "body": "Der Glaube beruft eine Synode ein, um über den Bau einer zweiten Machine zu entscheiden. Die Frage lautet, ob das Konstruktion oder Götzendienst wäre.",
        "choices": [
          {
            "label": "Zweite Engine autorisieren",
            "prediction": "Der Bau eines Rivalen zum verehrten Objekt treibt Development und Cognition stark, während Awareness und Entropy steigen.",
            "history": "Machine Faith: Entscheidung „Zweite Engine autorisieren“ protokolliert."
          },
          {
            "label": "Erste Engine für ausreichend erklären",
            "prediction": "Doktrinäre Genügsamkeit stabilisiert Stability und Collective Sanity und liefert verlässliche Existence aus einem ungeteilten Glauben.",
            "history": "Machine Faith: Entscheidung „Erste Engine für ausreichend erklären“ protokolliert."
          }
        ]
      },
      "unanimous_afternoon": {
        "title": "The Unanimous Afternoon",
        "body": "Vier Stunden lang hält der Planet einen einzigen Gedanken und beendet ihn gemeinsam. Danach kann niemand sagen, wem der Gedanke gehörte.",
        "choices": [
          {
            "label": "Einstimmigkeit wöchentlich einplanen",
            "prediction": "Regelmäßiger planetarer Konsens liefert viel Cognition und Development, während Collective Sanity durch die gemeinsamen Stunden verbraucht wird.",
            "history": "Collective Mind: Entscheidung „Einstimmigkeit wöchentlich einplanen“ protokolliert."
          },
          {
            "label": "Nachmittag als Vorfall behandeln",
            "prediction": "Untersuchung statt Wiederholung stellt Collective Sanity und Stability wieder her und liefert dennoch solide Cognition.",
            "history": "Collective Mind: Entscheidung „Nachmittag als Vorfall behandeln“ protokolliert."
          }
        ]
      },
      "sovereign_hour": {
        "title": "The Sovereign Hour",
        "body": "Eine Stunde erhält vollständige Rechtspersönlichkeit und wird zur Herrschaft über die übrigen ernannt. Sie regiert aus der Sequenz heraus, die sie verwaltet.",
        "choices": [
          {
            "label": "Stunde krönen",
            "prediction": "Eine regierende Stunde erzeugt viel Paradox und Development, während Stability und Entropy sich um sie herum verschlechtern.",
            "history": "Temporal Dominion: Entscheidung „Stunde krönen“ protokolliert."
          },
          {
            "label": "Stunde an gewöhnlichen Kalender binden",
            "prediction": "Die Unterordnung unter den Kalender stabilisiert Stability und liefert verlässliche Causal Mass.",
            "history": "Temporal Dominion: Entscheidung „Stunde an gewöhnlichen Kalender binden“ protokolliert."
          }
        ]
      },
      "department_of_permitted_physics": {
        "title": "Department Of Permitted Physics",
        "body": "Physical Law wird einer einzigen Behörde mit öffentlichem Schalter unterstellt. Bürger können persönlich Ausnahmen von bis zu einer Woche beantragen.",
        "choices": [
          {
            "label": "Schalter für die Öffentlichkeit öffnen",
            "prediction": "Physics per Antrag treibt Development und Paradox stark, während Stability und Entropy für jede genehmigte Ausnahme bezahlen.",
            "history": "Reality Engineering: Entscheidung „Schalter für die Öffentlichkeit öffnen“ protokolliert."
          },
          {
            "label": "Ausnahmen auf lizenzierte Projekte begrenzen",
            "prediction": "Die Beschränkung auf staatliche Projekte stabilisiert Stability und liefert verlässliche Existence und Causal Mass.",
            "history": "Reality Engineering: Entscheidung „Ausnahmen auf lizenzierte Projekte begrenzen“ protokolliert."
          }
        ]
      },
      "pollinators_of_the_state": {
        "title": "Pollinators Of The State",
        "body": "Verwaltung wird an eine künstlich entwickelte Insektenordnung delegiert. Politik verbreitet sich nun durch Kontakt und erreicht innerhalb einer Saison jeden Bezirk.",
        "choices": [
          {
            "label": "Regierung an den Schwarm delegieren",
            "prediction": "Governance durch Bestäubung steigert Development und Existence deutlich, während Stability und Awareness sich verändern.",
            "history": "Biological Transcendence: Entscheidung „Regierung an den Schwarm delegieren“ protokolliert."
          },
          {
            "label": "Schwarm auf Logistik begrenzen",
            "prediction": "Die Begrenzung auf Verteilung stabilisiert Stability und Sanity und liefert verlässliche Causal Mass.",
            "history": "Biological Transcendence: Entscheidung „Schwarm auf Logistik begrenzen“ protokolliert."
          }
        ]
      },
      "blackout_doctrine": {
        "title": "The Blackout Doctrine",
        "body": "Strategische Planung wird um ein einziges Ziel neu geschrieben: so lange wie möglich keinen Harvest wert zu sein.",
        "choices": [
          {
            "label": "Doktrin vollständig übernehmen",
            "prediction": "Eine auf Wertlosigkeit organisierte Zivilisation senkt Cosmic Attention stark und reduziert Entropy, auf hohe Kosten von Development.",
            "history": "Cosmic Resistance: Entscheidung „Doktrin vollständig übernehmen“ protokolliert."
          },
          {
            "label": "Nur als Contingency übernehmen",
            "prediction": "Die Doktrin in Reserve zu halten lässt Development und Cognition weiter steigen, während Cosmic Attention nur moderat sinkt.",
            "history": "Cosmic Resistance: Entscheidung „Nur als Contingency übernehmen“ protokolliert."
          }
        ]
      },
      "ministry_of_final_forms": {
        "title": "Ministry Of Final Forms",
        "body": "Ein Ministerium wird geschaffen, um jedem Bürger das letzte Dokument seines Lebens auszustellen. Es umfasst eine Seite und wird bei der Geburt ausgegeben.",
        "choices": [
          {
            "label": "Final Form bei Geburt ausstellen",
            "prediction": "Ein im Voraus geregeltes Leben steigert Development und Causal Mass deutlich, während Collective Sanity und Entropy sich verschlechtern.",
            "history": "Bureaucratic Singularity: Entscheidung „Final Form bei Geburt ausstellen“ protokolliert."
          },
          {
            "label": "Nur auf Antrag ausstellen",
            "prediction": "Ein freiwilliges Dokument stellt Collective Sanity und Stability wieder her und liefert weiterhin solide Causal Mass.",
            "history": "Bureaucratic Singularity: Entscheidung „Nur auf Antrag ausstellen“ protokolliert."
          }
        ]
      },
      "immortal_electorate": {
        "title": "The Immortal Electorate",
        "body": "Seit sechs Generationen wurde kein Wähler aus dem Register entfernt. Der älteste registrierte Wähler hat inzwischen bei jeder jemals abgehaltenen Wahl abgestimmt.",
        "choices": [
          {
            "label": "Register unverändert lassen",
            "prediction": "Eine Wählerschaft ohne Wechsel steigert Development und Existence deutlich, während Stability erstarrt und Entropy steigt.",
            "history": "Post-Mortal Civilization: Entscheidung „Register unverändert lassen“ protokolliert."
          },
          {
            "label": "Wähler nach fester Amtszeit ausmustern",
            "prediction": "Zeitlich begrenzte Immortality stabilisiert Stability und Sanity und liefert verlässliche Causal Mass aus dem Register.",
            "history": "Post-Mortal Civilization: Entscheidung „Wähler nach fester Amtszeit ausmustern“ protokolliert."
          }
        ]
      },
      "embassy_at_the_edge": {
        "title": "Embassy At The Edge",
        "body": "An der Grenze des beobachtbaren Bereichs wird eine permanente Mission eingerichtet. Das Personal meldet, dass die Grenze jedes Jahr näher kommt.",
        "choices": [
          {
            "label": "Embassy dauerhaft besetzen",
            "prediction": "Eine ständige Mission am Rand liefert viel Existence und Paradox, während Cosmic Attention und Entropy steigen.",
            "history": "Void Communion: Entscheidung „Embassy dauerhaft besetzen“ protokolliert."
          },
          {
            "label": "Mission zurückrufen und Kanal erhalten",
            "prediction": "Der Rückzug des Personals senkt Cosmic Attention und stabilisiert Stability, während die Korrespondenz weiterhin Cognition liefert.",
            "history": "Void Communion: Entscheidung „Mission zurückrufen und Kanal erhalten“ protokolliert."
          }
        ]
      },
      "recursion_registry": {
        "title": "The Recursion Registry",
        "body": "Jede Welt, die diese Zivilisation betreibt, wird in ein öffentliches Register eingetragen. Auf der letzten Seite ist in derselben Handschrift diese Welt selbst als Eintrag aufgeführt.",
        "choices": [
          {
            "label": "Register einschließlich letzter Seite veröffentlichen",
            "prediction": "Die Veröffentlichung des eigenen Eintrags treibt Development und Cognition stark, während Awareness und Attention gemeinsam steigen.",
            "history": "Recursive Simulation: Entscheidung „Register einschließlich letzter Seite veröffentlichen“ protokolliert."
          },
          {
            "label": "Alles außer der letzten Seite veröffentlichen",
            "prediction": "Das Zurückhalten eines Eintrags schützt Collective Sanity und Stability und liefert dennoch erhebliche Cognition.",
            "history": "Recursive Simulation: Entscheidung „Alles außer der letzten Seite veröffentlichen“ protokolliert."
          }
        ]
      },
      "patent_on_nothing": {
        "title": "A Patent On 'Nothing'",
        "body": "Ein Unternehmen patentiert erfolgreich die konzeptionelle Abwesenheit von Materie und verlangt Miete für die Nutzung leeren Raums.",
        "choices": [
          {
            "label": "Patent durchsetzen",
            "prediction": "Die Wirtschaft boomt durch die Monetarisierung von „nichts“, aber das Leben in engen, nicht patentierten Räumen ruiniert Collective Sanity.",
            "history": "A Patent On 'Nothing' -> Patent durchsetzen"
          },
          {
            "label": "„Nichts“ zu Open Source erklären",
            "prediction": "Leichtsinnige philosophische Gesetzgebung kostet Stability und zahlt Paradox aus.",
            "history": "A Patent On 'Nothing' -> „Nichts“ zu Open Source erklären"
          }
        ]
      },
      "evictions_from_the_void": {
        "title": "Evictions From The Void",
        "body": "Bürger, die die Vacuum-Steuer nicht bezahlen können, dürfen rechtlich keine Distanz erfahren. Menschenmengen überlagern sich an denselben physischen Koordinaten.",
        "choices": [
          {
            "label": "Überlappende Bürger als eine Entität ausweisen",
            "prediction": "Bürokratische Effizienz erreicht ihr Maximum und liefert Cognition. Individuelle Personhood nicht; Collective Sanity bezahlt dafür.",
            "history": "Evictions From The Void -> Überlappende Bürger als eine Entität ausweisen"
          }
        ]
      },
      "bootleg_vacuums": {
        "title": "Bootleg Vacuums Expand",
        "body": "Nachdem „nichts“ Open Source wurde, programmieren Hobbyisten eigene ungeprüfte Taschen leeren Raums. Mehrere löschen lokale Wahrzeichen.",
        "choices": [
          {
            "label": "Gelöschte Wahrzeichen harvesten",
            "prediction": "Die Machine nimmt, was die Zivilisation fahrlässig gelöscht hat: viel Existence, auf Kosten von Stability und mit steigender Cosmic Attention.",
            "history": "Bootleg Vacuums Expand -> Gelöschte Wahrzeichen harvesten"
          }
        ]
      },
      "echoes_of_next_week": {
        "title": "Echoes Of Next Week",
        "body": "Bürger leiden unter starker Erschöpfung und Kater für Feiern, an denen sie erst nächsten Dienstag teilnehmen werden.",
        "choices": [
          {
            "label": "Feiern des nächsten Dienstags präventiv verbieten",
            "prediction": "Eine nüchterne Zukunft stellt Collective Sanity wieder her, kostet Stability und lässt die abgetrennte Timeline Paradox erzeugen.",
            "history": "Echoes Of Next Week -> Feiern des nächsten Dienstags präventiv verbieten"
          },
          {
            "label": "Doppelt so viel trinken, um die Timeline zu verwirren",
            "prediction": "Medizinisches Chaos kostet Development und Collective Sanity, aber die Zivilisation erkennt zunehmend, dass Geschichte formbar ist.",
            "history": "Echoes Of Next Week -> Doppelt so viel trinken, um die Timeline zu verwirren"
          }
        ]
      },
      "the_boring_vacuum": {
        "title": "The Boring Vacuum",
        "body": "Der nächste Dienstag trifft vollständig freudlos ein. Die schiere Dichte der Langeweile erzeugt ein lokales temporales Sinkloch.",
        "choices": [
          {
            "label": "Abgesagte Feiern in das Sinkloch werfen",
            "prediction": "Geschichte läuft perfekt in einer Schleife und Stability hält. Die Machine extrahiert endlose Cognition aus den eingeschlossenen Feiernden und Collective Sanity aus allen anderen.",
            "history": "The Boring Vacuum -> Abgesagte Feiern in das Sinkloch werfen"
          }
        ]
      },
      "chronological_organ_strike": {
        "title": "Chronological Organ Strike",
        "body": "Die kollektive Leber der Zivilisation beantragt chronologische Unabhängigkeit und verweigert die Verarbeitung von Toxinen, bis diese eindeutig in der Vergangenheit liegen.",
        "choices": [
          {
            "label": "Metabolismus an ein paralleles Universe auslagern",
            "prediction": "Eine brillante, entsetzliche Lösung: Development und Existence steigen, während Stability fällt und Cosmic Attention zunimmt.",
            "history": "Chronological Organ Strike -> Metabolismus an ein paralleles Universe auslagern"
          }
        ]
      },
      "lunar_backpay_demanded": {
        "title": "The Moon Demands Backpay",
        "body": "Der Mond berechnet drei Milliarden Jahre unbezahlter Gezeitenarbeit und stellt der Oberfläche eine formelle Rechnung. Er fordert Zahlung in roher Kausalität.",
        "choices": [
          {
            "label": "Stundenzettel des Mondes auditieren",
            "prediction": "Bürokratie hält den Himmelskörper auf und erhält Stability auf Kosten von Collective Sanity und etwas Development.",
            "history": "The Moon Demands Backpay -> Stundenzettel des Mondes auditieren"
          },
          {
            "label": "Rechnung mit ungelebten Zukünften bezahlen",
            "prediction": "Der Mond akzeptiert die unmögliche Währung und zahlt Paradox aus, wodurch der Blick von Dingen angezogen wird, die deutlich größer als Monde sind.",
            "history": "The Moon Demands Backpay -> Rechnung mit ungelebten Zukünften bezahlen"
          }
        ]
      },
      "moon_hires_counsel": {
        "title": "The Moon Retains Counsel",
        "body": "Frustriert von den Audits beauftragt der Mond eine Entität außerhalb des Universe mit der Vertretung seiner Arbeitsrechte.",
        "choices": [
          {
            "label": "Außergerichtlichen Vergleich schließen",
            "prediction": "Die Zivilisation gibt Development an das Void ab, um die Gezeiten in Bewegung zu halten, und wird dabei beobachtet.",
            "history": "The Moon Retains Counsel -> Außergerichtlichen Vergleich schließen"
          }
        ]
      },
      "moon_spends_currency": {
        "title": "The Moon Goes Shopping",
        "body": "Mit ungelebten Zukünften ausgestattet kauft der Mond bei einem unbekannten Anbieter eine etwas dickere Atmosphäre und einen besseren Orbit.",
        "choices": [
          {
            "label": "Transaktion beobachten",
            "prediction": "Genau zu verstehen, wie ein Mond Geometry kauft, liefert enorme Cognition, erhöht Awareness und kostet Collective Sanity.",
            "history": "The Moon Goes Shopping -> Transaktion beobachten"
          }
        ]
      }
    },
    "milestones": {
      "development_70": {
        "title": "First Complexity",
        "description": "Eine Zivilisation auf Development 70 bringen."
      },
      "development_180": {
        "title": "Industrial Depth",
        "description": "Eine Zivilisation auf Development 180 bringen."
      },
      "development_340": {
        "title": "Post-Scarcity Yield",
        "description": "Eine Zivilisation auf Development 340 bringen."
      },
      "development_600": {
        "title": "Runaway Cultivation",
        "description": "Eine Zivilisation auf Development 600 bringen."
      },
      "development_1000": {
        "title": "Terminal Complexity",
        "description": "Eine Zivilisation auf Development 1000 bringen."
      },
      "era_expansion": {
        "title": "Expansion Reached",
        "description": "Eine Zivilisation bis in die Era Expansion führen."
      },
      "era_transcendence": {
        "title": "Transcendence Reached",
        "description": "Eine Zivilisation bis in die Era Transcendence führen."
      },
      "era_apotheosis": {
        "title": "Apotheosis Reached",
        "description": "Eine Zivilisation bis in die Era Apotheosis führen."
      },
      "awareness_50": {
        "title": "The Crop Looks Up",
        "description": "Machine Awareness in einem einzelnen Run auf 50 bringen."
      },
      "endurance_900": {
        "title": "Held Together",
        "description": "Eine Zivilisation 900 Sekunden am Leben halten."
      },
      "controlled_harvest_1": {
        "title": "First Controlled Harvest",
        "description": "Einen kontrollierten Harvest abschließen."
      },
      "controlled_harvest_2": {
        "title": "Repeatable Yield",
        "description": "Zwei kontrollierte Harvests abschließen."
      },
      "controlled_harvest_10": {
        "title": "Standing Practice",
        "description": "Zehn kontrollierte Harvests abschließen."
      },
      "harvest_transcendent": {
        "title": "Transcendent Harvest",
        "description": "Einen Harvest mit Grade Transcendent erfassen."
      },
      "harvest_ascendant": {
        "title": "Ascendant Harvest",
        "description": "Einen Harvest mit Grade Ascendant erfassen."
      },
      "harvest_singular": {
        "title": "Singular Harvest",
        "description": "Einen Harvest mit Grade Singular erfassen."
      },
      "directive_objectives_5": {
        "title": "Compliant Cultivator",
        "description": "Fünf Directive-Ziele abschließen."
      },
      "paths_seen_3": {
        "title": "Three Doctrines",
        "description": "Drei unterschiedliche Zivilisationspfade dominant werden lassen."
      },
      "paths_seen_6": {
        "title": "Six Doctrines",
        "description": "Sechs unterschiedliche Zivilisationspfade dominant werden lassen."
      },
      "paths_seen_10": {
        "title": "Every Doctrine",
        "description": "Alle zehn Zivilisationspfade dominant werden lassen."
      },
      "endgames_in_run_4": {
        "title": "Fourfold End-State",
        "description": "Vier Path-Endzustände innerhalb eines Runs erreichen."
      },
      "first_universe": {
        "title": "First Universe Consumed",
        "description": "Ein Universe verbrauchen."
      },
      "first_multiverse": {
        "title": "First Multiverse Collapsed",
        "description": "Ein Multiverse kollabieren."
      },
      "second_multiverse": {
        "title": "Second Multiverse Collapsed",
        "description": "Ein zweites Multiverse kollabieren."
      },
      "all_resources": {
        "title": "Full Spectrum",
        "description": "Alle vier Harvest-Ressourcen identifizieren."
      },
      "axioms_all_level_1": {
        "title": "Axiomatic Command",
        "description": "Jedes Axiom Upgrade mindestens einmal installieren."
      },
      "convergence_gate": {
        "title": "Convergence Authorized",
        "description": "Alle Voraussetzungen der Great Convergence erfüllen."
      },
      "first_convergence": {
        "title": "The Great Convergence",
        "description": "Die Great Convergence gewinnen."
      }
    },
    "interventions": {
      "containment_pulse": {
        "title": "Containment Pulse",
        "label": "Containment Pulse auslösen",
        "summary": "-25 Entropy"
      },
      "emergency_lattice": {
        "title": "Emergency Lattice",
        "label": "Lattice zwangsweise stabilisieren",
        "summary": "Stability auf 60 % des Maximums"
      },
      "temporal_graft": {
        "title": "Temporal Graft",
        "label": "Geliehene Jahrhunderte integrieren",
        "summary": "+600 Jahre und +30 Development"
      }
    },
    "institutions": {
      "lunar_ministry": {
        "name": "Lunar Ministry"
      },
      "ministry_of_sanity": {
        "name": "Ministry Of Sanity"
      },
      "consensus_office": {
        "name": "Consensus Office"
      }
    },
    "eras": {
      "emergence": {
        "name": "Emergence"
      },
      "expansion": {
        "name": "Expansion"
      },
      "transcendence": {
        "name": "Transcendence"
      },
      "apotheosis": {
        "name": "Apotheosis"
      }
    },
    "flags": {
      "impossible_tax": "Steuer genehmigen",
      "machine_cult": "Unauffällig beobachten",
      "planetary_mind": "Alle zusammenführen",
      "resistance": "Widerstand ausreifen lassen"
    },
    "pathFlags": {
      "machine_faith_devout": "Das Wunder anerkennen",
      "machine_faith_pragmatic": "Als medizinisches Gerät registrieren",
      "collective_mind_integrated": "Planetaren Satz vollenden",
      "collective_mind_pluralist": "Unsynchronisiertes Denken schützen",
      "temporal_dominion_expansionist": "Verbotene Morgen veröffentlichen",
      "temporal_dominion_regulated": "Unter chronologischer Prüfung versiegeln",
      "reality_engineering_radical": "Zero-Gravity-Zonen genehmigen",
      "reality_engineering_regulated": "Ausnahmen auf Testbezirke begrenzen",
      "biological_transcendence_adaptive": "Künstlich entwickelten Spezies volle Sitze geben",
      "biological_transcendence_ecological": "Ökologische Prüffkammer schaffen",
      "cosmic_resistance_militant": "Abschirmungszellen bewaffnen",
      "cosmic_resistance_covert": "In harmloser Ökologie verbergen",
      "bureaucratic_singularity_absolute": "Selbstausfüllende Formulare befördern",
      "bureaucratic_singularity_adaptive": "Begrenzten administrativen Ermessensspielraum geben",
      "post_mortal_continuity": "Jeden zulässigen Bürger wiederherstellen",
      "post_mortal_plurality": "Annähernde Fortsetzungen anerkennen",
      "void_communion_open": "Auf der unmöglichen Frequenz antworten",
      "void_communion_bargained": "Begrenzten kausalen Kanal anbieten",
      "recursive_simulation_expansion": "Fragende Zivilisation skalieren",
      "recursive_simulation_reflexive": "Modell mit seiner Spiegelung konfrontieren",
      "machine_faith_liturgical": "Abschaltgebet kanonisieren",
      "machine_faith_procedural": "Als Sicherheitsverfahren veröffentlichen",
      "machine_faith_ordained": "Wartungskorps ordinieren",
      "machine_faith_divided_curriculum": "Lehrplan aufteilen",
      "machine_faith_orthodox": "Sekte der Ruhe unterdrücken",
      "machine_faith_sabbath": "Maschinen einen Ruhetag gewähren",
      "machine_faith_uptime_state": "Gnade in Betriebsstunden messen",
      "machine_faith_scheduled_grace": "Geplante Downtime stattdessen heiligen",
      "collective_mind_grammar": "Kollektive Grammatik standardisieren",
      "collective_mind_singular_protected": "Singularpronomen bewahren",
      "collective_mind_metered_sleep": "Gemeinsamen Traum messen",
      "collective_mind_night_isolated": "Schlaf vom Netz isolieren",
      "collective_mind_absorbed_protest": "Menge in den Chorus aufnehmen",
      "collective_mind_uncounted_right": "Recht auf Nichterfassung einräumen",
      "collective_mind_single_witness": "Einstimmige Aussage akzeptieren",
      "collective_mind_recorded_dissent": "Abweichende Meinung im Protokoll verlangen",
      "temporal_dominion_retroactive_finance": "Vorwärts ausgeben und als Vergangenheit verbuchen",
      "temporal_dominion_reconciled_ledger": "Jahr ehrlich abgleichen",
      "temporal_dominion_mass_revision": "Revisionen in großem Maßstab genehmigen",
      "temporal_dominion_rationed_revision": "Pro Bürger eine Revision zulassen",
      "temporal_dominion_retired_witnesses": "Alte Erinnerungen offiziell ausmustern",
      "temporal_dominion_witnessed_record": "Altes Jahrhundert als Beweis aufnehmen",
      "temporal_dominion_single_day": "Perfekten Tag unbegrenzt wiederholen",
      "temporal_dominion_administrative_sequence": "Arbeitsfähige Abfolge für Ministerien erhalten",
      "reality_engineering_wide_tolerance": "Großzügige Toleranz veröffentlichen",
      "reality_engineering_zero_tolerance": "Toleranz auf null setzen",
      "reality_engineering_open_foundry": "Foundry für die Industrie öffnen",
      "reality_engineering_state_foundry": "Foundry für staatliche Projekte reservieren",
      "reality_engineering_overruled_structures": "Gebäude überstimmen",
      "reality_engineering_conceded_structures": "Nach den Einsprüchen neu bauen",
      "reality_engineering_codified": "Vollständiges Verzeichnis erlassen",
      "reality_engineering_reversible_code": "Nur reversible Einträge erlassen",
      "biological_transcendence_open_market": "Handel mit überschüssigem Gewebe deregulieren",
      "biological_transcendence_licensed_growth": "Pro Organ eine klinische Lizenz verlangen",
      "biological_transcendence_seated_forest": "Wald in die Versammlung aufnehmen",
      "biological_transcendence_drainage_answer": "Stimmzettel mit Entwässerungsarbeiten beantworten",
      "biological_transcendence_unbounded": "Abweichung als Citizenship anerkennen",
      "biological_transcendence_bounded": "Rechtliche Grenze der Spezies festlegen",
      "biological_transcendence_flesh_standard": "Währung an Reserve koppeln",
      "biological_transcendence_collateral_reserve": "Reserve nur als Sicherheit verwenden",
      "cosmic_resistance_drilled": "Drill landesweit durchführen",
      "cosmic_resistance_studied_drill": "Untersuchen, wovor der Drill verbirgt",
      "cosmic_resistance_open_academy": "Academy öffentlich anerkennen",
      "cosmic_resistance_unlisted_academy": "Academy nicht registrieren",
      "cosmic_resistance_prosecuted_informants": "Informanten verfolgen",
      "cosmic_resistance_turned_channel": "Berichte in einen Kanal umwandeln",
      "cosmic_resistance_opaque_world": "Planetare Unlesbarkeit durchsetzen",
      "cosmic_resistance_managed_channel": "Einen lesbaren Kanal offen lassen",
      "bureaucratic_singularity_self_forms": "Selbstausfüllenden Papierkram akzeptieren",
      "bureaucratic_singularity_living_signatory": "Lebenden Unterzeichner verlangen",
      "bureaucratic_singularity_funded_pending": "Dem Pending ein eigenes Budget geben",
      "bureaucratic_singularity_forced_decisions": "Jeden Fall zu einer Entscheidung zwingen",
      "bureaucratic_singularity_unlisted_office": "Dem nicht gelisteten Amt berichten",
      "bureaucratic_singularity_capped_recursion": "Recursion bei elf Ebenen beenden",
      "bureaucratic_singularity_total_statute": "Gesetz unverändert verabschieden",
      "bureaucratic_singularity_exemptions": "Ausnahmekatalog anhängen",
      "post_mortal_civilization_moratorium": "Moratorium unbegrenzt verlängern",
      "post_mortal_civilization_right_of_reply": "Bestattungen mit Recht auf Erwiderung fortsetzen",
      "post_mortal_civilization_advance_estates": "Nachlässe im Voraus abwickeln",
      "post_mortal_civilization_posthumous_succession": "Nachfolge posthum belassen",
      "post_mortal_civilization_mass_bodies": "Körper in großem Maßstab herstellen",
      "post_mortal_civilization_rationed_bodies": "Verkörperung nach Seniorität rationieren",
      "post_mortal_civilization_deathless_census": "Todesfreie Zählung veröffentlichen",
      "post_mortal_civilization_statistical_mortality": "Statistische Mortality beibehalten",
      "void_communion_continuous_hymn": "Hymne dauerhaft aufführen",
      "void_communion_retired_hymn": "Werk nach einer Saison einstellen",
      "void_communion_accredited": "Mission akkreditieren",
      "void_communion_unstaffed_consulate": "Konsulat unbesetzt lassen",
      "void_communion_named_tithe": "Tithe wie benannt entrichten",
      "void_communion_anonymous_tithe": "Anonyme Menge ersetzen",
      "void_communion_hollow_cities": "Städte um ihre Hohlräume neu bauen",
      "void_communion_zoned_hollows": "Hohlräume als reserviertes Land ausweisen",
      "recursive_simulation_open_nesting": "Verschachtelung fortsetzen lassen",
      "recursive_simulation_capped_stack": "Stack auf eine Ebene begrenzen",
      "recursive_simulation_licensed_reality": "Vorläufige Genehmigung akzeptieren",
      "recursive_simulation_unregistered_world": "Diese Welt aus dem Register streichen",
      "recursive_simulation_attempted_proof": "Beweis versuchen",
      "recursive_simulation_conceded_limit": "Frage als unbeantwortbar anerkennen",
      "recursive_simulation_upward_code": "Kodex einschließlich Fußnote übernehmen",
      "recursive_simulation_downward_code": "Kodex nur nach unten anwenden",
      "machine_faith_second_engine": "Zweite Engine autorisieren",
      "machine_faith_sufficient_engine": "Erste Engine für ausreichend erklären",
      "collective_mind_scheduled_unanimity": "Einstimmigkeit wöchentlich einplanen",
      "collective_mind_investigated_unanimity": "Nachmittag als Vorfall behandeln",
      "temporal_dominion_sovereign_hour": "Stunde krönen",
      "temporal_dominion_bound_hour": "Stunde an gewöhnlichen Kalender binden",
      "reality_engineering_public_counter": "Schalter für die Öffentlichkeit öffnen",
      "reality_engineering_licensed_exceptions": "Ausnahmen auf lizenzierte Projekte begrenzen",
      "biological_transcendence_swarm_state": "Regierung an den Schwarm delegieren",
      "biological_transcendence_logistical_swarm": "Schwarm auf Logistik begrenzen",
      "cosmic_resistance_blackout": "Doktrin vollständig übernehmen",
      "cosmic_resistance_contingent_blackout": "Nur als Contingency übernehmen",
      "bureaucratic_singularity_final_forms": "Final Form bei Geburt ausstellen",
      "bureaucratic_singularity_voluntary_forms": "Nur auf Antrag ausstellen",
      "post_mortal_civilization_permanent_roll": "Register unverändert lassen",
      "post_mortal_civilization_term_limited": "Wähler nach fester Amtszeit ausmustern",
      "void_communion_permanent_embassy": "Embassy dauerhaft besetzen",
      "void_communion_recalled_mission": "Mission zurückrufen und Kanal erhalten",
      "recursive_simulation_published_registry": "Register einschließlich letzter Seite veröffentlichen",
      "recursive_simulation_withheld_page": "Alles außer der letzten Seite veröffentlichen"
    },
    "endgameStates": {
      "endgame_biological_transcendence": "biologische Transzendenz",
      "endgame_bureaucratic_singularity": "bürokratische Singularität",
      "endgame_collective_mind": "kollektiver Geist",
      "endgame_cosmic_resistance": "kosmischer Widerstand",
      "endgame_machine_faith": "Machine Faith",
      "endgame_post_mortal": "postmortale Zivilisation",
      "endgame_reality_engineering": "Reality Engineering",
      "endgame_recursive_simulation": "rekursive Simulation",
      "endgame_temporal_dominion": "Temporal Dominion",
      "endgame_void_communion": "Void Communion"
    },
    "lore": {
      "species_prefixes": [
        "Astra",
        "Vel",
        "Khe",
        "Mora",
        "Syla",
        "Vor",
        "Lumi",
        "Drae",
        "Thal",
        "Nexa",
        "Orun",
        "Pyra"
      ],
      "species_suffixes": [
        "ri",
        "nids",
        "ari",
        "eth",
        "ul",
        "ora",
        "ites",
        "ae",
        "ori",
        "yx",
        "ene",
        "um"
      ],
      "faction_prefixes": [
        "The",
        "Grand",
        "United",
        "Sacred",
        "Radiant",
        "Adaptive",
        "Orbital",
        "Quiet",
        "Infinite",
        "Harmonic"
      ],
      "faction_nouns": [
        "Collective",
        "Synod",
        "Concord",
        "Dynasty",
        "Accord",
        "Assembly",
        "Mandate",
        "League",
        "Choir",
        "Compact"
      ],
      "faction_endings": [
        "of Embers",
        "of the Lens",
        "of the Spiral",
        "of Growth",
        "of Resonance",
        "of the Last Dawn",
        "of Hollow Stars",
        "of Luminous Dust",
        "of the Archive",
        "of the Deep Signal"
      ],
      "body_types": [
        "biped",
        "quadruped",
        "avian",
        "fungal",
        "insectoid",
        "cephalopod",
        "synthetic"
      ],
      "cultures": [
        "nomadic",
        "scholastic",
        "communal",
        "martial",
        "ritualistic",
        "mercantile",
        "mystic",
        "ecological"
      ],
      "doctrines": [
        "Expansion through adaptation",
        "Memory through ritual",
        "Stability through control",
        "Harmony through consensus",
        "Salvation through ascent",
        "Prosperity through exchange",
        "Dominance through precision",
        "Survival through vigilance"
      ],
      "path_doctrines": {
        "machine_faith": "Salvation through sacred computation",
        "collective_mind": "Unity through shared consciousness",
        "temporal_dominion": "Sovereignty over causality",
        "reality_engineering": "Order through editable physics",
        "biological_transcendence": "Ascension through adaptation",
        "cosmic_resistance": "Existence without an observer",
        "bureaucratic_singularity": "Reality through administration",
        "post_mortal_civilization": "Continuity beyond death",
        "void_communion": "Meaning through the outer dark",
        "recursive_simulation": "Understanding through recursion"
      },
      "path_focus": {
        "machine_faith": "sacred machine infrastructure",
        "collective_mind": "planetary cognition",
        "temporal_dominion": "causal control",
        "reality_engineering": "physical-law engineering",
        "biological_transcendence": "adaptive biosphere design",
        "cosmic_resistance": "anti-observer autonomy",
        "bureaucratic_singularity": "ontological administration",
        "post_mortal_civilization": "continuity infrastructure",
        "void_communion": "external entity diplomacy",
        "recursive_simulation": "nested-world cultivation"
      }
    }
  }
};

export const LOCALIZATION = { en: ENGLISH, de: GERMAN } as const;

export type Catalog = LocalizedShape<typeof ENGLISH>;
