const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#0b1020',
  scene: { create, update }
};

new Phaser.Game(config);

let gameOver = false;
let bossActive = false;

function create() {
  // ===== CARGAR GUARDADO =====
  const save = JSON.parse(localStorage.getItem('saveGame'));

  this.level = save?.level || 1;
  this.lives = save?.lives || 3;
  this.score = save?.score || 0;
  this.spawned = 0;

  this.highScore = parseInt(localStorage.getItem('highScore')) || 0;

  // ===== GRÁFICOS =====
  const g = this.make.graphics({ x: 0, y: 0, add: false });

  g.fillStyle(0x00ffd0);
  g.fillTriangle(20, 0, 0, 40, 40, 40);
  g.generateTexture('player', 40, 40);
  g.clear();

  g.fillStyle(0xff5555);
  g.fillRoundedRect(0, 0, 30, 30, 6);
  g.generateTexture('enemy', 30, 30);
  g.clear();

  g.fillStyle(0xaa44ff);
  g.fillRoundedRect(0, 0, 150, 80, 16);
  g.generateTexture('boss', 150, 80);
  g.clear();

  g.fillStyle(0xffff00);
  g.fillRect(0, 0, 6, 12);
  g.generateTexture('bullet', 6, 12);
  g.clear();

  g.fillStyle(0xffaa00);
  g.fillRect(0, 0, 10, 16);
  g.generateTexture('bossBullet', 10, 16);
  g.destroy();

  // ===== JUGADOR =====
  this.player = this.add.image(400, 520, 'player');

  this.tweens.add({
    targets: this.player,
    y: 510,
    duration: 800,
    yoyo: true,
    repeat: -1
  });

  // ===== INPUT =====
  this.cursors = this.input.keyboard.createCursorKeys();
  this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

  // ===== ARRAYS =====
  this.bullets = [];
  this.enemies = [];
  this.bossBullets = [];

  // ===== NIVELES =====
  this.levelData = [
    { enemies: 6, speed: 2 },
    { enemies: 9, speed: 3 }
  ];

  // ===== BOSS =====
  this.boss = null;
  this.bossLifeMax = 40;
  this.bossLife = 40;

  // ===== UI =====
  this.livesText = this.add.text(10, 10, 'Vidas: ' + this.lives, { fill: '#fff' });
  this.scoreText = this.add.text(10, 30, 'Puntos: ' + this.score, { fill: '#fff' });
  this.levelText = this.add.text(10, 50, 'Nivel: ' + this.level, { fill: '#fff' });
  this.recordText = this.add.text(10, 70, 'Récord: ' + this.highScore, { fill: '#fff' });

  this.endText = this.add.text(230, 260, '', {
    fontSize: '32px',
    fill: '#fff'
  }).setVisible(false);

  this.restartText = this.add.text(220, 310, 'R = Reiniciar', {
    fill: '#fff'
  }).setVisible(false);

  // ===== TIMERS =====
  this.enemyTimer = this.time.addEvent({
    delay: 900,
    loop: true,
    callback: () => spawnEnemy.call(this)
  });

  this.bossShootTimer = this.time.addEvent({
    delay: 700,
    loop: true,
    paused: true,
    callback: () => bossShoot.call(this)
  });

  this.time.addEvent({
    delay: 3000,
    loop: true,
    callback: () => saveGame.call(this)
  });
}

function saveGame() {
  if (gameOver) return;
  localStorage.setItem('saveGame', JSON.stringify({
    level: this.level,
    lives: this.lives,
    score: this.score
  }));
}

function spawnEnemy() {
  if (gameOver || bossActive) return;
  const data = this.levelData[this.level - 1];
  if (!data || this.spawned >= data.enemies) return;

  const e = this.add.image(
    Phaser.Math.Between(40, 760),
    -30,
    'enemy'
  );

  this.enemies.push(e);
  this.spawned++;
}

