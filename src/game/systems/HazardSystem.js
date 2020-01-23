// Add and remove hazard-based perks to the player based on ther location
define([
    'ash',
    'game/constants/HazardConstants',
    'game/constants/PerkConstants',
    'game/constants/GameConstants',
    'game/constants/LogConstants',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode',
    'game/components/common/LogMessagesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/player/PlayerActionComponent'
], function (Ash,
    HazardConstants, PerkConstants, GameConstants, LogConstants,
    PlayerPositionNode, PlayerLocationNode,
    LogMessagesComponent, SectorFeaturesComponent, ItemsComponent, PerksComponent, PlayerActionComponent) {
    
    var HazardSystem = Ash.System.extend({
        
        playerNodes: null,
        locationNodes: null,
        
        constructor: function () {
        },
        
        addToEngine: function (engine) {
            this.engine = engine;
            this.playerNodes = engine.getNodeList(PlayerPositionNode);
            this.locationNodes = engine.getNodeList(PlayerLocationNode);
        },
        
        removeFromEngine: function (engine) {
            this.playerNodes = null;
            this.locationNodes = null;
            this.engine = null;
        },
        
        update: function (time) {
            if (!this.locationNodes.head) return;
            this.addPerks();
            this.updatePerks(time);
        },
        
        addPerks: function () {
            var featuresComponent = this.locationNodes.head.entity.get(SectorFeaturesComponent);
            var itemsComponent = this.playerNodes.head.entity.get(ItemsComponent);
            var isAffectedByHazard = HazardConstants.isAffectedByHazard(featuresComponent, itemsComponent);
            if (isAffectedByHazard) {
                var perksComponent = this.playerNodes.head.entity.get(PerksComponent);
                var hazardPerks = HazardConstants.getPerksForSector(featuresComponent, itemsComponent);
                for (var i = 0; i < hazardPerks.length; i++) {
                    var perkID = hazardPerks[i];
                    var playerPerk = perksComponent.getPerk(perkID);
                    if (!playerPerk) {
                        perksComponent.addPerk(PerkConstants.getPerk(perkID).clone());
                        this.addAddedPerkLogMessage(perkID);
                    } else {
                        playerPerk.effectTimer = -1;
                    }
                }
            }
        },
        
        updatePerks: function (time) {
            // TODO generic effect timer system?
            
            var featuresComponent = this.locationNodes.head.entity.get(SectorFeaturesComponent);
            var busyComponent =  this.playerNodes.head.entity.get(PlayerActionComponent);
            var itemsComponent = this.playerNodes.head.entity.get(ItemsComponent);
            var perksComponent = this.playerNodes.head.entity.get(PerksComponent);
            
            var hazardPerksForSector = HazardConstants.getPerksForSector(featuresComponent, itemsComponent);
            var hazardPerksAll = [ PerkConstants.perkIds.hazardCold, PerkConstants.perkIds.hazardPoison, PerkConstants.perkIds.hazardRadiation];
            for (var i = 0; i < hazardPerksAll.length; i++) {
                var perkID = hazardPerksAll[i];
                if (hazardPerksForSector.indexOf(perkID) < 0) {
                    var playerPerk = perksComponent.getPerk(perkID);
                    if (playerPerk) {
                        if (playerPerk.effectTimer === -1) {
                            // add perk
                            playerPerk.effectTimer = (1 - playerPerk.effect) * 100;
                            this.addTimedPerkLogMessage(perkID);
                        } else {
                            // adjust perk timer
                            var isResting = busyComponent && busyComponent.getLastActionName() == "use_in_home";
                            var restFactor = isResting ? PerkConstants.PERK_RECOVERY_FACTOR_REST : 1;
                            playerPerk.effectTimer -= time * restFactor * GameConstants.gameSpeedExploration;
                            if (playerPerk.effectTimer < 0) {
                                // remove perk
                                perksComponent.removeItemsById(playerPerk.id);
                                this.addRemovedPerkLogMessage(perkID);
                            }
                        }
                    }
                }
            }
        },
        
        addAddedPerkLogMessage: function (perkID) {
            var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
            var msg = "";
            switch (perkID) {
                case PerkConstants.perkIds.hazardCold:
                    msg = "It's unbearably cold.";
                    break;
                    
                case PerkConstants.perkIds.hazardPoison:
                    msg = "The air here is toxic.";
                    break;
                    
                case PerkConstants.perkIds.hazardRadiation:
                    msg = "Feeling nauseous.";
                    break;
            }
            logComponent.addMessage(LogConstants.MSG_ID_ADD_HAZARD_PERK, msg);
        },
        
        addTimedPerkLogMessage: function (perkID) {
            var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
            var msg = "";
            switch (perkID) {
                case PerkConstants.perkIds.hazardCold:
                    msg = "Warmer here.";
                    break;
                default:
                    msg = "Safer here.";
                    break;
            }
            logComponent.addMessage(LogConstants.MSG_ID_TIME_HAZARD_PERK, msg);
        },
        
        addRemovedPerkLogMessage: function (perkID) {
            var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
            var msg = "";
            switch (perkID) {
                case PerkConstants.perkIds.hazardCold:
                    msg = "Feeling warm again.";
                    break;
                    
                case PerkConstants.perkIds.hazardPoison:
                    msg = "Feeling better again.";
                    break;
                    
                case PerkConstants.perkIds.hazardRadiation:
                    msg = "Feeling better again.";
                    break;
            }
            logComponent.addMessage(LogConstants.MSG_ID_REMOVE_HAZARD_PERK, msg);
        },

    });

    return HazardSystem;
});
