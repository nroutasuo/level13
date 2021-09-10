define( function () {
	var GameConstants = {

		gameSpeedCamp: 1,
		gameSpeedExploration: 1,
		isDebugVersion: false,
		isCheatsEnabled: false,
		isAutosaveEnabled: true,
		
		gameURL: "https://nroutasuo.github.io/level13",
		
		getFeedbackLinksHTML: function () {
			let result = "";
			var a = [ "level13game", "gmail.com" ];
			result += "<a href='https://github.com/nroutasuo/level13' target='github'>github</a>";
			result += " | ";
			result += "<a href='https://www.reddit.com/r/level13' target='reddit'>reddit</a>";
			result += " | ";
			result += "<a href='mailto:" + a.join("@") + "' rel='noopener noreferrer'>email</a>";
			return result;
		}

	};
	return GameConstants;
});
