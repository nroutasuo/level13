define(function () {
    
    var ConsoleLogger = {
        logInfo: true,
        logWarnings: true,
        logErrors: true,
    }
    
    window.log = {
        
        i: function (msg, context) {
            if (!ConsoleLogger.logInfo) return;
            if (context) {
                console.log("[" + context + "] " + msg);
            } else {
                console.log(msg);
            }
        },
            
        w: function (msg, context) {
            if (!ConsoleLogger.logWarnings) return;
            if (context) {
                console.warn("[" + context + "] " + msg);
            } else {
                console.warn(msg);
            }
        },
            
        e: function (msg, context) {
            if (!ConsoleLogger.logErrors) return;
            if (context) {
                console.error();("[" + context + "] " + msg);
            } else {
                console.error(msg);
            }
        },

    };
    
    return ConsoleLogger;
});
