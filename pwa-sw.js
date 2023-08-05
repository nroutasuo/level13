/*
My(@aeiea) attempt at making level 13 offline.
*/

cachecontent = ["/changelog.html", "/changelog.json", "/gridism.css", "/main.css", "/main.less", "/base-classes.less", "/base-elements.less", "/base-typography.less", "/elements-buttons.less", "/elements-common.less", "/elements-input.less", "/elements-meta.less", "/elements-special.less", "/layout.less", "/loader.less", "/scrollbar.less", "/vis.less", "/vision.less", "/normalize.css", "/theme-dark.less", "/theme-sunlit.less", "/faq.html", "/favicon-16x16.png", "/favicon-32x32.png", "/icon-checkmark-dark.png", "/icon-checkmark.png", "/icon-decrease-dark.png", "/icon-decrease.png", "/icon-even-dark.png", "/icon-even.png", "/icon-fastincrease-dark.png", "/icon-fastincrease.png", "/icon-gear-dark.png", "/icon-gear-warning.png", "/icon-gear.png", "/icon-increase-dark.png", "/icon-increase.png", "/icon-next-dark.png", "/icon-next.png", "/icon-previous-dark.png", "/icon-previous.png", "/icon-star-dark.png", "/icon-star.png", "/icon_placeholder-dark.png", "/icon_placeholder.png", "/icon_stat_cost_scavenge-dark.png", "/icon_stat_cost_scavenge.png", "/icon_stat_cost_scout-dark.png", "/icon_stat_cost_scout.png", "/icon_stat_fight_attack-dark.png", "/icon_stat_fight_attack.png", "/icon_stat_fight_defence-dark.png", "/icon_stat_fight_defence.png", "/icon_stat_fight_shield-dark.png", "/icon_stat_fight_shield.png", "/icon_stat_fight_speed-dark.png", "/icon_stat_fight_speed.png", "/icon_stat_light-dark.png", "/icon_stat_light.png", "/icon_stat_movement_cost-dark.png", "/icon_stat_movement_cost.png", "/icon_stat_resistance_cold-dark.png", "/icon_stat_resistance_cold.png", "/icon_stat_resistance_poison-dark.png", "/icon_stat_resistance_poison.png", "/icon_stat_resistance_radiation-dark.png", "/icon_stat_resistance_radiation.png", "/icon_stat_shade-dark.png", "/icon_stat_shade.png", "/follower_animal_bat.png", "/follower_animal_bird.png", "/follower_animal_dog.png", "/follower_animal_generic.png", "/follower_black_f.png", "/follower_black_m.png", "/follower_blue_m.png", "/follower_gray_f.png", "/follower_gray_m.png", "/follower_green_f.png", "/follower_green_m.png", "/follower_pink_f.png", "/follower_red_f.png", "/follower_red_m.png", "/follower_white_f.png", "/follower_white_m.png", "/follower_yellow_f.png", "/follower_yellow_m.png", "/artefact-test.png", "/bag-0.png", "/bag-1.png", "/bag-3.png", "/bamboo.png", "/blueprint.png", "/blueprint-evidence.png", "/blueprint-favour.png", "/blueprint-rumours.png", "/book.png", "/cache-food.png", "/cache-metal-plus.png", "/cache-metal.png", "/cache-water.png", "/clipboard.png", "/clothing-2.png", "/clothing-3.png", "/clothing-hand-0.png", "/clothing-hat-1.png", "/clothing-hat-2.png", "/clothing-hat-3.png", "/clothing-hat-plus.png", "/clothing-mask.png", "/clothing-rags.png", "/clothing-shirt-2.png", "/clothing-shirt.png", "/clothing-warm.png", "/consumable-paint.png", "/exploration-1.png", "/exploration-gear.png", "/exploration-map.png", "/firstaid-1.png", "/firstaid-2.png", "/follower-1.png", "/follower-2.png", "/follower-3.png", "/follower-4.png", "/follower-5.png", "/glowstick-1.png", "/health-negative.png", "/health-positive.png", "/hook.png", "/ingredients-matches.png", "/injury-1.png", "/injury-2.png", "/injury-3.png", "/light-electric.png", "/light-ghost.png", "/light-lantern.png", "/newspaper.png", "/pearl.png", "/perk-blessed.png", "/perk-light-beacon.png", "/perk-tired.png", "/res-bands.png", "/res-bottle.png", "/res-glowbug.png", "/res-leather.png", "/res-pin.png", "/res-silk.png", "/res-tape.png", "/seed.png", "/shades-basic.png", "/shades-fancy.png", "/shoe-1.png", "/shoe-2.png", "/shoe-3.png", "/shoe-l14.png", "/stamina-1.png", "/trade-chocolate.png", "/trade-diamond.png", "/trade-jar.png", "/transmitter.png", "/weapon-bomb.png", "/weapon-consumable-1.png", "/weapon-shiv.png", "/weight.png", "/map-beacon-sunlit.png", "/map-beacon.png", "/map-camp-sunlit.png", "/map-camp.png", "/map-campable-sunlit.png", "/map-campable.png", "/map-graffiti-sunlit.png", "/map-graffiti.png", "/map-ingredient-sunlit.png", "/map-ingredient.png", "/map-interest-sunlit.png", "/map-interest.png", "/map-investigate-sunlit.png", "/map-investigate.png", "/map-passage-down-sunlit.png", "/map-passage-down.png", "/map-passage-up-disabled-sunlit.png", "/map-passage-up-disabled.png", "/map-passage-up-sunlit.png", "/map-passage-up.png", "/map-unvisited-sunlit.png", "/map-unvisited.png", "/map-water-sunlit.png", "/map-water.png", "/map-workshop-sunlit.png", "/map-workshop.png", "/arrow-circle-bottom-2x-dark.png", "/arrow-circle-bottom-2x.png", "/arrow-circle-top-2x-dark.png", "/arrow-circle-top-2x.png", "/res-concrete.png", "/res-currency.png", "/res-food.png", "/res-fuel.png", "/res-herbs.png", "/res-medicine.png", "/res-metal.png", "/res-robots.png", "/res-rope.png", "/res-rubber.png", "/res-tools.png", "/res-water.png", "/stat-evidence.png", "/stat-favour.png", "/stat-rumours.png", "/status-hazard-prediction.png", "/status-ingredients-prediction.png", "/status-supplies-prediction.png", "/ui-camp-default-dark.png", "/ui-camp-default.png", "/ui-camp-outpost-dark.png", "/ui-camp-outpost.png", "/ui-level-cold-dark.png", "/ui-level-cold.png", "/ui-level-default-dark.png", "/ui-level-default.png", "/ui-level-empty-dark.png", "/ui-level-empty.png", "/ui-level-ground-dark.png", "/ui-level-ground.png", "/ui-level-poison-dark.png", "/ui-level-poison.png", "/ui-level-radiation-dark.png", "/ui-level-radiation.png", "/ui-level-sun-dark.png", "/ui-level-sun.png", "/ui-level-unknown-dark.png", "/ui-level-unknown.png", "/index.html", "/ash.js", "/ash.min.js", "/tickprovider.js", "/jquery-1.11.1.min.js", "/lz-string.js", "/json.js", "/require.min.js", "/text.js", "/changelog.js", "/config-meta.js", "/config-tools.js", "/config.js", "/ConsoleLogger.js", "/ExceptionHandler.js", "/CampComponent.js", "/CurrencyComponent.js", "/CurrentPlayerLocationComponent.js", "/LogMessagesComponent.js", "/MovementComponent.js", "/PositionComponent.js", "/ResourceAccumulationComponent.js", "/ResourcesComponent.js", "/RevealedComponent.js", "/SaveComponent.js", "/VisitedComponent.js", "/LevelPassagesComponent.js", "/LevelStatusComponent.js", "/AutoPlayComponent.js", "/BagComponent.js", "/DeityComponent.js", "/EvidenceComponent.js", "/ExcursionComponent.js", "/FollowersComponent.js", "/InsightComponent.js", "/ItemsComponent.js", "/PerksComponent.js", "/PlayerActionComponent.js", "/PlayerActionResultComponent.js", "/RumoursComponent.js", "/StaminaComponent.js", "/VisionComponent.js", "/CurrentNearestCampComponent.js", "/EnemiesComponent.js", "/CampEventTimersComponent.js", "/RaidComponent.js", "/RecruitComponent.js", "/TraderComponent.js", "/FightComponent.js", "/FightEncounterComponent.js", "/BeaconComponent.js", "/SectorCollectorsComponent.js", "/SectorImprovementsComponent.js", "/WorkshopComponent.js", "/LastVisitedCampComponent.js", "/MovementOptionsComponent.js", "/OutgoingCaravansComponent.js", "/PassagesComponent.js", "/ReputationComponent.js", "/SectorControlComponent.js", "/SectorFeaturesComponent.js", "/SectorLocalesComponent.js", "/SectorStatusComponent.js", "/UpgradesComponent.js", "/GangComponent.js", "/LevelComponent.js", "/PlayerComponent.js", "/SectorComponent.js", "/TribeComponent.js", "/AutoPlayConstants.js", "/BagConstants.js", "/CampConstants.js", "/CanvasConstants.js", "/CheatConstants.js", "/ColorConstants.js", "/CultureConstants.js", "/EnemyConstants.js", "/ExplorationConstants.js", "/FightConstants.js", "/FollowerConstants.js", "/GameConstants.js", "/ImprovementConstants.js", "/ItemConstants.js", "/LevelConstants.js", "/LocaleConstants.js", "/LogConstants.js", "/MovementConstants.js", "/OccurrenceConstants.js", "/PerkConstants.js", "/PlayerActionConstants.js", "/PlayerStatConstants.js", "/PositionConstants.js", "/SectorConstants.js", "/StoryConstants.js", "/SystemPriorities.js", "/TextConstants.js", "/TradeConstants.js", "/TribeConstants.js", "/TutorialConstants.js", "/UIConstants.js", "/UpgradeConstants.js", "/WorldConstants.js", "/EnemyData.json", "/ItemData.json", "/PlayerActionData.json", "/UpgradeData.json", "/HorizontalSelect.js", "/EntityCreator.js", "/GameFlowLogger.js", "/GameGlobals.js", "/GameGlobalsInitializer.js", "/GameState.js", "/GlobalSignals.js", "/AutoPlayHelper.js", "/ButtonHelper.js", "/CampBalancingHelper.js", "/CampHelper.js", "/CampVisHelper.js", "/EndingHelper.js", "/FightHelper.js", "/ItemsHelper.js", "/LevelHelper.js", "/MilestoneEffectsHelper.js", "/MovementHelper.js", "/PlayerActionResultsHelper.js", "/PlayerActionsHelper.js", "/PlayerHelper.js", "/ResourcesHelper.js", "/SaveHelper.js", "/SectorHelper.js", "/TribeBalancingHelper.js", "/TribeHelper.js", "/ChangeLogHelper.js", "/UIMapHelper.js", "/UIPopupManager.js", "/UITechTreeHelper.js", "/UpgradeEffectsHelper.js", "/level13.js", "/SaveNode.js", "/FightNode.js", "/GangNode.js", "/LastVisitedCampNode.js", "/LevelNode.js", "/PlayerLevelNode.js", "/LogNode.js", "/NearestCampNode.js", "/AutoPlayNode.js", "/DeityNode.js", "/ItemsNode.js", "/PlayerActionResultNode.js", "/PlayerMovementNode.js", "/PlayerResourcesNode.js", "/PlayerStatsNode.js", "/StaminaNode.js", "/VisionNode.js", "/PlayerActionNode.js", "/PlayerLocationNode.js", "/PlayerPositionNode.js", "/BeaconNode.js", "/CampNode.js", "/CampResourcesNode.js", "/SectorCollectorsNode.js", "/SectorImprovementsNode.js", "/SectorNode.js", "/VisitedSectorNode.js", "/TribeResourcesNode.js", "/TribeUpgradesNode.js", "/PlayerActionFunctions.js", "/AutoPlaySystem.js", "/BagSystem.js", "/CheatSystem.js", "/CollectorSystem.js", "/EndingSystem.js", "/EvidenceSystem.js", "/ExcursionSystem.js", "/FaintingSystem.js", "/FavourSystem.js", "/FightSystem.js", "/FollowerSystem.js", "/GameManager.js", "/GlobalResourcesResetSystem.js", "/GlobalResourcesSystem.js", "/InsightSystem.js", "/LevelStatusSystem.js", "/CampEventsSystem.js", "/PlayerEventsSystem.js", "/PerkSystem.js", "/PlayerActionSystem.js", "/PlayerMovementSystem.js", "/PlayerPositionSystem.js", "/PopulationSystem.js", "/ReputationSystem.js", "/RumourSystem.js", "/SaveSystem.js", "/SectorStatusSystem.js", "/SlowUpdateSystem.js", "/StaminaSystem.js", "/TutorialSystem.js", "/UIOutBagSystem.js", "/UIOutCampSystem.js", "/UIOutCampVisSystem.js", "/UIOutElementsSystem.js", "/UIOutEmbarkSystem.js", "/UIOutFightSystem.js", "/UIOutFollowersSystem.js", "/UIOutHeaderSystem.js", "/UIOutLevelSystem.js", "/UIOutLogSystem.js", "/UIOutManageSaveSystem.js", "/UIOutMapSystem.js", "/UIOutMilestonesSystem.js", "/UIOutPopupInventorySystem.js", "/UIOutPopupTradeSystem.js", "/UIOutProjectsSystem.js", "/UIOutTabBarSystem.js", "/UIOutTradeSystem.js", "/UIOutTribeSystem.js", "/UIOutUpgradesSystem.js", "/UnlockedFeaturesSystem.js", "/VisionSystem.js", "/WorkerSystem.js", "/UIFunctions.js", "/AutoExplorationVO.js", "/BlueprintVO.js", "/EnemyVO.js", "/EnvironmentalHazardsVO.js", "/FightItemEffectsVO.js", "/FollowerVO.js", "/GangVO.js", "/ImprovementVO.js", "/IncomingCaravanVO.js", "/ItemBonusVO.js", "/ItemVO.js", "/LevelProjectVO.js", "/LocaleVO.js", "/LogMessageVO.js", "/MovementBlockerVO.js", "/OutgoingCaravanVO.js", "/PassageVO.js", "/PathConstraintVO.js", "/PerkVO.js", "/PlayerActionVO.js", "/PositionVO.js", "/RaidVO.js", "/ResourcesVO.js", "/ResultVO.js", "/StashVO.js", "/TabCountsVO.js", "/TradingPartnerVO.js", "/UpgradeVO.js", "/WaymarkVO.js", "/level13-app.js", "/player-tools.js", "/pwa-sw.js", "/LangEnglish.js", "/Text.js", "/TextBuilder.js", "/CanvasUtils.js", "/DescriptionMapper.js", "/FileUtils.js", "/MapElements.js", "/MapUtils.js", "/MathUtils.js", "/MetaUIUtils.js", "/PathFinding.js", "/RandomUtils.js", "/StringUtils.js", "/UIAnimations.js", "/UIList.js", "/UIState.js", "/ValueCache.js", "/VOCache.js", "/CriticalPathVO.js", "/DistrictVO.js", "/EnemyCreator.js", "/LevelGenerator.js", "/LevelVO.js", "/SectorGenerator.js", "/SectorVO.js", "/StageVO.js", "/StructureGenerator.js", "/WorldCreator.js", "/WorldCreatorConstants.js", "/WorldCreatorDebug.js", "/WorldCreatorHelper.js", "/WorldCreatorLogger.js", "/WorldCreatorRandom.js", "/WorldFeatureVO.js", "/WorldGenerator.js", "/WorldValidator.js", "/WorldVO.js", "/ZoneVO.js", "/tools.html"];
self.addEventListener("install", (e) => {
    console.log("[Offline Service Worker]: Installed");
    e.waitUntil((async () => {
        const cache = await caches.open('level13');
        console.log('[Offline Service Worker] Caching all: app shell and content');
        await cache.addAll(cachecontent);
        console.log('[Offline Service Worker] Caching all: Done');
    })());
});
self.addEventListener("fetch", (e) => {
    console.log(`[Offline Service Worker] Fetched resource ${e.request.url}`);
});
self.addEventListener('fetch', (e) => {
    // Cache http and https only, skip unsupported chrome-extension:// and file://...
    if (!(
       e.request.url.startsWith('http:') || e.request.url.startsWith('https:')
    )) {
        return; 
    }

  e.respondWith((async () => {
    const r = await caches.match(e.request);
    console.log(`[Offline Service Worker] Fetching resource: ${e.request.url}`);
    if (r) return r;
    const response = await fetch(e.request);
    const cache = await caches.open('level13');
    console.log(`[Offline Service Worker] Caching new resource: ${e.request.url}`);
    cache.put(e.request, response.clone());
    return response;
  })());
});
