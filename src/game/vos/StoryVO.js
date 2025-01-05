define(['ash'], function (Ash) {

	let StoryVO = Ash.Class.extend({

        storyID: "",
        startTrigger: "",
        startConditions: {},
        onStart: {}, // StoryEffectVO
        onComplete: {},  // StoryEffectVO
        segments: [], // StorySegmentVO

        constructor: function (storyID) {
            this.storyID = storyID;
        },

        getSegment: function (segmentID) {
            for (let i = 0; i < this.segments.length; i++) {
                let segmentVO = this.segments[i];
                if (segmentVO.segmentID == segmentID) return segmentVO;
            }

            return null;
        },

        getSegmentIndex: function (segmentID) {
            for (let i = 0; i < this.segments.length; i++) {
                let segmentVO = this.segments[i];
                if (segmentVO.segmentID == segmentID) return i;
            }

            return -1;
        },

	});

	return StoryVO;
});
