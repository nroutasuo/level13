// Creates and updates maps (mini-map and main)
define(['ash',
    'game/GameGlobals',
    'game/constants/CanvasConstants',
    'game/constants/PlayerActionConstants',
    'game/constants/UpgradeConstants',
    'game/nodes/tribe/TribeUpgradesNode'],
function (Ash, GameGlobals, CanvasConstants, PlayerActionConstants, UpgradeConstants, TribeUpgradesNode) {
    
    var TechTreeNode = Ash.Class.extend({
        
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
            var i = 0;
            for (i; i <= this.roots.length; i++) {
                if (i === this.roots.length)
                    break;
                if (this.roots[i].level >= node.level)
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
                for (var i = 0; i < node.requiresIDs.length; i++) {
                    requiredId = node.requiresIDs[i];
                    requiredNode = this.nodesById[requiredId];
                    if (requiredNode) {
                        node.requires.push(requiredNode);
                        requiredNode.requiredBy.push(node);
                        if (!requiredNode.requiredByByLevel[node.level])
                            requiredNode.requiredByByLevel[node.level] = [];
                        requiredNode.requiredByByLevel[node.level].push(node);
                    } else {
                        console.log("WARN: Missing required node: " + requiredId);
                    }
                }
            }
        },
        
        pruneNodes: function (tribeNodes) {
            var node;
            for (var id in this.nodesById) {
                node = this.nodesById[id];
                if (tribeNodes.head.upgrades.hasUpgrade(node.definition.id))
                    continue;
                
                var isAvailable = GameGlobals.playerActionsHelper.checkRequirements(node.definition.id, false).value > 0;
                if (isAvailable)
                    continue;
                
                for (var i = 0; i < node.requires.length; i++) {
                    isAvailable = isAvailable || GameGlobals.playerActionsHelper.checkRequirements(node.requires[i].definition.id, false).value > 0;
                }
                if (isAvailable)
                    continue;
                
                this.removeNode(this.nodesById[id]);
            }
        },
        
        removeNode: function (node) {
            if (this.roots.indexOf(node) >= 0)
                this.roots.splice(this.roots.indexOf(node), 1);
            
            var requiredNode;
            for (var i = 0; i < node.requires.length; i++) {
                requiredNode = node.requires[i];
                requiredNode.requiredBy.splice(requiredNode.requiredBy.indexOf(node), 1);
                requiredNode.requiredByByLevel[node.level].splice(requiredNode.requiredByByLevel[node.level].indexOf(node), 1);
            }
        },
        
        getDepth: function (fromNode) {
            var maxD = 0;
            var d = 0;
            var searchNodes = fromNode ? fromNode.requiredBy : this.roots;
            for (var i = 0; i < searchNodes.length; i++) {
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
        cellH: 20,
        cellPX: 20,
        cellPY: 10,
        treePX: 20,
        treePY: 40,
        
        constructor: function (engine) {            
			this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
        },
        
        enableScrolling: function (canvasId) {
            CanvasConstants.makeCanvasScrollable(canvasId);
            CanvasConstants.updateScrollEnable(canvasId);
        },
        
        drawTechTree: function (canvasId) {
            this.canvas = $("#" + canvasId)[0];
            this.ctx = this.canvas ? this.canvas.getContext && this.canvas.getContext('2d') : null;
            
            if (!this.ctx)
                return;
            
            var tree = this.makeTechTree();
            var sunlit = $("body").hasClass("sunlit");
            
            // TODO extend to several required tech per tech; currently drawing assumes max 1
            
            var y = 0;
			for (var i = 0; i < tree.roots.length; i++) {
                y = y + this.positionRoot(tree, tree.roots[i], y);
            }
            
            var dimensions = this.getTreeDimensions(canvasId, tree.maxX, tree.maxY);
            this.ctx.canvas.width = dimensions.canvasWidth;
            this.ctx.canvas.height = dimensions.canvasHeight;            
            this.ctx.clearRect(0, 0, this.canvas.scrollWidth, this.canvas.scrollWidth);
            this.ctx.fillStyle = CanvasConstants.getBackgroundColor(sunlit);
            this.ctx.fillRect(0, 0, this.canvas.scrollWidth, this.canvas.scrollWidth);

			for (var i = 0; i < tree.roots.length; i++) {
                this.drawRoot(tree.roots[i], sunlit);
            }
        },
        
        positionRoot: function (tree, root, y) {
            var x = Math.max(0, root.level - 1);
            var yHeight = 1;
            root.x = x;
            root.y = y;
            
            if (root.x > tree.maxX) tree.maxX = root.x;
            if (root.y > tree.maxY) tree.maxY = root.y;
            
            var child;
            var previousLevel = root.level;
            var l = 0;
            for (var level in root.requiredByByLevel) {
                var numperlevel = root.requiredByByLevel[level].length;
                if (numperlevel > yHeight) yHeight = numperlevel;
                for (var i = 0; i < root.requiredByByLevel[level].length; i++) {
                    var ydiff = 0;
                    if (numperlevel === 2) ydiff = -0.5 + i;
                    else if (numperlevel === 3) ydiff = -1 + i;
                    else if (numperlevel > 3) console.log("WARN: numperlevel > 3 - vis will not work!");
                    child = root.requiredByByLevel[level][i];
                    child.x = x + 1 + l;
                    child.y = y + ydiff;
            
                    if (child.x > tree.maxX) tree.maxX = child.x;
                    if (child.y > tree.maxY) tree.maxY = child.y;
                }
                l++;
                if (level - previousLevel > 1)
                    l++;
                previousLevel = level;
            }
            
            return yHeight;            
        },
        
        drawRoot: function (root, sunlit) {
            this.drawNode(root);            
            for (var level in root.requiredByByLevel) {
                for (var i = 0; i < root.requiredByByLevel[level].length; i++) {
                    this.drawNode(root.requiredByByLevel[level][i], sunlit);
                }
            }
        },
        
        drawNode: function (node, sunlit) {
            var pixelX = this.getPixelPosX(node.x);
            var pixelY = this.getPixelPosY(node.y);
            
            // arrows
            for (var i = 0; i < node.requiredBy.length; i++) {
                this.drawArrow(
                    pixelX + this.cellW, 
                    pixelY + this.cellH / 2, 
                    this.getPixelPosX(node.requiredBy[i].x) - this.cellPX / 5, 
                    this.getPixelPosY(node.requiredBy[i].y) + this.cellH / 2
                );
            }
            
            // node
            this.ctx.fillStyle = this.getFillColor(node, sunlit);
            this.ctx.fillRect(pixelX, pixelY, this.cellW, this.cellH);
            
            var hasUpgrade =  this.tribeNodes.head.upgrades.hasUpgrade(node.definition.id);
            var isAvailable = GameGlobals.playerActionsHelper.checkRequirements(node.definition.id, false).value > 0;
            if (hasUpgrade || isAvailable) {
                this.ctx.lineWidth = 3;
                this.ctx.strokeStyle = hasUpgrade ? "#666" : "#fdfdfd";
                this.ctx.beginPath();
                this.ctx.moveTo(pixelX, pixelY);
                this.ctx.lineTo(pixelX + this.cellW, pixelY);
                this.ctx.lineTo(pixelX + this.cellW, pixelY + this.cellH);
                this.ctx.lineTo(pixelX, pixelY + this.cellH);
                this.ctx.lineTo(pixelX, pixelY);
                this.ctx.stroke();
                this.ctx.closePath();
            }

            // details
            var lacksBlueprint = 
                GameGlobals.playerActionsHelper.checkRequirements(node.definition.id, false).value <= 0 &&
                GameGlobals.playerActionsHelper.getReqs(node.definition.id).blueprint && 
                !this.tribeNodes.head.upgrades.hasAvailableBlueprint(GameGlobals.playerActionsHelper.getReqs(node.definition.id).blueprint);
            this.ctx.font = "11px Arial";
            this.ctx.fillStyle = sunlit ? "#fdfdfd" : "#202220";
            this.ctx.textAlign = "center";
            var text = lacksBlueprint ? "???" : node.definition.name;
            this.ctx.fillText(text, pixelX + this.cellW / 2, pixelY + this.cellH / 3 * 2);
        },
        
        getPixelPosX: function (x) {
            return this.treePX + x * this.cellW + x * this.cellPX;
        },
        
        getPixelPosY: function (y) {
            return this.treePY + y * this.cellH + y * this.cellPY;
        },
        
        drawArrow: function (fromx, fromy, tox, toy) {
            if (fromx < 0 || fromy < 0 || tox < 0 || toy < 0)
                return;
            
            var headlen = 7;
            var angle = Math.atan2(toy-fromy,tox-fromx);
            this.ctx.strokeStyle = "#444";
            
            this.ctx.beginPath();
            this.ctx.moveTo(fromx, fromy);
            this.ctx.lineTo(tox, toy);
            this.ctx.stroke();
            
            this.ctx.fillStyle = "#444";
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(tox, toy);
            this.ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
            this.ctx.moveTo(tox, toy);
            this.ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
            this.ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
            this.ctx.fill();
            this.ctx.closePath();
        },
        
        makeTechTree: function () {
            var definition;
            var tree = new TechTree();
            var node;
            var ids = Object.keys(UpgradeConstants.upgradeDefinitions)
            ids.sort(function (a, b) {
				var levela = UpgradeConstants.getMinimumCampOrdinalForUpgrade(a);
				var levelb = UpgradeConstants.getMinimumCampOrdinalForUpgrade(b);
				return levela - levelb; 
            });
			for (var i = 0; i < ids.length; i++) {
                definition = UpgradeConstants.upgradeDefinitions[ids[i]];
                var reqs = PlayerActionConstants.requirements[definition.id];
                node = new TechTreeNode();
                node.definition = definition;
                node.level = UpgradeConstants.getMinimumCampOrdinalForUpgrade(definition.id);
                node.requiresIDs = reqs && reqs.upgrades ? Object.keys(reqs.upgrades) : [];
                tree.addNode(node);
            }
            tree.connectNodes();
            tree.pruneNodes(this.tribeNodes, GameGlobals.playerActionsHelper);
            return tree;
        },
        
        getTreeDimensions: function (canvasId, maxX, maxY) {            
            var dimensions = {};            
            var canvas = $("#" + canvasId);
            
            dimensions.treeWidth = maxX * this.cellW + (maxX - 1) * this.cellPX + 2 * this.treePX;
            dimensions.treeHeight = maxY * this.cellH + (maxY - 1) * this.cellPY + 2 * this.treePY;
            dimensions.canvasWidth = Math.max(dimensions.treeWidth, $(canvas).parent().width());
            dimensions.canvasHeight = Math.max(dimensions.treeHeight, 100);
            return dimensions;
        },
        
        getFillColor: function (node, sunlit) {
            var definition = node.definition;
            if (this.tribeNodes.head.upgrades.hasUpgrade(definition.id)) {
                return sunlit ? "#3a3a3a" : "#aaa";
            }
            var isAvailable = GameGlobals.playerActionsHelper.checkRequirements(definition.id, false).value > 0;
            if (isAvailable) {
                return sunlit ? "#444" : "#ccc";
            }
            var isNext = true;
            if (isNext) {
                return sunlit ? "#cdcdcd" : "#444";
            }
            return null;
        }
        
    });
    
    return UITechTreeHelper;
});