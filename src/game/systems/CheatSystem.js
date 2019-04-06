// Functions to handle cheats, either from the console or UI
define(['ash',
    'game/GameGlobals',
    'game/constants/GameConstants',
    'game/constants/CheatConstants',
    'game/constants/ItemConstants',
    'game/constants/LocaleConstants',
    'game/constants/PerkConstants',
    'game/constants/FightConstants',
    'game/constants/TradeConstants',
    'game/constants/UpgradeConstants',
    'game/components/common/CampComponent',
    'game/components/player/AutoPlayComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/player/DeityComponent',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/events/CampEventTimersComponent',
    'game/components/type/LevelComponent',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/tribe/TribeUpgradesNode',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode'
], function (Ash,
    GameGlobals,
    GameConstants,
    CheatConstants,
    ItemConstants,
    LocaleConstants,
    PerkConstants,
    FightConstants,
    TradeConstants,
    UpgradeConstants,
    CampComponent,
    AutoPlayComponent,
    ItemsComponent,
    PerksComponent,
    DeityComponent,
    EnemiesComponent,
    SectorImprovementsComponent,
    SectorControlComponent,
    SectorFeaturesComponent,
    CampEventTimersComponent,
    LevelComponent,
    PlayerStatsNode,
    TribeUpgradesNode,
    PlayerPositionNode,
    PlayerLocationNode
) {
    var CheatSystem = Ash.System.extend({

        cheatDefinitions: {},

        constructor: function () {},

        addToEngine: function (engine) {
            this.engine = engine;
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);

            this.registerCheats();
        },

        registerCheats: function () {
            this.registerCheat(CheatConstants.CHEAT_NAME_CHEATLIST, "Print all available cheats to console.", [], function () {
                this.printCheats();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_SPEED, "Sets the speed of the game.", ["speed (1 = normal, >1 faster, <1 slower)"], function (params) {
                var spd = parseFloat(params[0]);
                this.setGameSpeed(spd);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_TIME, "Immediately passes in-game time.", ["time to pass in minutes"], function (params) {
                var mins = parseFloat(params[0]);
                this.passTime(mins);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_RES, "Set a resource to a given value.", ["resource name", "amount"], function (params) {
                var name = params[0];
                var amount = parseInt(params[1]);
                this.setResource(name, amount);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_SUPPLIES, "Refill supplies (water and food).", [], function () {
                this.addSupplies();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_VISION, "Set vision.", ["value"], function (params) {
                this.playerStatsNodes.head.vision.value = Math.min(200, Math.max(0, parseInt(params[0])));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_EVIDENCE, "Set evidence.", ["value"], function (params) {
                this.playerStatsNodes.head.evidence.value = Math.max(0, parseInt(params[0]));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_RUMOURS, "Set rumours.", ["value"], function (params) {
                this.playerStatsNodes.head.rumours.value = Math.max(0, parseInt(params[0]));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_FAVOUR, "Set favour.", ["value"], function (params) {
                var value = parseInt(params[0]);
                this.setFavour(value);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_POPULATION, "Add population to nearest camp.", ["value (1-n)"], function (params) {
                this.addPopulation(Math.max(1, parseInt(params[0])));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_STAMINA, "Refill stamina for free.", [], function () {
                this.refillStamina();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_POS, "Set position of the player. Must be an existing sector.", ["level", "x", "y"], function (params) {
                this.setPlayerPosition(parseInt(params[0]), parseInt(params[1]), parseInt(params[2]));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_LEVEL, "Go to a random valid sector on the given level.", ["level"], function (params) {
                var level = parseInt(params[0]);
                this.goToLevel(level);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_HEAL, "Heal injuries.", [], function () {
                this.heal();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_INJURY, "Add a random injury.", [], function () {
                this.addInjury();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_BUILDING, "Add buildings to the current camp.", ["building id", "amount"], function (params) {
                var buildingName = params[0];
                var buildingAmount = parseInt(params[1]);
                this.addBuilding(buildingName, buildingAmount);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_TECH, "Immediately unlock the given upgrade. \"all\" unlocks everything.", ["upgrade id"], function (params) {
                this.addTech(params[0]);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_TECHS, "Immediately unlock all tech up to and including a given camp ordinal.", ["camp ordinal"], function (params) {
                var campOrdinal = parseInt(params[0]);
                this.addTechs(campOrdinal);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_BLUEPRINT, "Add blueprints for the given upgrade.", ["upgrade id", "amount (1-total)"], function (params) {
                this.addBlueprints(params[0], parseInt(params[1]));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_BLUEPRINTS, "Add all blueprints found on a given camp ordinal.", ["camp ordinal"], function (params) {
                var campOrdinal = parseInt(params[0]);
                this.addBlueprintsForLevel(campOrdinal);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_TRADE_PARTNERS, "Add all trading partners found up to a given camp ordinal.", ["camp ordinal"], function (params) {
                var campOrdinal = parseInt(params[0]);
                this.addTradePartners(campOrdinal);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_WORKSHOPS, "Clear all workshops on a given level.", ["level"], function (params) {
                var level = parseInt(params[0]);
                this.clearWorkshops(level);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_ITEM, "Add the given item to inventory.", ["item id"], function (params) {
                this.addItem(params[0]);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_EQUIP_BEST, "Auto-equip best items available.", [], function (params) {
                this.equipBest();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_PERK, "Add the given perk to the player.", ["perk id"], function (params) {
                this.addPerk(params[0]);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_FOLLOWER, "Add random follower.", [], function (params) {
                this.addFollower();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_REVEAL_MAP, "Reveal the map (show important locations without scouting).", ["true/false"], function (params) {
                this.revealMap(params[0]);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_DEBUG_MAP, "Debug map generation (reveal map and show extra information).", ["true/false"], function (params) {
                this.debugMap(params[0]);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_SCOUT_LEVEL, "Scout all the sectors in the current level.", [], function (params) {
                this.scoutLevel();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_TRADER, "Trigger an incoming trader immediately.", [], function (params) {
                this.triggerTrader();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_RAID, "Trigger a raid immediately.", [], function (params) {
                this.triggerRaid();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_RESET_BUILDING_SPOTS, "Reset building spots for buildings in the current camp.", [], function (params) {
                this.resetBuildingSpots();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_AUTOPLAY, "Autoplay.", ["on/off/camp/expedition", "(optional) camp ordinal"], function (params) {
                this.setAutoPlay(params[0], parseInt(params[1]));
            });
        },

        registerCheat: function (cmd, desc, params, func) {
            this.cheatDefinitions[cmd] = {};
            this.cheatDefinitions[cmd].desc = desc;
            this.cheatDefinitions[cmd].params = params;
            this.cheatDefinitions[cmd].func = func;
        },

        isHidden: function (cmd) {
            return cmd === CheatConstants.CHEAT_NAME_AUTOPLAY;
        },

        applyCheat: function (input) {
            if (!GameConstants.isCheatsEnabled) return;

            var inputParts = input.split(" ");
            var name = inputParts[0];

            if (this.cheatDefinitions[name]) {
                var func = this.cheatDefinitions[name].func;
                var numParams = this.cheatDefinitions[name].params.length;
                var numOptional = ((this.cheatDefinitions[name].params.join().match(/optional/g)) || []).length;
                if (Math.abs(inputParts.length - 1 - numParams) <= numOptional) {
                    func.call(this, inputParts.slice(1));
                } else {
                    console.log("Wrong number of parameters. Expected " + numParams + " (" + numOptional + ") got " + (inputParts.length -1));
                }
                return;
            } else {
                console.log("cheat not found: " + name);
            }

            // TODO re-implement these cheats
            /*
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            switch (name) {
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
            }
            */
        },

        printCheats: function () {
            for (var cmd in this.cheatDefinitions) {
                if (this.isHidden(cmd))
                    continue;
                var hasParams = this.cheatDefinitions[cmd].params.length > 0;
                var params = "";
                for (var i = 0; i < this.cheatDefinitions[cmd].params.length; i++) {
                    params += "[" + this.cheatDefinitions[cmd].params[i] + "] ";
                }
                console.log(cmd + " " + params + "- " + this.cheatDefinitions[cmd].desc);
            }
        },

        getCheatListDiv: function() {
            var div = "<div>";
            div += "<h4 class='infobox-scrollable-header'>Cheat List</h4>";
            div += "<div id='cheatlist' class='infobox infobox-scrollable'>";
            for (var cmd in this.cheatDefinitions) {
                if (this.isHidden(cmd))
                    continue;
                var hasParams = this.cheatDefinitions[cmd].params.length > 0;
                var params = "";
                for (var i = 0; i < this.cheatDefinitions[cmd].params.length; i++) {
                    params += "[" + this.cheatDefinitions[cmd].params[i] + "] ";
                }
                div += ("<b>" + cmd + "</b>" + " " + params + "- " + this.cheatDefinitions[cmd].desc) + "<br/>";
            }
            div += "</div>";
            div += "</div>";
            return div;
        },

        setGameSpeed: function (speed) {
            GameConstants.gameSpeedCamp = speed;
            GameConstants.gameSpeedExploration = speed;
        },

        passTime: function (mins) {
            GameGlobals.playerActionFunctions.passTime(mins * 60);
        },

        setAutoPlay: function (type, numCampsTarget) {
            var start = false;
            var stop = false;
            var isExpedition = false;
            var endConditionUpdateFunction;
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
                    start = true;
                    if (!numCampsTarget || numCampsTarget < 1) numCampsTarget = 1;
                    endConditionUpdateFunction = function () {
                        if (GameGlobals.gameState.numCamps >= numCampsTarget) {
                            this.engine.updateComplete.remove(endConditionUpdateFunction, this);
                            this.applyCheat("autoplay off");
                        }
                    };
                    break;

                case "expedition":
                    start = true;
                    isExpedition = true;
                    endConditionUpdateFunction = function () {
                        var autoplayComponent = this.playerStatsNodes.head.entity.get(AutoPlayComponent);
                        if (autoplayComponent && autoplayComponent.isPendingExploring)
                            return;
                        if (!autoplayComponent || !autoplayComponent.isExploring) {
                            this.engine.updateComplete.remove(endConditionUpdateFunction, this);
                            this.applyCheat("autoplay off");
                        }
                    };
                    break;
            }

            if (endConditionUpdateFunction) this.engine.updateComplete.add(endConditionUpdateFunction, this);

            if (stop) {
                this.playerStatsNodes.head.entity.remove(AutoPlayComponent);
            } else if (start) {
                if (!this.playerStatsNodes.head.entity.has(AutoPlayComponent)) {
                    var component = new AutoPlayComponent();
                    if (isExpedition) {
                        component.isPendingExploring = true;
                        component.isExpedition = true;
                    }
                    this.playerStatsNodes.head.entity.add(component);
                }
            }
        },

        setResource: function (name, amount) {
            if (resourceNames[name]) {
                var playerResources = GameGlobals.resourcesHelper.getCurrentStorage().resources;
                playerResources.setResource(name, amount);
            } else {
                console.log(name + " is not a valid resource. Possible names are:");
                console.log(Object.keys(resourceNames));
            }
        },

        setFavour: function (value) {
            if (value >  0) {
                GameGlobals.gameState.unlockedFeatures.favour = true;
            }
            if (!this.playerStatsNodes.head.entity.has(DeityComponent)) {
                this.playerStatsNodes.head.entity.add(new DeityComponent("Hoodwinker"))
            }

            this.playerStatsNodes.head.entity.get(DeityComponent).favour = Math.max(0, value);
        },
        
        addSupplies: function () {
            var playerResources = GameGlobals.resourcesHelper.getCurrentStorage().resources;
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

        refillStamina: function () {
            this.playerStatsNodes.head.stamina.stamina = 1000;
        },

        setPlayerPosition: function (lvl, x, y, inCamp) {
            var playerPos = this.playerPositionNodes.head.position;
            playerPos.level = lvl;
            playerPos.sectorX = x;
            playerPos.sectorY = y;
            playerPos.inCamp = inCamp || false;
        },

        goToLevel: function (level) {
            var levelVO = GameGlobals.levelHelper.getLevelEntityForPosition(level).get(LevelComponent).levelVO;
            var i = Math.floor(Math.random() * levelVO.centralSectors.length);
            var sector = levelVO.centralSectors[i];
            this.setPlayerPosition(level, sector.position.sectorX, sector.position.sectorY);
        },

        addBuilding: function (name, amount) {
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var improvementsComponent = currentSector.get(SectorImprovementsComponent);
            improvementsComponent.add(name, amount);
        },

        addTech: function (name) {
            if (name !== "all")
                GameGlobals.playerActionFunctions.buyUpgrade(name, true);
            else
                for (var id in UpgradeConstants.upgradeDefinitions) {
                    GameGlobals.playerActionFunctions.buyUpgrade(id, true);
                }
        },

        addTechs: function (campOrdinal) {
            var minOrdinal;
			for (var id in UpgradeConstants.upgradeDefinitions) {
                minOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade(id);
                if (minOrdinal <= campOrdinal) {
                    this.addTech(id);
                }
            }
        },

        addBlueprints: function (name, amount) {
            var maxPieces = UpgradeConstants.getMaxPiecesForBlueprint(name);
            amount = Math.max(1, amount);
            amount = Math.min(amount, maxPieces);
            for (var i = 0; i < amount; i++) {
                this.tribeUpgradesNodes.head.upgrades.addNewBlueprintPiece(name);
            }
            GameGlobals.gameState.unlockedFeatures.blueprints = true;
        },

        addBlueprintsForLevel: function (campOrdinal) {
            var id;
            var blueprints = UpgradeConstants.getblueprintsByCampOrdinal(campOrdinal);
			for (var i in blueprints) {
                id = blueprints[i];
                this.addBlueprints(id, UpgradeConstants.piecesByBlueprint[id]);
            }
        },

        addTradePartners: function (campOrdinal) {
            var partner;
			for (var i = 0; i < TradeConstants.TRADING_PARTNERS.length; i++) {
                partner = TradeConstants.TRADING_PARTNERS[i];
                if (partner.campOrdinal < campOrdinal) {
                    if (GameGlobals.gameState.foundTradingPartners.indexOf(partner.campOrdinal) >= 0)
                        continue;

                    GameGlobals.gameState.foundTradingPartners.push(partner.campOrdinal);
                }
            }
        },
        
        clearWorkshops: function (level) {
            var workshopEntities = GameGlobals.levelHelper.getWorkshopsSectorsForLevel(level);
            var featuresComponent;
            var sectorControlComponent;
            for (var i = 0; i < workshopEntities.length; i++) {
    			sectorControlComponent = workshopEntities[i].get(SectorControlComponent);
				while (!sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)) {
					sectorControlComponent.addWin(LocaleConstants.LOCALE_ID_WORKSHOP);
				}
            }
        },

        addItem: function (itemID, onlyIfMissing) {
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            var playerPos = this.playerPositionNodes.head.position;
            var item = ItemConstants.getItemByID(itemID);
            if (item) {
                if (!onlyIfMissing || !itemsComponent.contains(item.name)) {
                    itemsComponent.addItem(item.clone(), !playerPos.inCamp);
                }
            } else {
                console.log("WARN: No such item: " + itemID);
            }
        },

        equipBest: function () {
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            itemsComponent.autoEquipAll();
        },

        addFollower: function() {
            var campCount = GameGlobals.gameState.numCamps;
            var follower = ItemConstants.getFollower(this.playerPositionNodes.head.position.level, campCount);
            GameGlobals.playerActionFunctions.addFollower(follower);
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
            GameGlobals.playerActionFunctions.useHospital();
        },

        addInjury: function () {
            var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
            var injuryi = Math.round(Math.random() * PerkConstants.perkDefinitions.injury.length);
            var defaultInjury = PerkConstants.perkDefinitions.injury[injuryi];
            perksComponent.addPerk(defaultInjury.clone());
        },

        revealMap: function (value) {
            GameGlobals.uiMapHelper.isMapRevealed = value ? true : false;
        },

        debugMap: function (value) {
            if (value) {
                this.addItem("equipment_map", true);
            }
            this.revealMap(value);
        },

        scoutLevel: function () {
            var originalPos = this.playerPositionNodes.head.position.getPosition();
            var levelVO = GameGlobals.levelHelper.getLevelEntityForPosition(originalPos.level).get(LevelComponent).levelVO;
            var sectorVO;
            var i = 0;
            var updateFunction = function () {
                if (i < levelVO.sectors.length) {
                    sectorVO = levelVO.sectors[i];
                    this.setPlayerPosition(levelVO.level, sectorVO.position.sectorX, sectorVO.position.sectorY);
                    GameGlobals.playerActionFunctions.scout();
                    i++;
                } else {
                    this.setPlayerPosition(originalPos.level, originalPos.sectorX, originalPos.sectorY);
                    GameGlobals.uiFunctions.popupManager.closeAllPopups();
                    this.engine.updateComplete.remove(updateFunction);
                    GameGlobals.uiFunctions.showGame();
                }
            };
			GameGlobals.uiFunctions.hideGame(false);
            this.engine.updateComplete.add(updateFunction, this);
        },

        triggerTrader: function () {
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var campTimers = currentSector ? currentSector.get(CampEventTimersComponent) : null;
            if (campTimers) {
                campTimers.eventStartTimers["trader"] = 1;
            }
        },

        triggerRaid: function () {
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var campTimers = currentSector ? currentSector.get(CampEventTimersComponent) : null;
            if (campTimers) {
                campTimers.eventStartTimers["raid"] = 10;
            }
        },
        
        resetBuildingSpots: function () {
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var improvements = currentSector ? currentSector.get(SectorImprovementsComponent) : null;
            if (improvements) {
                improvements.resetBuildingSpots();
            }
        }

    });

    return CheatSystem;
});
