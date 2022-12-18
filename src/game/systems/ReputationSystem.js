define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/LogConstants',
	'game/constants/OccurrenceConstants',
	'game/nodes/sector/CampNode',
	'game/nodes/PlayerPositionNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/common/LogMessagesComponent',
	'game/components/type/LevelComponent',
], function (
	Ash, GameGlobals, GlobalSignals, GameConstants, CampConstants, LogConstants, OccurrenceConstants, CampNode,
	PlayerPositionNode, TribeUpgradesNode, SectorImprovementsComponent, SectorFeaturesComponent, LogMessagesComponent,
	LevelComponent) {
	var ReputationSystem = Ash.System.extend({
	
		playerNodes: null,
		campNodes: null,
		tribeUpgradeNodes: null,
		
		lastUpdatePenalties: {},

		constructor: function () {
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerNodes = engine.getNodeList(PlayerPositionNode);
			this.campNodes = engine.getNodeList(CampNode);
			this.tribeUpgradeNodes = engine.getNodeList(TribeUpgradesNode);
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
			GlobalSignals.add(this, GlobalSignals.campBuiltSignal, this.onCampBuilt);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onImprovementBuilt);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.playerNodes = null;
			this.campNodes = null;
			this.tribeUpgradeNodes = null;
			this.engine = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			this.updateCurrentReputations(time);
		},
		
		slowUpdate: function () {
			if (GameGlobals.gameState.isPaused) return;
			this.updateTargetReputations();
		},
		
		updateCurrentReputations: function (time) {
			if (!this.campNodes.head) return;
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				var reputationComponent = campNode.reputation;
				var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
				
				reputationComponent.accSources = [];
				reputationComponent.targetValueSources = [];
				reputationComponent.accumulation = 0;
				
				this.applyReputationAccumulation(campNode, time);
				
				reputationComponent.value = Math.max(0, reputationComponent.value);
				reputationComponent.isAccumulating = campNode.camp.population > 0 || sectorImprovements.getTotal(improvementTypes.camp) > 0;
			}
		},
		
		updateTargetReputations: function () {
			if (!this.campNodes.head) return;
			let baseValue = GameGlobals.tribeHelper.getCurrentReputationBaseValue();
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				let reputationComponent = campNode.reputation;
				reputationComponent.targetValue = this.getTargetReputation(campNode, baseValue);
			}
		},
		
		getTargetReputation: function (campNode, baseValue) {
			let sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
			let sectorFeatures = campNode.entity.get(SectorFeaturesComponent);
			
			let storage = GameGlobals.resourcesHelper.getCurrentCampStorage(campNode.entity);
			let resources = storage ? storage.resources : null;
			
			let danger = GameGlobals.campHelper.getCampRaidDanger(campNode.entity);
			let levelComponent = GameGlobals.levelHelper.getLevelEntityForSector(campNode.entity).get(LevelComponent);
			
			let isSunlit = sectorFeatures.sunlit;
			
			let targetReputation = GameGlobals.campHelper.getTargetReputation(baseValue, sectorImprovements, resources, campNode.camp.population, levelComponent.populationFactor, danger, isSunlit);
			
			let sources = targetReputation.sources;
			let penalties = targetReputation.penalties;
			
			for (let key in sources) {
				campNode.reputation.addTargetValueSource(key, sources[key]);
			}
			
			for (let key in penalties) {
				this.logReputationPenalty(campNode, key, penalties[key]);
			}
			
			return targetReputation.value;
		},
		
		applyReputationAccumulation: function (campNode, time) {
			var reputationComponent = campNode.reputation;
			var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForSector(campNode.entity).get(LevelComponent);
			reputationComponent.value = reputationComponent.value || 0;
			reputationComponent.targetValue = reputationComponent.targetValue || 0;
			
			// improvements
			var accRadio = sectorImprovements.getCount(improvementNames.radio) * CampConstants.REPUTATION_PER_RADIO_PER_SEC * GameConstants.gameSpeedCamp;
			var accTargetDiff = reputationComponent.targetValue - reputationComponent.value;
			if (Math.abs(accTargetDiff) < 0.01) accTargetDiff = 0;
			if (accTargetDiff > 0) accTargetDiff = Math.min(10, Math.max(1, accTargetDiff));
			if (accTargetDiff < 0) accTargetDiff = Math.max(-10, Math.min(-1, accTargetDiff));
			var accTarget = (accTargetDiff < 0 ? accTargetDiff * 0.05 : accTargetDiff * 0.01) * GameConstants.gameSpeedCamp;
			
			// level population factor
			var accLevelPop = 0;
			if (accTarget > 0) {
				accLevelPop += accTarget * levelComponent.populationFactor - accTarget;
				accTarget *= levelComponent.populationFactor;
			}
			if (accRadio > 0) {
				accLevelPop += accRadio * levelComponent.populationFactor - accRadio;
				accRadio *= levelComponent.populationFactor;
			}
			
			// limits
			var accSpeed = accTarget + accRadio;
			accSpeed = Math.max(-0.05, accSpeed);
			accSpeed = Math.min(0.05, accSpeed);
					
			// set accumulation
			reputationComponent.addChange("Base", accTarget);
			reputationComponent.addChange("Radio", accRadio);
			if (accLevelPop) {
				reputationComponent.addChange("Level population", accLevelPop)
			}
			reputationComponent.accumulation += accSpeed;
			
			// apply accumulation
			reputationComponent.value += time * accSpeed;
			if (accTargetDiff === 0) {
				reputationComponent.value = reputationComponent.targetValue;
			} else if (reputationComponent.value > reputationComponent.targetValue && accTargetDiff > 0) {
				reputationComponent.value = reputationComponent.targetValue;
			}
			else if (reputationComponent.value < reputationComponent.targetValue && accTargetDiff < 0) {
				reputationComponent.value = reputationComponent.targetValue;
			}
		},
		
		onImprovementBuilt: function () {
			this.updateTargetReputations();
		},
		
		onCampBuilt: function () {
			this.updateTargetReputations();
		},
		
		logReputationPenalty: function (campNode, penaltyType, hasPenalty) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var campID = campNode.position.getPosition().toString();
			if (!(this.lastUpdatePenalties[campID])) {
				this.lastUpdatePenalties[campID] = {};
			}
			var hadPenalty = this.lastUpdatePenalties[campID][penaltyType];
			if (hasPenalty === hadPenalty) return;
			
			if (hasPenalty && !hadPenalty) {
				var playerPosition = this.playerNodes.head.position;
				var campPosition = campNode.position;
				if (playerPosition.level === campNode.position.level && playerPosition.sectorId() === campPosition.sectorId()) {
					var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
					switch (penaltyType) {
						case CampConstants.REPUTATION_PENALTY_TYPE_DEFENCES:
							logComponent.addMessage(LogConstants.MSG_ID_REPUTATION_PENALTY_DEFENCES, "People are anxious. They say the camp needs better defences.");
							break;
						case CampConstants.REPUTATION_PENALTY_TYPE_HOUSING:
							logComponent.addMessage(LogConstants.MSG_ID_REPUTATION_PENALTY_HOUSING, "People are unhappy because the camp is over-crowded.");
							break;
					}
				}
			}
			this.lastUpdatePenalties[campID][penaltyType] = hasPenalty;
		},
	});

	return ReputationSystem;
});
