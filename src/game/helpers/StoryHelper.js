define(['ash', 'utils/ValueCache', 'game/GameGlobals', 'game/constants/StoryConstants', 'game/constants/WorldConstants', 'game/constants/PlayerActionConstants'],
	function (Ash, ValueCache, GameGlobals, StoryConstants, WorldConstants, PlayerActionConstants) {
		
		let StoryHelper = Ash.Class.extend({
			
			endProjectUpgrades: [],
	
			constructor: function (engine) {},
			
			isReadyForLaunch: function (invalidateCache) {
				if (GameGlobals.gameState.isLaunched) return false;
				if (GameGlobals.gameState.numCamps < WorldConstants.CAMPS_TOTAL) return false;
				
				return ValueCache.getValue("IsReadyForLaunch", 5, invalidateCache ? true : false, () => {
					let reqsCheck = GameGlobals.playerActionsHelper.checkRequirements("launch", false);
					return reqsCheck.value >= 1 || reqsCheck.baseReason == PlayerActionConstants.DISABLED_REASON_BUSY;
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
			
		});
	
		return StoryHelper;
	});
	