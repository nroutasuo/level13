// Functions to handle cheats, either from the console or UI
define(['ash',
    'game/constants/GameConstants',
    'game/constants/CheatConstants',
    'game/constants/ItemConstants',
    'game/constants/PerkConstants',
    'game/constants/UpgradeConstants',
    'game/components/common/CampComponent',
    'game/components/player/AutoPlayComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode'
], function (Ash,
    GameConstants,
    CheatConstants,
    ItemConstants,
    PerkConstants,
    UpgradeConstants,
    CampComponent,
    AutoPlayComponent,
    ItemsComponent,
    PerksComponent,
    EnemiesComponent,
    SectorImprovementsComponent,
    SectorFeaturesComponent,
    PlayerStatsNode,
    PlayerPositionNode,
    PlayerLocationNode
) {
    var CheatSystem = Ash.System.extend({
        
        constructor: function (gameState, playerActionFunctions, resourcesHelper, uiMapHelper) {
            this.gameState = gameState;
            this.playerActionFunctions = playerActionFunctions;
            this.resourcesHelper = resourcesHelper;
            this.uiMapHelper = uiMapHelper;
        },

        addToEngine: function (engine) {
            this.engine = engine;
            this.engine.extraUpdateTime = 0;
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
        },

        applyCheat: function (input) {
            if (!GameConstants.isCheatsEnabled) return; 
            
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;

            var inputParts = input.split(" ");
            var name = inputParts[0];
            switch (name) {
                case CheatConstants.CHEAT_NAME_SPEED:
                    var spd = parseFloat(inputParts[1]);
                    this.setGameSpeed(spd);
                    break;

                case CheatConstants.CHEAT_NAME_AUTOPLAY:
                    var param1 = inputParts[1];
                    var param2 = parseInt(inputParts[2]);
                    this.setAutoPlay(param1, param2);
                    break;
                    
                case CheatConstants.CHEAT_NAME_TIME:
                    var mins = parseFloat(inputParts[1]);
                    this.passTime(mins);
                    break;

                case CheatConstants.CHEAT_NAME_RES:
                    var name = inputParts[1];
                    var amount = 0;
                    if (inputParts.length > 2) {
                        amount = parseInt(inputParts[2]);
                    } else {
                        amount = this.resourcesHelper.getCurrentStorageCap() / unlockedResources;
                    }
                    this.setResource(name, amount);
                    break;

                case CheatConstants.CHEAT_NAME_SUPPLIES:
                    this.addSupplies();
                    break;

                case CheatConstants.CHEAT_NAME_VISION:
                    this.playerStatsNodes.head.vision.value = parseInt(inputParts[1]);
                    break;

                case CheatConstants.CHEAT_NAME_EVIDENCE:
                    this.playerStatsNodes.head.evidence.value = parseInt(inputParts[1]);
                    break;


                case CheatConstants.CHEAT_NAME_POPULATION:
                    var amount = 1;
                    if (inputParts.length > 1) {
                        amount = parseInt(inputParts[1]);
                    }
                    this.addPopulation(amount);
                    break;

                case CheatConstants.CHEAT_NAME_POS:
                    this.setPlayerPosition(parseInt(inputParts[1]), parseInt(inputParts[2]), parseInt(inputParts[3]));
                    break;
                case CheatConstants.CHEAT_NAME_HEAL:
                    this.heal();
                    break;

                case CheatConstants.CHEAT_NAME_INJURY:
                    this.addInjury();
                    break;

                case CheatConstants.CHEAT_NAME_BUILDING:
                    var buildingName = inputParts[1];
                    var buildingAmount = parseInt(inputParts[2]);
                    this.addBuilding(buildingName, buildingAmount);
                    break;

                case CheatConstants.CHEAT_NAME_TECH:
                    this.addTech(inputParts[1]);
                    break;

                case CheatConstants.CHEAT_NAME_ITEM:
                    var itemID = inputParts[1];
                    this.addItem(itemID);
                    break;

                case CheatConstants.CHEAT_NAME_FOLLOWER:
                    this.addFollower();
                    break;

                case CheatConstants.CHEAT_NAME_PERK:
                    var perkID = inputParts[1];
                    this.addPerk(perkID);
                    break;
                    
                case CheatConstants.CHEAT_NAME_REVEAL_MAP:
                    this.revealMap(inputParts[1]);
                    break;

                case "printSector":
                    console.log(currentSector.get(SectorFeaturesComponent));
                    break;

                case "printEnemies":
                    var enemiesComponent = currentSector.get(EnemiesComponent);
                    var playerStamina = this.playerStatsNodes.head.stamina;
                    if (enemiesComponent.possibleEnemies.length < 1)
                        console.log("No enemies here.");
                    for (var e = 0; e < enemiesComponent.possibleEnemies.length; e++) {
                        var enemy = enemiesComponent.possibleEnemies[e];
                        console.log(
                            enemy.name + " " +
                            "(att: " + enemy.att + ", def: " + enemy.def + ", rarity: " + enemy.rarity + ") " +
                            "chances: " + Math.round(100 * FightConstants.getFightWinProbability(enemy, playerStamina, itemsComponent)) + "% " +
                            FightConstants.getFightChances(enemy, playerStamina, itemsComponent));
                    }
                    break;

                default:
                    console.log("Unknown cheat.");
                    break;
            }
        },
        
        setGameSpeed: function (speed) {            
            GameConstants.gameSpeedCamp = speed;
            GameConstants.gameSpeedExploration = speed;
        },
        
        passTime: function (mins) {
            this.engine.updateComplete.addOnce(function () {
                this.engine.extraUpdateTime = mins * 60;
                var cooldownkeys = Object.keys(this.gameState.actionCooldownEndTimestamps);                
                for (var i = 0; i < cooldownkeys.length; i++) {
                    this.gameState.actionCooldownEndTimestamps[cooldownkeys[i]] = this.gameState.actionCooldownEndTimestamps[cooldownkeys[i]] - mins * 60 * 1000;
                }
                this.playerActionFunctions.uiFunctions.onPlayerMoved(); // reset cooldowns for buttons
                this.engine.updateComplete.addOnce(function () {
                    this.engine.extraUpdateTime = 0;
                }, this);
            }, this);
        },
        
        setAutoPlay: function (type, numCampsTarget) {
            var endConditionUpdateFunction;
            var start = false;
            var stop = false;
            switch (type) {
                case "false":
                case "off":
                    stop = true;
                    break;
                    
                case "true":
                case "on":
                    start = true;
                    break;
                    
                case "camp":
                    this.cheat("item " + ItemConstants.itemDefinitions.bag[0].id);
                    if (!numCampsTarget || numCampsTarget < 1) numCampsTarget = 1;
                    endConditionUpdateFunction = function () {
                        if (this.gameState.numCamps >= numCampsTarget) {
                            this.engine.updateComplete.remove(endConditionUpdateFunction, this);
                            this.cheat("autoplay off");
                        }
                    };
                    break;
            }
            
            if (endConditionUpdateFunction) this.engine.updateComplete.add(endConditionUpdateFunction, this);
            
            if (stop) {
                this.playerStatsNodes.head.entity.remove(AutoPlayComponent);
            } else if (start) {                
                if (!this.playerStatsNodes.head.entity.has(AutoPlayComponent)) {
                    this.playerStatsNodes.head.entity.add(new AutoPlayComponent());
                }
            }
        },
        
        setResource: function (name, amount) {
            if (resourceNames[name]) {
                var playerResources = this.resourcesHelper.getCurrentStorage().resources;
                playerResources.setResource(name, amount);
            } else {
                console.log(name + " is not a valid resource. Possible names are:");
                console.log(Object.keys(resourceNames));
            }
        },
        
        addSupplies: function () {
            var playerResources = this.resourcesHelper.getCurrentStorage().resources;        
            playerResources.setResource("food", 15);
            playerResources.setResource("water", 15);
        },
        
        addPopulation: function (amount) {
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var camp = currentSector.get(CampComponent);
            if (camp) {                
                camp.addPopulation(amount);
            } else {
                console.log("WARN: Camp not found.");
            }
        },
        
        setPlayerPosition: function (lvl, x, y) {            
            var playerPos = this.playerPositionNodes.head.position;
            playerPos.level = lvl;
            playerPos.sectorX = x;
            playerPos.sectorY = y;
        },
        
        addBuilding: function (name, amount) {
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var improvementsComponent = currentSector.get(SectorImprovementsComponent);
            improvementsComponent.add(name, amount);
        },
        
        addTech: function (name) {
            if (name !== "all")
                this.playerActionFunctions.buyUpgrade(name, true);
            else
                for (var id in UpgradeConstants.upgradeDefinitions) {
                    this.playerActionFunctions.buyUpgrade(id, true);
                }            
        },
        
        addItem: function (itemID) {            
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            var playerPos = this.playerPositionNodes.head.position;
            var item = ItemConstants.getItemByID(itemID);
            if (item) {
                itemsComponent.addItem(item.clone(), !playerPos.inCamp);
            } else {
                console.log("WARN: No such item: " + itemID);
            }
        },
        
        addFollower: function() {    
            var campCount = this.gameState.numCamps;        
            var follower = ItemConstants.getFollower(this.playerPositionNodes.head.position.level, campCount);
            this.playerActionFunctions.addFollower(follower);
        },
        
        addPerk: function () {            
            var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
            var perk = PerkConstants.getPerk(perkID);
            if (perk) {
                perksComponent.addPerk(perk);
            } else {
                console.log("WARN: No such perk: " + perkID);
            }
        },
        
        heal: function() {  
            this.playerActionFunctions.useHospital(true);
        },
        
        addInjury: function () {       
            var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
            var injuryi = Math.round(Math.random() * PerkConstants.perkDefinitions.injury.length);
            var defaultInjury = PerkConstants.perkDefinitions.injury[injuryi];
            perksComponent.addPerk(defaultInjury.clone());
        },
        
        revealMap: function (value) {            
            this.uiMapHelper.isMapRevealed = value ? true : false;
        }
    
    });

    return CheatSystem;
});