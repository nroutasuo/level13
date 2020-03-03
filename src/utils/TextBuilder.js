// builds texts (user-facing strings) out of text templates and text parameters

// template: "A former [a-sectortype] sector where [n-buildings] and [n-buildings] lie in ruins"
// params: { a-sectortype: "industrial", n-buildings: [ "factories", "warehouses" ] }
// result: "A former industrial sector wheere factories and warehouses lie in ruins"

define(function () {
    var TextBuilder = {
        
        build: function (template, params) {
            var result = template;
            log.i(result);
            var vars = template.match(/\[\S*\]/g);
            if (vars) {
                var usedParams = {};
                for (var i = 0; i < vars.length; i++) {
                    var v = vars[i].substring(1, vars[i].length - 1);
                    var param = this.getNextParam(v, params, usedParams);
                    result = result.replace(vars[i], param);
                    log.i(result);
                }
            }
            return result;
        },
        
        getNextParam: function (v, params, usedParams) {
            var p = params[v];
            var t = typeof p;
            var result = "";
            if (!usedParams[v]) usedParams[v] = 0;
            var ordinal = usedParams[v] || 0;
            if (t == "string") {
                result = p;
            } else if (t == "object") {
                var index = ordinal % p.length;
                result = p[index];
            }
            usedParams[v]++;
            return result;
        }
        
    };
    return TextBuilder;
});
