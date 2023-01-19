// Creates and updates maps (mini-map and main)
define(['ash',
	'utils/CanvasUtils',
	'game/GameGlobals',
	'game/constants/CanvasConstants',
	'game/constants/ColorConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/UpgradeConstants',
	'game/nodes/tribe/TribeUpgradesNode'],
function (Ash, CanvasUtils, GameGlobals, CanvasConstants, ColorConstants, PlayerActionConstants, UpgradeConstants, TribeUpgradesNode) {
	
	var UITechTreeNode = Ash.Class.extend({
		
		definition: null,
		level: 0,
		requiresIDs: [],
		requires: [],
		requiredBy: [],
		requiredByByLevel: {},
		
		constructor: function () {
			this.requiresIds = [];
			this.requires = [];
			this.requiredBy = [];
			this.requiredByByLevel = {};
			this.x = -1;
			this.y = -1;
		},
	});
	
	var TechTree = Ash.Class.extend({
		
		roots: [],
		nodesById: {},
		
		constructor: function () {
			this.roots = [];
			this.grid = [];
			this.nodesById = {};
			this.maxX = -1;
			this.maxY = -1;
		},
		
		addNode: function (node) {
			if (node.requiresIDs.length === 0)
				this.addRootNode(node);
			this.nodesById[node.definition.id] = node;
		},
		
		addRootNode: function (node) {
			let i = 0;
			for (i; i <= this.roots.length; i++) {
				if (i === this.roots.length)
					break;
				if (this.roots[i].campOrdinal >= node.campOrdinal)
					break;
			}
			this.roots.splice(i, 0, node);
		},
		
		connectNodes: function () {
			var node;
			var requiredId;
			var requiredNode;
			for (var id in this.nodesById) {
				node = this.nodesById[id];
				for (let i = 0; i < node.requiresIDs.length; i++) {
					requiredId = node.requiresIDs[i];
					requiredNode = this.nodesById[requiredId];
					if (requiredNode) {
						node.requires.push(requiredNode);
						requiredNode.requiredBy.push(node);
						if (!requiredNode.requiredByByLevel[node.level])
							requiredNode.requiredByByLevel[node.level] = [];
						requiredNode.requiredByByLevel[node.level].push(node);
					} else {
						log.w("Missing required node: " + requiredId);
					}
				}
			}
		},
		
		pruneNodes: function (tribeNodes) {
			var node;
			for (var id in this.nodesById) {
				node = this.nodesById[id];
				
				// unlocked
				if (tribeNodes.head.upgrades.hasUpgrade(node.definition.id))
					continue;
				
				// available
				var isAvailable = GameGlobals.playerActionsHelper.checkRequirements(node.definition.id, false).value > 0;
				if (isAvailable)
					continue;
					
				// visible (requirements available)
				var isVisible = false;
				var reqs = GameGlobals.playerActionsHelper.getReqs(node.definition.id);
				var isMissingBlueprint = reqs && reqs.blueprint && !tribeNodes.head.upgrades.hasAvailableBlueprint(node.definition.id);
				if (!isMissingBlueprint) {
					for (let i = 0; i < node.requires.length; i++) {
						isVisible = isVisible || GameGlobals.playerActionsHelper.checkRequirements(node.requires[i].definition.id, false).value > 0;
					}
				} else {
					isVisible = tribeNodes.head.upgrades.hasNewBlueprint(node.definition.id);
				}
				if (isVisible)
					continue;
					
				// none of the above - prune
				this.removeNode(this.nodesById[id]);
			}
		},
		
		removeNode: function (node) {
			if (this.roots.indexOf(node) >= 0)
				this.roots.splice(this.roots.indexOf(node), 1);
			
			var requiredNode;
			for (let i = 0; i < node.requires.length; i++) {
				requiredNode = node.requires[i];
				requiredNode.requiredBy.splice(requiredNode.requiredBy.indexOf(node), 1);
				requiredNode.requiredByByLevel[node.level].splice(requiredNode.requiredByByLevel[node.level].indexOf(node), 1);
			}
		},
		
		getDepth: function (fromNode) {
			var maxD = 0;
			var d = 0;
			var searchNodes = fromNode ? fromNode.requiredBy : this.roots;
			for (let i = 0; i < searchNodes.length; i++) {
				var searchNodeValue = fromNode ? 1 : searchNodes[i].level;
				 d = searchNodeValue + this.getDepth(searchNodes[i]);
				 if (d > maxD) maxD = d;
			}
			return maxD;
		},
		
		toString: function () {
			return "TechTree (" + this.roots.length + ")";
		},
	});
	
	var UITechTreeHelper = Ash.Class.extend({
		
		canvas: null,
		ctx: null,
		
		cellW: 85,
		cellH: 22,
		cellPX: 20,
		cellPY: 15,
		treePX: 20,
		treePY: 20,
		
		minGridStep: 0.25,
		
		constructor: function (engine) {
			this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
		},
		
		init: function (canvasId, overlayId, selectioncb) {
			var vis = { $canvas: $("#" + canvasId), canvasId: canvasId, $overlay: $("#" + overlayId), overlayId: overlayId, selectioncb: selectioncb };
			vis.selectedID = null;
			return vis;
		},
		
		enableScrolling: function (vis) {
			CanvasConstants.makeCanvasScrollable(vis.canvasId);
			CanvasConstants.updateScrollEnable(vis.canvasId);
		},
		
		drawTechTree: function (vis) {
			var tree = this.makeTechTree();
			var y = 0;
			for (let i = 0; i < tree.roots.length; i++) {
				y = y + this.positionRoot(tree, tree.roots[i], y);
			}
			vis.tree = tree;
			vis.dimensions = this.getTreeDimensions(vis, tree.maxX, tree.maxY);
			vis.sunlit = $("body").hasClass("sunlit");
			
			// TODO extend to several required tech per tech; currently drawing assumes max 1
			
			this.refreshCanvas(vis);
			this.rebuildOverlay(vis);
			CanvasConstants.updateScrollEnable(vis.canvasId);
			CanvasConstants.updateScrollIndicators(vis.canvasId);
		},
		
		refreshCanvas: function (vis) {
			this.canvas = vis.$canvas[0];
			this.ctx = CanvasUtils.getCTX(vis.$canvas);
			
			if (!this.ctx)
				return;
			
			this.ctx.canvas.width = vis.dimensions.canvasWidth;
			this.ctx.canvas.height = vis.dimensions.canvasHeight;
			this.ctx.clearRect(0, 0, this.canvas.scrollWidth, this.canvas.scrollWidth);
			this.ctx.fillStyle = ColorConstants.getColor(vis.sunlit, "bg_page");
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

			for (let i = 0; i < vis.tree.roots.length; i++) {
				this.drawRoot(vis, vis.tree.roots[i], vis.sunlit);
			}
		},
		
		rebuildOverlay: function (vis) {
			var $overlay = vis.$overlay;
			$overlay.empty();
			$overlay.css("width", vis.dimensions.canvasWidth + "px");
			$overlay.css("height", vis.dimensions.canvasHeight + "px");
			
			for (let i = 0; i < vis.tree.roots.length; i++) {
				var root = vis.tree.roots[i];
				this.addOverlayNodes(vis, $overlay, root);
			}
		},
		
		addOverlayNodes: function (vis, $overlay, root) {
			this.addOverlayNode(vis, $overlay, root);
			for (var level in root.requiredByByLevel) {
				for (let j = 0; j < root.requiredByByLevel[level].length; j++) {
					this.addOverlayNodes(vis, $overlay, root.requiredByByLevel[level][j]);
				}
			}
		},
		
		addOverlayNode: function (vis, $overlay, node) {
			var xpx = this.getPixelPosX(node.x);
			var ypx = this.getPixelPosY(node.y);
			var data = "data-id='" + node.definition.id + "'";
			var text = node.definition.name;
			var $div = $("<div class='canvas-overlay-cell upgrades-overlay-cell' style='top: " + ypx + "px; left: " + xpx + "px' " + data +"><p>" + text +"</p></div>");
			var helper = this;
			$div.click(function (e) {
				log.i("tech selected: " + node.definition.id);
				vis.selectedID = node.definition.id;
				vis.selectioncb();
			});
			$div.hover(function () {
				vis.highlightedID = node.definition.id;
				helper.refreshCanvas(vis);
			}, function () {
				vis.highlightedID = null;
				helper.refreshCanvas(vis);
			});
			$overlay.append($div);
		},
		
		isOccupied: function (tree, x, y) {
			var grids = 1/this.minGridStep;
			var gridX = Math.round(x*grids) / grids;
			var gridY = Math.round(y*grids) / grids;
			if (gridX < 0 || gridY < 0) return true;
			if (!tree.grid[gridY]) return false;
			return tree.grid[gridY][gridX];
		},
		
		isOccupiedArea: function (tree, x, y, px, py) {
			if (this.isOccupied(tree, x, y)) return true;
			for (var tx = Math.max(0, x - px); tx <= x + px; tx += this.minGridStep) {
				for (var ty = Math.max(0, y - py); ty <= y + py; ty += this.minGridStep) {
					if (this.isOccupied(tree, tx, ty)) return true;
				}
			}
			return false;
		},
		
		positionNode: function (tree, node, x, y) {
			node.x = x;
			node.y = y;
			if (node.x > tree.maxX) tree.maxX = node.x;
			if (node.y > tree.maxY) tree.maxY = node.y;
			
			var grids = 1/this.minGridStep;
			var gridX = Math.round(x*grids) / grids;
			var gridY = Math.round(y*grids) / grids;
			if (!tree.grid[gridY]) tree.grid[gridY] = {};
			if (this.isOccupiedArea(tree, gridX, gridY, 0.5, 0.5)) log.w("Overlapping position: " + gridX + "-" + gridY + " " + node.definition.name);
			tree.grid[gridY][gridX] = node;
		},
		
		positionChildren: function (tree, parent, yHeight, x, y) {
			var child;
			var l = 0;
			var childYHeight = 0.825;
			var numChildren = parent.requiredBy.length;
			if (numChildren > yHeight) yHeight = numChildren * childYHeight;
			
			var maxYoffset = 0;
			if (numChildren == 2) maxYoffset = childYHeight / 2;
			if (numChildren > 2) maxYoffset = childYHeight;
			
			for (let i = 0; i < parent.requiredBy.length; i++) {
				child = parent.requiredBy[i];
				var ydiff = i * childYHeight;
				var childX = Math.max(x + 1, child.level);
				var childY = y + ydiff;
				if (maxYoffset > 0) {
					var yOffset = 0;
					var isOccupied = this.isOccupiedArea(tree, childX, childY - maxYoffset, 0.5, 0.5);
					if (!isOccupied) {
						yOffset = -maxYoffset;
						childY += yOffset;
					} else {
						maxYoffset = 0;
					}
				}
				
				let j = 0;
				while (this.isOccupiedArea(tree, childX, childY, 0.25, childYHeight/2)) {
					if (childY < 0) { log.i("break push due to 0"); break; }
					if (j > 100) { log.i("break push due to j"); break; }
					childY += childYHeight / 2;
					j++;
				}
				this.positionNode(tree, child, childX, childY);
				var childHeight = this.positionChildren(tree, child, yHeight, child.x, child.y);
				yHeight = Math.max(yHeight, childHeight);
			}
			return Math.max(1, yHeight);
		},
		
		positionRoot: function (tree, root, y) {
			var x = Math.max(0, root.level - 1);
			var yHeight = 1;
			this.positionNode(tree, root, x, y);
			yHeight = this.positionChildren(tree, root, yHeight, x, y);
			return yHeight;
		},
		
		drawRoot: function (vis, root, sunlit) {
			this.drawNode(vis, root, sunlit);
			for (var level in root.requiredByByLevel) {
				for (let i = 0; i < root.requiredByByLevel[level].length; i++) {
					this.drawRoot(vis, root.requiredByByLevel[level][i], sunlit);
				}
			}
		},
		
		drawNode: function (vis, node, sunlit) {
			var pixelX = this.getPixelPosX(node.x);
			var pixelY = this.getPixelPosY(node.y);
			
			// arrows
			for (let i = 0; i < node.requiredBy.length; i++) {
				var targetGridX = node.requiredBy[i].x;
				var targetGridY = node.requiredBy[i].y;
				var arrowstartxOffset = -Math.abs(node.y - targetGridY) * this.cellW / 16;
				this.drawArrow(
					pixelX + this.cellW + arrowstartxOffset,
					pixelY + this.cellH / 2,
					this.getPixelPosX(targetGridX) - this.cellPX / 5,
					this.getPixelPosY(targetGridY) + this.cellH / 2,
					this.getArrowColor(vis.tree, node, node.requiredBy[i], sunlit, vis.highlightedID)
				);
			}
			
			// node
			this.ctx.fillStyle = this.getFillColor(vis.tree, node, sunlit, vis.highlightedID);
			this.ctx.fillRect(pixelX, pixelY, this.cellW, this.cellH);
			
			// available border
			var hasUpgrade = this.tribeNodes.head.upgrades.hasUpgrade(node.definition.id);
			var isAvailable = GameGlobals.playerActionsHelper.checkRequirements(node.definition.id, false).value > 0;
			if (!hasUpgrade && isAvailable) {
				this.ctx.lineWidth = 3;
				this.ctx.strokeStyle = this.getBorderColor(vis.tree, node, sunlit, vis.highlightedID);
				this.ctx.beginPath();
				this.ctx.moveTo(pixelX, pixelY);
				this.ctx.lineTo(pixelX + this.cellW, pixelY);
				this.ctx.lineTo(pixelX + this.cellW, pixelY + this.cellH);
				this.ctx.lineTo(pixelX, pixelY + this.cellH);
				this.ctx.lineTo(pixelX, pixelY);
				this.ctx.stroke();
				this.ctx.closePath();
			}
		},
		
		getPixelPosX: function (x) {
			return this.treePX + x * this.cellW + x * this.cellPX;
		},
		
		getPixelPosY: function (y) {
			return this.treePY + y * this.cellH + y * this.cellPY;
		},
		
		drawArrow: function (fromx, fromy, tox, toy, color) {
			if (fromx < 0 || fromy < 0 || tox < 0 || toy < 0)
				return;
				
			var angle = Math.atan2(toy-fromy,tox-fromx);
			
			// arrow line
			this.ctx.strokeStyle = color;
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			this.ctx.moveTo(fromx, fromy);
			var pointsAligned = fromy == toy || fromx == tox;
			var pointsClose = Math.abs(fromy - toy) < this.cellH && Math.abs(fromx - tox) < this.cellW;
			if (pointsAligned || pointsClose) {
				this.ctx.lineTo(tox, toy);
			} else {
				var quadx = this.getCurveControlX(fromx, fromy, tox, toy);
				var quady = this.getCurveControlY(fromx, fromy, tox, toy);
				this.ctx.quadraticCurveTo(quadx, quady, tox, toy);
				// uncomment to see control points
				//this.ctx.fillRect(quadx,quady,4,4);
				angle = Math.abs(fromx - tox) > Math.abs(fromy - toy) ? 0 : angle / 2;
			}
			this.ctx.stroke();
			
			// arrowhead
			CanvasUtils.drawTriangle(this.ctx, color, 8, 8, tox, toy, angle);
		},
		
		makeTechTree: function () {
			var definition;
			var tree = new TechTree();
			var node;
			var ids = Object.keys(UpgradeConstants.upgradeDefinitions)
			ids.sort(function (a, b) {
				var levela = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade(a);
				var levelb = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade(b);
				return levela - levelb;
			});
			for (let i = 0; i < ids.length; i++) {
				definition = UpgradeConstants.upgradeDefinitions[ids[i]];
				var reqs = PlayerActionConstants.requirements[definition.id];
				node = new UITechTreeNode();
				node.definition = definition;
				node.campOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade(definition.id);
				node.level = Math.floor(node.campOrdinal / 3);
				node.requiresIDs = reqs && reqs.upgrades ? [ Object.keys(reqs.upgrades)[0] ] : []; // only visualize first requirement
				tree.addNode(node);
			}
			tree.connectNodes();
			tree.pruneNodes(this.tribeNodes, GameGlobals.playerActionsHelper);
			return tree;
		},
		
		getTreeDimensions: function (vis, maxX, maxY) {
			var dimensions = {};
			var canvas = vis.$canvas[0];
			dimensions.treeWidth = (maxX + 1) * this.cellW + maxX * this.cellPX + 2 * this.treePX;
			dimensions.treeHeight = (maxY + 1) * this.cellH + maxY * this.cellPY + 2 * this.treePY;
			dimensions.canvasWidth = Math.max(dimensions.treeWidth, $(canvas).parent().width());
			dimensions.canvasHeight = Math.max(dimensions.treeHeight, 100);
			return dimensions;
		},
		
		isConnected: function (tree, id1, id2) {
			if (id1 == id2) return true;
			return this.isDescendantOf(tree, id1, id2) || this.isAncestorOf(tree, id1, id2);
		},
		
		isAncestorOf: function (tree, id1, id2) {
			if (id1 == id2) return true;
			var node1 = tree.nodesById[id1];
			for (let i = 0; i < node1.requiredBy.length; i++) {
				var node3 = node1.requiredBy[i];
				if (this.isAncestorOf(tree, node3.definition.id, id2)) return true;
			}
			return false;
		},
		
		isDescendantOf: function (tree, id1, id2) {
			if (id1 == id2) return true;
			var node1 = tree.nodesById[id1];
			for (let i = 0; i < node1.requires.length; i++) {
				var node3 = node1.requires[i];
				if (this.isDescendantOf(tree, node3.definition.id, id2)) return true;
			}
			return false;
		},
		
		getCurveControlX: function (fromx, fromy, tox, toy) {
			// steeper curve (x control closer to fromx) when target is further away
			let result = fromx + this.cellW / 4 * 3 - (tox - fromx);
			result = Math.max(result, fromx );
			result = Math.min(result, (fromx + tox) / 2);
			return result;
		},
		
		getCurveControlY: function (fromx, fromy, tox, toy) {
			if (fromy == toy) return fromy;
			
			var xdist = Math.abs(fromx - tox);
			if (xdist > this.cellW + this.cellPX * 2) {
				// long distance, add some extra curviness to avoid overlaps
				if (fromy < toy) {
					return toy + this.cellPY;
				} else {
					return toy - this.cellPY;
				}
			} else {
				// short (max 1 level) distance, basic curve
				return toy;
			}
		},
		
		getArrowColor: function (tree, fromNode, toNode, sunlit, highlightedID) {
			var def1 = fromNode.definition;
			var def2 = toNode.definition;
			var highlight = this.isConnected(tree, fromNode.definition.id, highlightedID) && this.isConnected(tree, toNode.definition.id, highlightedID);
			if (!highlightedID || highlight) {
				return ColorConstants.getColor(sunlit, "techtree_arrow");
			} else {
				return ColorConstants.getColor(sunlit, "techtree_arrow_dimmed");
			}
		},
		
		getFillColor: function (tree, node, sunlit, highlightedID) {
			var definition = node.definition;
			var isUnlocked = this.tribeNodes.head.upgrades.hasUpgrade(definition.id);
			var highlight = definition.id == highlightedID || this.isConnected(tree, definition.id, highlightedID);
			if (!highlightedID || highlight) {
				if (isUnlocked) {
					return ColorConstants.getColor(sunlit, "techtree_node_unlocked");
				}
				var isAvailable = GameGlobals.playerActionsHelper.checkRequirements(definition.id, false).value > 0;
				if (isAvailable) {
					return ColorConstants.getColor(sunlit, "techtree_node_available");
				}
				return ColorConstants.getColor(sunlit, "techtree_node_default");
			} else {
				return ColorConstants.getColor(sunlit, "techtree_node_dimmed");
				
			}
		},
		
		getBorderColor: function (tree, node, sunlit, highlightedID) {
			var definition = node.definition;
			var isUnlocked = this.tribeNodes.head.upgrades.hasUpgrade(definition.id);
			var isAvailable = GameGlobals.playerActionsHelper.checkRequirements(node.definition.id, false).value > 0;
			if (!isUnlocked && isAvailable) {
				var highlight = definition.id == highlightedID || this.isConnected(tree, definition.id, highlightedID);
				if (!highlightedID || highlight) {
					return ColorConstants.getColor(sunlit, "techtree_node_unlocked");
				} else {
					return ColorConstants.getColor(sunlit, "techtree_node_default");
				}
			} else {
				return this.getFillColor(tree, node, sunlit, highlightedID);
			}
		}
		
	});
	
	return UITechTreeHelper;
});
