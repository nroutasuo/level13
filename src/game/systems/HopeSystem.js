define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/CampConstants',
	'game/constants/GameConstants',
	'game/components/player/HopeComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/sector/CampNode',
], function (Ash, GameGlobals, GlobalSignals, CampConstants, GameConstants, HopeComponent, SectorImprovementsComponent, PlayerStatsNode, TribeUpgradesNode, CampNode) {
	
	var HopeSystem = Ash.System.extend({

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.campNodes = engine.getNodeList(CampNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onImprovementBuilt);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			
			this.campNodes = null;
			this.tribeUpgradesNodes = null;
			this.playerStatsNodes = null;
			this.engine = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.isLaunched) return;
			if (!this.campNodes.head) return;
			
			let hopeComponent = this.playerStatsNodes.head.entity.get(HopeComponent);
			if (!hopeComponent) return;
			
			this.updateHopeLimit();
			this.updateHopeValue(time);
		},
		
		updateHopeLimit: function () {
			let hopeComponent = this.playerStatsNodes.head.entity.get(HopeComponent);
			hopeComponent.maxHope = GameGlobals.tribeHelper.getCurrentHopeLimit();
		},
		
		updateHopeValue: function (time) {
			let hopeComponent = this.playerStatsNodes.head.entity.get(HopeComponent);
			
			hopeComponent.accSources = [];
			hopeComponent.accumulation = 0;
			
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				var improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
				
				var accTemple = GameGlobals.campHelper.getTempleHopeGenerationPerSecond(improvementsComponent) * GameConstants.gameSpeedCamp;
				var numClerics = campNode.camp.assignedWorkers.cleric || 0;
				var accClerics = GameGlobals.campHelper.getHopeProductionPerSecond(numClerics, improvementsComponent);
				var accCamp = accTemple + accClerics;
				let change = time * accCamp;
				
				hopeComponent.addChange("Temples", accTemple, campNode.position.level);
				hopeComponent.addChange("Clerics", accClerics, campNode.position.level);
				hopeComponent.hope += change;
				hopeComponent.accumulation += accCamp;
				hopeComponent.accumulationPerCamp[campNode.position.level] = accCamp;

				GameGlobals.gameState.increaseGameStatKeyed("amountPlayerStatsProducedInCampsPerId", "hope", change);
			}
			
			if (hopeComponent.hope < 0) {
				hopeComponent.hope = 0;
			}
			
			if (hopeComponent.maxHope > 0 && hopeComponent.hope > hopeComponent.maxHope) {
				hopeComponent.hope = hopeComponent.maxHope;
			}
		},
		
		setDeityName: function (name) {
			let hopeComponent = this.playerStatsNodes.head.entity.get(HopeComponent);
			hopeComponent.deityName = name;
		},
		
		isValidDeityName: function (name) {
			if (!name || name.length < 1) {
				return false;
			}
			if (name.length > CampConstants.MAX_DEITY_NAME_LENGTH) {
				return false;
			}
			return true;
		},
		
		showDeityNamePopup: function () {
			let sys = this;
			GameGlobals.uiFunctions.showInput(
				"Name deity",
				"Now that you've built a temple, you should choose a name by which to your people will call this deity.",
				"",
				false,
				function (input) {
					sys.setDeityName(input);
				},
				function (input) {
					return sys.isValidDeityName(input);
				},
				CampConstants.MAX_DEITY_NAME_LENGTH
			);
		},
		
		onImprovementBuilt: function () {
			let hasTemple = false;
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				var improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
				hasTemple = hasTemple || improvementsComponent.getCount(improvementNames.temple) > 0;
			}
			if (!hasTemple) {
				return;
			}
			let hopeComponent = this.playerStatsNodes.head.entity.get(HopeComponent);
			if (this.isValidDeityName(hopeComponent.deityName)) {
				return;
			}
			this.showDeityNamePopup();
		},
		
	});
	
	return HopeSystem;
	
});
