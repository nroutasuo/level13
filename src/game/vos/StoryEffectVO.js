define(['ash'], function (Ash) {
	let StoryEffectVO = Ash.Class.extend({

		log: "", // textKey
		popup: {}, // title, text
		dialogue: null, // owner and storyFlag
		result: {}, // ResultVO
		storyFlags: {}, // id -> bool
		unlockFeature: null, // featureID
	});

	return StoryEffectVO;
});
