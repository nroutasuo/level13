define(function () {
	
	var ConsoleLogger = {
		logInfo: true,
		logWarnings: true,
		logErrors: true,
	}
	
	window.log = {
		
		i: function (msg, context, ...style) {
			if (!ConsoleLogger.logInfo) return;
			var context = this.parseContext(context);
			
			var m = "";
			var o = null;
			if (typeof(msg) == "object") {
				o = msg;
			} else {
				m = msg;
			}
			
			if (context) {
				if (m.length > 0) {
					m = " " + m;
				}
				m = "[" + context + "]" + m;
			}
			
			if (style && style.length > 0) {
				if (style.length == 1) {
					console.log("%c" + m, style[0]);
				} else {
					console.log(m, ...style);
				}
			} else {
				if (o) {
					console.log(m, o);
				} else {
					console.log(m);
				}
			}
		},
			
		w: function (msg, context) {
			if (!ConsoleLogger.logWarnings) return;
			var context = this.parseContext(context);
			var m = msg;
			if (context) {
				m = "[" + context + "] " + m;
			}
			console.warn(m);
			if (typeof(msg) == "object" && typeof(m) != "object") {
				console.warn(msg);
			}
		},
			
		e: function (msg, context) {
			if (!ConsoleLogger.logErrors) return;
			var context = this.parseContext(context);
			var m = msg;
			if (context) {
				m = "[" + context + "] " + m;
			}
			console.error(m);
			if (typeof(msg) == "object" && typeof(m) != "object") {
				console.error(msg);
			}
		},
		
		parseContext: function (c) {
			if (!c) return c;
			if (c.context) return c.context;
			if (typeof c === 'string' || c instanceof String) return c;
			if (c.constructor) return c.constructor.name;
			return c;
		}

	};
	
	return ConsoleLogger;
});
