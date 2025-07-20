// A class that checks raw user input from the DOM and passes game-related actions to PlayerActionFunctions
define(['ash',
	'text/Text',
	'core/ExceptionHandler',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/CheatConstants',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/EnemyConstants',
	'game/constants/UIConstants',
	'game/constants/ItemConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/helpers/ui/UIPopupManager',
	'game/vos/ResourcesVO',
	'game/vos/PositionVO',
	'utils/ActionButton',
	'utils/MathUtils',
	'utils/StringUtils',
],
	function (Ash, Text, ExceptionHandler, GameGlobals, GlobalSignals, CheatConstants, GameConstants, CampConstants, EnemyConstants, UIConstants, ItemConstants, PlayerActionConstants, PlayerStatConstants, UIPopupManager, ResourcesVO, PositionVO, ActionButton, MathUtils, StringUtils) {

		// TODO separate generic utils and tabs handling to a different file

		var UIFunctions = Ash.Class.extend({

			context: "UIFunctions",
			popupManager: null,

			hotkeys: {},

			texts: [],

			HOTKEY_DEFAULT_MODIFIER: "HOTKEY_DEFAULT_MODIFIER",
			HOTKEY_DEFAULT_MODIFIER_KEY: "shiftKey",

			elementIDs: {
				tabs: {
					bag: "switch-bag",
					explorers: "switch-explorers",
					projects: "switch-projects",
					map: "switch-map",
					trade: "switch-trade",
					in: "switch-in",
					out: "switch-out",
					upgrades: "switch-upgrades",
					world: "switch-world",
					milestones: "switch-milestones",
					embark: "switch-embark"
				},
			},

			constructor: function () {
				this.popupManager = new UIPopupManager(this);
			},
			
			init: function () {
				this.registerHotkeys();
				this.generateElements();
				this.hideElements();
				this.registerListeners();
				this.registerGlobalMouseEvents();
			},

			registerListeners: function () {
				var uiFunctions = this;

				$(window).resize(this.onResize);

				// Switch tabs
				let onTabClickedInternal = function (e) {
					let target = e.currentTarget;
					if (!($(target).hasClass("disabled"))) {
						GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
						uiFunctions.onTabClicked(target.id);
					}
				};
				$.each($("#switch-tabs li"), function () {
					$(this).click(onTabClickedInternal);
					$(this).keydown((e) => uiFunctions.onButtonLikeElementKeyDown(e, onTabClickedInternal));
				});

				// Collapsible divs
				this.registerCollapsibleContainerListeners("");

				// Steppers and stepper buttons
				this.registerStepperListeners("");

				// Meta/non-action buttons
				$("#btn-save").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					GlobalSignals.saveGameSignal.dispatch(GameConstants.SAVE_SLOT_DEFAULT, true);
				});
				$("#btn-restart").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					uiFunctions.onRestartButton();
				});
				$("#btn-more").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					let wasVisible = $("#game-options-extended").is(":visible");
					uiFunctions.showGameOptions(!wasVisible);
				});
				$("#btn-importexport").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					uiFunctions.showManageSave();
				});
				$("#btn-stats").click(function (e) {
					uiFunctions.showStatsPopup();
				});
				$("#game-stats-popup-close").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					uiFunctions.popupManager.closePopup("game-stats-popup");
				});
				$("#btn-settings").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					let options = { isMeta: true, isDismissable: true };
					uiFunctions.showSpecialPopup("settings-popup", options);
				});
				$("#settings-popup-close").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					uiFunctions.popupManager.closePopup("settings-popup");
				});
				$("#btn-info").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					uiFunctions.showInfoPopup("Level 13", uiFunctions.getGameInfoDiv(), null, null, null, true, true);
				});
				$("#out-action-fight-close").click(this.onMetaButtonClicked);
				$("#out-action-fight-continue").click(this.onMetaButtonClicked);

				$("#in-assign-workers input.amount").change(function (e) {
					var assignment = {};
					for (var key in CampConstants.workerTypes) {
						assignment[key] = parseInt($("#stepper-" + key + " input").val());
					}
					GameGlobals.playerActionFunctions.assignWorkers(null, assignment);
				});

				// Buttons: In: Other
				$("#btn-header-rename").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					var prevCampName = GameGlobals.playerActionFunctions.getNearestCampName();
					uiFunctions.showInput(
						"Rename Camp",
						"Give your camp a new name",
						prevCampName,
						true,
						function (input) {
							GameGlobals.playerActionFunctions.setNearestCampName(input);
						},
						null,
						CampConstants.MAX_CAMP_NAME_LENGTH
					);
				});
				
				$(document).on("keyup", this.onKeyUp);
			},

			registerGlobalMouseEvents: function () {
				GameGlobals.gameState.uiStatus.mouseDown = false;
				GameGlobals.gameState.uiStatus.mouseDownElement = null;
				$(document).on('mouseleave', function (e) {
					GameGlobals.gameState.uiStatus.mouseDown = false;
					GameGlobals.gameState.uiStatus.mouseDownElement = null;
				});
				$(document).on('mouseup', function (e) {
					GameGlobals.gameState.uiStatus.mouseDown = false;
					GameGlobals.gameState.uiStatus.mouseDownElement = null;
				});
				$(document).on('mousedown', function (e) {
					GameGlobals.gameState.uiStatus.mouseDown = true;
					GameGlobals.gameState.uiStatus.mouseDownElement = e.target;
				});
			},

			registerHotkeys: function () {
				let tabs = GameGlobals.uiFunctions.elementIDs.tabs;
				let defaultModifier = this.HOTKEY_DEFAULT_MODIFIER;
				this.registerHotkey("Move N", "KeyW", defaultModifier, tabs.out, false, false, "move_sector_north");
				this.registerHotkey("Move N", "Numpad8", defaultModifier, tabs.out, false, false, "move_sector_north");
				this.registerHotkey("Move W", "KeyA", defaultModifier, tabs.out, false, false, "move_sector_west");
				this.registerHotkey("Move W", "Numpad4", defaultModifier, tabs.out, false, false, "move_sector_west");
				this.registerHotkey("Move S", "KeyS", defaultModifier, tabs.out, false, false, "move_sector_south");
				this.registerHotkey("Move S", "Numpad2", defaultModifier, tabs.out, false, false, "move_sector_south");
				this.registerHotkey("Move E", "KeyD", defaultModifier, tabs.out, false, false, "move_sector_east");
				this.registerHotkey("Move E", "Numpad6", defaultModifier, tabs.out, false, false, "move_sector_east");
				this.registerHotkey("Move NW", "KeyQ", defaultModifier, tabs.out, false, false, "move_sector_nw");
				this.registerHotkey("Move NW", "Numpad7", defaultModifier, tabs.out, false, false, "move_sector_nw");
				this.registerHotkey("Move NE", "KeyE", defaultModifier, tabs.out, false, false, "move_sector_ne");
				this.registerHotkey("Move NE", "Numpad9", defaultModifier, tabs.out, false, false, "move_sector_ne");
				this.registerHotkey("Move SW", "KeyZ", defaultModifier, tabs.out, false, false, "move_sector_sw");
				this.registerHotkey("Move SW", "Numpad1", defaultModifier, tabs.out, false, false, "move_sector_sw");
				this.registerHotkey("Move SE", "KeyC", defaultModifier, tabs.out, false, false, "move_sector_se");
				this.registerHotkey("Move SE", "Numpad3", defaultModifier, tabs.out, false, false, "move_sector_se");

				this.registerHotkey("Scavenge", "KeyN", defaultModifier, tabs.out, false, false, "scavenge");
				this.registerHotkey("Scout", "KeyM", defaultModifier, tabs.out, false, false, "scout");
				this.registerHotkey("Collect water", "KeyG", defaultModifier, tabs.out, false, false, "use_out_collector_water");
				this.registerHotkey("Collect food", "KeyF", defaultModifier, tabs.out, false, false, "use_out_collector_food");

				this.registerHotkey("Teleport home", "KeyH", defaultModifier, null, false, true, () => GlobalSignals.triggerCheatSignal.dispatch(CheatConstants.CHEAT_NAME_TELEPORT_HOME));
				this.registerHotkey("Pass time", "KeyK", defaultModifier, null, false, true, () => GlobalSignals.triggerCheatSignal.dispatch(CheatConstants.CHEAT_NAME_TIME + " " + 1));
				this.registerHotkey("Toggle map", "KeyL", defaultModifier, null, false, true, () => GlobalSignals.triggerCheatSignal.dispatch(CheatConstants.CHEAT_NAME_REVEAL_MAP));

				this.registerHotkey("Previous tab", "ArrowLeft", "shiftKey", null, false, false, () => GameGlobals.uiFunctions.showPreviousTab());
				this.registerHotkey("Next tab", "ArrowRight", "shiftKey", null, false, false, () => GameGlobals.uiFunctions.showNextTab());

				this.registerHotkey("Dismiss popup", "Escape", null, null, true, false, () => GameGlobals.uiFunctions.popupManager.dismissPopups());
			},

			registerHotkey: function (description, code, modifier, tab, isUniversal, isDev, cb) {
				if (!code) return;
				if (!cb) return;
				if (isDev && !GameConstants.isCheatsEnabled) return;

				modifier = modifier || null;
				tab = tab || null;
				isUniversal = isUniversal || false;

				let displayKey = code.replace("Key", "");
				let displayKeyShort = displayKey.replace("Numpad", "");

				let action = null;
				if (typeof cb === "string") {
					action = cb;
					cb = () => GameGlobals.playerActionFunctions.startAction(action);
				}

				let activeCondition = null;

				if (action && action.indexOf("move_") >= 0) {
					if (code.indexOf("Numpad") >= 0) {
						activeCondition = () => GameGlobals.gameState.settings.hotkeysNumpad;
					} else {
						activeCondition = () => !GameGlobals.gameState.settings.hotkeysNumpad;
					}
				}

				if (!this.hotkeys[code]) this.hotkeys[code] = [];

				let hotkey = { 
					activeCondition: activeCondition,
					code: code, 
					modifier: modifier, 
					description: description, 
					displayKey: displayKey, 
					displayKeyShort: displayKeyShort,
					tab: tab, 
					isUniversal: isUniversal,
					isDev: isDev,
					action: action, 
					cb: cb 
				};
				this.hotkeys[code].push(hotkey);
			},

			getActionHotkey: function (action) {
				if (!action) return null;
				for (let code in this.hotkeys) {
					for (let i = 0; i < this.hotkeys[code].length; i++) {
						let hotkey = this.hotkeys[code][i];
						if (hotkey.activeCondition && !hotkey.activeCondition()) continue;
						if (hotkey.action == action) return hotkey;
					}
				}
				return null;
			},
			
			registerCustomButtonListeners: function (scope, btnClass, fn) {
				$.each($(scope + " button." + btnClass), function () {
					var $element = $(this);
					if ($element.hasClass("click-bound")) {
						log.w("trying to bind click twice! id: " + $element.attr("id"));
						return;
					}
					$element.addClass("click-bound");
					$element.click(ExceptionHandler.wrapClick(fn));
				});
			},
			
			updateButtonCooldowns: function (scope) {
				scope = scope || "";
				let updates = false;
				let sys = this;
				$.each($(scope + " button.action"), function () {
					var action = $(this).attr("action");
					if (action) {
						sys.updateButtonCooldown($(this), action);
						updates = true;
					}
				});
				return updates;
			},

			registerCollapsibleContainerListeners: function (scope) {
				var sys = this;
				$(scope + " .collapsible-header").click(function () {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					var wasVisible = $(this).next(".collapsible-content").is(":visible");
					sys.toggleCollapsibleContainer($(this), !wasVisible);
				});
				$.each($(scope + " .collapsible-header"), function () {
					sys.toggleCollapsibleContainer($(this), false);
				});
			},

			registerStepperListeners: function (scope) {
				var sys = this;
				$(scope + " .stepper button").click(function (e) {
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					sys.onStepperButtonClicked(this, e);
				});
				$(scope + ' .stepper input.amount').change(function () {
					sys.onStepperInputChanged(this)
				});
				$(scope + " .stepper input.amount").focusin(function () {
					$(this).data('oldValue', $(this).val());
				});
				$(scope + ' .stepper input.amount').trigger("change");

				// All number inputs
				$(scope + " input.amount").keydown(this.onNumberInputKeyDown);
			},

			generateElements: function () {
				this.generateTabBubbles();
				this.generateResourceIndicators();
				this.generateSteppers("body");
				this.createButtons("body");
				this.generateInfoCallouts("body");
			},
			
			hideElements: function () {
				this.toggle($(".hidden-by-default"), false);
			},

			generateTabBubbles: function () {
				$("#switch li").append("<div class='bubble' style='display:none'>1</div>");
			},

			generateResourceIndicators: function () {
				for (let key in resourceNames) {
					let name = resourceNames[key];
					$("#statsbar-resources-regular").append(UIConstants.createResourceIndicator(name, false, "resources-camp-regular-" + name, true, true, true, true));
					$("#statsbar-resources-mobile").append(UIConstants.createResourceIndicator(name, false, "resources-camp-mobile-" + name, true, true, true, false));
					$("#bag-resources-regular").append(UIConstants.createResourceIndicator(name, false, "resources-bag-regular-" + name, true, true, false, false));
					$("#bag-resources-mobile").append(UIConstants.createResourceIndicator(name, false, "resources-bag-mobile-" + name, true, true, false, false));
				}
			},

			generateInfoCallouts: function (scope) {
				$.each($(scope + " .info-callout-target"), function () {
					let $target = $(this);
					let generated = $target.data("callout-generated") || $target.parent().hasClass("callout-container");
					if (generated) return;
					
					let isSidePosition = $target.hasClass("info-callout-target-side")
					let arrowClass = isSidePosition ? "callout-arrow-left" : "callout-arrow-up";
					
					$target.wrap('<div class="callout-container"></div>');
					$target.after(function () {
						let description = $(this).attr("description");
						let content = description;
						content = '<div class="' + arrowClass + '"></div><div class="info-callout-content">' + content + "</div>";
						let callout = '<div class="info-callout">' + content + '</div>';
						return callout;
					});

					$target.data("callout-generated", true);
					$target.hover(() => GlobalSignals.elementToggledSignal.dispatch());
				});

				GlobalSignals.calloutsGeneratedSignal.dispatch();
			},

			transition: function (transitionID, targetValue, duration, transitionElements, callbacks) {
				if (!transitionID) return;

				let currentTransition = this.currentTransition;

				if (currentTransition) {
					if (currentTransition.id == transitionID && currentTransition.targetValue == targetValue) return;

					this.completeTransition();
				}

				transitionElements = transitionElements || {};
				callbacks = callbacks || {};
				duration = duration || 1;
				
				let blockUI = duration > 100;
				let fade = duration > 300;
				let fadeOutDuration = fade ? duration * 0.4 : 0;
				let transitionDuration = fade ? duration * 0.2 : duration;
				let fadeInDuration = fade ? duration * 0.4 : 0;
				let transition = { id: transitionID, targetValue: targetValue, transitionElements: transitionElements, callbacks: callbacks };

				this.currentTransition = transition;

				$("body").toggleClass("ui-transition", true);
				if (blockUI) GameGlobals.gameState.uiStatus.isTransitioning = true;
				GlobalSignals.transitionStartedSignal.dispatch();

				if (callbacks.started) callbacks.started();

				this.transitionElementsOut(transitionElements, fadeOutDuration, transitionDuration, fadeInDuration);

				transition.currentTimeoutID = setTimeout(function () {
					GameGlobals.uiFunctions.transitionElementsIn(transitionElements, fadeOutDuration, transitionDuration, fadeInDuration);

					if (callbacks.toggled) callbacks.toggled();
					
					transition.currentTimeoutID = setTimeout(function () {
						GameGlobals.uiFunctions.completeTransition();
						if (callbacks.completed) callbacks.completed();
					}, transitionDuration + fadeOutDuration);
				}, fadeOutDuration);
			},

			transitionElementsOut: function (transitionElements, fadeOutDuration, transitionDuration, fadeInDuration) {
				log.i("transition elements out");

				if (transitionElements.$fadeInOut) {
					transitionElements.$fadeInOut.toggleClass("ui-transition-element", true);
					transitionElements.$fadeInOut.stop(true).animate({ opacity: 1 }, fadeOutDuration).delay(transitionDuration).animate({ opacity: 0 }, fadeInDuration);
				}

				if (transitionElements.$fadeOut) {
					transitionElements.$fadeOut.toggleClass("ui-transition-element", true);
					transitionElements.$fadeOut.stop(true).animate({ opacity: 0 }, fadeOutDuration);
				}

				if (transitionElements.$slideInOut) {
					$.each(transitionElements.$slideInOut, function () {
						GameGlobals.uiFunctions.slideToggleIf($(this), null, true, fadeOutDuration, fadeOutDuration);
					});
				}

				if (transitionElements.$slideOut) {
					$.each(transitionElements.$slideOut, function () {
						GameGlobals.uiFunctions.slideToggleIf($(this), null, false, fadeOutDuration, fadeOutDuration);
					});
				}
			},

			transitionElementsIn: function (transitionElements, fadeOutDuration, transitionDuration, fadeInDuration) {
				log.i("transition elements in");

				if (transitionElements.$fadeIn) {
					transitionElements.$fadeIn.toggleClass("ui-transition-element", true);
					transitionElements.$fadeIn.stop(true).animate({ opacity: 1 }, fadeInDuration);
				}

				if (transitionElements.$slideInOut) {
					$.each(transitionElements.$slideInOut, function () {
						GameGlobals.uiFunctions.slideToggleIf($(this), null, false, fadeInDuration, fadeInDuration);
					});
				}

				if (transitionElements.$slideIn) {
					$.each(transitionElements.$slideIn, function () {
						GameGlobals.uiFunctions.slideToggleIf($(this), null, true, fadeInDuration, fadeInDuration);
					});
				}
			},

			transitionElementsComplete: function (transitionElements) {
				log.i("transition elements complete");

				if (!transitionElements) return;

				if (transitionElements.$fadeInOut) {
					transitionElements.$fadeInOut.toggleClass("ui-transition-element", false);
					transitionElements.$fadeInOut.stop(true).animate({ opacity: 0 }, 1);
				}

				if (transitionElements.$fadeOut) {
					transitionElements.$fadeOut.toggleClass("ui-transition-element", false);
					transitionElements.$fadeOut.stop(true).animate({ opacity: 0 }, 1);
				}

				if (transitionElements.$fadeIn) {
					transitionElements.$fadeIn.toggleClass("ui-transition-element", false);
					transitionElements.$fadeIn.stop(true).animate({ opacity: 1 }, 1);
				}

				if (transitionElements.$slideInOut) {
					$.each(transitionElements.$slideInOut, function () {
						GameGlobals.uiFunctions.toggle($(this), false);
					});
				}

				if (transitionElements.$slideOut) {
					$.each(transitionElements.$slideOut, function () {
						GameGlobals.uiFunctions.toggle($(this), false);
					});
				}

				if (transitionElements.$slideIn) {
					$.each(transitionElements.$slideIn, function () {
						GameGlobals.uiFunctions.toggle($(this), true);
					});
				}
			},

			completeTransition: function () {
				let transition = this.currentTransition;

				this.currentTransition = null;
				$("body").toggleClass("ui-transition", false);
				GameGlobals.gameState.uiStatus.isTransitioning = false;

				if (!transition) return;

				clearTimeout(transition.timeoutID);

				this.transitionElementsComplete(transition.elements);
				
				GlobalSignals.transitionCompletedSignal.dispatch();
			},
			
			updateInfoCallouts: function (scope) {
				$.each($(scope + " .callout-container"), function () {
					var description = $(this).children(".info-callout-target").attr("description");
					if (description && description.length > 0) {
						$(this).find(".info-callout-content").html(description);
					}
				});
			},

			getSpecialReqsText: function (action) {
				let position = GameGlobals.sectorHelper.getCurrentActionPosition();
				let s = "";
				let specialReqs = GameGlobals.playerActionsHelper.getSpecialReqs(action);
				if (specialReqs) {
					for (let key in specialReqs) {
						switch (key) {
							case "improvementsOnLevel":
								let actionImprovementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(action);
								if (actionImprovementName != improvementNames.camp) {
									for (let improvementID in specialReqs[key]) {
										let range = specialReqs[key][improvementID];
										let count = position ? GameGlobals.playerActionsHelper.getCurrentImprovementCountOnLevel(position.level, improvementID) : 0;
										let rangeText = UIConstants.getRangeText(range);
										let displayName = GameGlobals.playerActionsHelper.getImprovementDisplayName(improvementID);
										if (actionImprovementName == displayName) {
											displayName = "";
										}
										s += rangeText + " " + displayName + " on level (" + count + ")";
									}
								}
								break;
							default:
								s += key + ": " + specialReqs[key];
								log.w("unknown special req: " + key);
								break;
						}
					}
				}
				s.trim();
				return s;
			},

			generateSteppers: function (scope) {
				$(scope + " .stepper").append("<button type='button' class='btn-glyph' data-type='minus' data-field=''>-</button>");
				$(scope + " .stepper").append("<input class='amount' type='text' min='0' max='100' autocomplete='off' value='0' name='' tabindex='0'></input>");
				$(scope + " .stepper").append("<button type='button' class='btn-glyph' data-type='plus' data-field=''>+</button>");
				$(scope + " .stepper button").attr("data-field", function (i, val) {
					return $(this).parent().attr("id") + "-input";
				});
				$(scope + " .stepper button").attr("action", function (i, val) {
					return $(this).parent().attr("id") + "-" + $(this).attr("data-type");
				});
				$(scope + " .stepper input").attr("name", function (i, val) {
					return $(this).parent().attr("id") + "-input";
				});
			},

			createButtons: function (scope) {
				let $container = $(scope);

				$.each($container.find("button.action"), function () {
					if (ActionButton.isButton(this)) return;
					let button = ActionButton.create(this);
					if (!button) return;
					ActionButton.registerListener(button, GameGlobals.uiFunctions, GameGlobals.uiFunctions.onActionButtonClicked);
				});

				GameGlobals.buttonHelper.updateButtonDisabledStates(scope, true);
				this.updateHotkeyHints();

				GlobalSignals.calloutsGeneratedSignal.dispatch();
			},

			updateHotkeyHints: function () {
				let hotkeysEnabled = GameGlobals.gameState.settings.hotkeysEnabled;
				$(".hotkey-hint").toggleClass("hidden", !hotkeysEnabled);

				if (!hotkeysEnabled) return;

				$.each($("button.action"), function () {
					let $btn = $(this);
					let action = $btn.attr("action");
					let hotkey = GameGlobals.uiFunctions.getActionHotkey(action);
					$btn.children(".hotkey-hint").html(hotkey ? hotkey.displayKeyShort : "");
				});
			},

			startGame: function () {
				log.i("Starting game..");
				var startTab = this.elementIDs.tabs.out;
				var playerPos = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
				if (playerPos.inCamp) startTab = this.elementIDs.tabs.in;
				this.showTabInstant(startTab);
			},

			/**
			 * Resets cooldown for an action. Should be called directly after an action is completed and any relevant popup is closed.
			 * @param {type} action action
			 */
			completeAction: function (action) {
				let baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
				let cooldown = PlayerActionConstants.getCooldown(baseId);
				if (cooldown > 0) {
					let locationKey = this.getLocationKey(action);
					GameGlobals.gameState.setActionCooldown(action, locationKey, cooldown);
					let button = $("button[action='" + action + "']");
					this.startButtonCooldown($(button), cooldown);
				}
			},

			showGame: function () {
				this.hideGameCounter = this.hideGameCounter || 1;
				this.hideGameCounter--;
				if (this.hideGameCounter > 0) return;
				log.i("[ui] show game ");
				this.setGameOverlay(false, false);
				this.setGameElementsVisibility(true);
				this.updateButtonCooldowns();
				this.setUIStatus(false, false);

				setTimeout(function () {
					GlobalSignals.gameShownSignal.dispatch();
				}, 1);
			},

			hideGame: function (showLoading, showThinking) {
				this.hideGameCounter = this.hideGameCounter || 0;
				this.hideGameCounter++;
				log.i("[ui] hide game (showLoading: " + showLoading + ", showThinking: " + showThinking + ")");
				showThinking = showThinking && !showLoading;
				this.setGameOverlay(showLoading, showThinking);
				this.setGameElementsVisibility(showThinking);
				this.setUIStatus(true, true);
			},
			
			blockGame: function () {
				this.setUIStatus(GameGlobals.gameState.uiStatus.isHidden, true);
			},
			
			unblockGame: function () {
				this.setUIStatus(GameGlobals.gameState.uiStatus.isHidden, false);
			},
			
			setUIStatus: function (isHidden, isBlocked) {
				isBlocked = isBlocked || isHidden;
				GameGlobals.gameState.uiStatus.isHidden = isHidden;
				GameGlobals.gameState.uiStatus.isBlocked = isBlocked;
			},
			
			setGameOverlay: function (isLoading, isThinking) {
				isThinking = isThinking && !isLoading;
				$(".loading-content").css("display", isLoading ? "block" : "none");
				$(".thinking-content").css("display", isThinking ? "block" : "none");
			},
			
			setGameElementsVisibility: function (visible) {
				$(".sticky-footer").css("display", visible ? "block" : "none");
				$("#grid-main").css("display", visible ? "block" : "none");
				$("#unit-main").css("display", visible ? "block" : "none");
				$(".hide-while-loading").css("display", visible ? "initial" : "none");
			},

			scrollToTabTop: function () {
				let element = $(document.getElementById("grid-location-header"));
				let elementTop = element.offset().top;
			    let offset = elementTop - $(window).scrollTop();

			    if (offset < 0) {
			        $('html,body').animate({scrollTop: elementTop}, 250);
			    }
			},

			restart: function () {
				$("#log ul").empty();
				this.onTabClicked(this.elementIDs.tabs.out);
				GlobalSignals.restartGameSignal.dispatch(true);
			},

			onResize: function () {
				GlobalSignals.windowResizedSignal.dispatch();
			},

			updateGameStatsPopup: function () {
				let stats = GameGlobals.playerHelper.getVisibleGameStats();

				let html = "<table class='fullwidth'>";
				for (let i in stats) {
					let category = stats[i];
					let isCategoryDebugVisible = !category.isVisible && GameConstants.isDebugVersion;
					let isCategoryVisible = category.isVisible || isCategoryDebugVisible;
					if (!isCategoryVisible) continue;

					html += "<th colspan=2 class='game-stat-category" + (isCategoryDebugVisible ? " debug-info" : "") + "'>";
					html += category.displayName;
					html += "</th>";

					for (let j in category.stats) {
						let stat = category.stats[j];

						let isDebugVisible = !stat.isVisible && GameConstants.isDebugVersion;
						let isVisible = stat.isVisible || isDebugVisible;
						if (!isVisible) continue;

						let divClasses = [ "game-stat-entry" ];
						if (isDebugVisible) divClasses.push("debug-info");
						if (stat.isInSubCategory) divClasses.push("game-stat-in-subcategory")

						if (stat.isSubCategory) {
							divClasses.push("game-stat-sub-category");
							html += "<tr><td colspan=2 class='" + divClasses.join(" ") + "'>" + stat.displayName + "</td></tr>";
							continue;
						}

						let displayValue = "-";
						if (stat.value) {
							if (stat.unit == GameConstants.gameStatUnits.seconds) {
								displayValue = UIConstants.getTimeToNum(stat.value)
							} else if (stat.isPercentage) {
								displayValue = UIConstants.roundValue(stat.value * 100) + "%";
							} else if (stat.unit == GameConstants.gameStatUnits.steps) {
								displayValue = UIConstants.roundValue(stat.value) + " steps";
							} else {
								displayValue = UIConstants.getDisplayValue(UIConstants.roundValue(stat.value));
							}
						}
						
						html += "<tr>";
						html += "<td class='" + divClasses.join(" ") + "'>";
						html += "<span class='game-stat-span game-stat-name'>" + Text.capitalize(stat.displayName) + "</span>";
						html += "</td>";

						html += "<td>"
						html += "<span class='game-stat-span game-stat-value'>" + displayValue + "</span> ";

						if (stat.entry) {
							let entryDisplay = stat.entry;
							if (stat.entry.hasOwnProperty("sectorX")) {
								entryDisplay = new PositionVO(stat.entry.level, stat.entry.sectorX, stat.entry.sectorY).getInGameFormat(true);
							} else if (stat.entry.hasOwnProperty("level")) {
								entryDisplay = "on level " + stat.entry.level;
							} else if (stat.entry.hasOwnProperty("name")) {
								entryDisplay = stat.entry.name;
							} else if (EnemyConstants.tryGetEnemy(stat.entry)) {
								entryDisplay = EnemyConstants.getEnemy(stat.entry).name;
							} else if(ItemConstants.getItemDefinitionByID(stat.entry, true)) {
								entryDisplay = ItemConstants.getItemDisplayNameFromID(stat.entry);
							} else if (stat.entry.hasOwnProperty("timestamp")) {
								entryDisplay = UIConstants.getTimeSinceText(stat.entry.timestamp);
							} else if (stat.entryUnit == GameConstants.gameStatUnits.level) {
								entryDisplay = "on level " + stat.entry;
							}
							html += "<span class='game-stat-span game-stat-highscore-entry'>(" + entryDisplay + ")</span>";
						}
						html += "</td>";


						html += "</tr>";
					}
				}
				html += "</table>";
				
				$("#game-stats-container").html(html);
				$("#game-stats-container").animate({ scrollTop: 0 });
			},

			getGameInfoDiv: function () {
				let html = "";
				html += "<span id='changelog-version'>version " + GameGlobals.changeLogHelper.getCurrentVersionNumber() + "<br/>updated " + GameGlobals.changeLogHelper.getCurrentVersionDate() + "</span>";
				html += "<p>Note that this game is still in development and many features are incomplete and unbalanced. Updates might break saves. Feedback and bug reports are appreciated!</p>";
				html += "<p>Feedback:<br/>" + GameConstants.getFeedbackLinksHTML() + "</p>";
				html += "<p>More info:<br/><a href='faq.html' target='faq'>faq</a> | <a href='changelog.html' target='changelog'>changelog</a></p>";
				return html;
			},

			onTabClicked: function (tabID, tabProps) {
				GameGlobals.uiFunctions.showTab(tabID, tabProps);
			},

			showTab: function (tabID, tabProps, isCampTransition) {
				if (GameGlobals.gameState.isLaunchStarted) return;
				if (GameGlobals.gameState.isLaunched) return;

				let isInCamp = GameGlobals.playerHelper.isInCamp();
				if (isInCamp && tabID == GameGlobals.uiFunctions.elementIDs.tabs.out) tabID == GameGlobals.uiFunctions.elementIDs.tabs.embark;

				let previousTabID = GameGlobals.gameState.uiStatus.currentTab;

				let transitionElements = {};
				transitionElements.$fadeOut = $(".tabelement, .tabbutton").filter("[data-tab!='" + tabID + "']");
				transitionElements.$fadeInOut = null;
				transitionElements.$fadeIn = $(".tabelement, .tabbutton").filter("[data-tab='" + tabID + "']");
				transitionElements.$slideOut = $(".tabcontainer").filter("[data-tab!='" + tabID + "']");
				transitionElements.$slideInOut = null;
				transitionElements.$slideIn = $(".tabcontainer").filter("[data-tab='" + tabID + "']");

				if (isCampTransition) {
					if (isInCamp) {
						transitionElements.$slideIn.add("#main-header-camp");
						transitionElements.$slideOut.add("#main-header-bag");
						transitionElements.$slideOut.add("#main-header-items");
					} else {
						transitionElements.$slideOut.add("#main-header-camp");
						transitionElements.$slideIn.add("#main-header-bag");
						transitionElements.$slideIn.add("#main-header-items");
					}
				}

				let callbacks = {
					started: () => GlobalSignals.tabClosedSignal.dispatch(previousTabID),
					toggled: () => GameGlobals.uiFunctions.setTab(tabID, tabProps),
					completed: () => GlobalSignals.tabOpenedSignal.dispatch(tabID),
				};
				
				GameGlobals.uiFunctions.transition("tab", tabID, 500, transitionElements, callbacks);
			},
			
			showTabInstant: function (tabID, tabProps) {
				let previousTabID = GameGlobals.gameState.uiStatus.currentTab;
				GlobalSignals.tabClosedSignal.dispatch(previousTabID);
				GameGlobals.uiFunctions.setTab(tabID, tabProps);
				GlobalSignals.tabOpenedSignal.dispatch(tabID);
			},

			setTab: function (tabID, tabProps) {
				$("#switch-tabs li").removeClass("selected");
				$("#switch-tabs li#" + tabID).addClass("selected");
				$("#tab-header h2").text(tabID);

				GameGlobals.gameState.uiStatus.currentTab = tabID;

				$.each($(".tabcontainer"), function () {
					GameGlobals.uiFunctions.toggle($(this), $(this).attr("data-tab") === tabID);
				});

				$.each($(".tabelement"), function () {
					GameGlobals.uiFunctions.toggle($(this), $(this).attr("data-tab") === tabID);
				});

				$.each($(".tabbutton"), function () {
					GameGlobals.uiFunctions.toggle($(this), $(this).attr("data-tab") === tabID);
				});

				GameGlobals.gameState.markSeenTab(tabID);
				
				log.i("tabChanged: " + tabID, "ui");

				GlobalSignals.tabChangedSignal.dispatch(tabID, tabProps);
			},

			onStepperButtonClicked: function (button, e) {
				e.preventDefault();
				var fieldName = $(button).attr('data-field');
				var type = $(button).attr('data-type');
				var input = $("input[name='" + fieldName + "']");
				var currentVal = parseInt(input.val());
				if (!isNaN(currentVal)) {
					if (type == 'minus') {
						var min = input.attr('min');
						if (currentVal > min) {
							input.val(currentVal - 1).change();
						}
					} else if (type == 'plus') {
						var max = input.attr('max');
						if (currentVal < max) {
							input.val(currentVal + 1).change();
						}
					}
				} else {
					log.w("invalid stepper input value [" + fieldName + "]");
					input.val(0);
				}
			},

			onStepperInputChanged: function (input) {
				var minValue = parseInt($(input).attr('min'));
				var maxValue = parseInt($(input).attr('max'));
				var valueCurrent = parseInt($(input).val());
				var name = $(input).attr('name');

				if (isNaN(valueCurrent)) {
					let valueOld = $(this).data('oldValue');
					if (!isNaN(valueOld)) {
						$(this).val(valueOld);
						return;
					} else {
						$(this).val(0);
					}
				}

				this.updateStepperButtons("#" + $(input).parent().attr("id"));
			},
			
			onKeyUp: function (e) {
				if (e.originalEvent.isTextInput) return;
				if (!GameGlobals.uiFunctions.triggerHotkey(e.originalEvent.code, e)) return;
			},

			triggerHotkey: function (code, modifiers) {
				if (!this.hotkeys[code]) return false;
				let currentTab = GameGlobals.gameState.uiStatus.currentTab;
				let hasPopups = GameGlobals.uiFunctions.popupManager.hasOpenPopup();
				let hasModifier = modifiers.shiftKey || modifiers.altKey || modifiers.ctrlKey || modifiers.metaKey;

				for (let i = 0; i < this.hotkeys[code].length; i++) {
					let hotkey = this.hotkeys[code][i];
					if (hotkey.tab && hotkey.tab !== currentTab) continue;
					if (!hotkey.isUniversal && hasPopups) continue;
					if (hotkey.activeCondition && !hotkey.activeCondition()) continue;
					if (!GameGlobals.gameState.settings.hotkeysEnabled && !hotkey.isUniversal) continue;

					let modifier = GameGlobals.uiFunctions.getActualHotkeyModifier(hotkey.modifier);
					if (modifier && !modifiers[modifier]) continue;
					if (!modifier && hasModifier) continue;

					log.i("[hotkey] triggered " + hotkey.code + " " + hotkey.modifier + " " + hotkey.tab);

					hotkey.cb.apply(this);
					return true;
				}

				return false;
			},

			getActualHotkeyModifier: function (modifier) {
				if (!modifier) return null;

				let result = modifier.modifier || modifier;
				if (result == GameGlobals.uiFunctions.HOTKEY_DEFAULT_MODIFIER) {
					result = null;
				}
				return result;
			},

			onMetaButtonClicked: function (e) {
				let $btn = $(e.currentTarget);
				let id = $btn.attr("id");
				
				GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);

				if (id == "out-action-fight-close") {
					GameGlobals.fightHelper.endFight(false, false);
				} else if (id == "out-action-fight-continue") {
					GameGlobals.fightHelper.endFight(false, false);
				}
			},

			onActionButtonClicked: function (button) {
				var uiFunctions = this;
				var gameState = GameGlobals.gameState;

				let $btn = button.$button;
				let action = $btn.attr("action");
				let id = $btn.attr("id");

				if (!GameGlobals.gameState.isPlayerInputAccepted()) return;

				GlobalSignals.actionButtonClickedSignal.dispatch(action);

				if (id == "out-action-fight-confirm") {
					GameGlobals.fightHelper.startFight();
				} else if  (id == "out-action-fight-takeselected") {
					GameGlobals.fightHelper.endFight(false, false);
				} else if  (id == "out-action-fight-takeall") {
					GameGlobals.fightHelper.endFight(true, false);
				} else if  (id == "out-action-fight-cancel") {
					GameGlobals.fightHelper.endFight(false, true);
				} else if (action == "leave_camp") {
					gameState.uiStatus.leaveCampItems = {};
					gameState.uiStatus.leaveCampRes = {};

					let selectedResVO = new ResourcesVO();
					let selectedCurrency = 0;
					$.each($("#embark-resources tr"), function () {
						let resourceName = $(this).attr("id").split("-")[2];
						let selectedVal = parseInt($(this).children("td").children(".stepper").children("input").val());
						let isCurrency = resourceName == "currency";
						if (isCurrency) {
							selectedCurrency = selectedVal;
						} else {
							selectedResVO.setResource(resourceName, selectedVal);
						}
					});

					var selectedItems = {};
					$.each($("#embark-items tr"), function () {
						var itemID = $(this).attr("id").split("-")[2];
						var selectedVal = parseInt($(this).children("td").children(".stepper").children("input").val());
						selectedItems[itemID] = selectedVal;
					});

					GameGlobals.playerActionFunctions.updateCarriedItems(selectedItems);
					GameGlobals.resourcesHelper.moveResFromCampToBag(selectedResVO);
					GameGlobals.resourcesHelper.moveCurrencyFromCampToBag(selectedCurrency);
					GameGlobals.playerActionFunctions.leaveCamp();
				} else {
					if ($btn.hasClass("action-manual-trigger")) {
						return;
					}

					GameGlobals.gameState.uiStatus.isBusyCounter++;

					let param = null;
					let actionIDParam = GameGlobals.playerActionsHelper.getActionIDParam(action);
					if (actionIDParam) param = actionIDParam;
					let isProject = $btn.hasClass("action-level-project");
					if (isProject) param = $btn.attr("sector");
					if (!param) param = GameGlobals.playerActionsHelper.getActionDefaultParam();

					let locationKey = uiFunctions.getLocationKey(action);
					let isStarted = GameGlobals.playerActionFunctions.startAction(action, param);

					GameGlobals.gameState.uiStatus.isBusyCounter--;

					if (!isStarted) {
						uiFunctions.updateButtonCooldown($btn, action);
					} else {
						let baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
						let duration = PlayerActionConstants.getDuration(action, baseId);
						if (duration > 0) {
							GameGlobals.gameState.setActionDuration(action, locationKey, duration);
							uiFunctions.startButtonDuration($btn, duration);
						}
					}
				}
			},

			onNumberInputKeyDown: function (e) {
				// Allow: backspace, delete, tab, escape, enter and .
				if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 190]) !== -1 ||
					// Allow: Ctrl+A
					(e.keyCode == 65 && e.ctrlKey === true) ||
					// Allow: home, end, left, right
					(e.keyCode >= 35 && e.keyCode <= 39)) {
					return;
				}
				// Ensure that it's a number and stop the keypress
				if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
					e.preventDefault();
				}
			},

			onTextInputKeyDown: function (e) {
				// Allow: backspace, delete, tab, escape and enter
				if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
					// Allow: Ctrl+A
					(e.keyCode == 65 && e.ctrlKey === true) ||
					// Allow: home, end, left, right
					(e.keyCode >= 35 && e.keyCode <= 39)) {
					// let it happen, don't do anything
					return;
				}
				e.originalEvent.isTextInput = true;
			},

			onTextInputKeyUp: function (e) {
				let value = $(e.target).val();
				value = StringUtils.cleanUpInput(value, $(e.target).data("max-input-length"), '_');
				$(e.target).val(value);
				e.originalEvent.isTextInput = true;
			},

			onButtonLikeElementKeyDown: function (e, cb) {
				switch (e.keyCode) {
					case 13:
					case 32:
						cb(e);
						return;
				}
			},

			onPlayerPositionChanged: function () {
				if (GameGlobals.gameState.uiStatus.isHidden) return;
				var updates = false;
				updates = this.updateButtonCooldowns("") || updates;
				if (updates) {
					GlobalSignals.updateButtonsSignal.dispatch();
				}
			},
			
			onRestartButton: function () {
				var sys = this;
				this.showConfirmation(
					"Do you want to restart the game? Your progress will be lost.",
					function () {
						sys.restart();
					},
					true
				);
			},

			slideToggleIf: function (element, replacement, show, durationIn, durationOut, cb) {
				var visible = this.isElementToggled(element);
				var toggling = ($(element).attr("data-toggling") == "true");
				var sys = this;

				if (show && (visible == false || visible == null) && !toggling) {
					if (replacement) sys.toggle(replacement, false);
					$(element).attr("data-toggling", "true");
					$(element).stop().slideToggle(durationIn, function () {
						sys.toggle(element, true);
						$(element).attr("data-toggling", "false");
						if (cb) cb();
					});
					return;
				} else if (!show && (visible == true || visible == null) && !toggling) {
					$(element).attr("data-toggling", "true");
					$(element).stop().slideToggle(durationOut, function () {
						if (replacement) sys.toggle(replacement, true);
						sys.toggle(element, false);
						$(element).attr("data-toggling", "false");
						if (cb) cb();
					});
					return;
				}

				if (cb) cb();
			},

			toggleCollapsibleContainer: function (element, show) {
				var $element = typeof (element) === "string" ? $(element) : element;
				if (show) {
					var group = $element.parents(".collapsible-container-group");
					if (group.length > 0) {
						var sys = this;
						$.each($(group).find(".collapsible-header"), function () {
							var $child = $(this);
							if ($child[0] !== $element[0]) {
								sys.toggleCollapsibleContainer($child, false);
							}
						});
					}
				}
				$element.toggleClass("collapsible-collapsed", !show);
				$element.toggleClass("collapsible-open", show);
				this.slideToggleIf($element.next(".collapsible-content"), null, show, 300, 200);
				GlobalSignals.elementToggledSignal.dispatch($element, show);
			},

			toggle: function (element, show, signalParams, delay) {
				let $element = typeof (element) === "string" ? $(element) : element;

				if (($element).length === 0)
					return;

				if (typeof (show) === "undefined")
					show = false;
				if (show === null)
					show = false;
				if (!show)
					show = false;

				if (this.isElementToggled($element) === show)
					return;
					
				this.cancelDelayedToggle($element);
				
				if (!delay || delay <= 0) {
					this.toggleInternal($element, show, signalParams);
				} else {
					let id = setTimeout(function () { GameGlobals.uiFunctions.toggleInternal($element, show, signalParams); }, delay);
					$element.attr("data-toggle-timeout", id);
				}
			},
			
			toggleInternal: function ($element, show, signalParams) {
				show = show == true;
				$element.attr("data-visible", show);
				$element.toggle(show);

				// if parent callout container exists and it has only one non-hover child (element being toggled), toggle parent too
				this.toggleParentCalloutContainer($element, ".info-callout-target", show);
				this.toggleParentCalloutContainer($element, ".callout-container", show);

				// NOTE: For some reason the element isn't immediately :visible for checks in UIOutElementsSystem without the timeout
				setTimeout(function () {
					GlobalSignals.elementToggledSignal.dispatch($element, show, signalParams);
				}, 1);
			},

			toggleParentCalloutContainer: function ($element, parentSelector, show) {
				let $parent = $element.parent(parentSelector);

				if ($parent.length === 0) return;
				
				let $children = $parent.children();
				let $countedChildren = $children.not(".info-callout");

				if ($countedChildren.length === 1) {
					this.toggle($parent, show);
				}
			},
			
			cancelDelayedToggle: function ($element) {
				// TOGO generalize for cancelling any timeout with id like "toggle-timeout"
				let id = $element.attr("data-toggle-timeout");
				if (!id) return;
				clearTimeout(id);
				$element.attr("data-toggle-timeout", 0);
			},
			
			toggleContainer: function (element, show, signalParams) {
				var $element = typeof (element) === "string" ? $(element) : element;
				this.toggle($element, show, signalParams);
				this.toggle($element.children("button"), show, signalParams);
			},

			isElementToggled: function (element) {
				var $element = typeof (element) === "string" ? $(element) : element;
				if (!$element || ($element).length === 0)
					return false;

				// if several elements, return their value if all agree, otherwise null
				if (($element).length > 1) {
					var previousIsToggled = null;
					var currentIsToggled = null;
					for (let i = 0; i < ($element).length; i++) {
						previousIsToggled = currentIsToggled;
						currentIsToggled = this.isElementToggled($(($element)[i]));
						if (i > 0 && previousIsToggled !== currentIsToggled) return null;
					}
					return currentIsToggled;
				}

				var visible = true;
				var visibletag = ($element.attr("data-visible"));

				if (typeof visibletag !== typeof undefined) {
					visible = (visibletag == "true");
				} else {
					visible = null;
				}
				return visible;
			},

			isElementVisible: function (element, skipParentsCheck) {
				var $element = typeof (element) === "string" ? $(element) : element;
				var toggled = this.isElementToggled($element);
				if (toggled === false)
					return false;
				if (!skipParentsCheck) {
					var $e = $element.parent();
					while ($e && $e.length > 0) {
						if (!$e.hasClass("collapsible-content") && !$e.hasClass("callout-container")) {
							var parentToggled = this.isElementToggled($e);
							if (parentToggled === false) {
								return false;
							}
						}
						$e = $e.parent();
					}
				}
				return (($element).is(":visible"));
			},

			setText: function (selector, key, options) {
				if (!selector) {
					log.w("invalid selector for automatic text update");
					return;
				}

				this.texts[selector] = { key: key, options: options };
				this.updateText($(selector), Text.t(key, options));
			},

			updateTexts: function () {
				for (let selector in this.texts) {
					let saved = this.texts[selector];
					let $elem = typeof selector === "string" ? $(selector) : selector;
					this.updateText($elem, Text.t(saved.key, saved.options));
				}
			},

			updateText: function ($elem, text) {
				let current = $elem.text();
				if (current == text) return;
				$elem.text(text);
			},

			stopButtonCooldown: function (button) {
				$(button).children(".cooldown-action").stop(true, true);
				$(button).attr("data-hasCooldown", "false");
				$(button).children(".cooldown-action").css("display", "none");
				$(button).children(".cooldown-action").css("width", "100%");
				GlobalSignals.updateButtonsSignal.dispatch();
			},
			
			updateButtonCooldown: function (button, action) {
				let baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
				let locationKey = this.getLocationKey(action);

				cooldownTotal = PlayerActionConstants.getCooldown(baseId);
				cooldownLeft = Math.min(cooldownTotal, GameGlobals.gameState.getActionCooldown(action, locationKey, cooldownTotal));
				durationTotal = PlayerActionConstants.getDuration(action, baseId);
				durationLeft = Math.min(durationTotal, GameGlobals.gameState.getActionDuration(action, locationKey, durationTotal));

				if (cooldownLeft > 0) this.startButtonCooldown(button, cooldownTotal, cooldownLeft);
				else this.stopButtonCooldown(button);

				if (durationLeft > 0) this.startButtonDuration(button, durationTotal, durationLeft);
				else this.stopButtonDuration(button);
			},

			startButtonCooldown: function (button, cooldown, cooldownLeft) {
				if (GameGlobals.gameState.uiStatus.isHidden) return;

				let action = $(button).attr("action");
				let isAvailable = GameGlobals.playerActionsHelper.isRequirementsMet(action, null, [ PlayerActionConstants.DISABLED_REASON_BUSY ]);

				if (!isAvailable) {
					this.stopButtonCooldown(button);
					return;
				}

				if (!cooldownLeft) cooldownLeft = cooldown;
				var uiFunctions = this;
				var startingWidth = (cooldownLeft / cooldown * 100);
				$(button).attr("data-hasCooldown", "true");
				$(button).children(".cooldown-action").stop(true, false).css("display", "inherit").css("width", startingWidth + "%").animate({
						width: 0
					},
					cooldownLeft * 1000,
					'linear',
					function () {
						uiFunctions.stopButtonCooldown($(this).parent());
					}
				);
			},

			stopButtonDuration: function (button) {
				$(button).children(".cooldown-duration").stop(true, true);
				$(button).children(".cooldown-duration").css("display", "none");
				$(button).children(".cooldown-duration").css("width", "0%");
				$(button).attr("data-isInProgress", "false");
			},

			startButtonDuration: function (button, duration, durationLeft) {
				if (!durationLeft) durationLeft = duration;
				let uiFunctions = this;
				let startingWidth = (1 - durationLeft / duration) * 100;
				$(button).attr("data-isInProgress", "true");
				$(button).children(".cooldown-duration").stop(true, false).css("display", "inherit").css("width", startingWidth + "%").animate({
						width: '100%'
					},
					durationLeft * 1000,
					'linear',
					function () {
						uiFunctions.stopButtonDuration($(this).parent());
					}
				);
			},

			getLocationKey: function (action) {
				var isLocationAction = PlayerActionConstants.isLocationAction(action);
				var playerPos = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
				return GameGlobals.gameState.getActionLocationKey(isLocationAction, playerPos);
			},
			
			updateCostsSpans: function (action, costs, elements, costsStatus, displayedCosts, signalParams) {
				let playerHealth = GameGlobals.playerActionFunctions.playerStatsNodes.head.stamina.health;
				let maxRumours = GameGlobals.playerActionFunctions.playerStatsNodes.head.rumours.maxValue;
				let maxEvidence = GameGlobals.playerActionFunctions.playerStatsNodes.head.evidence.maxValue;
				let maxHope = GameGlobals.playerHelper.getMaxHope();
				let maxInsight = GameGlobals.playerActionFunctions.playerStatsNodes.head.insight.maxValue;
				let showStorage = GameGlobals.resourcesHelper.getCurrentStorageCap();

				let costsWithoutBonuses = GameGlobals.playerActionsHelper.getCostsWithoutBonuses(action);

				let maxCostCountdown = -1;
				let hasNonAccumulatingCost = false;
				
				// costs themselves
				for (let key in costs) {
					let value = costs[key];
					let valueWithoutBonuses = costsWithoutBonuses[key];
					let isNegatedByBonus = value === 0 && valueWithoutBonuses !== 0;
					let isAccumulatingCost = GameGlobals.playerActionsHelper.isAccumulatingCost(key, false);

					if (isAccumulatingCost && !hasNonAccumulatingCost) {
						let costCountdown = GameGlobals.playerActionsHelper.getCostCountdownSeconds(key, value);

						if (costCountdown < 0) {
							hasNonAccumulatingCost = true;
						}

						if (costCountdown >= 0 && costCountdown > maxCostCountdown) {
							maxCostCountdown = costCountdown;
						}
					} else {
						hasNonAccumulatingCost = true;
					}

					let $costSpan = elements.costSpans[key];
					if (!$costSpan || $costSpan.length == 0) {
						log.w("cost span missing: " + key + " " + action);
						continue;
					}
					let costFraction = GameGlobals.playerActionsHelper.checkCost(action, key);
					let isFullCostBlocker =
						(isResource(key.split("_")[1]) && value > showStorage) ||
						(key == "stamina" && value > playerHealth * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR) ||
						(key == "rumours" && value > maxRumours) ||
						(key == "evidence" && value > maxEvidence) ||
						(key == "insight" && value > maxInsight) ||
						(key == "hope" && value > maxHope);
						
					if (costsStatus) {
						if (isFullCostBlocker) {
							costsStatus.hasCostBlockers = true;
						} else if (costFraction < costsStatus.bottleneckCostFraction) {
							costsStatus.bottleneckCostFraction = costFraction;
						}
					}
					$costSpan.toggleClass("action-cost-blocker", costFraction < 1);
					$costSpan.toggleClass("action-cost-blocker-storage", isFullCostBlocker);

					let displayValue = UIConstants.getDisplayValue(value);
					if (isNegatedByBonus) {
						displayValue = "<span class='action-cost-negated'>" + UIConstants.getDisplayValue(valueWithoutBonuses) + "</span> " + displayValue;
					}
	
					if (displayValue !== displayedCosts[key]) {
						let $costSpanValue = elements.costSpanValues[key];
						let showCostSpan = valueWithoutBonuses > 0;
						$costSpanValue.html(displayValue);
						GameGlobals.uiFunctions.toggle($costSpan, showCostSpan, signalParams);
						displayedCosts[key] = displayValue;
					}
				}

				// cost countdown
				let $costsCountdown = elements.calloutCostsCountdown;
				let $costsCountdownContainer = elements.calloutCostsCountdownContainer;
				let showCostCountdown = !hasNonAccumulatingCost && maxCostCountdown >= 0 && costsStatus.bottleneckCostFraction < 1;
				GameGlobals.uiFunctions.toggle($costsCountdownContainer, showCostCountdown, signalParams);
				if (showCostCountdown) {
					$costsCountdown.text(Text.t("ui.actions.action_available_in_field", UIConstants.getTimeToNum(maxCostCountdown)));
				}
			},

			updateStepper: function (id, val, min, max) {
				var $input = $(id + " input");
				var oldVal = parseInt($input.val());
				var oldMin = parseInt($input.attr('min'));
				var oldMax = parseInt($input.attr('max'));
				if (oldVal === val && oldMin === min && oldMax === max) return;
				$input.attr("min", min);
				$input.attr("max", max);
				$input.val(val)
				this.updateStepperButtons(id);
			},

			updateStepperButtons: function (id) {
				var $input = $(id + " input");
				var name = $input.attr('name');
				var minValue = parseInt($input.attr('min'));
				var maxValue = parseInt($input.attr('max'));
				var valueCurrent = MathUtils.clamp(parseInt($input.val()), minValue, maxValue);

				var decEnabled = false;
				var incEnabled = false;
				if (valueCurrent > minValue) {
					decEnabled = true;
				} else {
					$input.val(minValue);
					
				}
				if (valueCurrent < maxValue) {
					incEnabled = true;
				} else {
					$input.val(maxValue);
				}

				var decBtn = $(".btn-glyph[data-type='minus'][data-field='" + name + "']");
				decBtn.toggleClass("btn-disabled", !decEnabled);
				decBtn.toggleClass("btn-disabled-basic", !decEnabled);
				decBtn.attr("disabled", !decEnabled);
				var incBtn = $(".btn-glyph[data-type='plus'][data-field='" + name + "']");
				incBtn.toggleClass("btn-disabled", !incEnabled);
				incBtn.toggleClass("btn-disabled-basic", !incEnabled);
				incBtn.attr("disabled", !incEnabled);
			},
			
			updateBubble: function (element, oldBubbleNumber, bubbleNumber) {
				bubbleNumber = bubbleNumber || 0;
				if (GameGlobals.gameState.isLaunchStarted) bubbleNumber = 0;
				
				if (bubbleNumber == oldBubbleNumber) return;
				
				var $element = typeof (element) === "string" ? $(element) : element;
				
				$element.text(bubbleNumber);
				GameGlobals.uiFunctions.toggle($element, bubbleNumber !== 0);
			},

			registerLongTap: function (element, callback) {
				var $element = typeof (element) === "string" ? $(element) : element;
				var minTime = 1000;
				var intervalTime = 200;

				var cancelLongTap = function () {
					mouseDown = false;
					var timer = $(this).attr("data-long-tap-timeout");
					var interval = $(this).attr("data-long-tap-interval");
					if (!timer && !interval) return;
					clearTimeout(timer);
					clearInterval(interval);
					$(this).attr("data-long-tap-interval", 0);
					$(this).attr("data-long-tap-timeout", 0);
				};
				$element.on('mousedown', function (e) {
					var target = e.target;
					var $target = $(this);
					cancelLongTap()
					var timer = setTimeout(function () {
						cancelLongTap()
						var interval = setInterval(function () {
							if (GameGlobals.gameState.uiStatus.mouseDown && GameGlobals.gameState.uiStatus.mouseDownElement == target) {
								callback.apply($target, e);
							} else {
								cancelLongTap();
							}
						}, intervalTime);
						$(this).attr("data-long-tap-interval", interval);
					}, minTime);
					$(this).attr("data-long-tap-timeout", timer);
				});
				$element.on('mouseleave', function (e) {
					cancelLongTap();
				});
				$element.on('mousemove', function (e) {
					cancelLongTap();
				});
				$element.on('mouseout', function (e) {
					cancelLongTap();
				});
				$element.on('mouseup', function (e) {
					cancelLongTap();
				});
			},

			focus: function ($element, numTries) {
				if (!$element || $element.length == 0) {
					log.w("could not find element to focus on");
					return;
				}

				let name = UIConstants.getElementName($element);

				if (numTries > 10) {
					log.w("could not focus on element (not focusable): " + name);
					return;
				}

				let e = $element[0];
				let isFocusable = UIConstants.isFocusable(e);

				if (!isFocusable) {
					setTimeout(() => { GameGlobals.uiFunctions.focus($element, numTries + 1); }, 100);
					return;
				}

				log.i("focus on " + name);
				e.focus();
			},

			showPreviousTab: function () {
				let visibleTabElements = $("#switch-tabs li").filter("[data-visible=true]");
				let currentTabElement = $("#switch-tabs li.selected")[0];
				let currentTabElementIndex = visibleTabElements.toArray().indexOf(currentTabElement);
				let previousTabElementIndex = currentTabElementIndex - 1;
				if (previousTabElementIndex < 0) previousTabElementIndex = visibleTabElements.length - 1;
				visibleTabElements[previousTabElementIndex].click();
				GameGlobals.uiFunctions.scrollToTabTop();
			},

			showNextTab: function () {
				let visibleTabElements = $("#switch-tabs li").filter("[data-visible=true]");
				let currentTabElement = $("#switch-tabs li.selected")[0];
				let currentTabElementIndex = visibleTabElements.toArray().indexOf(currentTabElement);
				let nextTabElementIndex = currentTabElementIndex + 1;
				if (nextTabElementIndex >= visibleTabElements.length) nextTabElementIndex = 0;
				visibleTabElements[nextTabElementIndex].click();
				GameGlobals.uiFunctions.scrollToTabTop();
			},

			showFight: function () {
				if (GameGlobals.gameState.uiStatus.isHidden) return;
				this.showSpecialPopup("fight-popup");
			},

			showIncomingCaravanPopup: function () {
				this.showSpecialPopup("incoming-caravan-popup");
			},

			showManageSave: function () {
				let options = { isMeta: true, isDismissable: true };
				this.showSpecialPopup("manage-save-popup", options);
			},

			showStatsPopup: function () {
				GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
				let options = { isMeta: true, isDismissable: true };
				this.updateGameStatsPopup();
				this.showSpecialPopup("game-stats-popup", options);
			},

			showSpecialPopup: function (popupID, options) {
				options = options || {};
				
				log.i("[ui] showSpecialPopup " + popupID);
				
				let $popup = $("#" + popupID);

				if (options.setupCallback) {
					options.setupCallback();
				}

				GameGlobals.uiFunctions.popupManager.setDismissable($popup, options.isDismissable);
				
				let uiFunctions = this;

				this.popupManager.showOverlay(function () {
					uiFunctions.popupManager.repositionPopup($popup);
					GlobalSignals.popupOpenedSignal.dispatch(popupID);
					$popup.stop().fadeIn(UIConstants.POPUP_FADE_IN_DURATION, function () {
						$popup.attr("data-toggling", false);
						uiFunctions.toggle("#" + popupID, true);
						uiFunctions.popupManager.repositionPopup($popup);
						uiFunctions.popupManager.updatePause();
						GlobalSignals.popupShownSignal.dispatch("common-popup");
						if (options.$defaultButton) GameGlobals.uiFunctions.focus(options.$defaultButton);
					});
					GlobalSignals.elementToggledSignal.dispatch(("#" + popupID), true);
				});
				
				this.generateInfoCallouts("#" + popupID);
			},

			showInfoPopup: function (title, msg, buttonLabel, resultVO, callback, isMeta, isDismissable) {
				if (!buttonLabel) buttonLabel = "Continue";
				let options = {
					isMeta: isMeta,
					isDismissable: isDismissable,
				};
				this.popupManager.showPopup(title, msg, buttonLabel, false, resultVO, callback, null, options);
			},

			showResultPopup: function (title, msg, resultVO, callback, options) {
				options = options || {};
				options.isDismissable = !resultVO || resultVO.isVisuallyEmpty();
				this.popupManager.showPopup(title, msg, "Continue", false, resultVO, callback, null, options);
			},

			showActionPopup: function (action, title, msg) {
				let options = {
					isMeta: false,
					isDismissable: true,
					action: action,
				};

				let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
				let actionName = Text.t("game.actions." + baseActionID + "_name");

				title = title || actionName;
				
				this.popupManager.showPopup(title, msg, null, "Cancel", null, null, null, options);
			},

			showConfirmation: function (msg, callback, isMeta) {
				let uiFunctions = this;
				
				let okCallback = function (e) {
					uiFunctions.popupManager.closePopup("common-popup");
					callback();
				};
				let cancelCallback = function () {
					uiFunctions.popupManager.closePopup("common-popup");
				};
				let options = {
					isMeta: isMeta,
					isDismissable: false,
				};
				
				this.popupManager.showPopup("Confirmation", msg, "Confirm", "Cancel", null, okCallback, cancelCallback, options);
			},

			showQuestionPopup: function (title, msg, buttonLabel, cancelButtonLabel, callbackOK, callbackNo, isMeta) {
				let uiFunctions = this;
				let okCallback = function (e) {
					uiFunctions.popupManager.closePopup("common-popup");
					callbackOK();
				};
				let cancelCallback = function () {
					uiFunctions.popupManager.closePopup("common-popup");
					if (callbackNo) callbackNo();
				};
				let options = {
					isMeta: isMeta,
					isDismissable: false,
				};
				this.popupManager.showPopup(title, msg, buttonLabel, cancelButtonLabel, null, okCallback, cancelCallback, options);
			},

			showInput: function (title, msg, defaultValue, allowCancel, confirmCallback, inputCallback, maxLength) {
				// TODO improve input validation (check and show feedback on input, not just on confirm)
				let okCallback = function () {
					let input = $("#common-popup input").val();
					input = StringUtils.cleanUpInput(input, maxLength);
					let ok = input && input.length > 0 && (inputCallback ? inputCallback(input) : true);
					if (ok) {
						confirmCallback(input);
						return true;
					} else {
						log.w("invalid input: " + input);
						return false;
					}
				};
				let cancelButtonLabel = allowCancel ? "Cancel" : null;
				let options = {
					isMeta: false,
					isDismissable: false,
					isCloseable: false,
				};
				
				this.popupManager.showPopup(title, msg, "Confirm", cancelButtonLabel, null, okCallback, null, options);

				var uiFunctions = this;
				var maxChar = 40;
				this.toggle("#common-popup-input-container", true);
				$("#common-popup-input-container input").attr("maxlength", maxChar);

				$("#common-popup input").val(defaultValue);
				$("#common-popup input").data("max-input-length", maxLength)
				$("#common-popup input").keydown(uiFunctions.onTextInputKeyDown);
				$("#common-popup input").keyup(uiFunctions.onTextInputKeyUp);
			},

			showGameOptions: function (show) {
				$("#game-options-extended").toggle(show);
				$("#btn-more").text(show ? Text.t("ui.meta.more_options_button_label") : Text.t("ui.meta.more_options_button_label"));
				GlobalSignals.elementToggledSignal.dispatch($("#game-options-extended"), show);
			},

			showResultFlyout: function (resultVO) {
				
			},
		});

		return UIFunctions;
	});
