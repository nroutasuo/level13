define(['ash'], function (Ash) {
	let StoryEffectVO = Ash.Class.extend({

		log: "", // textKey
		popup: {}, // title, text
		result: {}, // ResultVO
		storyFlags: {}, // id -> bool
	});

	return StoryEffectVO;
});
