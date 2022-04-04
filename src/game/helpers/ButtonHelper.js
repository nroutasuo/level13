define(['ash', 'game/GameGlobals', 'game/GlobalSignals', 'game/constants/PlayerActionConstants'], function (Ash, GameGlobals, GlobalSignals, PlayerActionConstants ) {
	
	var ButtonHelper = Ash.Class.extend({

		constructor: function () {
		},

		getButtonSectorEntity: function ($button) {
			var sector = $button.attr("sector");
			var sectorEntity = null;
			if (sector) {
				var l = parseInt(sector.split(".")[0]);
				var sX = parseInt(sector.split(".")[1]);
				var sY = parseInt(sector.split(".")[2]);
				sectorEntity = GameGlobals.levelHelper.getSectorByPosition(l, sX, sY);
			}
			return sectorEntity;
		},

		isButtonActionDisabled: function ($button) {
			if ($button.hasClass("btn-meta")) return false;

			if ($button.attr("data-type") === "minus") {
				var input = $button.siblings("input");
				return parseInt(input.val()) <= parseInt(input.attr("min"));
			}

			if ($button.attr("data-type") === "plus") {
				var input = $button.siblings("input");
				return parseInt(input.val()) >= parseInt(input.attr("max"));
			}

			if (!($button.hasClass("action"))) return false;

			var action = $button.attr("action");
			if (!action) return false;
			
			var sectorEntity = GameGlobals.buttonHelper.getButtonSectorEntity($button);
			var reqsCheck = GameGlobals.playerActionsHelper.checkRequirements(action, false, sectorEntity);
			return reqsCheck.value < 1 && reqsCheck.reason !== PlayerActionConstants.UNAVAILABLE_REASON_LOCKED_RESOURCES;
		},

		isButtonActionDisabledVision: function ($button, playerVision) {
			var action = $button.attr("action");
			if (action) {
				var requirements = GameGlobals.playerActionsHelper.getReqs(action);
				if (requirements && requirements.vision) return (playerVision < requirements.vision[0]);
			}
			return false;
		},

		isButtonActionDisabledResources: function (button) {
			var action = $(button).attr("action");
			return GameGlobals.playerActionsHelper.checkCosts(action, false) < 1;
		},

		hasButtonCooldown: function ($button) {
			return ($button.attr("data-hasCooldown") === "true");
		},

		hasButtonDuration: function (button) {
			return ($(button).attr("data-isInProgress") === "true");
		},
		
		updateButtonDisabledStates: function (scope, forceDisable) {
			$.each($(scope + " button.action"), function () {
				GameGlobals.buttonHelper.updateButtonDisabledState($(this), null, 0, forceDisable);
			});
		},
		
		updateButtonDisabledState: function ($button, $buttonContainer, playerVision, forceDisable) {
			let wasDisabled = $button.hasClass("btn-disabled");
			
			let disabledBase = this.isButtonActionDisabled($button);
			let disabledVision = !forceDisable && this.isButtonActionDisabledVision($button, playerVision);
			let disabledBasic = !disabledVision && disabledBase;
			let disabledResources = !disabledVision && !disabledBasic && this.isButtonActionDisabledResources($button);
			let disabledCooldown = !disabledVision && !disabledBasic && !disabledResources && this.hasButtonCooldown($button);
			let disabledDuration = !disabledVision && !disabledBasic && !disabledResources && !disabledCooldown && this.hasButtonDuration($button);
			let isDisabled = disabledBasic || disabledVision || disabledResources || disabledCooldown || disabledDuration;
			
			$button.toggleClass("btn-disabled", isDisabled);
			$button.toggleClass("btn-disabled-basic", disabledBasic);
			$button.toggleClass("btn-disabled-vision", disabledVision);
			if ($buttonContainer) $buttonContainer.toggleClass("btn-disabled-vision", disabledVision);
			$button.toggleClass("btn-disabled-resources", !disabledVision && !disabledBasic && disabledResources);
			$button.toggleClass("btn-disabled-cooldown", disabledCooldown || disabledDuration);
			$button.attr("disabled", isDisabled || forceDisable);
			
			if (wasDisabled != isDisabled) {
				let action = $button.attr("action");
				if (action) {
					GlobalSignals.buttonStateChangedSignal.dispatch(action, !isDisabled);
				}
			}
			
			return disabledBase || disabledVision;
		}
		
		
	});

	return ButtonHelper;
});
