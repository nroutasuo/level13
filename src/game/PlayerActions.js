// A class responds to player actions parsed by the UIFunctions
define(['ash',
        'game/constants/PlayerActionConstants',
        'game/constants/PlayerStatConstants',
        'game/constants/ItemConstants',
        'game/constants/PerkConstants',
        'game/constants/FightConstants',
        'game/constants/EnemyConstants',
        'game/constants/UIConstants',
        'game/constants/TextConstants',
        'game/vos/ItemVO',
        'game/nodes/PlayerPositionNode',
        'game/nodes/PlayerStatsNode',
        'game/nodes/player/PlayerResourcesNode',
        'game/nodes/PlayerLocationNode',
        'game/nodes/NearestCampNode',
        'game/nodes/sector/SectorNode',
        'game/nodes/sector/CampNode',
        'game/nodes/tribe/TribeUpgradesNode',
        'game/components/common/PositionComponent',
        'game/components/common/ResourcesComponent',
        'game/components/common/VisitedComponent',
        'game/components/player/ItemsComponent',
        'game/components/player/PerksComponent',
        'game/components/player/DeityComponent',
        'game/components/sector/improvements/CampComponent',
        'game/components/sector/improvements/SectorImprovementsComponent',
        'game/components/sector/FightComponent',
        'game/components/sector/EnemiesComponent',
        'game/components/sector/SectorControlComponent',
        'game/components/sector/SectorFeaturesComponent',
        'game/components/sector/SectorStatusComponent',
        'game/components/sector/MovementOptionsComponent',
        'game/components/sector/PassagesComponent',
        'game/components/sector/events/CampEventTimersComponent',
        'game/components/common/LogMessagesComponent',
        'game/systems/ui/UIOutHeaderSystem',
        'game/systems/ui/UIOutElementsSystem',
        'game/systems/SaveSystem',
        'game/systems/SectorMovementOptionsSystem'
], function (Ash,
        PlayerActionConstants, PlayerStatConstants, ItemConstants, PerkConstants, FightConstants, EnemyConstants, UIConstants, TextConstants,
        ItemVO,
        PlayerPositionNode, PlayerStatsNode, PlayerResourcesNode, PlayerLocationNode,
        NearestCampNode, SectorNode, CampNode, TribeUpgradesNode,
        PositionComponent, ResourcesComponent, VisitedComponent,
        ItemsComponent, PerksComponent, DeityComponent,
        CampComponent, SectorImprovementsComponent, FightComponent, EnemiesComponent,
        SectorControlComponent, SectorFeaturesComponent, SectorStatusComponent,
        MovementOptionsComponent, PassagesComponent, CampEventTimersComponent,
        LogMessagesComponent,
        UIOutHeaderSystem, UIOutElementsSystem, SaveSystem, SectorMovementOptionsSystem) {
    
    var PlayerActions = Ash.System.extend({
        
        directions: {
            left: "LEFT",
            right: "RIGHT",
            up: "UP",
            down: "DOWN",
            camp: "CAMP"
        },
        
		playerPositionNodes: null,
		playerLocationNodes: null,
		nearestCampNodes: null,
        campNodes: null,
        playerStatsNodes: null,
        playerResourcesNodes: null,
        tribeUpgradesNodes: null,
        
        engine: null,
        gameState: null,
        occurrenceFunctions: null,
        playerMovedSignal: null,
        improvementBuiltSignal: null,
        resourcesHelper: null,
		levelHelper: null,
        
        constructor: function (gameState, resourcesHelper, levelHelper, playerMovedSignal, improvementBuiltSignal) {
            this.gameState = gameState;
            this.resourcesHelper = resourcesHelper;
			this.levelHelper = levelHelper;
            this.playerMovedSignal = playerMovedSignal;
            this.improvementBuiltSignal = improvementBuiltSignal;
        },

        addToEngine: function (engine) {
            this.engine = engine;
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.nearestCampNodes = engine.getNodeList(NearestCampNode);
            this.campNodes = engine.getNodeList(CampNode);
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
        },

        removeFromEngine: function (engine) {
            this.playerPositionNodes = null;
            this.playerLocationNodes = null;
            this.nearestCampNodes = null;
            this.campNodes = null;
            this.playerStatsNodes = null;
            this.playerResourcesNodes = null;
            this.tribeUpgradesNodes = null;
            this.engine = null;
        },
        
        addLogMessage: function(msg, replacements, values, pendingPosition) {
            var logComponent = this.playerPositionNodes.head.entity.get(LogMessagesComponent);
            if (pendingPosition) {
                logComponent.addMessage(msg, replacements, values, pendingPosition.level, pendingPosition.sector, pendingPosition.inCamp);
            } else {
                logComponent.addMessage(msg, replacements, values);                
            }
        },
        
        moveTo: function(direction){
            if(direction) {                
                var playerPos = this.playerPositionNodes.head.position;
                switch(direction) {
                    case this.directions.left:           
                        this.deductCosts("move_sector_left");
                        playerPos.sector--;
                        break;
                    case this.directions.right:           
                        this.deductCosts("move_sector_right");
                        playerPos.sector++;
                        break;
                    case this.directions.up:           
                        this.deductCosts("move_level_up");
                        playerPos.level++;
                        break;
                    case this.directions.down:           
                        this.deductCosts("move_level_down");
                        playerPos.level--;
                        break;
                    case this.directions.camp:
                        this.deductCosts("move_camp_level");
                        var campSector = this.nearestCampNodes.head.entity;
                        var campPosition = campSector.get(PositionComponent);
                        playerPos.level = campPosition.level;
                        playerPos.sector = campPosition.sector;
                        break;
                }
                
                this.forceResourceBarUpdate();
            }
            else {
                console.log("WARN: unknown direction: " + direction);
            }
        },
        
        moveToCamp: function (level) {
            var campSector = null;
            var campPosition = null;
            for (var node = this.campNodes.head; node; node = node.next) {
                campPosition = node.entity.get(PositionComponent);
                if (campPosition.level == level) {
                    campSector = node.entity;
                    break;
                }
            }
            
            var playerPos = this.playerPositionNodes.head.position;
            if (campSector) {
                this.deductCosts("move_camp_global");
                campPosition = campSector.get(PositionComponent);
                playerPos.level = campPosition.level;
                playerPos.sector = campPosition.sector;
                this.enterCamp();
            } else {
                console.log("WARN: No camp found for level " + level);
            }
        },
        
        moveResFromCampToBag: function(resourcesVO) {
            var playerLevelCamp = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity : null;
            var playerResources = this.playerResourcesNodes.head.resources.resources;		
            var campResourcesSource = playerLevelCamp.get(ResourcesComponent).resources;
            this.moveResourcesFromVOToVO(resourcesVO, campResourcesSource, playerResources);
        },
        
        moveResFromBagToCamp: function() {
            var playerLevelCamp = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity : null;
            var playerResources = this.playerResourcesNodes.head.resources.resources;
            var campResourcesSource = playerLevelCamp.get(ResourcesComponent).resources;
            this.moveResourcesFromVOToVO( playerResources, playerResources, campResourcesSource);
        },
        
        moveResourcesFromVOToVO: function( amountsVO, fromResVO, toResVO ) {
            for(var key in resourceNames) {
            var name = resourceNames[key];
            var amount = Math.min(amountsVO.getResource(name), fromResVO.getResource(name));
            if (amount > 0) {
                toResVO.addResource(name, amount);
                fromResVO.addResource(name, -amount);
            }
            }    
        },
        
        enterCamp: function() {
            var playerPos = this.playerPositionNodes.head.position;
            var campNode = this.nearestCampNodes.head;
            if (campNode && campNode.position.level == playerPos.level && campNode.position.sector == playerPos.sector) {
                if (!playerPos.inCamp) {
                    playerPos.inCamp = true;
                    if (this.resourcesHelper.hasCampStorage()) {
                        this.moveResFromBagToCamp();
                    }
                    
                    this.addLogMessage("Entered camp.");
                    this.playerMovedSignal.dispatch(playerPos);
                    this.forceResourceBarUpdate();
                    this.save();
                }
            } else {
                console.log("WARN: No valid camp found.");
            }
        },
        
        enterOutTab: function() {
            if(!this.resourcesHelper.hasCampStorage()) this.leaveCamp();
        },
        
        leaveCamp: function() {
            var playerPos = this.playerPositionNodes.head.position;
            var campNode = this.nearestCampNodes.head;
            if (campNode && campNode.position.level == playerPos.level && campNode.position.sector == playerPos.sector) {
                var oldPlayerPos = playerPos.clone();
                playerPos.inCamp = false;
                this.addLogMessage("Left camp.");
                this.playerMovedSignal.dispatch(playerPos);
                this.forceResourceBarUpdate();
                // this.addLogMessage("The people have missed you.", null, null, oldPlayerPos);
                this.save();
            } else {
                console.log("WARN: No valid camp found.");
            }
        },
        
        scavenge: function() {
            if (this.checkAvailability("scavenge", true)) {                
                this.deductCosts("scavenge");
                
                var playerVision = this.playerStatsNodes.head.vision.value;
                var playerHealth = this.playerStatsNodes.head.stamina.health;
                var playerPos = this.playerPositionNodes.head.position;
                var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resources;
                var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent); 
            
                // Always: basic res
                var resultResources = PlayerActionConstants.getResourcesForScavenge(playerVision, playerHealth, sectorResources, true);
                
                // Rarely: items, hints, injuries) (depending on vision)
                // TODO add hints and injuries for scavenge
                var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
                var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
                var resultItems = PlayerActionConstants.getItemsForScavange(playerVision, itemsComponent, levelOrdinal);
                
                var currentStorage = this.resourcesHelper.getCurrentStorage(true);
                currentStorage.addResources(resultResources);
                
                var msg = "";
                var replacements = [];
                var values = [];
                
                if (playerVision <= PlayerStatConstants.VISION_BASE) {
                    msg = "Rummaged in the dark. ";
                }
                else {
                    msg = "Went scavenging. ";
                }
                
                var resTxt = TextConstants.getLogResourceText(resultResources);
                msg += "Found " + resTxt.msg;
                replacements = replacements.concat(resTxt.replacements);
                values = values.concat(resTxt.values);
                for(var key in resourceNames) {
                    var name = resourceNames[key];
                    var amount = resultResources.getResource(name);
                    if (amount > 0) {
                        sectorStatus.addDiscoveredResource(name);
                    }
                }
                for (var i = 0; i < resultItems.length; i++) {
                    var item = resultItems[i];
                    itemsComponent.addItem(item);
                    msg += "$" + replacements.length + ", ";
                    replacements.push(item.name);
                }
                
                if (resultResources.getTotal() > 0 || resultItems.length > 0) {
                    msg = msg.slice(0, -2);
                    msg += ".";                
                } else {
                    msg = "Didn't find anything.";
                }
                
                this.addLogMessage(msg, replacements, values);                
                this.forceResourceBarUpdate();
                this.forceTabUpdate();
            }
        },
        
        scout: function() {
            if (this.checkAvailability("scout", true)) {
                var sector = this.playerLocationNodes.head.entity;
                
                var playerStamina = this.playerStatsNodes.head.stamina;
                var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
                var fightStrength = FightConstants.getPlayerStrength(playerStamina, itemsComponent);
                var positionComponent = sector.get(PositionComponent);
                var levelOrdinal = this.gameState.getLevelOrdinal(positionComponent.level);
                if (fightStrength < EnemyConstants.getRequiredStength(levelOrdinal)) {
                    this.occurrenceFunctions.onScoutSectorWeakling(sector);
                    return;
                }
                
                var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent); 
                if(!sectorStatus.scouted) {
                    this.deductCosts("scout");
                    sectorStatus.scouted = true;
                    this.playerStatsNodes.head.evidence.value++;
                    var msg = "Scouted the area (+1 Evidence).";
                    
                    var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resources;
                    var resultResources = PlayerActionConstants.getResourcesForScout(sectorResources);
                    
                    if (resultResources.getTotal() > 0) {
                        var currentStorage = this.resourcesHelper.getCurrentStorage(true);
                        currentStorage.addResources(resultResources);
                        msg += " Found ";
                        for(var key in resourceNames) {
                            var name = resourceNames[key];
                            var amount = resultResources.getResource(name);
                            if (amount > 0) {
                                msg += Math.round(amount) + " " + name + ".";
                                sectorStatus.addDiscoveredResource(name);
                            }
                        }
                    }
                    
                    // TODO add details to message based on the location
                    this.forceResourceBarUpdate();
                    this.addLogMessage(msg);
                    
                    this.occurrenceFunctions.onScoutSector(sector);
                    this.save();
                }
            }
        },
        
        initFight: function() {
            var sector = this.playerLocationNodes.head.entity;
            sector.get(EnemiesComponent).selectNextEnemy();
        },
        
        startFight: function() {
            if (this.checkAvailability("fight", true)) {                
                this.deductCosts("fight");  
                var sector = this.playerLocationNodes.head.entity;
                var enemiesComponent = sector.get(EnemiesComponent);
                sector.add(new FightComponent(enemiesComponent.getNextEnemy()));
                this.forceResourceBarUpdate();
            }
        },
        
        endFight: function() {
            var sector = this.playerLocationNodes.head.entity;
            if (sector.has(FightComponent) && sector.get(FightComponent).won) {
                sector.get(EnemiesComponent).resetNextEnemy();
            }
            sector.remove(FightComponent);
            this.save();
        },
        
        buildCamp: function() {
            if(this.checkAvailability("build_out_camp", true)) {
                this.deductCosts("build_out_camp");               
                
                var sector = this.playerLocationNodes.head.entity;
                sector.add(new CampComponent());
                sector.add(new CampEventTimersComponent());
                this.buildStorage(true, sector);
                
                this.addLogMessage("Built a camp.");                
                this.forceResourceBarUpdate();
                this.save();
            }
        },
		
		buildPassageUpStairs: function(sectorPos) {
            this.buildPassage(sectorPos, true, "build_out_passage_up_stairs", "build_out_passage_down_stairs");
        },
        
        buildPassageDownStairs: function(sectorPos) {
            this.buildPassage(sectorPos, false, "build_out_passage_down_stairs", "build_out_passage_up_stairs");
        },
		
		buildPassageUpElevator: function(sectorPos) {
            this.buildPassage(sectorPos, true, "build_out_passage_up_elevator", "build_out_passage_down_elevator");
        },
        
        buildPassageDownElevator: function(sectorPos) {
            this.buildPassage(sectorPos, false, "build_out_passage_down_elevator", "build_out_passage_up_elevator");
        },
		
		buildPassageUpHole: function(sectorPos) {
            this.buildPassage(sectorPos, true, "build_out_passage_up_hole", "build_out_passage_down_hole");
        },
        
        buildPassageDownHole: function(sectorPos) {
            this.buildPassage(sectorPos, false, "build_out_passage_down_hole", "build_out_passage_up_hole");
        },
        
        buildPassage: function(sectorPos, up, action, neighbourAction) {
			var l = sectorPos.split("-")[0];
			var s = sectorPos.split("-")[1];
			var sector = this.levelHelper.getSectorByPosition(l, s);
			var neighbour = this.levelHelper.getSectorByPosition(up ? l + 1 : l - 1, s);
            this.buildImprovement(action, this.getImprovementNameForAction(action), sector);
            this.buildImprovement(neighbourAction, this.getImprovementNameForAction(neighbourAction), neighbour, true);
			this.addLogMessage("Passage up ready in sector " + s);
		},
        
        buildTrap: function() {
            this.buildImprovement("build_out_collector_food", this.getImprovementNameForAction("build_out_collector_food"));
            this.addLogMessage("Built a trap. It will catch food.");
        },
        
        buildBucket: function() {
            this.buildImprovement("build_out_collector_water", this.getImprovementNameForAction("build_out_collector_water"));
            this.addLogMessage("Made a bucket. It will collect water.");
        },
        
        buildHouse: function(automatic) {
            this.buildImprovement("build_in_house", this.getImprovementNameForAction("build_in_house"), null, automatic);
            if (!automatic && this.checkAvailability("build_in_house")) {
                var msg = "Built a house.";
                var totalHouses = 0;
                for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
                    var improvementsComponent = node.entity.get(SectorImprovementsComponent);
                    totalHouses += improvementsComponent.getCount(improvementNames.house);
                }
                if (totalHouses < 5) msg += " People will come if they hear about the camp.";
                this.addLogMessage(msg);
            }
        },
        
        buildHouse2: function() {
            this.buildImprovement("build_in_house2", this.getImprovementNameForAction("build_in_house2"));
            if (this.checkAvailability("build_in_house2")) {
                var msg = "Built a tower block.";
                this.addLogMessage(msg);
            }            
        },
        
        buildLights: function() {
            this.buildImprovement("build_in_lights", this.getImprovementNameForAction("build_in_lights"));
            if (this.checkAvailability("build_in_lights")) {
                var msg = "Installed lights to the camp.";
                this.addLogMessage(msg);
            }            
        },
        
        buildCeiling: function() {
            this.buildImprovement("build_in_ceiling", this.getImprovementNameForAction("build_in_ceiling"));
            if (this.checkAvailability("build_in_ceiling")) {
                var msg = "Build a big tent to protect the camp from the sun.";
                this.addLogMessage(msg);
            }   
        },
        
        buildStorage: function(automatic, sector) {
            this.buildImprovement("build_in_storage", this.getImprovementNameForAction("build_in_storage"), null, automatic);
            if (!automatic) {
                this.addLogMessage("Built a storage.");
            }            
        },
        
        buildFortification: function() {
            this.buildImprovement("build_in_fortification", this.getImprovementNameForAction("build_in_fortification"));
            this.addLogMessage("Fortified the camp.");
        },
        
        buildBarracks: function() {
            this.buildImprovement("build_in_barracks", this.getImprovementNameForAction("build_in_barracks"));
            this.addLogMessage("Built a barracks.");            
        },
        
        buildSmithy: function() {
            this.buildImprovement("build_in_smithy", this.getImprovementNameForAction("build_in_smithy"));
            this.addLogMessage("Built a smithy.");            
        },
        
        buildApothecary: function() {
            this.buildImprovement("build_in_apothecary", this.getImprovementNameForAction("build_in_apothecary"));
            this.addLogMessage("Built an apothecary.");            
        },
        
        buildCementMill: function() {
            this.buildImprovement("build_in_cementmill", this.getImprovementNameForAction("build_in_cementmill"));
            this.addLogMessage("Built a cement mill for making concrete.");            
        },
        
        buildRadioTower: function() {
            this.buildImprovement("build_in_radio", this.getImprovementNameForAction("build_in_radio"));
            this.addLogMessage("Built a radio tower.");             
        },
        
        buildCampfire: function() {
            this.buildImprovement("build_in_campfire", this.getImprovementNameForAction("build_in_campfire"));
            this.addLogMessage("Built a campfire. Here, ideas are shared and discussed.");
        },
        
        buildDarkFarm: function() {
            this.buildImprovement("build_in_darkfarm", this.getImprovementNameForAction("build_in_darkfarm"));
            this.addLogMessage("Built a snail farm.");
        },
        
        buildHospital: function() {
            this.buildImprovement("build_in_hospital", this.getImprovementNameForAction("build_in_hospital"));
            this.addLogMessage("Built a hospital.");
        },
        
        buildLibrary: function() {
            this.buildImprovement("build_in_library", this.getImprovementNameForAction("build_in_library"));
            this.addLogMessage("Built a library.");            
        },
        
        buildMarket: function() {
            this.buildImprovement("build_in_market", this.getImprovementNameForAction("build_in_market"));
            this.addLogMessage("Built a market."); 
        },
        
        buildTradingPost: function() {
            this.buildImprovement("build_in_tradingPost", this.getImprovementNameForAction("build_in_tradingPost"));
            this.addLogMessage("Build a trading post.");
        },
        
        buildInn: function() {
            this.buildImprovement("build_in_inn", this.getImprovementNameForAction("build_in_inn"));
            this.addLogMessage("Build an inn. Maybe it will attract adventurers.");            
        },
        
        buildBridge: function() {
            if (this.checkAvailability("build_out_bridge"), true) {
                var sector = this.playerLocationNodes.head.entity;
                var positionComponent = sector.get(PositionComponent);
                var passagesComponent = sector.get(PassagesComponent);
                var isLeft = passagesComponent.isLeftBridgeable();
                var isRight = passagesComponent.isRightBridgeable();
                
                if (isLeft && isRight) {
                    console.log("WARN: Both left and right bridgeable.");
                    return;
                }
                
                if (!isLeft && !isRight) {
                    console.log("WARN: Trying to build a bridge but there's nothing to bridge.");
                    return;
                }
                
                // Find neighbours
                var neighbour = this.levelHelper = getSectorByPosition(
					positionComponent.level,
					isLeft ? positionComponent.sector - 1 : positionComponent.sector + 1
				);
                
                var neighbourPassagesComponent = neighbour.get(PassagesComponent);
                var neighbourBlockedLeft = neighbourPassagesComponent.isLeftBridgeable();
                var neighbourBlockedRight = neighbourPassagesComponent.isRightBridgeable();
                
                if ((isLeft && !neighbourBlockedRight) || (isRight && !neighbourBlockedLeft)) {
                    console.log("WARN: Trying to build bridge but neighbour doesn't match.");
                    return;
                }
                
                this.buildImprovement("build_out_bridge", this.getImprovementNameForAction("build_out_bridge"));
                this.buildImprovement("build_out_bridge", this.getImprovementNameForAction("build_out_bridge"), neighbour, true);
            }
        },
        
        collectFood: function() {
            this.collectCollector("use_out_collector_food", "collector_food");
        },
        
        collectWater: function() {
            this.collectCollector("use_out_collector_water", "collector_water");
        },
        
        useCampfire: function() {            
            var campSector = this.nearestCampNodes.head.entity;
            var campComponent = campSector.get(CampComponent);
            if(this.checkAvailability("use_in_campfire", true) && campSector) {
                this.deductCosts("use_in_campfire");
                if (campComponent.rumourpool >= 1) {
                    campComponent.rumourpool--;
                    this.playerStatsNodes.head.rumours.value++;
                    this.addLogMessage("Sat at the campfire to exchange stories about the corridors.");    
                } else {
                    this.addLogMessage("Sat at the campfire to exchange stories, but there was nothing new.");   
		    campComponent.rumourpoolchecked = true;
                }
            }    
            this.forceResourceBarUpdate();
        },
        
        useHospital: function(automatic) {
            if(automatic || this.checkAvailability("use_in_hospital", true)) {
                this.deductCosts("use_in_hospital");
                
                var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
                perksComponent.removeItemsByType(PerkConstants.perkTypes.injury);
                this.addLogMessage("Healed all injuries.");            
            }    
            this.forceResourceBarUpdate();
            this.gameState.unlockedFeatures.fight = true;
        },
        
        useInn: function() {
            if (this.checkAvailability("use_in_inn", true)) {                
                // TODO add varied results depending on follower
                var sector = this.playerLocationNodes.head.entity;
                var positionComponent = sector.get(PositionComponent);
                var levelOrdinal = this.gameState.getLevelOrdinal(positionComponent.level);
                var follower = ItemConstants.getFollower(positionComponent.level, levelOrdinal);
                var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
                var currentFollowers = itemsComponent.getCountByType(ItemConstants.itemTypes.follower);
                if (currentFollowers < FightConstants.getMaxFollowers(this.gameState.numCamps)) {
                    this.deductCosts("use_in_inn");
                    this.addFollower(follower);
                } else {
                    var oldFollower = itemsComponent.getWeakestByType(ItemConstants.itemTypes.follower);
                    var oldFollowerLi = UIConstants.getItemLI(oldFollower);
                    var newFollowerLi = UIConstants.getItemLI(follower);
                    var playerActions = this;
                    this.uiFunctions.showConfirmation(
                        "<p>Do you want to invite this new follower to join your party? Someone else will have to leave to make room.</p>" +
                        "Joining:<br/>" +
                        "<ul class='resultlist' id='inn-follower-list-join'>" + newFollowerLi + "</ul><br/>" +
                        "Leaving:<br/>" +
                        "<ul class='resultlist' id='inn-follower-list-leave'>" + oldFollowerLi + "</ul><br/>",
                        function() {
                            playerActions.deductCosts("use_in_inn");
                            itemsComponent.discardItem(oldFollower);
                            playerActions.addFollower(follower);
                    });
                    this.uiFunctions.generateCallouts("#inn-follower-list-join");
                    this.uiFunctions.generateCallouts("#inn-follower-list-leave");
                }
            }
        },
        
        addFollower: function(follower) {
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            itemsComponent.addItem(follower);                    
            this.addLogMessage("A wanderer agrees to travel together for awhile.");
            this.forceResourceBarUpdate();
            this.forceStatsBarUpdate();
            this.save();   
        },
        
        craftLight: function() {
            this.craftItem("craft_light");
        },
        
        craftWeapon: function() {
            this.craftItem("craft_weapon");
            this.gameState.unlockedFeatures.fight = true;
        },
        
        craftItem: function(actionName) {            
            if (this.checkAvailability(actionName, true)) {                
                this.deductCosts(actionName);
                
                var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
                var item = this.getItemForAction(actionName);
                itemsComponent.addItem(item.clone());
                           
                this.addLogMessage("Crafted " + item.name);
                this.forceResourceBarUpdate();
                this.save();
            }
        },
        
        buyUpgrade: function(upgradeId) {
            if(this.checkAvailability(upgradeId, true)) {
                this.deductCosts(upgradeId);
                this.tribeUpgradesNodes.head.upgrades.addUpgrade(upgradeId);
                this.save();
            }
        },
        
        collectCollector: function(actionName, improvementName) {
            if(this.checkAvailability(actionName, true)) {
                this.deductCosts(actionName);
                var currentStorage = this.resourcesHelper.getCurrentStorage(true);
                
                var sector = this.playerLocationNodes.head.entity;
                var improvementsComponent = sector.get(SectorImprovementsComponent);
                var improvementVO = improvementsComponent.getVO(improvementNames[improvementName]);
                var resourcesVO = improvementVO.storedResources;
                
                var totalCollected = 0;                
                for(var key in resourceNames) {
                    var name = resourceNames[key];
                    var amount = resourcesVO.getResource(name);
                    if (amount >= 1) {
                        currentStorage.resources.addResource(name, amount);
                        totalCollected += amount;
                    }
                }
                
                if (totalCollected > 0) {
                    resourcesVO.reset(); 
                }
                else
                {
                    this.addLogMessage("Nothing to collect yet.");                             
                }
                
                this.forceResourceBarUpdate();
            }            
        },
        
        buildImprovement: function(actionName, improvementName, otherSector, isFree) {
            var sector = otherSector || this.playerLocationNodes.head.entity;
            if (isFree || this.checkAvailability(actionName, true, sector)) {
                if(typeof isFree == "undefined" || !isFree) this.deductCosts(actionName);
                
                var improvementsComponent = sector.get(SectorImprovementsComponent);
                improvementsComponent.add(improvementName);
                
                this.improvementBuiltSignal.dispatch();
                this.forceResourceBarUpdate();                
                this.save();
            }            
        },
        
        assignWorkers: function(scavengers, trappers, waters, ropers, chemists, apothecaries, smiths, concrete, soldiers) {
            var camp = null;
	    for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
                if (node.entity.get(PositionComponent).level == this.playerPositionNodes.head.position.level) {
                    camp = node.camp;    
                }
            }
            
            if (camp) {
                camp.assignedWorkers.scavenger = scavengers;   
                camp.assignedWorkers.trapper = trappers;   
                camp.assignedWorkers.water = waters;   
                camp.assignedWorkers.ropemaker = ropers;
                camp.assignedWorkers.chemist = chemists;
                camp.assignedWorkers.apothecary = apothecaries;
                camp.assignedWorkers.toolsmith = smiths;
                camp.assignedWorkers.concrete = concrete;
                camp.assignedWorkers.soldier = soldiers;
            }
            else {
                console.log("WARN: No camp found for worker assignment.");
            }
        },
        
        getItemForAction: function(actionName) {
            switch (actionName) {
                case "craft_light":
                    return ItemConstants.itemDefinitions.light[0];
                
                case "craft_weapon":
                    return ItemConstants.itemDefinitions.weapon[0];
                
                default: return null;
            }    
        },
        
        deductCosts: function(action) {
            var costs = PlayerActionConstants.getCosts(action, this.getOrdinal(action), this.getCostFactor(action)); 
            
            if (!costs) {
                return;
            }
            
	    var currentStorage = this.resourcesHelper.getCurrentStorage(true);
            
            if (costs.stamina) {
                this.playerStatsNodes.head.stamina.stamina -= costs.stamina;
            }
            
            if (costs.resource_metal) {
                currentStorage.resources.metal -= costs.resource_metal;
            }
            
            if (costs.resource_fuel) {
                currentStorage.resources.fuel -= costs.resource_fuel;
            }
            
            if (costs.resource_rope) {
                currentStorage.resources.rope -= costs.resource_rope;
            }
            
            if (costs.resource_water) {
                currentStorage.resources.water -= costs.resource_water;
            }
            
            if (costs.resource_food) {
                currentStorage.resources.food -= costs.resource_food;
            }
                
            if(costs.rumours) {
                this.playerStatsNodes.head.rumours.value -= costs.rumours;
            }
                
            if(costs.evidence) {
                this.playerStatsNodes.head.evidence.value -= costs.evidence;
            }
        },
        
        // Check both costs and requirements - everything that is needed for the player action
        checkAvailability: function(action, log, otherSector) {
            if (this.checkRequirements(action, log, otherSector).value < 1) return false;
            if(this.checkCosts(action, log, otherSector) < 1) return false;
            
            return true;
        },
        
        // Check requirements (not costs) of an action
        // returns an object containing:
        // value: fraction the player has of requirements or 0 depending on req type (if 0, action is not available)
        // reason: string to describe the non-passed requirement (for button explanations)
        checkRequirements: function(action, log, otherSector) {
            var playerVision = this.playerStatsNodes.head.vision.value;
            var playerResources = this.resourcesHelper.getCurrentStorage(false).resources;
            var playerItems = this.playerResourcesNodes.head.entity.get(ItemsComponent);
            var playerPerks = this.playerResourcesNodes.head.entity.get(PerksComponent);
            var deityComponent = this.playerResourcesNodes.head.entity.get(DeityComponent);
            
            var sector = otherSector || this.playerLocationNodes.head.entity;            
            if (!sector) return { value: 0, reason: "No selected sector" };
            
            var requirements = PlayerActionConstants.getReqs(action);
            var improvementComponent = sector.get(SectorImprovementsComponent);
            var movementOptionsComponent = sector.get(MovementOptionsComponent);
            var passagesComponent = sector.get(PassagesComponent);
            var campComponent = sector.get(CampComponent);
            var featuresComponent = sector.get(SectorFeaturesComponent);
            var statusComponent = sector.get(SectorStatusComponent);
            
            var lowestFraction = 1;
            var reason = "";
            
            if (action == "move_level_up" && !movementOptionsComponent.canMoveUp)
                return { value: 0, reason: "Blocked. " + movementOptionsComponent.cantMoveUpReason };
            if (action == "move_level_down" && !movementOptionsComponent.canMoveDown)
                return { value: 0, reason: "Blocked. " + movementOptionsComponent.cantMoveDownReason };
            
            if (requirements) {                    
                if (requirements.vision) {
                    if (playerVision < requirements.vision) {
                        if(log) console.log("WARN: Not enough vision to perform action [" + action + "]");
                        reason = requirements.vision + " vision needed.";
                        lowestFraction = Math.min(lowestFraction, playerVision / requirements.vision);
                    }
                }
                
                if (requirements.stamina) {
                    var playerStamina = this.playerStatsNodes.head.stamina.stamina;
                    if (playerStamina < requirements.stamina) {
                        if(log) console.log("WARN: Not enough stamina to perform action [" + action + "]");
                        lowestFraction = Math.min(lowestFraction, playerStamina / requirements.stamina);
                    }
                }
                
                if (requirements.health) {
                    var playerHealth = this.playerStatsNodes.head.stamina.health;
                    if (playerHealth < requirements.health) {
                        if(log) console.log("WARN: Not enough health to perform action [" + action + "]");
                        lowestFraction = Math.min(lowestFraction, playerHealth / requirements.health);
                    }
                }
                
                if (typeof requirements.sunlit != "undefined") {
                    var currentValue = featuresComponent.sunlit;
                    var requiredValue = requirements.sunlit;
                    if (currentValue !== requiredValue) {
                        if (currentValue) reason = "Sunlight not allowed.";
                        else reason = "Sunlight required.";
                        if (log) console.log("WARN: " + reason);
                        return { value: 0, reason: reason };
                    }
                }
                
                if (requirements.deity) {
                    if (!deityComponent) {
                        return { value: 0, reason: "Deity required." };
                    }
                }
                
                if (typeof requirements.rumourpoolchecked != "undefined") {
                    if (sector.has(CampComponent)) {
                        var campValue = sector.get(CampComponent).rumourpoolchecked;
                        if (requirements.rumourpoolchecked != campValue) {
                            if (!requirements.rumourpoolchecked) reason = "No new rumours at the moment.";
                            if (requirements.rumourpoolchecked) reason = "There are new rumours.";
                            return { value: 0, reason: reason };
                        }
                    }
                }
                
                if (requirements.population) {
                    var min = requirements.population[0];
                    var max = requirements.population[1];
                    if (max < 0) max = 9999999;
                    var currentPopulation = campComponent ? campComponent.population : 0;
                    if (currentPopulation < min || currentPopulation > max) {
                        if (currentPopulation < min) reason = min + " population required.";
                        if (currentPopulation > max) reason = "Maximum " + max + " population.";
                        return { value: 0, reason: reason };
                    }
                }
				
				if (requirements.numCamps) {
					var currentCamps = this.gameState.numCamps;
					if (requirements.numCamps > currentCamps) {
						reason = requirements.numCamps + " camps required.";
                        return { value: currentCamps / requirements.numCamps, reason: reason };						
					}
				}
                
                if (requirements.improvements) {
                    var improvementRequirements = requirements.improvements;
                    
                    for(var improvName in improvementRequirements)
                    {
                        var requirementDef = improvementRequirements[improvName];
                        var min = requirementDef[0];
                        var max = requirementDef[1];
                        if (max < 0) max = 9999999;
                        
                        var amount = 0;                        
                        switch(improvName)
                        {                            
                            case "camp":
								for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
                                if (node.entity.get(PositionComponent).level == this.playerPositionNodes.head.position.level)
                                        amount++;
                                }
                                break;
                           
                            case "passageUp":
                                amount =
                                    improvementComponent.getCount(improvementNames.passageUpStairs) +
                                    improvementComponent.getCount(improvementNames.passageUpElevator) +
                                    improvementComponent.getCount(improvementNames.passageUpHole);
                                break;
                            
                            case "passageDown":
                                amount =
                                    improvementComponent.getCount(improvementNames.passageDownStairs) +
                                    improvementComponent.getCount(improvementNames.passageDownElevator) +
                                    improvementComponent.getCount(improvementNames.passageDownHole);
                                break;
                            
                            default:
                                var name = improvementNames[improvName];
                                amount = improvementComponent.getCount(name);
                                break;
                        }
            
                        if (min > amount || max <= amount) {
                            var improvementName = this.getImprovementNameForAction(action, true);
                            if (min > amount) reason = "Improvement required";
                            else reason = "Improvement already exists";
                            reason += ": " + min + "x " + improvName;
                            if(log) console.log("WARN: " + reason);
                            if (min > amount) return { value: amount/min, reason: reason };
                            else return { value: 0, reason: reason };
                        }
                    }
                }

                if (requirements.perks) {
                    var perkRequirements = requirements.perks;
                    for(var perkName in perkRequirements)
                    {
                        var requirementDef = perkRequirements[perkName];
                        var min = requirementDef[0];
                        var max = requirementDef[1];
                        if (max < 0) max = 9999999;
                        var totalEffect = playerPerks.getTotalEffect(perkName);
                        if (min > totalEffect || max <= totalEffect) {
                            if (min > totalEffect) reason = "Perk required: " + perkName;
                            if (max <= totalEffect) reason = "Perk required: " + perkName;
                            if(log) console.log("WARN: " + reason);
                            return { value: 0, reason: reason };
                        }
                    }
                }
                
                if (requirements.upgrades) {
                    var upgradeRequirements = requirements.upgrades;
                    for (var upgradeId in upgradeRequirements) {
                        var requirementBoolean = upgradeRequirements[upgradeId];
                        var hasBoolean = this.tribeUpgradesNodes.head.upgrades.hasBought(upgradeId);
                        if (requirementBoolean != hasBoolean) {
                            if (requirementBoolean) reason = "Upgrade required: " + upgradeId;
                            else reason = "Upgrade already researched (" + upgradeId + ")";
                            if (log) console.log("WARN: " + reason);
                            return { value: 0, reason: reason } ; 
                        }
                    }
                }
                
                if (requirements.sector) {                    
                    if (requirements.sector.canHaveCamp) {
                        if (!featuresComponent.canHaveCamp()) {
                            if (log) console.log("WARN: Location not suitabe for camp.");
                            return { value: 0, reason: "Location not suitable for camp" };
                        }
                    }
                    if (typeof requirements.sector.control != "undefined") {
                        var sectionControl = sector.get(SectorControlComponent).hasControl();
                        if (sectionControl != requirements.sector.control) {
                            if (log) console.log("WARN: Sector control required / not allowed");
                            return { value: 0, reason: "Sector control required / not allowed" };
                        }
                    }
                    if (typeof requirements.sector.enemies != "undefined") {
                        var enemiesComponent = sector.get(EnemiesComponent);
                        if ((enemiesComponent.possibleEnemies.length > 0) != requirements.sector.enemies) {
                            if (log) console.log("WARN: Sector enemies required / not allowed");
                            return { value: 0, reason: "Sector enemies required / not allowed" };
                        }
                    }
                    if (typeof requirements.sector.scouted != "undefined") {
                        if (statusComponent.scouted != requirements.sector.scouted) {
                            if (statusComponent.scouted)    reason = "Area already scouted.";
                            else                            reason = "Area not scouted yet.";
                            if (log) console.log("WARN: " + reason);
                            return { value: 0, reason: reason };
                        }
                    }
                    if (typeof requirements.sector.blockerLeft != 'undefined') {
                        if (!movementOptionsComponent.canMoveLeft) {
                            if (log) console.log("WARN: Movement to left blocked.");
                            return { value: 0, reason: "Blocked. " + movementOptionsComponent.cantMoveLeftReason };
                        }
                    }
					
                    if (typeof requirements.sector.blockerRight != 'undefined') {
                        if (!movementOptionsComponent.canMoveRight) {
                            if (log) console.log("WARN: Movement to right blocked.");
                            return { value: 0, reason: "Blocked. " + movementOptionsComponent.cantMoveRightReason };
                        }
                    }					
					
                    if (typeof requirements.sector.passageUp != 'undefined') {
                        if (!passagesComponent.passageUp) {
							reason = "No passage up.";
                            if (log) console.log("WARN: " + reason);
                            return { value: 0, reason: "Blocked. " + reason };
                        } else {
                            var requiredType = parseInt(requirements.sector.passageUp);
                            if (requiredType > 0) {
                                var existingType = passagesComponent.passageUp.type;
                                if (existingType != requiredType) {
                                    reason = "Wrong passage type.";
                                    if (log) console.log("WARN: " + reason);
                                    return { value: 0, reason: "Blocked. " + reason };
                                }
                            }                            
                        }
                    }
                    if (typeof requirements.sector.passageDown != 'undefined') {
                        if (!passagesComponent.passageDown) {
							reason = "No passage down.";
                            if (log) console.log("WARN: " + reason);
                            return { value: 0, reason: "Blocked. " + reason };
                        } else {
                            var requiredType = parseInt(requirements.sector.passageDown);
                            if (requiredType > 0) {
                                var existingType = passagesComponent.passageDown.type;
                                if (existingType != requiredType) {
                                    reason = "Wrong passage type.";
                                    if (log) console.log("WARN: " + reason);
                                    return { value: 0, reason: "Blocked. " + reason };
                                }
                            }                            
                        }
                    }
                    
                    if (typeof requirements.sector.collected_food != "undefined") {                      
                        var collector = improvementComponent.getVO(improvementNames.collector_food);
                        var requiredStorage = requirements.sector.collected_food;
                        var currentStorage = collector.storedResources.getResource(resourceNames.food);
                        if (currentStorage < requiredStorage) {
                            if (log) console.log("WARN: Not enough stored resources in collectors.");
                            lowestFraction = Math.min(lowestFraction, currentStorage / requiredStorage);
                        }
                    }
                    
                    if (typeof requirements.sector.collected_water != "undefined") {                          
                        var collector = improvementComponent.getVO(improvementNames.collector_water);
                        var requiredStorage = requirements.sector.collected_water;
                        var currentStorage = collector.storedResources.getResource(resourceNames.water);
                        if (currentStorage < requiredStorage) {
                            if (log) console.log("WARN: Not enough stored resources in collectors.");
                            lowestFraction = Math.min(lowestFraction, currentStorage / requiredStorage);
                        }
                    }
                }
                
                return { value: lowestFraction, reason: reason };
            }
            
            return { value: 1 };
        },
        
        // Check the costs of an action; returns lowest fraction of the cost player can cover; >1 means the action is available
        checkCosts: function(action, log, otherSector) {            
            var costs = PlayerActionConstants.getCosts(action, this.getOrdinal(action), this.getCostFactor(action));
            if (costs) {
                var currentFraction = 1;
                var lowestFraction = currentFraction;
                for(var key in costs) {
                    currentFraction = this.checkCost(action, key, otherSector);
                    if (currentFraction < lowestFraction) {
                        if(log) console.log("WARN: Not enough " + key + " to perform action [" + action + "]");
                        lowestFraction = currentFraction;
                    }
                }
                return lowestFraction;                
            }
            
            return 1;
        },
        
        // Check if player can afford a cost; returns fraction of the cost the player can cover; >1 means ok
        checkCost: function(action, name, otherSector) {
            var playerVision = this.playerStatsNodes.head.vision.value;
            var playerStamina = this.playerStatsNodes.head.stamina.stamina;
            var playerResources = this.resourcesHelper.getCurrentStorage(false);
            
            var sector = otherSector || (this.playerLocationNodes.head && this.playerLocationNodes.head.entity);
            if (!sector) return false;
            
            var costs = PlayerActionConstants.getCosts(action, this.getOrdinal(action), this.getCostFactor(action));
            switch(name) {
                case "stamina":
                    return (playerStamina / costs.stamina);
                
                case "resource_metal":
                    return (playerResources.resources.metal / costs.resource_metal);
                
                case "resource_fuel":
                    return (playerResources.resources.fuel / costs.resource_fuel);  
                
                case "resource_rope":
                    return (playerResources.resources.rope / costs.resource_rope);   
                
                case "resource_water":
                    return (playerResources.resources.water / costs.resource_water);
                
                case "resource_food":
                    return (playerResources.resources.food / costs.resource_food);
                
                case "rumours":
                    return (this.playerStatsNodes.head.rumours.value / costs.rumours);
                
                case "evidence":
                    return (this.playerStatsNodes.head.evidence.value / costs.evidence);
                    
                default: return 1;
            }
        },
        
        getNearestCampName: function() {
            var campSector = this.nearestCampNodes.head.entity;
            if (campSector) {
                return campSector.get(CampComponent).campName;
            } else {
                return "";
            }
        },
        
        setNearestCampName: function(newName) {
            var campSector = this.nearestCampNodes.head.entity;
            if (campSector) {
                campSector.get(CampComponent).campName = newName;
                this.save();
            }
        },
        
        // Return the ordinal of the action (for example, if the player has 2 houses and wants to build another one, it's 3)
        getOrdinal: function(action) {
            if (!this.playerLocationNodes) {
				return 1;
			}
            if (!action) return 1;
            
            var sector = this.playerLocationNodes.head.entity;
            var playerPos = sector.get(PositionComponent);
            
            if (action.indexOf("build_in") >= 0) {
                    var improvementName = this.getImprovementNameForAction(action);
                    var improvementsComponent = sector.get(SectorImprovementsComponent);
                    return improvementsComponent.getCount(improvementName) + 1;
            }
                
            switch(action) {
                case "use_in_inn":
                    var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
                    return itemsComponent.getEquipped(ItemConstants.itemTypes.follower).length;
                
                case "build_out_passage_up":
                case "build_out_passage_down":
                    var level = action == "build_out_passage_up" ? playerPos.level + 1 : playerPos.level - 1;
                    return this.gameState.getLevelOrdinal(level);
                
                default: return 1;
            }
        },
        
        // Returns the cost factor of a given action, usually 1, but may depend on the current status for some actions
        getCostFactor: function(action) {
            if (!this.playerLocationNodes) return 1;
            
            var sector = this.playerLocationNodes.head.entity;
            var passageComponent = sector.get(PassagesComponent);
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            var items = itemsComponent.getEquipped(ItemConstants.itemTypes.shoes);
            
            var factor = 1;
            switch(action) {
                case "move_level_down":
                    factor += passageComponent.passageDown && passageComponent.passageDown.climbable ? 2 : 0;
                    if (items.length > 0) factor *= items[0].bonus;
                    break;
                
                case "move_level_up":
                    factor += passageComponent.passageUp && passageComponent.passageUp.climbable ? 2 : 0;
                    if (items.length > 0) factor *= items[0].bonus;
                    break;
                
                case "move_sector_left":
                case "move_sector_right":
                case "move_camp_level":
                case "move_camp_global":
                    if (items.length > 0) factor *= items[0].bonus;                    
                    break;
            }
            
            return factor;
        },
        
        getImprovementNameForAction: function(action, disableWarnings)
        {            
            switch(action) {
                case "build_out_collector_food": return improvementNames.collector_food;
                case "build_out_collector_water": return improvementNames.collector_water;
                case "build_in_house": return improvementNames.house;
                case "build_in_storage": return improvementNames.storage;
                case "build_in_hospital": return improvementNames.hospital;
                case "build_in_tradingPost": return improvementNames.tradepost;
                case "build_in_inn": return improvementNames.inn;
                case "build_out_bridge": return improvementNames.bridge;
                case "build_in_campfire": return improvementNames.campfire;
                case "build_in_darkfarm": return improvementNames.darkfarm;
                case "build_in_house2": return improvementNames.house2;
                case "build_in_lights": return improvementNames.lights;
                case "build_in_ceiling": return improvementNames.ceiling;
                case "build_in_apothecary": return improvementNames.apothecary;
                case "build_in_smithy": return improvementNames.smithy;
                case "build_in_cementmill": return improvementNames.cementmill;
                case "build_in_library": return improvementNames.library;
                case "build_in_shrine": return improvementNames.shrine;
                case "build_in_barracks": return improvementNames.barracks;
                case "build_in_fortification": return improvementNames.fortification;
                case "build_in_market": return improvementNames.market;
                case "build_in_radio": return improvementNames.radiotower;
                case "build_in_researchcenter": return improvementNames.researchcenter;
                case "build_out_passage_up_stairs": return improvementNames.passageUpStairs;
                case "build_out_passage_up_elevator": return improvementNames.passageUpElevator;
                case "build_out_passage_up_hole": return improvementNames.passageUpHole;
                case "build_out_passage_down_stairs": return improvementNames.passageDownStairs;
                case "build_out_passage_down_elevator": return improvementNames.passageDownElevator;
                case "build_out_passage_down_hole": return improvementNames.passageDownHole;
                case "build_out_camp": return "";
                
                default:
                    if(!disableWarnings) console.log("WARN: No improvement name found for action " + action);
                    return "";
            }
        },
        
        forceResourceBarUpdate: function() {
            var system = this.engine.getSystem(UIOutHeaderSystem);
            system.lastUpdateTimeStamp = 0;   
        },
        
        forceStatsBarUpdate: function() {
            var system = this.engine.getSystem(UIOutHeaderSystem);
            system.updateItems(true);
            system.updatePerks(true);
            system.updatePlayerStats(true);
            system.updateDeity(true);
        },
        
        forceTabUpdate: function() {
            var system = this.engine.getSystem(UIOutElementsSystem);
            system.updateTabVisibility();
        },
        
        save: function() {
            var saveSystem = this.engine.getSystem(SaveSystem);
            saveSystem.save();
        },
        
        cheat: function(input) {
			var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            var inputParts = input.split(" ");
            var name = inputParts[0];
            switch(name) {
				case "res":
                    var playerResources = this.resourcesHelper.getCurrentStorage(true).resources;
                    var storageCap = this.resourcesHelper.getCurrentStorageCap();
                    for(var key in resourceNames) {
                        var name = resourceNames[key];
                        if(this.gameState.unlockedFeatures.resources[name])
                            playerResources.setResource(name, storageCap);
                    }
                    this.forceResourceBarUpdate();
					break;
                
                case "stat":                    
                    this.playerStatsNodes.head.stamina.stamina = this.playerStatsNodes.head.stamina.health;
                    this.playerStatsNodes.head.vision.value = 75;
                    this.playerStatsNodes.head.rumours.value += 5;
                    this.playerStatsNodes.head.evidence.value += 5;
                    break;
                
                case "vision":                    
                    this.playerStatsNodes.head.vision.value = parseInt(inputParts[1]);
                    break;
                
				case "pop":
                    var camp = currentSector.get(CampComponent);
					if (inputParts.length > 1) {
						var pop = parseInt(inputParts[1]);
						camp.setPopulation(pop);
					} else {
						camp.addPopulation(5);
					}
					break;
                
                case "pos":                    
                    var playerPos = this.playerPositionNodes.head.position;
                    playerPos.level = inputParts[1];
                    playerPos.sector = inputParts[2];
                    break;
                
                case "camp":
                    this.cheat("res");
                    this.craftLight();
                    itemsComponent.addItem(ItemConstants.itemDefinitions.bag[0].clone());
                    this.cheat("stat");
                    this.playerPositionNodes.head.position.level = 13;
                    this.playerPositionNodes.head.position.sector = 3;
                    this.scout();
                    this.engine.updateComplete.addOnce(function() {
                        this.cheat("res");
                        this.scout();
                        this.buildCamp();
                        this.engine.updateComplete.addOnce(function() {
                            this.cheat("res");
                            this.buildHouse();
                            this.engine.updateComplete.addOnce(function() {
                                this.cheat("pop");
                                this.cheat("heal");
                            }, this);
                        }, this);
                        
                    }, this);
                    break;
                
                case "2camp":
                    break;
                
                case "heal":
                    this.useHospital(true);
                    break;
                
                case "injury":
                    var defaultInjury = PerkConstants.perkDefinitions.injury[0];
                    var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
                    perksComponent.addPerk(defaultInjury.clone());
                    break;
                
                case "building":
                    var name = inputParts[1];
                    var amount = parseInt(inputParts[2]);
                    var sector = this.playerLocationNodes.head.entity;                
                    var improvementsComponent = sector.get(SectorImprovementsComponent);
                    improvementsComponent.add(name, amount);                    
                    break;
                
                case "item":
                    var itemID = inputParts[1];
                    var item = ItemConstants.getItemByID(itemID);
                    if (item) {
                        itemsComponent.addItem(item);                       
                    } else {
                        console.log("WARN: No such item: " + itemID);
                    }
                    break;
            }
        }
    });

    return PlayerActions;
});