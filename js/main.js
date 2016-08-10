window.onload = function () {
	// Set the name of the hidden property and the change event for visibility
	var hidden, visibilityChange; 
	if (typeof document.hidden !== "undefined") {
	  hidden = "hidden";
	  visibilityChange = "visibilitychange";
	} else if (typeof document.mozHidden !== "undefined") {
	  hidden = "mozHidden";
	  visibilityChange = "mozvisibilitychange";
	} else if (typeof document.msHidden !== "undefined") {
	  hidden = "msHidden";
	  visibilityChange = "msvisibilitychange";
	} else if (typeof document.webkitHidden !== "undefined") {
	  hidden = "webkitHidden";
	  visibilityChange = "webkitvisibilitychange";
	}

	// Back key event listener
	document.addEventListener('tizenhwkey', function(e) {
	  if (e.keyName === "back") {
	      try {
	          tizen.application.getCurrentApplication().exit();
	      } catch (ignore) {}
	  }
	});

	// Visibility change event listener
	document.addEventListener(visibilityChange, function () {
	  if (document[hidden]){
	  	pause = true;
	    document.removeEventListener('click', action);
	    document.removeEventListener('rotarydetent', move);
        document.removeEventListener('touchstart', move);
        document.removeEventListener('touchend', move);
	  } else {
	    pause = false;
	    countP = 0;
	    if (starting || gameOver) {
	    	document.addEventListener('click', action);
	    } else if (playing) {
	    	document.addEventListener('rotarydetent', move);
	    	document.addEventListener('touchstart', move);
	    	document.addEventListener('touchend', move);
	    }
	  }
	}, false);
	// tap event
	document.addEventListener('click', action);
    
    // Setting up the canvas
    var canvas = document.getElementById('canvas'),
        ctx    = canvas.getContext('2d'),
        cH     = ctx.canvas.height = 360,
        cW     = ctx.canvas.width  = 360;

    //General sprite load
    var imgHeart = new Image();
    imgHeart.src = 'images/heart.png';
    var imgRefresh = new Image();
    imgRefresh.src = 'images/refresh.png';
    var spriteExplosion = new Image();
    spriteExplosion.src = 'images/explosion.png';
    var imgDeadlyIcon = new Image();
    imgDeadlyIcon.src = 'images/deadly_icon.png';
    var imgCoin = new Image();
    imgCoin.src = 'images/coin.png';
    var imgBall = new Image();
    imgBall.src = 'images/ball.png';
    var imgArrow = new Image();
    imgArrow.src = 'images/arrow.png';
    var imgEnemy = new Image();
    imgEnemy.src = 'images/deadly.png';

    //Game
    var points     = 0,
        attempts   = 0,  
        lives      = 4,
        count      = 0,
        pause      = false,
        countP     = 0,
        playing    = false,
        gameOver   = false,
    	starting = true,
        frame = 0;

    var record = localStorage.getItem("record");
    record = record === null ? 0 : record;
    
    //Player
    var player = new _player();
    // Enemies
    var enemies = [];
    // Coin
    var coin = new _coin();
    coin.randomPlace();

    for (var i = 0; i < 2; i++) {
        var newEnemy = new _enemy();
        newEnemy.randomPlace();
        enemies.push(newEnemy);
    }

    
    function move(e) {
        if (e.type === 'rotarydetent') {
        	if (e.detail.direction === "CCW") {
                if (Math.sqrt(player.velocity.x*player.velocity.x + player.velocity.y*player.velocity.y) < 0.3) {
                    player.angle -= (2*Math.PI)/24.0;
                }
            } else {
                if (Math.sqrt(player.velocity.x*player.velocity.x + player.velocity.y*player.velocity.y) < 0.3) {
                    player.angle += (2*Math.PI)/24.0;
                }
            }
            if (player.angle > Math.PI*2) {
                player.angle -= Math.PI*2;
            } else if (player.angle < -Math.PI*2) {
                player.angle += Math.PI*2;
            }
        } else if (e.type === 'touchstart') {
            if (Math.sqrt(player.velocity.x*player.velocity.x + player.velocity.y*player.velocity.y) < 0.3) {
                player.boosting = true;
                player.velocity = {x:0, y:0};
            }
        } else if (e.type === 'touchend') {
            if (Math.sqrt(player.velocity.x*player.velocity.x + player.velocity.y*player.velocity.y) < 0.3) {
                player.boosting = false;
                attempts += 1;
            }
        }

    }
 
    function action(e) {
        e.preventDefault();
        if(gameOver) {
            if(e.type === 'click') {
                gameOver   = false;
                player = new _player();
                starting = true;
                playing = false;
                count      = 0;
                points     = 0;
                attempts = 0;
                enemies = [];
                for (var i = 0; i < 2; i++) {
                    var newEnemy = new _enemy();
                    newEnemy.randomPlace();
                    enemies.push(newEnemy);
                }
                lives = 4;
                document.removeEventListener('rotarydetent', move);
                document.removeEventListener('touchstart', move);
                document.removeEventListener('touchend', move);
            } 
        } else if (starting) {
        	if(e.type === 'click') {
        		starting = false;
                playing = true;
                document.addEventListener('rotarydetent', move);
                document.addEventListener('touchstart', move);
                document.addEventListener('touchend', move);
        	}
        } else if (playing) {
            if(e.type === 'click') {
                playing = true;
                document.addEventListener('rotarydetent', move);
                document.addEventListener('touchstart', move);
                document.addEventListener('touchend', move);
            }
        }
        
    }

    function _player() {
        this.radius = 10;
        this.x = cW/2;
        this.y = cH/2;
        this.angle = 0;
        this.boosting = false;
        this.power = 0;
        this.state = 0;
        this.stateX = 0;
        this.velocity = { x: 0, y: 0 };
        this.dead = false;
        this.friction = 0.99;
        this.move = function() {
            // Border collision
            if (euclidianDistance(cW/2,cH/2,this.x,this.y) >= cW/2-this.radius) {
                var normal = { x: this.x - cW/2,
                               y: this.y - cH/2 };
                var len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
                normal.x /= len;
                normal.y /= len;
                var nsx = this.velocity.x - (2 *( normal.x * this.velocity.x + normal.y * this.velocity.y ) ) * normal.x; 
                var nsy = this.velocity.y - (2 *( normal.x * this.velocity.x + normal.y * this.velocity.y ) ) * normal.y;
                this.velocity.x = nsx;
                this.velocity.y = nsy;  
            }


            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
        };
        this.checkBorderCollision = function() {
        };
    }

    function _coin() {
        this.radius = 10;
        this.x = cW/2;
        this.y = cH/2; 
        this.alpha = 1;
        this.alphaDecrease = true;
        this.collected = false;
        this.collectedForFrames = 0; 
        this.collectedPoints = 0;
        this.isAtInvalidPosition = function() {
            // if the distance between the coin and any ball is less than 2.5 times the radius, it's NOT legal
            if(euclidianDistance(player.x,player.y,this.x,this.y)<(player.radius*2.5)){
                return true;
            }
            
            // if the distance between the coin and any enemy is less than three times the radius, it's NOT legal
            for(i=0;i<enemies.length;i++){
                if(euclidianDistance(enemies[i].x,enemies[i].y,this.x,this.y)<(player.radius*3)){
                    return true;
                }
            }
            
            // otherwise it's legal
            return false;          
        };
        this.randomPlace = function() {
            do {
            var angle = Math.random() * Math.PI * 2;
            var radius = Math.sqrt(Math.random()) * (cW/2-this.radius*2);
            this.x = cW/2 + radius * Math.cos(angle);
            this.y = cH/2 + radius * Math.sin(angle);
            } while (this.isAtInvalidPosition());
        };    
    }

    function _enemy() {
        this.radius = 10;
        this.x = cW/2;
        this.y = cH/2;  
        this.state = 0;
        this.stateX = 0;
        this.dead = false;
        this.isAtInvalidPosition = function() {
            // if the distance between the enemy and the ball is less than three times the radius, it's NOT legal
            if (euclidianDistance(playing.x,player.y,this.x,this.y)<(player.radius*3)) {
                return true;
            }
            
            // if the distance between the enemy and any other enemy is less than two times the radius, it's NOT legal
            for(i=0;i<enemies.length-1;i++){
                if(euclidianDistance(enemies[i].x,enemies[i].y,this.x,this.y)<(player.radius*2)){
                    return true;
                }
            }
            
            // otherwise it's legal 
            return false;      
        };
        this.randomPlace = function() {
            do {
            var angle = Math.random() * Math.PI * 2;
            var radius = Math.sqrt(Math.random()) * (cW/2-this.radius*2);
            this.x = cW/2 + radius * Math.cos(angle);
            this.y = cH/2 + radius * Math.sin(angle);
            } while (this.isAtInvalidPosition());
        };
    }
    
    function explosion(enemy) {
        ctx.save();

        var spriteY,
            spriteX = 256;
        if(enemy.state === 0) {
            spriteY = 0;
            spriteX = 0;
        } else if (enemy.state < 8) {
            spriteY = 0;
        } else if(enemy.state < 16) {
            spriteY = 256;
        } else if(enemy.state < 24) {
            spriteY = 512;
        } else {
            spriteY = 768;
        }

        if(enemy.state === 8 || enemy.state === 16 || enemy.state === 24) {
            enemy.stateX = 0;
        }

        ctx.drawImage(
            spriteExplosion,
            enemy.stateX += spriteX,
            spriteY,
            256,
            256,
            enemy.x-60,
            enemy.y-60,
            120,
            120
        );
        enemy.state += 1;

        ctx.restore();
    }

    function drawPowerBar() {
        // Draw power
        var percent = player.power/100.0;
        ctx.beginPath();
        ctx.arc(cW/2, cH/2, 160, -5*(Math.PI/4), -5*(Math.PI/4) + (Math.PI/2)*percent, false);
        ctx.strokeStyle = "rgba(8, 164, 8, 0.5)";
        ctx.lineWidth = 20;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(cW/2, cH/2, 171, -5*(Math.PI/4), -5*(Math.PI/4) + (Math.PI/2), false);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cW/2, cH/2, 149, -5*(Math.PI/4), -5*(Math.PI/4) + (Math.PI/2), false);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.translate(cW/2, cH/2);
        ctx.rotate(-5*(Math.PI/4));
        ctx.moveTo(0,149);
        ctx.lineTo(0,171);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.translate(0, 0);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.translate(cW/2, cH/2);
        ctx.rotate(Math.PI/4);
        ctx.moveTo(0,149);
        ctx.lineTo(0,171);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.translate(0, 0);
        ctx.restore();

        ctx.font = "bold 9px Helvetica";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        ctx.save();
        ctx.beginPath();
        ctx.translate(cW/2, cH/2);
        ctx.rotate(Math.PI/4-0.07);
        ctx.fillText("MAX", -cW/2+20,0);
        ctx.translate(0, 0);
        ctx.restore();            

        ctx.save();
        ctx.beginPath();
        ctx.translate(cW/2, cH/2);
        ctx.rotate(7*(Math.PI/4)+0.03);
        ctx.fillText("MIN", -cW/2+20,0);
        ctx.translate(0, 0);
        ctx.restore(); 
    }
    
    function update() {
    	frame += 1;
    	frame %= 100;

        if (playing) {
            
            if (player.boosting) {
                if (player.power < 100) {
                    player.power += 0.5;
                }
            } else {
                if (player.power > 0) {
                    player.velocity.x += Math.cos(player.angle-Math.PI/2)*player.power/10;
                    player.velocity.y += Math.sin(player.angle-Math.PI/2)*player.power/10;
                    player.power = 0;
                    player.angle = 0;
                }
                player.move();

                if (coin.collected) {
                    if (coin.collectedForFrames > 30) {
                        coin.collected = false;
                        coin.collectedForFrames = 0;
                        coin.randomPlace();
                    } else {
                        coin.collectedForFrames += 1;
                    }
                }

                if(euclidianDistance(player.x,player.y,coin.x,coin.y)<(player.radius+coin.radius) && !coin.collected){
                    if (attempts === 0) {
                        points += 12;
                        coin.collectedPoints = 12;
                    } else {
                        points += Math.round(10/attempts);
                        coin.collectedPoints = Math.round(10/attempts);
                    }
                    coin.collected = true;
                    attempts = 0;
                    var newEnemy = new _enemy();
                    newEnemy.randomPlace();
                    enemies.push(newEnemy);
                }
                for (var i = 0; i < enemies.length; i++) {
                    if(euclidianDistance(player.x,player.y,enemies[i].x,enemies[i].y)<(player.radius+enemies[i].radius)){
                        enemies[i].dead = true;
                    }
                }
            }

            for (var j = 0; j < enemies.length; j++) {
                if (enemies[j].dead) {
                    if (enemies[j].state === 31) {
                        lives -= 1;
                        if (lives === -1) {
                            gameOver = true;
                            playing  = false;
                            document.removeEventListener('rotarydetent',move);
                            document.removeEventListener('touchstart', move);
                            document.removeEventListener('touchend', move);
                        } else {
                            enemies.splice(j, 1);
                        }                   
                    }
                }
            }

        }
    }
    
    function draw() {
        if (pause) {
            if (countP < 1) {
                countP = 1;
            }
        } else if (playing) {
        	//Clear
            ctx.clearRect(0, 0, cW, cH);

            // Ball
            ctx.shadowBlur=20;
            ctx.shadowColor="black";
            ctx.drawImage(
                imgBall,
                player.x - player.radius,
                player.y - player.radius,
                20,
                20
            );
            ctx.shadowBlur=0;

            // Arrow
            if (Math.sqrt(player.velocity.x*player.velocity.x + player.velocity.y*player.velocity.y) < 0.3) {
                ctx.save();
                ctx.translate(player.x, player.y);

                ctx.rotate(player.angle);

                ctx.shadowBlur=20;
                ctx.shadowColor="black";
                ctx.drawImage(
                    imgArrow,
                    -7,
                    -30,
                    14,
                    17
                );
                ctx.shadowBlur=0;
                ctx.restore();
            }

            // Drawing coin ---------------
            if (coin.collected) {
                var alpha = 1;
                var up = 0;
                if (coin.collectedForFrames > 0) {
                    alpha = 1 - coin.collectedForFrames/30;
                    up = coin.collectedForFrames/5; 
                }
                ctx.font = "bold 18px Helvetica";
                ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                ctx.fillText("+" + coin.collectedPoints, coin.x, coin.y - up);  
            } else {
                if (coin.alphaDecrease) {
                    coin.alpha -= 0.05;
                } else {
                    coin.alpha += 0.05;
                }
                if (coin.alpha >= 1) {
                    coin.alphaDecrease = true;
                } else if (coin.alpha <= 0.2) {
                    coin.alphaDecrease = false;
                }
                ctx.globalAlpha = coin.alpha;
                ctx.shadowBlur=20;
                ctx.shadowColor="black";
                ctx.drawImage(
                    imgCoin,
                    coin.x - coin.radius,
                    coin.y - coin.radius,
                    20,
                    20
                );
                ctx.shadowBlur=0;
                ctx.globalAlpha = 1;
            }

            // Drawing enemies ---------------

            for (var i = 0; i < enemies.length; i++) {
                if (enemies[i].dead) {
                    explosion(enemies[i]);
                } else {
                    ctx.shadowBlur=20;
                    ctx.shadowColor="black";
                    ctx.drawImage(
                        imgEnemy,
                        enemies[i].x - enemies[i].radius,
                        enemies[i].y - enemies[i].radius,
                        20,
                        20
                    );
                    ctx.shadowBlur=0;                
                }
            }
            
            // Drawing HUD ----------------
            // Draw lives
            var startX = 130;
            for (var k = 0; k < lives; k++) {
                ctx.drawImage(
                    imgHeart,
                    startX,
                    35,
                    20,
                    20
                );
                startX += 25;
            }

            // Draw power bar
            drawPowerBar();

            // Points
            ctx.font = "14px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText(TIZEN_L10N["score"] + ": " + points, cW/2,25);    

            // Attempts
            ctx.font = "14px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText(TIZEN_L10N["attempts"] + ": " + attempts, cW/2,cH/2 + 155);
            
        } else if(starting) {
            //Clear
            ctx.clearRect(0, 0, cW, cH);
            ctx.beginPath();

            ctx.font = "bold 25px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["title"], cW/2,cH/2 - 120);

            ctx.font = "bold 18px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["tap_to_play"], cW/2,cH/2 - 90);     
              
            ctx.font = "bold 18px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["instructions"], cW/2,cH/2 + 90);
              
            ctx.font = "13px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            wrapText(TIZEN_L10N["collect"], cW/2,cH/2 + 115, 220, 14);
            
            ctx.drawImage(
                    imgDeadlyIcon,
                    cW/2 - 64,
                    cH/2 - 74,
                    128,
                    128
                );
        } else if(count < 1) {
            count = 1;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.rect(0,0, cW,cH);
            ctx.fill();

            ctx.font = "bold 25px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText("Game over",cW/2,cH/2 - 100);

            ctx.font = "18px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["score"] + ": "+ points, cW/2,cH/2 + 100);

            record = points > record ? points : record;
            localStorage.setItem("record", record);

            ctx.font = "18px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["record"] + ": "+ record, cW/2,cH/2 + 125);

            ctx.drawImage(imgRefresh, cW/2 - 23, cH/2 - 23);        	
        }
    }
    
    function init() {
    	update();
        ctx.save();
        draw();
        ctx.restore();
        window.requestAnimationFrame(init);
    }

    init();

    //Utils ---------------------
    function euclidianDistance(x1,y1,x2,y2) {
        return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
    }
    
    function wrapText(text, x, y, maxWidth, lineHeight) {
        var words = text.split(' ');
        var line = '';

        for(var n = 0; n < words.length; n++) {
          var testLine = line + words[n] + ' ';
          var metrics = ctx.measureText(testLine);
          var testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
          }
          else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, y);
      }

};