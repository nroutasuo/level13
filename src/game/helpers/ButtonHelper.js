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
		
		isButtonHardDisabled: function ($button) {
			if (!this.isButtonActionDisabled($button)) return false;
			
			let action = $button.attr("action");
			let sectorEntity = GameGlobals.buttonHelper.getButtonSectorEntity($button);
			let reqsCheck = GameGlobals.playerActionsHelper.checkRequirements(action, false, sectorEntity);
			return reqsCheck.value < 1 && reqsCheck.reason !== PlayerActionConstants.DISABLED_REASON_LOCKED_RESOURCES;
		},

		isButtonActionDisabled: function ($button) {
			if ($button.hasClass("btn-meta")) return false;

			if ($button.attr("data-type") === "minus") {
				let input = $button.siblings("input");
				return parseInt(input.val()) <= parseInt(input.attr("min"));
			}

			if ($button.attr("data-type") === "plus") {
				let input = $button.siblings("input");
				return parseInt(input.val()) >= parseInt(input.attr("max"));
			}

			if (!($button.hasClass("action"))) return false;

			let action = $button.attr("action");
			if (!action) return false;
			
			let sectorEntity = GameGlobals.buttonHelper.getButtonSectorEntity($button);
			return !GameGlobals.playerActionsHelper.checkAvailability(action, false, sectorEntity, true);
		},

		isButtonActionDisabledVision: function ($button, playerVision) {
			var action = $button.attr("action");
			if (action) {
				var requirements = GameGlobals.playerActionsHelper.getReqs(action);
				if (requirements && requirements.vision) return (playerVision < requirements.vision[0]);
			}
			return false;
		},
		
		isButtonActionDisabledResources: function ($button) {
			let action = $button.attr("action");
			let isHardDisabled = this.isButtonHardDisabled($button);
			let isActionDisabledByCosts = GameGlobals.playerActionsHelper.checkCosts(action, false) < 1;
			let isActionDisabledByStorage = GameGlobals.playerActionsHelper.checkCostsVersusStorage(action) < 1;
			return !isHardDisabled && !isActionDisabledByStorage && isActionDisabledByCosts;
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
			forceDisable = forceDisable || false;
			
			let wasDisabled = $button.hasClass("btn-disabled");
			let action = $button.attr("action");
			
			let isHardDisabled = this.isButtonHardDisabled($button);
			let isActionDisabled = this.isButtonActionDisabled($button);
			
			let disabledVision = !forceDisable && this.isButtonActionDisabledVision($button, playerVision);
			let disabledResources = !forceDisable && !disabledVision && this.isButtonActionDisabledResources($button);
			let disabledBasic = !disabledVision && !disabledResources && isActionDisabled;
			let disabledCooldown = !disabledVision && !disabledResources && !disabledBasic && this.hasButtonCooldown($button);
			let disabledDuration = !disabledVision && !disabledResources && !disabledBasic && !disabledCooldown && this.hasButtonDuration($button);
			let isDisabled = disabledBasic || disabledVision || disabledResources || disabledCooldown || disabledDuration;
			
			let showDisabled = isDisabled || forceDisable;
			
			$button.toggleClass("btn-disabled", showDisabled);
			
			$button.toggleClass("btn-disabled-basic", disabledBasic);
			$button.toggleClass("btn-disabled-vision", disabledVision);
			if ($buttonContainer) $buttonContainer.toggleClass("btn-disabled-vision", disabledVision);
			$button.toggleClass("btn-disabled-resources", !disabledVision && !disabledBasic && disabledResources);
			$button.toggleClass("btn-disabled-cooldown", disabledCooldown || disabledDuration);
			
			$button.attr("disabled", showDisabled);
			
			if (wasDisabled != isDisabled) {
				if (action) {
					GlobalSignals.buttonStateChangedSignal.dispatch(action, !isDisabled);
				}
			}
			
			return isHardDisabled;
		}
		
		
	});

	return ButtonHelper;
});
