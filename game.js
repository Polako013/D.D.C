// ===== CANVAS =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 400;
canvas.height = 600;

// ===== FIREBASE =====
const FIREBASE_URL = "https://mi-juego-ranking-default-rtdb.firebaseio.com//scores.json";

// ===== ESTADO =====
let level = Number(localStorage.getItem("level")) || 1;
let score = Number(localStorage.getItem("score")) || 0;

const player = { x: 200, y: 520, lives: 3, speed: 5 };

let bullets = [];
let enemies = [];
let boss = null;
let bossBullets = [];
let gameOver = false;
let showRanking = false;
let rankingData = [];

// ===== CONTROLES =====
const keys = {};
document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === " ") shoot();
  if (e.key === "r" && gameOver) restartGame();
});
document.addEventListener("keyup", e => keys[e.key] = false);

// ===== DISPARO =====
function shoot() {
  if (!gameOver) bullets.push({ x: player.x, y: player.y });
}

// ===== COLISIÓN =====
function hit(a, b, d = 20) {
  return Math.abs(a.x - b.x) < d && Math.abs(a.y - b.y) < d;
}

// ===== ENEMIGOS =====
function spawnEnemy() {
  enemies.push({
    x: Math.random() * 360 + 20,
    y: -20,
    speed: 2 + level * 0.3
  });
}

// ===== BOSS =====
function spawnBoss() {
  boss = {
    x: 200,
    y: 80,
    life: 40 + level * 10,
    dir: 1,
    shootTimer: 0,
    time: 0
  };
}

// ===== FIREBASE =====
function enviarPuntuacion(nombre, puntos) {
  fetch(FIREBASE_URL, {
    method: "POST",
    body: JSON.stringify({ name: nombre, score: puntos })
  });
}

function cargarRanking() {
  fetch(FIREBASE_URL)
    .then(r => r.json())
    .then(data => {
      if (!data) return;
      rankingData = Object.values(data)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      showRanking = true;
    });
}

// ===== FIN =====
function endGame() {
  gameOver = true;
  localStorage.clear();

  const nombre = prompt("Tu nombre para el ranking:");
  if (nombre) enviarPuntuacion(nombre, score);
  cargarRanking();
}

// ===== REINICIO =====
function restartGame() {
  level = 1;
  score = 0;
  player.lives = 3;
  bullets = [];
  enemies = [];
  boss = null;
  bossBullets = [];
  gameOver = false;
  showRanking = false;
  saveGame();
}

// ===== GUARDAR =====
function saveGame() {
  localStorage.setItem("level", level);
  localStorage.setItem("score", score);
}

// ===== UPDATE =====
function update() {
  if (gameOver) return;

  if (keys["ArrowLeft"] && player.x > 20) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x < 380) player.x += player.speed;

  bullets.forEach(b => b.y -= 7);
  bullets = bullets.filter(b => b.y > 0);

  if (!boss && Math.random() < 0.02) spawnEnemy();
  enemies.forEach(e => e.y += e.speed);

  enemies.forEach((e, ei) => {
    bullets.forEach((b, bi) => {
      if (hit(e, b)) {
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        score += 10;
      }
    });

    if (e.y > 600 || hit(e, player)) {
      enemies.splice(ei, 1);
      player.lives--;
      if (player.lives <= 0) endGame();
    }
  });

  if (level % 3 === 0 && !boss) spawnBoss();

  if (boss) {
    boss.x += boss.dir * 2;
    if (boss.x < 40 || boss.x > 360) boss.dir *= -1;

    boss.shootTimer++;
    boss.time++;

    if (boss.shootTimer > 40) {
      bossBullets.push({ x: boss.x, y: boss.y });
      boss.shootTimer = 0;
    }

    if (boss.time > 1800) boss.life = 0;

    bossBullets.forEach(b => b.y += 4);
    bossBullets = bossBullets.filter(b => b.y < 600);

    bossBullets.forEach((b, bi) => {
      if (hit(b, player)) {
        bossBullets.splice(bi, 1);
        player.lives--;
        if (player.lives <= 0) endGame();
      }
    });

    bullets.forEach((b, bi) => {
      if (hit(boss, b, 30)) {
        bullets.splice(bi, 1);
        boss.life--;
        score += 5;
        if (boss.life <= 0) {
          if (level >= 9) {
            endGame();
            return;
          }
          boss = null;
          level++;
          saveGame();
        }
      }
    });
  }

  if (score > level * 200 && !boss) {
    level++;
    saveGame();
  }
}

// ===== DIBUJO =====
function draw() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 400, 600);

  ctx.font = "24px Arial";
  ctx.fillText("🚀", player.x - 12, player.y + 12);

  bullets.forEach(b => ctx.fillText("🔹", b.x - 5, b.y));
  enemies.forEach(e => ctx.fillText("👾", e.x - 12, e.y + 12));

  if (boss) {
    ctx.font = "40px Arial";
    ctx.fillText("👑", boss.x - 20, boss.y + 20);
    ctx.font = "16px Arial";
    ctx.fillText("BOSS VIDA: " + boss.life, 140, 30);
  }

  bossBullets.forEach(b => ctx.fillText("🔥", b.x - 8, b.y + 8));

  ctx.font = "16px Arial";
  ctx.fillStyle = "white";
  ctx.fillText("Puntos: " + score, 10, 20);
  ctx.fillText("Vidas: " + player.lives, 320, 20);
  ctx.fillText("Nivel: " + level, 180, 20);

  if (gameOver) {
    ctx.font = "22px Arial";
    ctx.fillText("FIN DEL JUEGO", 120, 280);
    ctx.font = "16px Arial";
    ctx.fillText("Pulsa R para reiniciar", 110, 320);
  }

  if (showRanking) {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(50, 150, 300, 300);
    ctx.fillStyle = "white";
    ctx.fillText("🏆 RANKING 🏆", 140, 180);
    rankingData.forEach((p, i) => {
      ctx.fillText(`${i + 1}. ${p.name} - ${p.score}`, 90, 220 + i * 30);
    });
  }
}

// ===== LOOP =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
