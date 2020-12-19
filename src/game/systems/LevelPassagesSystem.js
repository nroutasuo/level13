// A system that updates a Levels's LevelPassagesComponent based on sectors on the level
define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/nodes/level/LevelNode',
    'game/nodes/sector/SectorNode',
    'game/components/common/PositionComponent',
    'game/components/level/LevelPassagesComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash,
        GameGlobals,
        GlobalSignals,
		LevelNode,
		SectorNode,
		PositionComponent,
		LevelPassagesComponent,
		PassagesComponent,
		SectorImprovementsComponent) {
    var LevelPassagesSystem = Ash.System.extend({

		levelNodes: null,
		sectorNodes: null,

		constructor: function () { },

		// TODO also check when sector node improved, or passage appears (due to occurrence?)

		addToEngine: function (engine) {
			var sys = this;
			this.levelNodes = engine.getNodeList(LevelNode);
			this.sectorNodes = engine.getNodeList(SectorNode);
			GlobalSignals.gameStateReadySignal.add(function () {
				sys.updateAllSectors();
			});
			GlobalSignals.improvementBuiltSignal.add(function () {
				sys.updateAllSectors();
			});
		},

        removeFromEngine: function (engine) {
			this.levelNodes = null;
			this.sectorNodes = null;
		},

		updateAllSectors: function () {
			for (var node = this.sectorNodes.head; node; node = node.next) {
				this.updateSector(node.entity);
			}
		},

		updateSector: function (entity) {
			var passagesComponent = entity.get(PassagesComponent);
			var passageUp = passagesComponent.passageUp;
			var passageDown = passagesComponent.passageDown;
			if (passageUp == null && passageDown == null) return;

			var positionComponent = entity.get(PositionComponent);
			var improvementsComponent = entity.get(SectorImprovementsComponent);
			var s = positionComponent.sectorId();
			var passageUpBuilt =
				improvementsComponent.getCount(improvementNames.passageUpStairs) > 0 ||
				improvementsComponent.getCount(improvementNames.passageUpHole) > 0 ||
				improvementsComponent.getCount(improvementNames.passageUpElevator) > 0;
			var passageDownBuilt =
				improvementsComponent.getCount(improvementNames.passageDownStairs) > 0 ||
				improvementsComponent.getCount(improvementNames.passageUpHole) > 0 ||
				improvementsComponent.getCount(improvementNames.passageUpElevator) > 0;
			var levelEntity = GameGlobals.levelHelper.getLevelEntityForSector(entity);
			this.updateLevelPassagesComponent(levelEntity, s, passageUp, passageUpBuilt, passageDown, passageDownBuilt);
		},

		updateLevelPassagesComponent: function (levelEntity, s, passageUp, passageUpBuilt, passageDown, passageDownBuilt) {
			var levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			if (typeof passageUp == "undefined") passageUp = null;
			if (typeof passageDown == "undefined") passageDown = null;
			levelPassagesComponent.passagesUp[s] = passageUp;
			levelPassagesComponent.passagesUpBuilt[s] = passageUpBuilt;
			levelPassagesComponent.passagesDown[s] = passageDown;
			levelPassagesComponent.passagesDownBuilt[s] = passageDownBuilt;
		},

    });

    return LevelPassagesSystem;
});
