(function(namespace) {
	var DEFAULT_COLOUR = "#444";
	var BACKGROUND_COLOUR = "#EEE";
	var OFFSET_SPEED = 0.4;
	var MAX_TIME_TICK = 1000 / 60;
	var SCREEN_BUFFER = 50;
	var GROUND_BUFFER = 10;
	var SPACE_BAR_CODE = 32;
	var MIN_CACTUS_DISTANCE = 400;

	var spacePressed = false;
	function keydown(e) {
        if (e.keyCode === SPACE_BAR_CODE) {
			spacePressed = true;
        }
    }

    function keyup(e) {
        if (e.keyCode === SPACE_BAR_CODE) {
			spacePressed = false;
        }
    }

	document.addEventListener('keydown', keydown, false);
	document.addEventListener('keyup', keyup, false);

	function Game(options) {
		this.canvas = options.el;
		this.context = this.canvas.getContext("2d");

		this.cacti = [];
		this.nextCactus = 0;
		this.offset = 0;
		this.lastTick = null;
		this.running = false;
		this.finished = false;

		this.initObjects();
		this.draw();
		requestAnimationFrame(this.step.bind(this));
	}

	Game.prototype.initObjects = function() {
		this.player = new Dinosaur({
			context: this.context, 
			left: 10, 
			bottom: this.canvas.height - GROUND_BUFFER,
			colour: DEFAULT_COLOUR
		});

		this.background = new Background({
			context: this.context, 
			width: this.canvas.width, 
			height: this.canvas.height,
			colour: DEFAULT_COLOUR
		});

		this.score = new ScoreBoard({
			context: this.context, 
			left: this.canvas.width - 10, 
			bottom: 26,
			colour: DEFAULT_COLOUR
		});
	};

	Game.prototype.updateCacti = function() {
		while (this.offset > this.nextCactus) {
			var count = Math.floor(rand(1, 3.9)),
				scale = rand(0.8, 1.5),
				x = this.canvas.width + this.offset + SCREEN_BUFFER;

			while (count--) {
				this.cacti.push(new Cactus({
					left: x + (count * 20 * scale), 
					bottom: this.canvas.height - GROUND_BUFFER,
					scale: scale, 
					leftSize: rand(0.5, 1.5), 
					rightSize: rand(0.5, 1.5), 
					centerSize: rand(0.5, 1.5),
					colour: DEFAULT_COLOUR
				}));
			}

			this.nextCactus = this.offset + rand(MIN_CACTUS_DISTANCE, this.canvas.width);
		}
	};

	Game.prototype.removeOldCacti = function() {
		var count = 0; // used to force cacti off the screen

		while (this.cacti.length > count && this.cacti[count].x < this.offset - SCREEN_BUFFER) { 
			count++; 
		}

		this.cacti.splice(0, count);
	};

	Game.prototype.draw = function() {
		this.clear();

		this.background.draw(this.context, this.offset);

		for (var i = 0; i < this.cacti.length; i++) {
			this.cacti[i].drawColliders(this.context, this.offset);
			this.cacti[i].draw(this.context, this.offset);
		}

		this.player.drawColliders(this.context, this.offset);
		this.player.draw(this.context, this.offset);
		this.score.draw(this.context, this.offset);
	};

	Game.prototype.checkCactusHit = function() {
		for (var i = 0; i < this.cacti.length; i++) {
			if (this.player.collidesWith(this.cacti[i], this.offset)) {
				this.running = false;
				this.finished = true;
				this.player.wideEyed = true;
				return;
			}
		}
	};

	Game.prototype.clear = function() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	};

	Game.prototype.step = function(timestamp) {
		if (this.running && this.lastTick) {
			this.offset += Math.min((timestamp - this.lastTick), MAX_TIME_TICK) * OFFSET_SPEED;

			this.removeOldCacti();
			this.updateCacti();

			if (!this.player.isJumping(this.offset) && spacePressed) {
				this.player.startJump(this.offset);
			}

			this.checkCactusHit();
			this.draw();
		} else if (spacePressed) {
			this.running = true;
		}

		if (!this.finished) {
			this.lastTick = timestamp;
			requestAnimationFrame(this.step.bind(this));
		}
	};

	namespace.Game = Game;
})(window);
function rand(min, max) {
	return Math.random() * (max - min) + min;
}
(function(namespace) {
	function generateBits(width, height) {
		var bits = [], x, y;
		for (y = height - 10; y <= height; y += 8) {
			for (x = 0 + rand(0, 100); x <= width; x += rand(100, 200)) {
				bits.push({
					x: x, 
					y: y, 
					width: rand(2, 4)
				});
			}
		}
		return bits;
	}

	function Background(options) {
		this.width = options.width;
		this.height = options.height;
		this.colour = options.colour;
		this.bits = generateBits(this.width, this.height);
	}

	Background.prototype = Object.create(GameObject.prototype);
	Background.prototype.constructor = Background;

	Background.prototype.draw = function(context, offset) {
		context.fillStyle = this.colour;
		context.fillRect(0, this.height - 20, this.width, 1);

		for (var i = this.bits.length - 1; i >= 0; i--) {
			context.fillRect(this.width - ((this.bits[i].x + offset) % this.width), this.bits[i].y, this.bits[i].width, 1);
		}
	};

	namespace.Background = Background;
})(window);
(function(namespace) {
	function Cactus(options) {
		this.scale = options.scale;
		this.x = options.left;
		this.y = options.bottom;
		this.colour = options.colour;
		this.leftSize = options.leftSize;
		this.centerSize = options.centerSize;
		this.rightSize = options.rightSize;
	}

	Cactus.prototype = Object.create(GameObject.prototype);
	Cactus.prototype.constructor = Cactus;

	Cactus.prototype.draw = function(context, offset) {
		var x = this.x - offset,
			y = this.y,
			scale = this.scale;

		context.fillStyle = this.colour;

		// center
		var height = 15 * this.centerSize;
		context.fillRect(x + 6 * scale, y - (20 + height) * scale, 6 * scale, height * scale);
		context.fillRect(x + 7 * scale, y - (20 + height + 1) * scale, 4 * scale, 1 * scale);
		context.fillRect(x + 6 * scale, y - 20 * scale, 6 * scale, 20 * scale);
		
		// left
		height = 15 * this.leftSize;
		context.fillRect(x, y - (15 + height) * scale, 4 * scale, height * scale);
		context.fillRect(x + 1 * scale, y - (15 + height + 1) * scale, 2 * scale, 1 * scale);
		context.fillRect(x + 4 * scale, y - 19 * scale, 4 * scale, 4 * scale);

		// right
		height = 15 * this.rightSize;
		context.fillRect(x + 14 * scale, y - (15 + height) * scale, 4 * scale, height * scale);
		context.fillRect(x + 15 * scale, y - (15 + height + 1) * scale, 2 * scale, 1 * scale);
		context.fillRect(x + 12 * scale, y - 19 * scale, 4 * scale, 4 * scale);
	};

	Cactus.prototype.colliders = function(offset) {
		return [{
			x: this.x,
			y: this.y,
			width: 17 * this.scale,
			height: (20 + (15 * Math.max(this.centerSize, this.leftSize, this.rightSize))) * this.scale
		}];
	};

	namespace.Cactus = Cactus;
})(window);
(function(namespace) {
	var STEP_SPEED = 0.02;
	var JUMP_DISTANCE = 350;
	var JUMP_HEIGHT = 100;

	function Dinosaur(options) {
		this.scale = options.scale;
		this.x = options.left;
		this.y = options.bottom;
		this.colour = options.colour;
		this.jumpStart = null;
	}

	Dinosaur.prototype = Object.create(GameObject.prototype);
	Dinosaur.prototype.constructor = Dinosaur;

	Dinosaur.prototype.isJumping = function(offset) {
		return this.jumpStart !== null && this.jumpDistanceRemaining(offset) > 0;
	};

	Dinosaur.prototype.jumpDistanceRemaining = function(offset) {
		if (this.jumpStart === null) return 0;
		return this.jumpStart + JUMP_DISTANCE - offset;
	};

	Dinosaur.prototype.startJump = function(offset) {
		this.jumpStart = offset;
	};

	Dinosaur.prototype.jumpHeight = function (offset) {
		var distanceRemaining = this.jumpDistanceRemaining(offset);
		if (distanceRemaining > 0) {
			var maxPoint = JUMP_DISTANCE / 2;

			if (distanceRemaining >= maxPoint) {
				distanceRemaining -= JUMP_DISTANCE
			}

			// get a number between 0 and 1 (-x^2)
			// var arcPos = Math.abs(Math.pow(distanceRemaining / maxPoint, 2) * -1);

			// linear
			var arcPos = Math.abs(distanceRemaining / maxPoint);

			return JUMP_HEIGHT * arcPos;
		}
		return 0;
	};

	Dinosaur.prototype.hasBackLegUp = function(offset) {
		return offset > 0 && Math.floor(offset * STEP_SPEED) % 2 === 0;
	};

	Dinosaur.prototype.hasFrontLegUp = function(offset) {
		return offset > 0 && Math.floor(offset * STEP_SPEED) % 2 === 1;
	};

	Dinosaur.prototype.draw = function(context, offset) {
		var x = this.x,
			offsetY = this.y - this.jumpHeight(offset),
			y = offsetY;

		// background spacer
		// context.fillStyle = backgroundColour;
		// context.fillRect(x + 7, y - 14, 22, 18);

		// Dino!
		context.fillStyle = this.colour;
		
		// tail
		context.fillRect(x, y - 36, 2, 16);
		context.fillRect(x + 2, y - 32, 2, 16);
		context.fillRect(x + 4, y - 30, 2, 16);
		context.fillRect(x + 6, y - 28, 2, 16);
		context.fillRect(x + 8, y - 28, 2, 18);
		context.fillRect(x + 10, y - 30, 2, 22);
		context.fillRect(x + 12, y - 32, 4, 26);
		context.fillRect(x + 16, y - 34, 4, 26);
		context.fillRect(x + 20, y - 36, 4, 30);
		context.fillRect(x + 24, y - 38, 2, 30);
		context.fillRect(x + 26, y - 38, 2, 28);
		context.fillRect(x + 28, y - 52, 2, 40);

		if (this.wideEyed) {
			context.fillRect(x + 30, y - 54, 6, 2);
			context.fillRect(x + 32, y - 50, 2, 2);
			context.fillRect(x + 30, y - 46, 2, 32);
			context.fillRect(x + 32, y - 46, 2, 30);
			context.fillRect(x + 34, y - 46, 2, 28);
			// context.fillRect(x + 32, y - 54, 2, 4);
			// context.fillRect(x + 32, y - 48, 2, 32);
			// context.fillRect(x + 34, y - 54, 2, 36);
		} else {
			context.fillRect(x + 30, y - 54, 2, 40);
			context.fillRect(x + 32, y - 54, 2, 4);
			context.fillRect(x + 32, y - 48, 2, 32);
			context.fillRect(x + 34, y - 54, 2, 36);
		}

		context.fillRect(x + 36, y - 54, 2, 34);
		context.fillRect(x + 38, y - 54, 2, 20);
		context.fillRect(x + 40, y - 54, 12, 16);
		context.fillRect(x + 52, y - 52, 2, 14);

		if (this.wideEyed) {
			context.fillRect(x + 38, y - 34, 8, 2);
		} else {
			context.fillRect(x + 40, y - 36, 8, 2);
		}

		// arm (singular)
		context.fillRect(x + 36, y - 26, 4, 2);
		context.fillRect(x + 40, y - 26, 2, 4);

		y = offsetY;
		if (this.hasBackLegUp(offset)) {
			y -= 4;
		}
		// back leg
		context.fillRect(x + 12, y, 4, 2);
		context.fillRect(x + 12, y - 6, 2, 8);
		context.fillRect(x + 14, y - 6, 2, 3);
		context.fillRect(x + 16, y - 8, 2, 3);

		y = offsetY;
		if (this.hasFrontLegUp(offset)) {
			y -= 6;
		}

		// front leg
		context.fillRect(x + 22, y, 4, 2);
		context.fillRect(x + 22, y - 6, 2, 8);
	};

	Dinosaur.prototype.colliders = function(offset) {
		var y = this.y - this.jumpHeight(offset);
		return [{
			x: this.x + offset,
			y: y - 20,
			width: 30,
			height: 16
		}, {
			x: this.x + offset + 12,
			y: y + 2,
			width: 15,
			height: 20
		}, {
			x: this.x + offset + 30,
			y: y - 34,
			width: 25,
			height: 20
		}];
	};


	namespace.Dinosaur = Dinosaur;
})(window);
(function(namespace) {
	function collidesWith(first, second) {
		return first.x < second.x + second.width &&
		   first.x + first.width > second.x &&
		   first.y > second.y - second.height &&
		   first.y - first.height  < second.y;
	}

	function GameObject(options) {}

	GameObject.prototype.draw = function(context, offset) {
		throw new Error("Draw not yet implemented");
	};

	GameObject.prototype.colliders = function(offset) {
		throw new Error("Colliders not yet implemented");
	};

	GameObject.prototype.drawColliders = function(context, offset) {
		var colliders = [];

		context.fillStyle = "#fff";
		try { colliders = this.colliders(offset); } catch(e) {}
		for (var i = 0; i < colliders.length; i++) {
			context.fillRect(colliders[i].x - offset, colliders[i].y - colliders[i].height, colliders[i].width, colliders[i].height);
			
		}
	};

	GameObject.prototype.collidesWith = function(that, offset) {
		var firstList = this.colliders(offset),
			secondList = that.colliders(offset),
			i, j;

		for (i = 0; i < firstList.length; i++) {
			for (j = 0; j < secondList.length; j++) {
				if (collidesWith(firstList[i], secondList[j])) {
					return true;
				}
			}
		}

		return false;
	};

	namespace.GameObject = GameObject;
})(window);
(function(namespace) {
	var SCORE_FACTOR = 0.1;

	function formatOffset(offset) {
		// TODO pad with zeroes
		return Math.floor(offset * SCORE_FACTOR);
	}

	function ScoreBoard(options) {
		this.scale = options.scale;
		this.x = options.left;
		this.y = options.bottom;
		this.colour = options.colour;
	}

	ScoreBoard.prototype = Object.create(GameObject.prototype);
	ScoreBoard.prototype.constructor = ScoreBoard;

	ScoreBoard.prototype.draw = function(context, offset) {
		context.fillStyle = this.colour;
		context.font = "16px Courier";
		context.textAlign = "right"; 
		context.fillText(formatOffset(offset), this.x, this.y);
	};

	namespace.ScoreBoard = ScoreBoard;
})(window);
