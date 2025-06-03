define(['ash'], function (Ash) {
	let StoryEffectVO = Ash.Class.extend({

		log: null, // textKey, visibility
		popup: {}, // title, text
		dialogue: null, // owner and storyFlag
		result: {}, // ResultVO
		storyFlags: {}, // id -> bool
		unlockFeature: null, // featureID
	});

	return StoryEffectVO;
});
