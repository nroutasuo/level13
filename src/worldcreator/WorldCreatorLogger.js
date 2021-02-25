define(['core/ConsoleLogger'], function (ConsoleLogger) {

	var WorldCreatorLogger = {
		
		context: "world",
		warningStyle: "background: #fffff0; color: #111100",
		
		start: function (seed) {
			if (!ConsoleLogger.logInfo) return;
			this.groupCollapsed("World " + seed);
		},
		
		end: function () {
			if (!ConsoleLogger.logInfo) return;
			this.groupEnd();
		},
		
		i: function (msg) {
			if (!ConsoleLogger.logInfo) return;
			log.i(msg, WorldCreatorLogger.context)
		},
		
		w: function (msg) {
			if (!ConsoleLogger.logInfo) return;
			log.i("WARN: " + msg, WorldCreatorLogger.context, WorldCreatorLogger.warningStyle)
		},
		
		s: function (msg, ...style) {
			if (!ConsoleLogger.logInfo) return;
			log.i(msg, WorldCreatorLogger.context, ...style)
		},
		
		groupCollapsed: function (header) {
			if (!ConsoleLogger.logInfo) return;
			console.groupCollapsed("[" + WorldCreatorLogger.context + "]", header);
		},
		
		groupEnd: function () {
			if (!ConsoleLogger.logInfo) return;
			console.groupEnd();
		}
		
	};

	return WorldCreatorLogger;
});
