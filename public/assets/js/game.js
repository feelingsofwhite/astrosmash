var score, speed, direction;

var gameHighScore;
var platforms;
var player;
var cursors;
var scoreText;
var debugText;
var ground;
var config;
var nextFreeManAt;
var Game = {
  scoreChange: function(delta){
    score += delta;
    scoreText.text = "score: " + score;
    // update game high score to determine free mans etc
    if (score > gameHighScore) {
      gameHighScore = score;
    }
    this.reapRewards();
  },
  reapRewards: function () {
    if (gameHighScore > nextFreeManAt) {
      // add free man
      console.log("player lives before: " + player.lives.length);
      player.lives.push(
        game.add.sprite(game.world.width - ((player.lives.length)*(player.width+16)), game.world.height - player.height - 16, 'hero')

      );
      this.mans++;
    console.log("player lives after: " + player.lives.length);
      nextFreeManAt += config.freeManThreshold;

      // todo: check level change
    }
  },
  makeBaddie: function (type, args)
  {
      args = args || {};
      var self = this;
      var image = type;
      var rollForSmall = function(){ return (Math.floor((Math.random() * 9) + 1)); };
      switch (type)
      {
        case "big":
          image = "big" + (Math.floor((Math.random() * 5) + 1));
          break;
        case "small":
          image = "small" + rollForSmall();
          break;
        case "debris":
          image = "small" + args.idx;
          break;
      }


      var baddie = game.add.sprite(0, -64, image);
      var padding = 16;
      baddie.anchor.set(0.5,0.5);
      baddie.x = args.x || Math.floor((Math.random() * (game.world.width - baddie.offsetX - (padding * 2)))) + padding;
      baddie.y = args.y || -64;
      game.physics.arcade.enable(baddie);
      this.baddies.push(baddie);
      switch(type)
      {
        case "big":
          baddie.body.velocity.y = 75 + Math.floor((Math.random() * (80 * this.difficultyMultiplier)));
          baddie.body.velocity.x = Math.ceil((Math.random() * (config.baddieDriftMax * 2))) - config.baddieDriftMax;
          baddie.baseScore = config.bigBaddieBaseScore;
          baddie.shotUp = function() {
            if (self.baddies.livingCount() <=  3) {
              //if (true) {
              //must use livingCount, as the array is likely not trimmed yet, as this will occur during shot
              //maybe use a sprite group? or something else where we we're not calculating this ourselves? *shrug*
              var idx = rollForSmall();
              self.makeBaddie("debris", {big: baddie, idx: idx, direction: -1 });
              self.makeBaddie("debris", {big: baddie, idx: idx, direction: +1 });
            } else {
              self.explode(baddie.x, baddie.y);
            }
          };
          break;
        case "small":
          baddie.body.velocity.y = 75 + Math.floor((Math.random() * (80 * this.difficultyMultiplier)));
          baddie.body.velocity.x = Math.ceil((Math.random() * (config.baddieDriftMax * 2))) - config.baddieDriftMax;
          baddie.baseScore = config.smallBaddieBaseScore;
          break;
        case "debris":
          baddie.x = args.big.x + args.direction * 2;
          baddie.y = args.big.y + args.direction * 2;
          baddie.body.velocity.y = args.big.body.velocity.y;
          baddie.body.velocity.x = args.big.body.velocity.x + (args.big.body.velocity.y * 0.8 * args.direction);
          baddie.baseScore = config.smallBaddieBaseScore;
          break;
        case "seaker":
          var speed = 75 + Math.floor((Math.random() * 80));
          baddie.baseScore = config.seekerBaseScore;
          baddie.body.velocity.y = speed;
          baddie.animations.add('pulse', [0,0,0,1,2,2,2,1], 30, true);
          baddie.animations.play('pulse');
          baddie.think = function(){
            var delta = player.x - baddie.x;
            var qty = Math.abs(delta);
            if (qty > 3) //solve unknown shudder issue
            {
              var direction = delta / qty; // -1 or +1
              baddie.body.velocity.x = direction * speed;
            } else {
              baddie.body.velocity.x = 0;
            }
          };
          break;
        case 'bigBomb':
          baddie.body.velocity.y = 75 + Math.floor((Math.random() * (80 * this.difficultyMultiplier)));
          baddie.body.velocity.x = Math.ceil((Math.random() * (config.baddieDriftMax * 2))) - config.baddieDriftMax;
          baddie.baseScore = config.bigBombBaseScore;
          baddie.animations.add('spinBig', [0,1,2,3], 10, true);
          baddie.animations.play('spinBig');
          baddie.hitGround = function () {
            self.baddieHitPlayer(player, baddie);
          };
          break;
        case 'smallBomb':
          baddie.body.velocity.y = 75 + Math.floor((Math.random() * (80 * this.difficultyMultiplier)));
          baddie.body.velocity.x = Math.ceil((Math.random() * (config.baddieDriftMax * 2))) - config.baddieDriftMax;
          baddie.baseScore = config.smallBombBaseScore;
          baddie.animations.add('spinSmall', [0,1,2,3], 10, true);
          baddie.animations.play('spinSmall');
          baddie.hitGround = function () {
            self.baddieHitPlayer(player, baddie);
          };
      }
      if (typeof baddie.think === 'undefined')
        baddie.think = function(){};
      if (typeof baddie.hitGround === 'undefined')
        baddie.hitGround = function () {
          self.scoreChange(-1 * (baddie.baseScore * self.levelMultiplier)/2);
        };
      if (typeof baddie.shotUp === 'undefined')
        baddie.shotUp = function () {
          self.scoreChange(baddie.baseScore * self.levelMultiplier);
          self.explode(baddie.x, baddie.y);
        };
  },
  dropFromTheSky: function(){
    if (this.gameover || this.baddies.length > 5)  {
        return;
    }
    var i = (Math.floor((Math.random() * 88) ));
    if (i === 0) {
        this.makeBaddie("seaker");
    } else if (i <= 27) {
        this.makeBaddie("big");
    } else if (i <= 32) {
        this.makeBaddie("small");
    } else if (i <= 40) {
      this.makeBaddie('bigBomb');
    } else if (i <= 44) {
      this.makeBaddie('smallBomb');
    }
  },
  explode: function (x, y) {
    var explosion = game.add.sprite(x, y, 'explosion');
      explosion.animations.add('boom', [0,1,2,3,4,5], 30, false, true);
      explosion.play('boom', 30, false, true);
    explosion.anchor.set(0.5, 0.5);
    game.physics.arcade.enable(explosion);
    this.explosions.push(explosion);
  },
  preload: function () {
    // here we load all theneeded resources for the level
    game.load.json('config', './assets/js/config/config.json');

    game.load.image('big1', './assets/images/big1.png');
    game.load.image('big2', './assets/images/big2.png');
    game.load.image('big3', './assets/images/big3.png');
    game.load.image('big4', './assets/images/big4.png');
    game.load.image('big5', './assets/images/big5.png');

    game.load.image('small1', './assets/images/small1.png');
    game.load.image('small2', './assets/images/small2.png');
    game.load.image('small3', './assets/images/small3.png');
    game.load.image('small4', './assets/images/small4.png');
    game.load.image('small5', './assets/images/small5.png');
    game.load.image('small6', './assets/images/small6.png');
    game.load.image('small7', './assets/images/small7.png');
    game.load.image('small8', './assets/images/small8.png');
    game.load.image('small9', './assets/images/small9.png');

    game.load.spritesheet('seaker', './assets/images/seaker-20x20x3.png', 20, 20);
    game.load.spritesheet('explosion', './assets/images/explosion-32x32x6.png', 32, 32);
    game.load.spritesheet('bigBomb', './assets/images/bomb-64x64x4.png', 64, 64);
    game.load.spritesheet('smallBomb', './assets/images/bomb-32x32x4.png', 32, 32);

    game.load.image('hero', 'assets/images/hero.png');
    game.load.image('ground', 'assets/platform.png');
    game.load.image('bullet', 'assets/images/bullet.png');
    this.fireKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    this.difficultyMultiplier = 1;
    this.explosions = [];
  },
  create: function () {
    config = game.cache.getJSON('config');
    var currGameHighScore = this.state.states.Death_Scene.gameHighScore;
    var currScore = this.state.states.Death_Scene.score;
    var currMans = this.state.states.Death_Scene.mans;
    var levelMultiplier = this.state.states.Death_Scene.levelMultiplier;
    var freeManThreshold = this.state.states.Death_Scene.nextFreeManAt;
    this.mans = typeof currMans !== 'undefined' ? currMans: config.initialHeroManCount;
    if (this.mans === -1) {
      this.gameOverManGAMEOVER();
    }
    var self = this;
    if (!nextFreeManAt) {
        nextFreeManAt = freeManThreshold? freeManThreshold : config.freeManThreshold;
    }
    this.baddies = [];
    this.baddies.livingCount = function(){
      var result = 0;
      for (var li =0; li < self.baddies.length; li++)
        if (self.baddies[li].alive)
          result++;
      return result;
    };
    var i;
    this.explosions = [];
    score = currScore?currScore:0;
    gameHighScore = currGameHighScore?currGameHighScore:0;
    this.levelMultiplier = levelMultiplier? levelMultiplier: 1;
    game.stage.backgroundColor = '#061f27';

    //  We're going to be using physics, so enable the Arcade Physics system
    game.physics.startSystem(Phaser.Physics.ARCADE);

    //  We will enable physics for any object that is created in this group
    platforms = game.add.group();
    platforms.enableBody = true;

    ground = platforms.create(0, game.world.height - 60, 'ground');
    //  Scale it to fit the width of the game (the original sprite is 400x32 in size)
    ground.scale.setTo(2,2);
    ground.body.immovable=true;

    this.bullets = [];
    for (i = 0; i < config.bulletCount; i++) {
      this.bullets[i] = game.add.sprite(0, 0, 'bullet');
      this.bullets[i].anchor.set(0.5,0);
      game.physics.arcade.enable(this.bullets[i]);
      this.bullets[i].kill();
    }

    player = game.add.sprite(32, 0, 'hero');
    player.anchor.set(0.5,0.5);
    player.y = game.world.height - ground.height - player.offsetY;
    //enable phaysics on player
    game.physics.arcade.enable(player);


    //player.body.bounce.y = 0.2
    //player.body.gravity.y = 300;
    player.body.collideWorldBounds = true;
    player.lives = [];
    for(i=this.mans;i>0;i--)
    {
      player.lives.push(
          game.add.sprite(game.world.width - (i*(player.width+16)), game.world.height - player.height - 16, 'hero')
        );
    }

    cursors = game.input.keyboard.createCursorKeys();
    scoreText = game.add.text(16,game.world.height - 48,'', {fontSize: '32px', fill: '#fff'});
    this.scoreChange(0);
    debugText = game.add.text(16,16,'debug', {fontSize: '16px', fill: '#aaa'});

    this.makeBaddie('small');
    this.makeBaddie('small');
    this.makeBaddie('small');
    this.makeBaddie('big');
    this.makeBaddie('seaker');

    game.time.events.loop(Phaser.Timer.SECOND/2, this.dropFromTheSky, this);

    var key = game.input.keyboard.addKey(Phaser.Keyboard.T); //see here: http://docs.phaser.io/Keyboard.js.html for the keycodes
    key.onDown.add(this.teleport, this);

	this.fireDown = false;
    this.gameover = false;
  },

  update: function () {
    if (this.dignity) {
      console.log("can't talk. dying.");
      return;
    }
    if (this.gameover) {
        return;
    }
    var i;

    for (i = 0; i < this.bullets.length; i++) {
      var bullet = this.bullets[i];
      if (bullet.exists && (bullet.height + bullet.body.y)  < -2) {
        console.log('bullet ' + i + ' flew into the sky height=' + bullet.height + ' y=' + bullet.body.y);
        bullet.kill();
      }
    }

    if (this.fireKey.isDown && !this.fireDown) {
      this.firePhasoidCannons();
      this.fireDown = true;
    }

    if (this.fireKey.isUp && this.fireDown) {
      this.fireDown = false;
    }

    //reset players velocity (movement)
    player.body.velocity.x = 0;
    player.body.velocity.y = 0;

    if (cursors.left.isDown && cursors.right.isDown) {
        // do nothing
    } else if (cursors.left.isDown) {
        player.body.velocity.x = -1 * config.heroSpeed;
    }
    else if (cursors.right.isDown) {
        player.body.velocity.x = config.heroSpeed;
    }

    for (i = 0; i < this.bullets.length; i++) {
      game.physics.arcade.overlap(this.bullets[i], this.baddies, this.bulletHitBaddie, null, this);
    }

    for (i = 0; i < this.explosions.length; i++) {
      game.physics.arcade.overlap(this.explosions[i], this.baddies, this.explosionHitBaddie, null, this);
    }

    game.physics.arcade.overlap(player, this.baddies, this.baddieHitPlayer, null, this);

    if (this.gameover) {
      return;
    }

    game.physics.arcade.overlap(ground, this.baddies, this.baddieHitGround, null, this);

    for (i=this.baddies.length-1;i>=0;i--)
    {
      var baddie = this.baddies[i];
      if ((baddie.left > game.world.width) || (baddie.right < 0)){
        baddie.kill();
      }
      if (baddie.alive === false) {
        this.baddies.splice(i, 1);
      } else {
        baddie.think();
      }
    }
    debugText.text =
          "player.body.x=" + player.body.x +
          "\rbaddies.length=" + this.baddies.length +
          "\rbaddies.livingCount=" + this.baddies.livingCount();
  },
  baddieHitPlayer: function (player, baddie){
      if (this.gameover) {
        return;
      }
      var self = this;
      var life = player.lives.length-1;

        baddie.kill();
        console.log('lives: ' + player.lives.length);
        if (this.mans > 0) {
          player.lives[life].kill();
        }
        this.scoreChange(-100 * this.levelMultiplier);
        this.mans--;
        console.log('lives: ' + player.lives.length);

    this.dieWithDignity();
  },
  dieWithDignity: function () {
    // create 5 sprites to expand away from player x, y, straight up, straight right, straight left, diagonal up right, and diagonal up left
    //this.dignity = true;
    //console.log("really impressive death scene");
    //this.dignity = false;

      this.state.states.Death_Scene.x = player.x;
      this.state.states.Death_Scene.y = player.y;
      this.state.states.Death_Scene.gameHighScore = gameHighScore;
      this.state.states.Death_Scene.score = score;
      this.state.states.Death_Scene.mans = this.mans;
      this.state.states.Death_Scene.levelMultiplier = this.levelMultiplier;
      this.state.states.Death_Scene.nextFreeManAt = nextFreeManAt;
      this.state.start('Death_Scene',false, false);

  },
  gameOverManGAMEOVER: function(){
    delete this.state.states.Death_Scene.x;
    delete this.state.states.Death_Scene.y;
    delete this.state.states.Death_Scene.gameHighScore;
    delete this.state.states.Death_Scene.score;
    delete this.state.states.Death_Scene.mans;
    delete this.state.states.Death_Scene.levelMultiplier;
    delete this.state.states.Death_Scene.nextFreeManAt;
    this.gameover = true;
    for (i=this.baddies.length-1;i>=0;i--)
    {
      var baddie = this.baddies[i];

    }
    this.state.start('Game_Over');
  },
  baddieHitGround: function (ground, baddie){
      baddie.hitGround();
      baddie.kill();
  },
  firePhasoidCannons: function () {
    //debugger;
    for (var i = 0; i < this.bullets.length; i++) {
      var bullet = this.bullets[i];
      if (!bullet.exists) {
        bullet.reset(player.x, player.top);
        bullet.body.velocity.y = -500;
        console.log('bullet ' + i + ' fired height=' + bullet.height + ' y=' + bullet.body.y);
        break;
      }
    }
  },
  bulletHitBaddie: function (bullet, baddie) {
    bullet.kill();
    baddie.kill();
    baddie.shotUp();
  },
  explosionHitBaddie: function (explosion, baddie) {
    baddie.kill();
    baddie.shotUp();
  },
  teleport: function(){
    var padding = 2;
    player.x = Math.floor((Math.random() * (game.world.width - player.width - (padding * 2)))) + padding;
  }

};