function spawnBoss() {
  bossActive = true;
  this.boss = this.add.image(400, -100, 'boss');
  this.bossShootTimer.paused = false;

  this.tweens.add({
    targets: this.boss,
    scale: 1.05,
    duration: 600,
    yoyo: true,
    repeat: -1
  });
}

function bossShoot() {
  if (!bossActive || !this.boss || gameOver) return;
  const b = this.add.image(this.boss.x, this.boss.y + 50, 'bossBullet');
  this.bossBullets.push(b);
}

function update() {
  if (gameOver) {
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      localStorage.removeItem('saveGame');
      location.reload();
    }
    return;
  }

  // MOVIMIENTO
  if (this.cursors.left.isDown) this.player.x -= 5;
  if (this.cursors.right.isDown) this.player.x += 5;

  // DISPARAR
  if (Phaser.Input.Keyboard.JustDown(this.space)) {
    const b = this.add.image(this.player.x, this.player.y - 20, 'bullet');
    this.bullets.push(b);
  }

  // BALAS
  for (let i = this.bullets.length - 1; i >= 0; i--) {
    this.bullets[i].y -= 8;
    if (this.bullets[i].y < 0) {
      this.bullets[i].destroy();
      this.bullets.splice(i, 1);
    }
  }

  // ENEMIGOS
  if (!bossActive) {
    const data = this.levelData[this.level - 1];

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].y += data.speed;

      if (this.enemies[i].y > 620) {
        this.enemies[i].destroy();
        this.enemies.splice(i, 1);
        this.lives--;
        this.livesText.setText('Vidas: ' + this.lives);
        if (this.lives <= 0) endGame.call(this, false);
      }
    }

    if (this.spawned >= data.enemies && this.enemies.length === 0) {
      this.level++;
      this.spawned = 0;
      if (this.level > this.levelData.length) spawnBoss.call(this);
      else this.levelText.setText('Nivel: ' + this.level);
    }
  }

  // COLISIONES BALAS vs ENEMIGOS
  for (let b = this.bullets.length - 1; b >= 0; b--) {
    for (let e = this.enemies.length - 1; e >= 0; e--) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        this.bullets[b].getBounds(),
        this.enemies[e].getBounds()
      )) {
        this.bullets[b].destroy();
        this.enemies[e].destroy();
        this.bullets.splice(b, 1);
        this.enemies.splice(e, 1);
        this.score += 10;
        this.scoreText.setText('Puntos: ' + this.score);
        break;
      }
    }
  }

  // BOSS
  if (bossActive && this.boss) {
    if (this.boss.y < 120) this.boss.y += 2;
    this.boss.x += Math.sin(this.time.now / 400) * 2;

    for (let b = this.bullets.length - 1; b >= 0; b--) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        this.bullets[b].getBounds(),
        this.boss.getBounds()
      )) {
        this.bullets[b].destroy();
        this.bullets.splice(b, 1);
        this.bossLife--;
      }
    }

    if (this.bossLife <= 0) endGame.call(this, true);
  }

  // BALAS BOSS
  for (let i = this.bossBullets.length - 1; i >= 0; i--) {
    this.bossBullets[i].y += 5;
    if (Phaser.Geom.Intersects.RectangleToRectangle(
      this.bossBullets[i].getBounds(),
      this.player.getBounds()
    )) {
      this.bossBullets[i].destroy();
      this.bossBullets.splice(i, 1);
      this.lives--;
      this.livesText.setText('Vidas: ' + this.lives);
      if (this.lives <= 0) endGame.call(this, false);
    }
  }
}

function endGame(win) {
  gameOver = true;
  localStorage.removeItem('saveGame');

  if (this.score > this.highScore) {
    localStorage.setItem('highScore', this.score);
  }

  this.endText.setText(win ? '¡BOSS DERROTADO!' : 'GAME OVER').setVisible(true);
  this.restartText.setVisible(true);
}
