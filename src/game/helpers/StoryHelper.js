define(['ash', 
	'utils/ValueCache', 
	'game/GameGlobals', 
	'game/constants/LogConstants', 
	'game/constants/StoryConstants', 
	'game/constants/WorldConstants', 
	'game/constants/PlayerActionConstants',
	'game/components/player/ExplorersComponent',
], function (Ash, ValueCache, GameGlobals, LogConstants, StoryConstants, WorldConstants, PlayerActionConstants, ExplorersComponent) {
		
		let StoryHelper = Ash.Class.extend({
			
			endProjectUpgrades: [],
	
			constructor: function (engine) {},
			
			isReadyForLaunch: function (invalidateCache) {
				if (GameGlobals.gameState.isLaunched) return false;
				if (GameGlobals.gameState.numCamps < WorldConstants.CAMPS_TOTAL) return false;
				
				return ValueCache.getValue("IsReadyForLaunch", 5, invalidateCache ? true : false, () => {
					let reqsCheck = GameGlobals.playerActionsHelper.checkRequirements("launch", false);
					return reqsCheck.value >= 1 || reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_BUSY;
				});
			},
			
			isFinished: function () {
				return GameGlobals.gameState.isFinished;
			},
	
			getActiveStories: function () {
				let result = [];
	
				for (let storyID in GameGlobals.gameState.storyStatus) {
					let status = this.getStoryStatus(storyID);
					if (status == StoryConstants.storyStatuses.STARTED) {
						result.push(storyID);
					}
				}
	
				return result;
			},

			getPossibleNextSegmentsFromSegment: function (segmentVO) {
				if (!segmentVO) return [];
				let storyVO = StoryConstants.getStory(segmentVO.storyID);
				if (!storyVO) return [];
	
				let possibleNextSegments = segmentVO.possibleNextSegments;
	
				if (possibleNextSegments == null) {
					// default: next segment
					let index = storyVO.segments.indexOf(segmentVO);
					let nextSegmentIndex = index + 1;
					if (storyVO.segments.length > nextSegmentIndex) {
						return [ storyVO.segments[nextSegmentIndex] ];
					} else {
						return [];
					}
				} else if (possibleNextSegments.length == 0) {
					// none: end of story
					return [];
				} else {
					// specific segments: find by id
					let result = [];
					for (let i = 0; i < possibleNextSegments.length; i++) {
						let nextSegmentID = possibleNextSegments[i];
						result.push(storyVO.getSegment(nextSegmentID));
					}
					return result;
				}
			},

			getExplorerQuestStory: function (explorerVO) {
				if (!explorerVO) return null;
				
				let storyIDs = this.getExplorerQuestStories(explorerVO);

				if (storyIDs.length == 0) return null;

				// more urgent / shorter stories take precedence in case there's more than one
				if (storyIDs.indexOf("rescue") >= 0) return "rescue";
				if (storyIDs.indexOf("spirits") >= 0) return "spirits";
				if (storyIDs.indexOf("greenhouse") >= 0) return "greenhouse";

				return storyIDs[0];
			},

			getExplorerQuestStories: function (explorerVO) {
				if (!explorerVO) return [];
				let explorersComponent = GameGlobals.playerHelper.getPlayerEntity().get(ExplorersComponent);
				let storyIDs = [];

				for (let storyID in explorersComponent.quests) {
					let explorerIDs = explorersComponent.quests[storyID]
					if (explorerIDs.indexOf(explorerVO.id) >= 0) {
						storyIDs.push(storyID);
					}
				}

				return storyIDs;
			},

			startQuest: function (storyID, explorerVO) {
				if (!storyID) {
					log.w("no storyID defined for startQuest");
					return;
				}
				
				if (!explorerVO) {
					log.w("no explorer defined for startQuest");
					return;
				}

				let explorersComponent = GameGlobals.playerHelper.getPlayerEntity().get(ExplorersComponent);
				let explorerID = explorerVO.id;
				if (!explorersComponent.quests[storyID]) explorersComponent.quests[storyID] = [];
				explorersComponent.quests[storyID].push(explorerID);

				log.i("started quest: " + storyID + " " + explorerID);

				let questTextID = this.getQuestTextID(storyID);
				let textKey = "story.messages.quest_" + questTextID + "_started_message";
				
				let msg = {
					textKey: textKey,
					textParams: { "explorerName": explorerVO.name }
				}
				GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), msg, { visibility: LogConstants.MSG_VISIBILITY_GLOBAL });
			},

			endQuest: function(storyID, explorerVO) {
				if (!storyID) {
					log.w("no storyID defined for endQuest");
					return;
				}

				if (!explorerVO) {
					log.w("no explorer defined for endQuest");
					return;
				}

				let explorersComponent = GameGlobals.playerHelper.getPlayerEntity().get(ExplorersComponent);
				let explorerID = explorerVO.id;
				if (!explorersComponent.quests[storyID]) return;

				let explorerIDs = explorersComponent.quests[storyID];
				let index = explorerIDs.indexOf(explorerID);

				if (index >= 0) {
					explorerIDs.splice(index, 1);
					explorersComponent.quests[storyID] = explorerIDs;
				}
			},

			endQuests: function (storyID) {
				if (!storyID) {
					log.w("no storyID defined for endQuests");
					return;
				}

				let explorersComponent = GameGlobals.playerHelper.getPlayerEntity().get(ExplorersComponent);
				delete explorersComponent.quests[storyID];
			},

			getQuestTextID: function (storyID) {
				if (storyID === "greenhouse" && GameGlobals.gameState.getStoryFlag(StoryConstants.flags.GREENHOUSE_FOUND)) {
					return "greenhouse_fix";
				}
				return storyID;
			}
			
		});
	
		return StoryHelper;
	});
	