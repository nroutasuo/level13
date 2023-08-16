// A class that checks raw user input from the DOM and passes game-related actions to PlayerActionFunctions
define(['ash',
		'core/ExceptionHandler',
		'game/GameGlobals',
		'game/GlobalSignals',
		'game/constants/GameConstants',
		'game/constants/CampConstants',
		'game/constants/UIConstants',
		'game/constants/ItemConstants',
		'game/constants/PlayerActionConstants',
		'game/constants/PlayerStatConstants',
		'game/constants/PositionConstants',
		'game/helpers/ui/UIPopupManager',
		'game/vos/ResourcesVO',
		'utils/MathUtils',
	],
	function (Ash, ExceptionHandler, GameGlobals, GlobalSignals, GameConstants, CampConstants, UIConstants, ItemConstants, PlayerActionConstants, PlayerStatConstants, PositionConstants, UIPopupManager, ResourcesVO, MathUtils) {

		// TODO separate generic utils and tabs handling to a different file

		var UIFunctions = Ash.Class.extend({

			context: "UIFunctions",
			popupManager: null,

			elementIDs: {
				tabs: {
					bag: "switch-bag",
					followers: "switch-followers",
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
				this.generateElements();
				this.hideElements();
				this.registerListeners();
				this.registerGlobalMouseEvents();
			},

			registerListeners: function () {
				var elementIDs = this.elementIDs;
				var uiFunctions = this;

				$(window).resize(this.onResize);

				// Switch tabs
				var onTabClicked = this.onTabClicked;
				$.each($("#switch-tabs li"), function () {
					$(this).click(function () {
						if (!($(this).hasClass("disabled"))) {
							onTabClicked(this.id);
						}
					});
				});

				// Collapsible divs
				this.registerCollapsibleContainerListeners("");

				// Steppers and stepper buttons
				this.registerStepperListeners("");

				// Action buttons buttons
				this.registerActionButtonListeners("");

				// Meta/non-action buttons
				$("#btn-save").click(function (e) {
					GlobalSignals.saveGameSignal.dispatch(GameConstants.SAVE_SLOT_DEFAULT, true);
				});
				$("#btn-restart").click(function (e) {
					uiFunctions.onRestartButton();
				});
				$("#btn-more").click(function (e) {
					var wasVisible = $("#game-options-extended").is(":visible");
					$("#game-options-extended").toggle();
					$(this).text(wasVisible ? "more" : "less");
					GlobalSignals.elementToggledSignal.dispatch($(this), !wasVisible);
				});
				$("#btn-importexport").click(function (e) {
					gtag('event', 'screen_view', {
						'screen_name': "popup-manage-save"
					});
					uiFunctions.showManageSave();
				});
				$("#btn-info").click(function (e) {
					gtag('event', 'screen_view', {
						'screen_name': "popup-game-info"
					});
					uiFunctions.showInfoPopup("Level 13", uiFunctions.getGameInfoDiv(), null, null, null, true, false);
				});

				$("#in-assign-workers input.amount").change(function (e) {
					var assignment = {};
					for (var key in CampConstants.workerTypes) {
						assignment[key] = parseInt($("#stepper-" + key + " input").val());
					}
					GameGlobals.playerActionFunctions.assignWorkers(null, assignment);
				});

				// Buttons: In: Other
				$("#btn-header-rename").click(function (e) {
					var prevCampName = GameGlobals.playerActionFunctions.getNearestCampName();
					uiFunctions.showInput(
						"Rename Camp",
						"Give your camp a new name",
						prevCampName,
						true,
						function (input) {
							GameGlobals.playerActionFunctions.setNearestCampName(input);
						}
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

			registerActionButtonListeners: function (scope) {
				var uiFunctions = this;
				var gameState = GameGlobals.gameState;

				// All action buttons
				$.each($(scope + " button.action"), function () {
					var $element = $(this);
					if ($element.hasClass("click-bound")) {
						log.w("trying to bind click twice! id: " + $element.attr("id"));
						return;
					}
					if ($element.hasClass("action-manual-trigger")) {
						return;
					}
					$element.addClass("click-bound");
					$element.click(ExceptionHandler.wrapClick(function (e) {
						var action = $(this).attr("action");
						if (!action) {
							log.w("No action mapped for button.");
							return;
						}
						
						GlobalSignals.actionButtonClickedSignal.dispatch(action);

						var param = null;
						var actionIDParam = GameGlobals.playerActionsHelper.getActionIDParam(action);
						if (actionIDParam) param = actionIDParam;
						let isProject = $(this).hasClass("action-level-project");
						if (isProject) param = $(this).attr("sector");
						if (!param) param = GameGlobals.playerActionsHelper.getActionDefaultParam();

						let locationKey = uiFunctions.getLocationKey(action);
						let isStarted = GameGlobals.playerActionFunctions.startAction(action, param);
						if (!isStarted) {
							uiFunctions.updateButtonCooldown($(this), action);
							return;
						}

						var baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
						var duration = PlayerActionConstants.getDuration(action, baseId);
						if (duration > 0) {
							GameGlobals.gameState.setActionDuration(action, locationKey, duration);
							uiFunctions.startButtonDuration($(this), duration);
						}
					}));
				});

				// Special actions
				$(scope + "#out-action-fight-confirm").click(function (e) {
					GameGlobals.fightHelper.startFight();
				});
				$(scope + "#out-action-fight-close").click(function (e) {
					GameGlobals.fightHelper.endFight(false);
				});
				$(scope + "#out-action-fight-continue").click(function (e) {
					GameGlobals.fightHelper.endFight(false);
				});
				$(scope + "#out-action-fight-takeselected").click(function (e) {
					GameGlobals.fightHelper.endFight(false);
				});
				$(scope + "#out-action-fight-takeall").click(function (e) {
					GameGlobals.fightHelper.endFight(true);
				});
				$(scope + "#out-action-fight-cancel").click(function (e) {
					GameGlobals.fightHelper.endFight(false);
					GameGlobals.playerActionFunctions.flee();
				});
				$(scope + "#incoming-caravan-popup-cancel").click(function (e) {
					uiFunctions.popupManager.closePopup("incoming-caravan-popup");
				});
				$(scope + " button[action='leave_camp']").click(function (e) {
					gameState.uiStatus.leaveCampItems = {};
					gameState.uiStatus.leaveCampRes = {};

					var selectedResVO = new ResourcesVO();
					$.each($("#embark-resources tr"), function () {
						var resourceName = $(this).attr("id").split("-")[2];
						var selectedVal = parseInt($(this).children("td").children(".stepper").children("input").val());
						selectedResVO.setResource(resourceName, selectedVal);
					});

					var selectedItems = {};
					$.each($("#embark-items tr"), function () {
						var itemID = $(this).attr("id").split("-")[2];
						var selectedVal = parseInt($(this).children("td").children(".stepper").children("input").val());
						selectedItems[itemID] = selectedVal;
					});

					GameGlobals.playerActionFunctions.updateCarriedItems(selectedItems);
					GameGlobals.resourcesHelper.moveResFromCampToBag(selectedResVO);
					GameGlobals.playerActionFunctions.leaveCamp();
				});

				// Buttons: Bag: Item details
				// some in UIOoutBagSystem
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
				this.generateButtonOverlays("body");
				this.generateCallouts("body");
				this.setInitialButtonState("body");
			},
			
			hideElements: function () {
				this.toggle($(".hidden-by-default"), false);
			},

			generateTabBubbles: function () {
				$("#switch li").append("<div class='bubble' style='display:none'>1</div>");
			},

			generateResourceIndicators: function () {
				for (var key in resourceNames) {
					var name = resourceNames[key];
					var isSupplies = name === resourceNames.food || name === resourceNames.water;
					$("#statsbar-resources").append(UIConstants.createResourceIndicator(name, false, "resources-" + name, true, true, true));
					$("#bag-resources").append(UIConstants.createResourceIndicator(name, false, "resources-bag-" + name, true, true, false));
				}
			},

			generateCallouts: function (scope) {
				// Info callouts
				$.each($(scope + " .info-callout-target"), function () {
					let $target = $(this);
					let generated = $target.data("callout-generated") || $target.parent().hasClass("callout-container");
					if (generated) {
						log.w("Info callout already generated! id: " + $target.attr("id") + ", scope: " + scope);
						log.i($target);
						return;
					}
					
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
				});

				// Button callouts
				// TODO performance bottleneck - detach elements to edit
				var uiFunctions = this;
				$.each($(scope + " div.container-btn-action"), function () {
					let $container = $(this);
					let button = $(this).children("button")[0];
					let action = $(button).attr("action");
					let generated = $container.data("callout-generated");
					if (generated) {
						log.w("Button callout already generated!");
						log.i($container);
						return;
					}
					$container.data("callout-generated", true);
					$container.wrap('<div class="callout-container"></div>');
					$container.after(function () {
						if (!action) {
							log.w("Action button with no action ");
							log.i($(button))
							return "";
						}
						if (action === "take_all" || action === "accept_inventory" || action === "fight")
							return "";
						return uiFunctions.generateActionButtonCallout(action);
					});
				});

				GlobalSignals.calloutsGeneratedSignal.dispatch();
			},
			
			updateCallouts: function (scope) {
				$.each($(scope + " .callout-container"), function () {
					var description = $(this).children(".info-callout-target").attr("description");
					$(this).find(".info-callout-content").html(description);
				});
			},
			
			generateActionButtonCallout: function (action) {
				var baseActionId = GameGlobals.playerActionsHelper.getBaseActionID(action);

				var content = "";
				var enabledContent = "";
				var disabledContent = "";
				
				/*
				var ordinal = GameGlobals.playerActionsHelper.getActionOrdinal(action);
				content += "<span>" + action + " " + ordinal + "</span>"
				*/

				// always visible: description
				var description = GameGlobals.playerActionsHelper.getDescription(action);
				if (description) {
					content += "<span class='action-description'>" + description + "</span>";
				}

				// visible if button is enabled: costs, special requirements, & risks
				let costs = GameGlobals.playerActionsHelper.getCosts(action);
				let costsSpans = UIConstants.getCostsSpans(action, costs);
				if (costsSpans.length > 0) {
					if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
					enabledContent += costsSpans;
				}

				var duration = PlayerActionConstants.getDuration(action, baseActionId);
				if (duration > 0) {
					if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
					enabledContent += "<span class='action-duration'>duration: " + Math.round(duration * 100) / 100 + "s</span>";
				}
				
				let specialReqs = GameGlobals.playerActionsHelper.getSpecialReqs(action);
				if (specialReqs) {
					let s = this.getSpecialReqsText(action);
					if (s.length > 0) {
						if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
						enabledContent += "<span class='action-special-reqs'>" + s + "</span>";
					}
				}

				var encounterFactor = GameGlobals.playerActionsHelper.getEncounterFactor(action);
				var injuryRiskMax = PlayerActionConstants.getInjuryProbability(action, 0, 0);
				var inventoryRiskMax = PlayerActionConstants.getLoseInventoryProbability(action, 0, 0);
				var fightRiskMax = PlayerActionConstants.getRandomEncounterProbability(baseActionId, 0, 1, encounterFactor);
				var fightRiskMin = PlayerActionConstants.getRandomEncounterProbability(baseActionId, 100, 1, encounterFactor);
				if (injuryRiskMax > 0 || inventoryRiskMax > 0 || fightRiskMax > 0) {
					if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
					var inventoryRiskLabel = action === "despair" ? "drop items" : "drop item";
					if (injuryRiskMax > 0)
						enabledContent += "<span class='action-risk action-risk-injury warning'>injury: <span class='action-risk-value'></span>%</span>";
					if (inventoryRiskMax > 0)
						enabledContent += "<span class='action-risk action-risk-inventory warning'>" + inventoryRiskLabel + ": <span class='action-risk-value'></span>%</span>";
					if (fightRiskMax > 0)
						enabledContent += "<span class='action-risk action-risk-fight warning'>fight: <span class='action-risk-value'></span>%</span>";
				}

				// visible if button is disabled: disabled reason
				if (content.length > 0 || enabledContent.length > 0) {
					if (content.length > 0) disabledContent += "<hr/>";
					disabledContent += "<span class='btn-disabled-reason action-cost-blocker'></span>";
				}

				if (enabledContent.length > 0) {
					content += "<span class='btn-callout-content-enabled'>" + enabledContent + "</span>";
				}

				if (disabledContent.length > 0) {
					content += "<span class='btn-callout-content-disabled' style='display:none'>" + disabledContent + "</span>";
				}

				if (content.length > 0) {
					return '<div class="btn-callout"><div class="callout-arrow-up"></div><div class="btn-callout-content">' + content + '</div></div>';
				} else {
					log.w("No callout could be created for action button with action " + action + ". No content for callout.");
					return "";
				}
			},

			getSpecialReqsText: function (action) {
				var position = GameGlobals.playerActionFunctions.playerPositionNodes.head ? GameGlobals.playerActionFunctions.playerPositionNodes.head.position : {};
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
										let count = GameGlobals.playerActionsHelper.getCurrentImprovementCountOnLevel(position.level, improvementID);
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
				$(scope + " .stepper").append("<input class='amount' type='text' min='0' max='100' autocomplete='off' value='0' name='' tabindex='1'></input>");
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

			generateButtonOverlays: function (scope) {
				$.each($(scope + " button.action"), function () {
					let $btn = $(this);
					if ($btn.parent().hasClass("container-btn-action")) {
						log.w("generating double button overlays: " + $(this) + " | " + scope);
						return;
					}
					let action = $btn.attr("action");
					let text = $btn.text();
					$btn.text("");
					$btn.append("<span class='btn-label'>" + text + "</span>");
					$btn.append("<div class='cooldown-action' style='display:none' />");
					$btn.append("<div class='cooldown-duration' style='display:none' />");
					$btn.wrap("<div class='container-btn-action' />");
				});
				
				
				$.each($(scope + " div.container-btn-action"), function () {
					let $container = $(this);
					if ($container.find(".cooldown-reqs").length > 0) return;
					let $button = $container.find("button");
					let action = $button.attr("action");
					let costs = GameGlobals.playerActionsHelper.getCosts(action);
					let hasCosts = action && costs && Object.keys(costs).length > 0;
					if (hasCosts) {
						$container.append("<div class='cooldown-reqs' data-action='" + action + "' />");
					}
				});
			},
			
			setInitialButtonState: function (scope) {
				GameGlobals.buttonHelper.updateButtonDisabledStates(scope, true);
			},

			startGame: function () {
				log.i("Starting game..");
				var startTab = this.elementIDs.tabs.out;
				var playerPos = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
				if (playerPos.inCamp) startTab = this.elementIDs.tabs.in;
				this.selectTab(startTab);
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
					if (!GameGlobals.gameState.isAutoPlaying) {
						let button = $("button[action='" + action + "']");
						this.startButtonCooldown($(button), cooldown);
					}
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
				GlobalSignals.gameShownSignal.dispatch();
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

			getGameInfoDiv: function () {
				var html = "";
				html += "<span id='changelog-version'>version " + GameGlobals.changeLogHelper.getCurrentVersionNumber() + "<br/>updated " + GameGlobals.changeLogHelper.getCurrentVersionDate() + "</span>";
				html += "<p>Note that this game is still in development and many features are incomplete and unbalanced. Updates might break saves. Feedback and bug reports are appreciated!</p>";
				html += "<p>Feedback:<br/>" + GameConstants.getFeedbackLinksHTML() + "</p>";
				html += "<p>More info:<br/><a href='faq.html' target='faq'>faq</a> | <a href='changelog.html' target='changelog'>changelog</a></p>";
				return html;
			},

			onTabClicked: function (tabID, tabProps) {
				if (GameGlobals.gameState.isLaunchStarted) return;
				if (GameGlobals.gameState.isLaunched) return;
				
				GameGlobals.uiFunctions.selectTab(tabID, tabProps);
			},
			
			selectTab: function (tabID, tabProps) {
				$("#switch-tabs li").removeClass("selected");
				$("#switch-tabs li#" + tabID).addClass("selected");
				$("#tab-header h2").text(tabID);

				gtag('event', 'screen_view', {
					'screen_name': tabID
				});

				var transition = !(GameGlobals.gameState.uiStatus.currentTab === tabID);
				var transitionTime = transition ? 200 : 0;
				GameGlobals.gameState.uiStatus.currentTab = tabID;

				$.each($(".tabelement"), function () {
					GameGlobals.uiFunctions.slideToggleIf($(this), null, $(this).attr("data-tab") === tabID, transitionTime, 200);
				});
				$.each($(".tabbutton"), function () {
					GameGlobals.uiFunctions.slideToggleIf($(this), null, $(this).attr("data-tab") === tabID, transitionTime, 200);
				});
				
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
				var isInCamp = GameGlobals.playerHelper.isInCamp();
				let hasPopups = GameGlobals.uiFunctions.popupManager.hasOpenPopup();
				if (!e.shiftKey) {
					if (!isInCamp && !hasPopups) {
						if (e.keyCode == 65) {
							GameGlobals.playerActionFunctions.startAction("move_sector_west");
						}
						if (e.keyCode == 87) {
							GameGlobals.playerActionFunctions.startAction("move_sector_north");
						}
						if (e.keyCode == 83) {
							GameGlobals.playerActionFunctions.startAction("move_sector_south")
						}
						if (e.keyCode == 68) {
							GameGlobals.playerActionFunctions.startAction("move_sector_east")
						}
						if (e.keyCode == 81) {
							GameGlobals.playerActionFunctions.startAction("move_sector_nw")
						}
						if (e.keyCode == 69) {
							GameGlobals.playerActionFunctions.startAction("move_sector_ne")
						}
						if (e.keyCode == 90) {
							GameGlobals.playerActionFunctions.startAction("move_sector_sw")
						}
						if (e.keyCode == 67) {
							GameGlobals.playerActionFunctions.startAction("move_sector_se")
						}
						if (GameConstants.isCheatsEnabled) {
							if (e.keyCode == 78) {
								GameGlobals.playerActionFunctions.startAction("scavenge")
							}
							if (e.keyCode == 77) {
								GameGlobals.playerActionFunctions.startAction("scout")
							}
						}
					}
					if (e.keyCode == 27) {
						GameGlobals.uiFunctions.popupManager.dismissPopups();
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
			},

			onTextInputKeyUp: function (e) {
				var value = $(e.target).val();
				value = value.replace(/[&\/\\#,+()$~%.'":*?<>{}\[\]=]/g, '_');
				$(e.target).val(value);
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

			cleanUpInput: function (str) {
				return str.replace(/[&\/\\#,+()$~%.'":*?<>{}]$/g, '');
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
				} else if (!show && (visible == true || visible == null) && !toggling) {
					$(element).attr("data-toggling", "true");
					$(element).stop().slideToggle(durationOut, function () {
						if (replacement) sys.toggle(replacement, true);
						sys.toggle(element, false);
						$(element).attr("data-toggling", "false");
						if (cb) cb();
					});
				}
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

			tabToggleIf: function (element, replacement, show, durationIn, durationOut) {
				var visible = $(element).is(":visible");
				var toggling = ($(element).attr("data-toggling") == "true");
				var sys = this;

				if (show && !visible && !toggling) {
					if (replacement) sys.toggle(replacement, false);
					$(element).attr("data-toggling", "true");
					$(element).fadeToggle(durationIn, function () {
						sys.toggle(element, true);
						$(element).attr("data-toggling", "false");
					});
				} else if (!show && visible && !toggling) {
					$(element).attr("data-toggling", "true");
					$(element).fadeToggle(durationOut, function () {
						if (replacement) sys.toggle(replacement, true);
						sys.toggle(element, false);
						$(element).attr("data-toggling", "false");
					});
				}
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
				$element.attr("data-visible", show);
				$element.toggle(show);
				// NOTE: For some reason the element isn't immediately :visible for checks in UIOutElementsSystem without the timeout
				setTimeout(function () {
					GlobalSignals.elementToggledSignal.dispatch($element, show, signalParams);
				}, 1);
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

			stopButtonCooldown: function (button) {
				$(button).children(".cooldown-action").stop(true, true);
				$(button).attr("data-hasCooldown", "false");
				$(button).children(".cooldown-action").css("display", "none");
				$(button).children(".cooldown-action").css("width", "100%");
				GlobalSignals.updateButtonsSignal.dispatch();
			},
			
			updateButtonCooldown: function (button, action) {
				var baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
				var locationKey = this.getLocationKey(action);
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
				if (!GameGlobals.playerActionsHelper.isRequirementsMet(action)) return;
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
				let maxFavour = GameGlobals.playerHelper.getMaxFavour();
				let maxInsight = GameGlobals.playerActionFunctions.playerStatsNodes.head.insight.maxValue;
				let showStorage = GameGlobals.resourcesHelper.getCurrentStorageCap();
				
				for (let key in costs) {
					let $costSpan = elements.costSpans[key];
					if (!$costSpan || $costSpan.length == 0) {
						log.w("cost span missing: " + key + " " + action);
						continue;
					}
					let value = costs[key];
					let costFraction = GameGlobals.playerActionsHelper.checkCost(action, key);
					let isFullCostBlocker =
						(isResource(key.split("_")[1]) && value > showStorage) ||
						(key == "stamina" && value > playerHealth * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR) ||
						(key == "rumours" && value > maxRumours) ||
						(key == "evidence" && value > maxEvidence) ||
						(key == "insight" && value > maxInsight) ||
						(key == "favour" && value > maxFavour);
						
					if (costsStatus) {
						if (isFullCostBlocker) {
							costsStatus.hasCostBlockers = true;
						} else if (costFraction < costsStatus.bottleneckCostFraction) {
							costsStatus.bottleneckCostFraction = costFraction;
						}
					}
					$costSpan.toggleClass("action-cost-blocker", costFraction < 1);
					$costSpan.toggleClass("action-cost-blocker-storage", isFullCostBlocker);
	
					if (value !== displayedCosts[key]) {
						let $costSpanValue = elements.costSpanValues[key];
						$costSpanValue.html(UIConstants.getDisplayValue(value));
						GameGlobals.uiFunctions.toggle($costSpan, value > 0, signalParams);
						displayedCosts[key] = value;
					}
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
				GameGlobals.uiFunctions.toggle($element, bubbleNumber > 0);
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

			showTab: function (tabID, tabProps) {
				if (GameGlobals.gameState.isLaunched) return;
				this.onTabClicked(tabID, tabProps);
			},

			showFight: function () {
				if (GameGlobals.gameState.uiStatus.isHidden) return;
				this.showSpecialPopup("fight-popup");
			},

			showIncomingCaravanPopup: function () {
				this.showSpecialPopup("incoming-caravan-popup");
			},

			showManageSave: function () {
				this.showSpecialPopup("manage-save-popup");
			},

			showSpecialPopup: function (popupID) {
				log.i("[ui] showSpecialPopup " + popupID);
				let $popup = $("#" + popupID);
				if ($popup.is(":visible")) return;
				
				if ($popup.parent().hasClass("popup-overlay")) $popup.unwrap();
				$popup.wrap("<div class='popup-overlay popup-overlay-ingame' style='display:none'></div>");
				
				let uiFunctions = this;
				$(".popup-overlay").fadeIn(200, function () {
					uiFunctions.popupManager.repositionPopups();
					GlobalSignals.popupOpenedSignal.dispatch(popupID);
					GameGlobals.gameState.isPaused = true;
					$("#" + popupID).fadeIn(200, function () {
						uiFunctions.toggle("#" + popupID, true);
						uiFunctions.popupManager.repositionPopups();
					});
					GlobalSignals.elementToggledSignal.dispatch(("#" + popupID), true);
				});
				this.generateCallouts("#" + popupID);
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
				this.popupManager.showPopup(title, msg, "Continue", false, resultVO, callback, null, options);
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

			showInput: function (title, msg, defaultValue, allowCancel, confirmCallback, inputCallback) {
				// TODO improve input validation (check and show feedback on input, not just on confirm)
				let okCallback = function () {
					let input = $("#common-popup input").val();
					input = GameGlobals.uiFunctions.cleanUpInput(input);
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
				};
				
				this.popupManager.showPopup(title, msg, "Confirm", cancelButtonLabel, null, okCallback, null, options);

				var uiFunctions = this;
				var maxChar = 40;
				this.toggle("#common-popup-input-container", true);
				$("#common-popup-input-container input").attr("maxlength", maxChar);

				$("#common-popup input").val(defaultValue);
				$("#common-popup input").keydown(uiFunctions.onTextInputKeyDown);
				$("#common-popup input").keyup(uiFunctions.onTextInputKeyUp);
			},
		});

		return UIFunctions;
	});
