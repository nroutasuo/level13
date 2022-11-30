define([
	'utils/MathUtils',
], function (
	MathUtils
) {
	var UIAnimations = {
		
		debugAnimations: false,
		animData: {},
		
		shouldAnimateChange: function (previousValue, currentValue, previousTime, currentTime, accumulationPerSec) {
			if (!previousTime) {
				return false;
			}
			let change = (currentValue - previousValue);
			if (change == 0) {
				return false;
			}
			if (accumulationPerSec == 0) {
				return true;
			}
			let secondsPassed = currentTime - previousTime;
			let changePerSec = change / secondsPassed;
			return Math.abs(changePerSec - accumulationPerSec) > 0.5;
		},
		
		animateOrSetNumber: function ($elem, animate, targetValue, suffix, flipNegative, roundingFunc) {
			if (animate) {
				UIAnimations.animateNumber($elem, targetValue, suffix, flipNegative, roundingFunc);
			} else {
				UIAnimations.setNumber($elem, targetValue, roundingFunc, suffix);
			}
		},
		
		animateNumber: function ($elem, targetValue, suffix, flipNegative, roundingFunc) {
			roundingFunc = roundingFunc || ((num) => num);
			let animType = "number-anim";
			let roundedTargetValue = UIAnimations.parseRawNumber(roundingFunc(targetValue));
			let currentTargetValue = parseFloat(UIAnimations.getCurrentTarget($elem, animType));
			if (currentTargetValue === roundedTargetValue) {
				return;
			}
			let currentAnimId = UIAnimations.getCurrentId($elem, animType);
			if (currentAnimId) {
				UIAnimations.endAnimation($elem, animType, currentAnimId);
			}
			let isValueSet = $elem.attr("data-value-set");
			if (!isValueSet) {
				UIAnimations.setNumber($elem, targetValue, roundingFunc, suffix);
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
			if (flipNegative) isNegative = !isNegative;
			let stepValue = numValueSteps > 1 ? diff / numValueSteps : diff;
			
			let step = 0;
			let data = {
				roundingFunc: roundingFunc,
				suffix: suffix,
			};
			let animId = UIAnimations.startAnimation($elem, animType, isNegative, targetValue, stepDuration, data, function () {
				step++;
				let currentValue = startValue + step * stepValue;
				if (step == numValueSteps) {
					UIAnimations.setNumber($elem, targetValue, roundingFunc, suffix);
					UIAnimations.endAnimation($elem, animType, animId, stepDuration);
				} else {
					UIAnimations.setNumber($elem, currentValue, roundingFuncStep, suffix);
				}
			});
		},
		
		animateNumberEnd: function ($elem) {
			let animType = "number-anim";
			let animId = UIAnimations.getCurrentId($elem, animType);
			if (!animId) {
				return;
			}
			let data = UIAnimations.animData[animId];
			UIAnimations.setNumber($elem, data.targetValue, data.roundingFunc, data.suffix);
			UIAnimations.endAnimation($elem, animType, animId, 0);
		},
		
		setNumber: function ($elem, value, roundingFunc, suffix) {
			suffix = suffix || "";
			$elem.text(roundingFunc(value) + "" + suffix);
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
			UIAnimations.animData[animId] = data;
			if (UIAnimations.debugAnimations) log.i("[anim] " + animId + " start " + targetValue);
			return animId;
		},
		
		endAnimation: function ($elem, animType, animId, duration) {
			if (UIAnimations.debugAnimations) log.i("[anim] " + animId + " end");
			clearInterval(animId);
			if (duration > 0) {
				setTimeout(function () {
					UIAnimations.clearAnimation($elem, animType, animId);
				}, duration);
			} else {
				UIAnimations.clearAnimation($elem, animType, animId);
			}
		},
		
		clearAnimation: function ($elem, animType, animId) {
			// TODO check for multiple animations
			$elem.removeAttr("data-" + animType + "-id");
			$elem.removeAttr("data-ui-animation");
			$elem.toggleClass("ui-anim", false);
			$elem.toggleClass("ui-anim-negative", false);
			$elem.toggleClass("ui-anim-positive", false);
			delete UIAnimations.animData[animId];
		},
		
		isAnimating: function ($elem) {
			return $elem.attr("data-ui-animation");
		},
		
		parseRawNumber: function (numberString) {
			let s = numberString;
			if (typeof numberString == "string") {
				s = numberString.replaceAll(/\D/g,'');
			}
			return parseFloat(s)
		}
		
	};

	return UIAnimations;
});
