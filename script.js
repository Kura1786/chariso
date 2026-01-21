/**
 * Chariso Game
 * Simple endless runner
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const SPEED = 5;
const DOUBLE_JUMP_FORCE = -10;

// Game State
let gameState = 'START'; // START, PLAYING, GAME_OVER
let frames = 0;
let score = 0;
let gameSpeed = SPEED;
let requestId = null;

// Resize canvas to fit container
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Classes ---

class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = 100;
        this.y = 200;
        this.velY = 0;
        this.isGrounded = false;
        this.jumpCount = 0;
        this.maxJumps = 2;
        this.color = '#333';
    }

    update() {
        // Apply gravity
        this.velY += GRAVITY;
        this.y += this.velY;

        // Ground collision (temporary floor check before terrain interaction)
        // Actual collision is handled in the main loop with terrain segments,
        // but we need a "pit" check (if y > canvas.height).
    }

    jump() {
        if (this.jumpCount < this.maxJumps) {
            this.velY = this.jumpCount === 0 ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
            this.jumpCount++;
            this.isGrounded = false;
        }
    }

    land(y) {
        this.y = y - this.height;
        this.velY = 0;
        this.isGrounded = true;
        this.jumpCount = 0;
    }

    draw() {
        // Simple Stick-figure Bike
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const wheelRadius = 10;
        const rearWheelX = this.x + wheelRadius;
        const frontWheelX = this.x + this.width - wheelRadius;
        const wheelY = this.y + this.height;

        // Draw Wheels
        ctx.beginPath();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.arc(rearWheelX, wheelY, wheelRadius, 0, Math.PI * 2);
        ctx.stroke(); // Rear
        ctx.beginPath();
        ctx.arc(frontWheelX, wheelY, wheelRadius, 0, Math.PI * 2);
        ctx.stroke(); // Front

        // Draw Frame
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;

        // Rear axle to Seat post
        ctx.moveTo(rearWheelX, wheelY);
        ctx.lineTo(this.x + 15, this.y + 15); // Seat position (approx)

        // Review axle to Pedal
        ctx.moveTo(rearWheelX, wheelY);
        ctx.lineTo(this.x + 25, this.y + 35); // Pedal area

        // Pedal to Seat post (Main triangle)
        ctx.lineTo(this.x + 15, this.y + 15);

        // Seat post to Handlebar stem
        ctx.moveTo(this.x + 15, this.y + 15);
        ctx.lineTo(this.x + 35, this.y + 10); // Crossbar to front

        // Front axle to Handlebar stem (Fork)
        ctx.moveTo(frontWheelX, wheelY);
        ctx.lineTo(this.x + 35, this.y + 5); // Handlebar height

        // Handlebars
        ctx.lineTo(this.x + 30, this.y);

        // Seat
        ctx.moveTo(this.x + 10, this.y + 15);
        ctx.lineTo(this.x + 20, this.y + 15);

        ctx.stroke();

        // Simple Rider (Optional, maybe just a head)
        ctx.beginPath();
        ctx.fillStyle = '#000';
        // Head
        ctx.arc(this.x + 20, this.y - 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.strokeStyle = '#000';
        ctx.moveTo(this.x + 20, this.y - 2); // Neck
        ctx.lineTo(this.x + 15, this.y + 15); // Back to seat
        ctx.moveTo(this.x + 20, this.y - 2);
        ctx.lineTo(this.x + 32, this.y + 5); // Arms to handle
        ctx.stroke();
    }
}

class TerrainManager {
    constructor() {
        this.segments = [];
        this.segmentWidth = 100; // Minimum width of a block
        // Initial ground
        this.addSegment(0, canvas.height - 100, canvas.width + 200, 100);
    }

    addSegment(x, y, w, h) {
        this.segments.push({ x, y, w, h });
    }

    update() {
        // Move segments
        for (let i = 0; i < this.segments.length; i++) {
            this.segments[i].x -= gameSpeed;
        }

        // Remove off-screen segments
        if (this.segments.length > 0 && this.segments[0].x + this.segments[0].w < 0) {
            this.segments.shift();
        }

        // Generate new segments
        const lastSegment = this.segments[this.segments.length - 1];
        if (lastSegment.x + lastSegment.w < canvas.width + 200) {
            this.generateNextSegment(lastSegment);
        }
    }

    generateNextSegment(lastSegment) {
        // Simple random generation logic
        // Gap or Ground?
        const isGap = Math.random() < 0.3; // 30% chance of gap

        if (isGap) {
            // Add a gap by simply placing the next segment further away
            const gapSize = 100 + Math.random() * 100; // 100-200px gap
            // Ground height variation (not too steep)
            let newY = lastSegment.y + (Math.random() * 100 - 50);
            // Clamp height (keep it visible and playable)
            newY = Math.max(100, Math.min(canvas.height - 50, newY)); // Keep at least 50px from bottom, 100px from top

            const newW = 200 + Math.random() * 300; // Random width

            this.addSegment(lastSegment.x + lastSegment.w + gapSize, newY, newW, 400); // 400 height to fill down
        } else {
            // Continue ground directly connected
            let newY = lastSegment.y + (Math.random() * 60 - 30); // Small bump/step
            newY = Math.max(100, Math.min(canvas.height - 50, newY));

            const newW = 100 + Math.random() * 200;
            this.addSegment(lastSegment.x + lastSegment.w, newY, newW, 400);
        }
    }

    draw() {
        ctx.fillStyle = '#4CAF50';
        for (const seg of this.segments) {
            ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
            // Top grass border
            ctx.fillStyle = '#388E3C';
            ctx.fillRect(seg.x, seg.y, seg.w, 10);
            ctx.fillStyle = '#4CAF50';
        }
    }
}

// --- Global Objects ---
let player;
let terrainManager;

function initGame() {
    player = new Player();
    terrainManager = new TerrainManager();
    gameSpeed = SPEED;
    score = 0;
    frames = 0;
}

// --- Main Loop ---
function loop() {
    if (gameState !== 'PLAYING') return;

    update();
    draw();
    requestId = requestAnimationFrame(loop);
}

function update() {
    frames++;
    gameSpeed += 0.001; // Slowly increase speed

    // Update Score
    score = Math.floor(frames / 10);
    scoreEl.textContent = score;

    player.update();
    terrainManager.update();

    checkCollision();
    checkGameOver();
}

function checkCollision() {
    player.isGrounded = false; // Assume falling unless we find ground

    // Check collision with all segments
    for (const seg of terrainManager.segments) {
        // Horizontal overlap
        if (player.x + player.width > seg.x && player.x < seg.x + seg.w) {
            // Vertical check: Player bottom is near Segment top
            // Tolerance allows for high speed updates
            if (player.y + player.height >= seg.y && player.y + player.height <= seg.y + player.velY + 20) {
                if (player.velY >= 0) { // Only land if falling or flat
                    player.land(seg.y);
                }
            }
            // Side collision (wall logic) - Simplified: if inside block and not landed properly
            else if (player.y + player.height > seg.y + 10) {
                // Hit a wall/side of terrain: Game Over? or just stop?
                // For Chariso, hitting a wall usually means death or sliding down.
                // Let's implement death on wall hit for "classic" difficulty.
                // Actually simple logic: if x + width > seg.x (which is true here) AND y > seg.y, we are inside.
            }
        }
    }
}

function checkGameOver() {
    // 1. Fell relative to screen height
    if (player.y > canvas.height) {
        gameOver();
    }

    // 2. Hit a wall (gameSpeed pushes player off screen or instant death)
    // Checking if player is pushed off screen left
    // But since player X is fixed-ish and terrain moves, side collision means player might clip through or get pushed.
    // Let's refine collision: If player.x + width > seg.x && player.x < seg.x + 10 && player.y > seg.y, it's a frontal crash.

    for (const seg of terrainManager.segments) {
        if (player.x + player.width > seg.x && player.x < seg.x + 20 && player.y + player.height > seg.y + 5) {
            // Frontal collision
            gameOver();
        }
    }
}

function draw() {
    // Background Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    terrainManager.draw();
    player.draw();
}

function gameOver() {
    gameState = 'GAME_OVER';
    cancelAnimationFrame(requestId);
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// --- Input Handling ---
function handleInput(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (gameState === 'START' || gameState === 'GAME_OVER') return; // Handled by buttons

    player.jump();
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameState === 'PLAYING') {
            player.jump();
        }
    }
});

canvas.addEventListener('mousedown', () => {
    if (gameState === 'PLAYING') player.jump();
});
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    if (gameState === 'PLAYING') player.jump();
}, { passive: false });

// --- Button Listeners ---
startBtn.addEventListener('click', () => {
    initGame();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    loop();
});

restartBtn.addEventListener('click', () => {
    initGame();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden'); // Wait, should remove hidden class or add it? We hide it.
    gameOverScreen.classList.add('hidden');
    loop();
});
