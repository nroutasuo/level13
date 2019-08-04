define(function () {
    
    var ConsoleLogger = {
        logInfo: true,
        logWarnings: true,
        logErrors: true,
    }
    
    window.log = {
        
        i: function (msg, context) {
            if (!ConsoleLogger.logInfo) return;
            var context = this.parseContext(context);
            if (context) {
                console.log("[" + context + "] " + msg);
            } else {
                console.log(msg);
            }
        },
            
        w: function (msg, context) {
            if (!ConsoleLogger.logWarnings) return;
            var context = this.parseContext(context);
            if (context) {
                console.warn("[" + context + "] " + msg);
            } else {
                console.warn(msg);
            }
        },
            
        e: function (msg, context) {
            if (!ConsoleLogger.logErrors) return;
            var context = this.parseContext(context);
            if (context) {
                console.error();("[" + context + "] " + msg);
            } else {
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
