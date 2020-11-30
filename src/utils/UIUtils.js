define([
    'utils/MathUtils',
], function (
    MathUtils
) {
    var UIUtils = {
        
        debugAnimations: false,
        
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
            
            let defaultDuration = 800;
            let maxValueSteps = 10;
            let numValueSteps = Math.ceil(Math.abs(diff));
            numValueSteps = Math.min(numValueSteps, maxValueSteps);
            let stepDuration = MathUtils.clamp(defaultDuration / numValueSteps, 50, 300);
            
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
            let animId = UIUtils.startAnimation($elem, animType, isNegative, targetValue, stepDuration, function () {
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
        
        startAnimation: function ($elem, animType, isNegative, targetValue, stepDuration, fn) {
            $elem.attr("data-" + animType + "-target", targetValue);
            $elem.attr("data-ui-animation", true);
            $elem.toggleClass("ui-anim", true);
            if (isNegative)
                $elem.toggleClass("ui-anim-negative", true);
            else
                $elem.toggleClass("ui-anim-positive", true);
            let animId = setInterval(function () { fn(); }, stepDuration);
            $elem.attr("data-" + animType + "-id", animId);
            if (UIUtils.debugAnimations) log.i("[anim] " + animId + " start " + targetValue);
            return animId;
        },
        
        endAnimation: function ($elem, animType, animId, stepDuration) {
            if (UIUtils.debugAnimations) log.i("[anim] " + animId + " end");
            clearInterval(animId);
            let finalStepDuration = MathUtils.clamp(stepDuration, 100, 500);
            setTimeout(function () {
                $elem.removeAttr("data-" + animType + "-id");
                $elem.removeAttr("data-ui-animation");
                // TODO check for multiple animations
                $elem.toggleClass("ui-anim", false);
                $elem.toggleClass("ui-anim-negative", false);
                $elem.toggleClass("ui-anim-positive", false);
            }, finalStepDuration);
        },
        
        isAnimating: function ($elem) {
            return $elem.attr("data-ui-animation");
        },
        
    };

    return UIUtils;
});
