define(['ash'], function (Ash) {

	let StorySegmentVO = Ash.Class.extend({
	
        storyID: "",
		segmentID: "",
        
        startTrigger: "",
        startConditions: {},
        
        completeTrigger: "",
        completeConditions: {},
        
        onStart: {}, // StoryEffectVO
        onComplete: {},  // StoryEffectVO

        possibleNextSegments: [], // segmentID
        startFromAny: false, // can be started from any previous segment if conditions met (allows skipping segments)

        constructor: function (storyID, segmentID) {
            this.storyID = storyID;
            this.segmentID = segmentID;
        },

	});

	return StorySegmentVO;
});
