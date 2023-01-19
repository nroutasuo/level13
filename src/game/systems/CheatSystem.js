// Functions to handle cheats, either from the console or UI
define(['ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/CheatConstants',
	'game/constants/ItemConstants',
	'game/constants/LocaleConstants',
	'game/constants/PerkConstants',
	'game/constants/FightConstants',
	'game/constants/FollowerConstants',
	'game/constants/TradeConstants',
	'game/constants/UpgradeConstants',
	'game/constants/WorldConstants',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/player/AutoPlayComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PerksComponent',
	'game/components/player/DeityComponent',
	'game/components/sector/EnemiesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/type/LevelComponent',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/PlayerPositionNode',
	'game/nodes/PlayerLocationNode'
], function (Ash,
	GameGlobals,
	GlobalSignals,
	GameConstants,
	CheatConstants,
	ItemConstants,
	LocaleConstants,
	PerkConstants,
	FightConstants,
	FollowerConstants,
	TradeConstants,
	UpgradeConstants,
	WorldConstants,
	CampComponent,
	PositionComponent,
	AutoPlayComponent,
	ItemsComponent,
	PerksComponent,
	DeityComponent,
	EnemiesComponent,
	SectorImprovementsComponent,
	SectorControlComponent,
	SectorFeaturesComponent,
	SectorStatusComponent,
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
			this.registerCheat(CheatConstants.CHEAT_NAME_MATERIALS, "Refill materials (metal, rope).", [], function () {
				this.addMaterials();
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_VISION, "Set vision.", ["value"], function (params) {
				this.playerStatsNodes.head.vision.value = Math.min(200, Math.max(0, parseInt(params[0])));
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_EVIDENCE, "Set evidence.", ["value"], function (params) {
				this.setEvidence(parseInt(params[0]));
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_RUMOURS, "Set rumours.", ["value"], function (params) {
				this.setRumours(parseInt(params[0]));
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_FAVOUR, "Set favour.", ["value"], function (params) {
				var value = parseInt(params[0]);
				this.setFavour(value);
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_POPULATION, "Add population to nearest camp.", ["value (1-n)"], function (params) {
				this.addPopulation(Math.max(1, parseInt(params[0])));
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_WORKERS, "Auto-assign workers in nearest camp.", [], function (params) {
				this.autoAssignWorkers();
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_STAMINA, "Refill stamina for free.", [], function () {
				this.refillStamina();
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_SET_STAMINA, "Set stamina.", [ "value" ], function (params) {
				var value = parseInt(params[0]);
				this.setStamina(value);
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
			this.registerCheat(CheatConstants.CHEAT_NAME_TRADE_PARTNER, "Add next trade partner, regardless of camp ordinal.", [], function (params) {
				this.addTradePartner();
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_WORKSHOPS, "Clear all workshops on a given level.", ["level"], function (params) {
				var level = parseInt(params[0]);
				this.clearWorkshops(level);
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_ITEM, "Add the given item to inventory.", ["item id"], function (params) {
				this.addItem(params[0]);
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_FOLLOWER, "Add a random follower.", [], function (params) {
				this.addFollower();
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_EQUIP_BEST, "Auto-equip best items available.", [], function (params) {
				this.equipBest();
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_BREAK_ITEM, "Break a random item.", [], function () {
				this.breakItem();
			});
			this.registerCheat(CheatConstants.CHEAT_NAME_PERK, "Add the given perk to the player.", ["perk id"], function (params) {
				this.addPerk(params[0]);
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
			this.registerCheat(CheatConstants.CHEAT_NAME_RECRUIT, "Trigger an incoming recruit immediately.", [], function (params) {
				this.triggerRecruit();
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
			this.registerCheat(CheatConstants.CHEAT_NAME_SCAVENGE, "Do a scavenge expedition on the current level.", [], function (params) {
				this.setAutoPlay("expedition", null, "scout");
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

		applyCheatInput: function (input) {
			if (!GameConstants.isCheatsEnabled) return;

			var inputParts = input.split(" ");
			var name = inputParts[0];

			if (this.cheatDefinitions[name]) {
				var func = this.cheatDefinitions[name].func;
				var numParams = this.cheatDefinitions[name].params.length;
				var numOptional = ((this.cheatDefinitions[name].params.join().match(/optional/g)) || []).length;
				if (Math.abs(inputParts.length - 1 - numParams) <= numOptional) {
					this.applyCheat(() => {
						func.call(this, inputParts.slice(1));
					});
				} else {
					log.w("Wrong number of parameters. Expected " + numParams + " (" + numOptional + ") got " + (inputParts.length -1));
				}
				return;
			} else {
				log.w("cheat not found: " + name);
			}
		},
		
		applyCheat: function (fn) {
			if (!fn) return
			if (!GameConstants.isCheatsEnabled) return;
			if (!GameGlobals.gameState.hasCheated) {
				GameGlobals.gameState.hasCheated = true;
				gtag('set', { 'has_cheated': true });
			}
			fn();
		},

		printCheats: function () {
			for (var cmd in this.cheatDefinitions) {
				if (this.isHidden(cmd))
					continue;
				var hasParams = this.cheatDefinitions[cmd].params.length > 0;
				var params = "";
				for (let i = 0; i < this.cheatDefinitions[cmd].params.length; i++) {
					params += "[" + this.cheatDefinitions[cmd].params[i] + "] ";
				}
				log.i(cmd + " " + params + "- " + this.cheatDefinitions[cmd].desc);
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
				for (let i = 0; i < this.cheatDefinitions[cmd].params.length; i++) {
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
							this.applyCheatInput("autoplay off");
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
							this.applyCheatInput("autoplay off");
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
						component.explorationVO.limitToCurrentLevel = true;
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
				log.i(name + " is not a valid resource. Possible names are:");
				log.i(Object.keys(resourceNames));
			}
		},
		
		setEvidence: function (value) {
			this.playerStatsNodes.head.evidence.value = Math.max(0, value);
		},
		
		setRumours: function (value) {
			this.playerStatsNodes.head.rumours.value = Math.max(0, value);
		},

		setFavour: function (value) {
			if (value > 0) {
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
		
		addMaterials: function () {
			var playerStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			var playerResources = playerStorage.resources;
			playerResources.setResource("metal", playerStorage.storageCapacity);
			playerResources.setResource("rope", playerStorage.storageCapacity / 2);
			if (GameGlobals.gameState.unlockedFeatures.resources.concrete)
				playerResources.setResource("concrete", playerStorage.storageCapacity / 4);
			if (GameGlobals.gameState.unlockedFeatures.resources.tools)
				playerResources.setResource("tools", playerStorage.storageCapacity / 4);
		},

		addPopulation: function (amount) {
			var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
			var camp = currentSector.get(CampComponent);
			if (camp) {
				camp.addPopulation(amount);
			} else {
				log.w("Camp not found.");
			}
		},
		
		autoAssignWorkers: function () {
			var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
			var camp = currentSector.get(CampComponent);
			if (!camp) return;
			var assignment = GameGlobals.campHelper.getDefaultWorkerAssignment(currentSector);
			GameGlobals.playerActionFunctions.assignWorkers(currentSector, assignment);
		},

		refillStamina: function () {
			this.playerStatsNodes.head.stamina.stamina = 1000;
		},

		setStamina: function (value) {
			this.playerStatsNodes.head.stamina.stamina = value;
		},

		setPlayerPosition: function (lvl, x, y, inCamp) {
			var playerPos = this.playerPositionNodes.head.position;
			playerPos.level = lvl;
			playerPos.sectorX = x;
			playerPos.sectorY = y;
			playerPos.inCamp = inCamp || false;
		},

		goToLevel: function (level) {
			for (var dx = 0; dx < 200; dx++) {
				for (var dy = 0; dy < 200; dy++) {
					var sector = GameGlobals.levelHelper.getSectorByPosition(level, dx, dy);
					sector = sector || GameGlobals.levelHelper.getSectorByPosition(level, -dx, dy);
					sector = sector || GameGlobals.levelHelper.getSectorByPosition(level, dx, -dy);
					sector = sector || GameGlobals.levelHelper.getSectorByPosition(level, -dx, -dy);
					if (sector) {
						this.setPlayerPosition(level, sector.position.sectorX, sector.position.sectorY);
						return;
					}
				}
			}
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

		addTechs: function (campOrdinal, step) {
			step = step || WorldConstants.CAMP_STEP_END;
			var minOrdinal;
			var minStep;
			for (var id in UpgradeConstants.upgradeDefinitions) {
				if (this.tribeUpgradesNodes.head.upgrades.hasUpgrade(id)) continue;
				minOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade(id);
				minStep = GameGlobals.upgradeEffectsHelper.getMinimumCampStepForUpgrade(id);
				if (WorldConstants.isHigherOrEqualCampOrdinalAndStep(campOrdinal, step, minOrdinal, minStep)) {
					this.addTech(id);
				}
			}
		},

		addBlueprints: function (name, amount) {
			var maxPieces = UpgradeConstants.getMaxPiecesForBlueprint(name);
			amount = Math.max(1, amount);
			amount = Math.min(amount, maxPieces);
			for (let i = 0; i < amount; i++) {
				this.tribeUpgradesNodes.head.upgrades.addNewBlueprintPiece(name);
			}
			GameGlobals.gameState.unlockedFeatures.blueprints = true;
		},

		addBlueprintsForLevel: function (campOrdinal) {
			var id;
			var blueprints = UpgradeConstants.getBlueprintsByCampOrdinal(campOrdinal);
			for (let i in blueprints) {
				id = blueprints[i];
				this.addBlueprints(id, UpgradeConstants.piecesByBlueprint[id]);
			}
		},

		addTradePartners: function (campOrdinal) {
			var partner;
			for (let i = 0; i < TradeConstants.TRADING_PARTNERS.length; i++) {
				partner = TradeConstants.TRADING_PARTNERS[i];
				if (partner.campOrdinal < campOrdinal) {
					if (GameGlobals.gameState.foundTradingPartners.indexOf(partner.campOrdinal) >= 0)
						continue;

					GameGlobals.gameState.foundTradingPartners.push(partner.campOrdinal);
				}
			}
		},
		
		addTradePartner: function () {
			var partner;
			for (let i = 0; i < TradeConstants.TRADING_PARTNERS.length; i++) {
				partner = TradeConstants.TRADING_PARTNERS[i];
				if (GameGlobals.gameState.foundTradingPartners.indexOf(partner.campOrdinal) >= 0)
					continue;

				GameGlobals.gameState.foundTradingPartners.push(partner.campOrdinal);
				return;
			}
		},
		
		clearWorkshops: function (level) {
			var workshopEntities = GameGlobals.levelHelper.getWorkshopsSectorsForLevel(level);
			var featuresComponent;
			var sectorControlComponent;
			for (let i = 0; i < workshopEntities.length; i++) {
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
					GameGlobals.playerHelper.addItem(item);
					GlobalSignals.inventoryChangedSignal.dispatch();
				}
			} else {
				log.w("No such item: " + itemID);
			}
		},
		
		addFollower: function () {
			let followersComponent = this.playerStatsNodes.head.followers;
			let playerPos = this.playerPositionNodes.head.position;
			let follower = FollowerConstants.getNewRandomFollower(FollowerConstants.followerSource.SCOUT, GameGlobals.gameState.numCamps, playerPos.level);
			followersComponent.addFollower(follower);
		},

		equipBest: function () {
			let itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			itemsComponent.autoEquipAll();
		},
		
		breakItem: function () {
			let itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			let playerPos = this.playerPositionNodes.head.position;
			let breakable = itemsComponent.getAll(playerPos.inCamp).filter(item => !item.broken && item.repairable);
			if (breakable.length == 0) {
				log.w("no breakable items");
				return;
			}
			let item = breakable[Math.floor(Math.random() * breakable.length)];
			item.broken = true;
			log.i("broke item: " + item.id + " " + item.itemID);
			GlobalSignals.inventoryChangedSignal.dispatch();
		},

		addPerk: function () {
			var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
			var perk = PerkConstants.getPerk(perkID);
			if (perk) {
				perksComponent.addPerk(perk);
			} else {
				log.w("No such perk: " + perkID);
			}
		},

		heal: function() {
			GameGlobals.playerActionFunctions.useHospital();
		},

		addInjury: function () {
			var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
			var injuryi = Math.round(Math.random() * PerkConstants.perkDefinitions.injury.length);
			var defaultInjury = PerkConstants.perkDefinitions.injury[injuryi];
			perksComponent.addPerk(PerkConstants.getPerk(defaultInjury.id));
		},

		revealMap: function (value) {
			GameGlobals.uiMapHelper.isMapRevealed = value === true || value === "true" || value === 1 ? true : false;
		},

		debugMap: function (value) {
			if (value) {
				this.addItem("equipment_map", true);
			}
			this.revealMap(value);
		},

		scoutLevel: function () {
			GameGlobals.playerActionFunctions.leaveCamp();
			var startSector = this.playerLocationNodes.head.entity;
			var originalPos = this.playerPositionNodes.head.position.getPosition();
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			var level = originalPos.level;
			var sectors = GameGlobals.levelHelper.getSectorsByLevel(level);
			var sector;
			let i = 0;
			var binding = null;
			var updateFunction = function () {
				if (i < sectors.length) {
					sector = sectors[i];
					var pos = sector.get(PositionComponent);
					var goalSector = GameGlobals.levelHelper.getSectorByPosition(level, pos.sectorX, pos.sectorY);
					if (GameGlobals.levelHelper.isSectorReachable(startSector, goalSector)) {
						var statusComponent = goalSector.get(SectorStatusComponent);
						var featuresComponent = goalSector.get(SectorFeaturesComponent);
						var isAffectedByHazard = GameGlobals.sectorHelper.isAffectedByHazard(featuresComponent, statusComponent, itemsComponent);
						if (!isAffectedByHazard) {
							this.setPlayerPosition(level, pos.sectorX, pos.sectorY);
							GameGlobals.playerActionFunctions.scout();
						}
					}
				} else if (i == sectors.length) {
					this.setPlayerPosition(originalPos.level, originalPos.sectorX, originalPos.sectorY);
					GameGlobals.uiFunctions.popupManager.closeAllPopups();
					binding.detach();
					this.engine.updateComplete.addOnce(function () {
						GameGlobals.uiFunctions.showGame();
					});
				}
				i++;
			};
			GameGlobals.uiFunctions.hideGame(false);
			binding = this.engine.updateComplete.add(updateFunction, this);
		},

		triggerTrader: function () {
			var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
			var campTimers = currentSector ? currentSector.get(CampEventTimersComponent) : null;
			if (campTimers) {
				campTimers.eventStartTimers["trader"] = 1;
			}
		},

		triggerRecruit: function () {
			var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
			var campTimers = currentSector ? currentSector.get(CampEventTimersComponent) : null;
			if (campTimers) {
				campTimers.eventStartTimers["recruit"] = 1;
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
