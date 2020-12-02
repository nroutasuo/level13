define([
    'utils/MathUtils',
], function (
    MathUtils
) {
    var UIUtils = {
        
        debugAnimations: false,
        animData: {},
        
        animateOrSetNumber: function ($elem, animate, targetValue, suffix, roundingFunc) {
            if (animate) {
                UIUtils.animateNumber($elem, targetValue, suffix, roundingFunc);
            } else {
                UIUtils.setNumber($elem, targetValue, roundingFunc, suffix);
            }
        },
        
        animateNumber: function ($elem, targetValue, suffix, roundingFunc) {
            let animType = "number-anim";
            let roundedTargetValue = roundingFunc(targetValue);
            let currentTargetValue = parseFloat(UIUtils.getCurrentTarget($elem, animType));
            if (currentTargetValue === roundedTargetValue) {
                return;
            }
            let currentAnimId = UIUtils.getCurrentId($elem, animType);
            if (currentAnimId) {
                UIUtils.endAnimation($elem, animType, currentAnimId);
            }
            let isValueSet = $elem.attr("data-value-set");
            if (!isValueSet) {
                UIUtils.setNumber($elem, targetValue, roundingFunc, suffix);
                return;
            }
            
            let startValue = parseFloat($elem.text()) || 0;
            let diff = roundedTargetValue - startValue;
            if (diff === 0) {
                return;
            }
            
            let defaultDuration = 600;
            let maxValueSteps = 10;
            let numValueSteps = Math.ceil(Math.abs(diff));
            numValueSteps = Math.min(numValueSteps, maxValueSteps);
            let stepDuration = MathUtils.clamp(defaultDuration / numValueSteps, 50, 250);
            
            let multiple = 0;
            if (diff > 100) {
                multiple = 10;
            } else if (diff > 10) {
                multiple = 5;
            } else if (diff > 2 || (Number.isInteger(startValue) && Number.isInteger(roundedTargetValue))) {
                multiple = 1;
            }
            let roundingFuncStep = function (v) {
                return multiple >= 1 ? MathUtils.roundToMultiple(roundingFunc(v), multiple) : roundingFunc(v);
            };
            
            // TODO extend to support pattenrs, like "value / max"
            
            let isNegative = diff < 0;
            let stepValue = numValueSteps > 1 ? diff / numValueSteps : diff;
            
            let step = 0;
            let data = {
                roundingFunc: roundingFunc,
                suffix: suffix,
            };
            let animId = UIUtils.startAnimation($elem, animType, isNegative, targetValue, stepDuration, data, function () {
                step++;
                let currentValue = startValue + step * stepValue;
                if (step == numValueSteps) {
		            UIUtils.setNumber($elem, targetValue, roundingFunc, suffix);
                    UIUtils.endAnimation($elem, animType, animId, stepDuration);
                } else {
                    UIUtils.setNumber($elem, currentValue, roundingFuncStep, suffix);
                }
            });
        },
        
        animateNumberEnd: function ($elem) {
            let animType = "number-anim";
            let animId = UIUtils.getCurrentId($elem, animType);
            if (!animId) {
                return;
            }
            let data = UIUtils.animData[animId];
            UIUtils.setNumber($elem, data.targetValue, data.roundingFunc, data.suffix);
            UIUtils.endAnimation($elem, animType, animId, 0);
        },
        
        setNumber: function ($elem, value, roundingFunc, suffix) {
            suffix = suffix || "";
            $elem.text(roundingFunc(value) + suffix);
            $elem.attr("data-value-set", true);
        },
        
        getCurrentTarget: function ($elem, animType) {
            return $elem.attr("data-" + animType + "-target")
        },
        
        getCurrentId: function ($elem, animType) {
            return $elem.attr("data-" + animType + "-id");
        },
        
        startAnimation: function ($elem, animType, isNegative, targetValue, stepDuration, data, fn) {
            $elem.attr("data-" + animType + "-target", targetValue);
            $elem.attr("data-ui-animation", true);
            $elem.toggleClass("ui-anim", true);
            if (isNegative)
                $elem.toggleClass("ui-anim-negative", true);
            else
                $elem.toggleClass("ui-anim-positive", true);
            let animId = setInterval(function () { fn(); }, stepDuration);
            $elem.attr("data-" + animType + "-id", animId);
            data = data || {};
            data.animType = animType;
            data.stepDuration = stepDuration;
            data.targetValue = targetValue;
            UIUtils.animData[animId] = data;
            if (UIUtils.debugAnimations) log.i("[anim] " + animId + " start " + targetValue);
            return animId;
        },
        
        endAnimation: function ($elem, animType, animId, duration) {
            if (UIUtils.debugAnimations) log.i("[anim] " + animId + " end");
            clearInterval(animId);
            if (duration > 0) {
                setTimeout(function () {
                    UIUtils.clearAnimation($elem, animType, animId);
                }, duration);
            } else {
                UIUtils.clearAnimation($elem, animType, animId);
            }
        },
        
        clearAnimation: function ($elem, animType, animId) {
            // TODO check for multiple animations
            $elem.removeAttr("data-" + animType + "-id");
            $elem.removeAttr("data-ui-animation");
            $elem.toggleClass("ui-anim", false);
            $elem.toggleClass("ui-anim-negative", false);
            $elem.toggleClass("ui-anim-positive", false);
            delete UIUtils.animData[animId];
        },
        
        isAnimating: function ($elem) {
            return $elem.attr("data-ui-animation");
        },
        
    };

    return UIUtils;
});
