// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TODO: Replace with your Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyBfuDxZ04aoLrZxjoJmeWivsm8V05ZfiS4",
    authDomain: "chariso.firebaseapp.com",
    projectId: "chariso",
    storageBucket: "chariso.firebasestorage.app",
    messagingSenderId: "886025257832",
    appId: "1:886025257832:web:1a1b83180c751952b20cdd",
    measurementId: "G-3PS2G08FNZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Ranking Logic ---
async function fetchLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '<li>Loading...</li>';

    try {
        const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(5));
        const querySnapshot = await getDocs(q);

        list.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement('li');
            li.textContent = `${data.score} - ${data.name}`;
            list.appendChild(li);
        });

        if (querySnapshot.empty) {
            list.innerHTML = '<li>No scores yet. Be the first!</li>';
        }
    } catch (e) {
        console.error("Error fetching leaderboard: ", e);
        list.innerHTML = '<li>Error loading scores. Check Console.</li>';
    }
}

async function submitScore() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim() || "Anonymous";
    const btn = document.getElementById('submit-score-btn');

    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        await addDoc(collection(db, "scores"), {
            name: name,
            score: score,
            date: new Date().toISOString()
        });

        alert("Score Registered!");
        document.getElementById('score-submit-area').style.display = 'none'; // Hide input
        fetchLeaderboard(); // Refresh
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Error saving score: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Register Score";
    }
}

// Initial Fetch
fetchLeaderboard();

// Submit Listener
document.getElementById('submit-score-btn').addEventListener('click', submitScore);


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
resizeCanvas(); // Initial call


// --- Classes ---

class Obstacle {
    constructor(x, y, w, h, type) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.type = type; // 'TREE', 'BIRD'
        this.markedForDeletion = false;
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.w < 0) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        // Placeholder, overridden by subclasses
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

class Tree extends Obstacle {
    constructor(x, y) {
        super(x, y - 50, 40, 50, 'TREE'); // Pipe sits on ground
    }

    draw() {
        // Green Pipe
        ctx.fillStyle = '#43A047'; // Green
        ctx.strokeStyle = '#1B5E20'; // Dark Green border
        ctx.lineWidth = 2;

        // Pipe Body
        ctx.fillRect(this.x + 5, this.y + 20, 30, 30);
        ctx.strokeRect(this.x + 5, this.y + 20, 30, 30);

        // Pipe Rim (Top)
        ctx.fillRect(this.x, this.y, 40, 20);
        ctx.strokeRect(this.x, this.y, 40, 20);

        // Piranha Plant (Simple)
        // Stem
        ctx.beginPath();
        ctx.moveTo(this.x + 20, this.y);
        ctx.lineTo(this.x + 20, this.y - 10);
        ctx.stroke();

        // Head (Red with White spots)
        ctx.fillStyle = '#E53935'; // Red
        ctx.beginPath();
        ctx.arc(this.x + 20, this.y - 20, 15, 0, Math.PI * 2); // Main head
        ctx.fill();
        ctx.stroke();

        // Mouth (Cutout)
        ctx.fillStyle = 'white'; // White mouth sector
        ctx.beginPath();
        ctx.moveTo(this.x + 20, this.y - 20);
        ctx.arc(this.x + 20, this.y - 20, 15, 0.2, 1.2);
        ctx.lineTo(this.x + 20, this.y - 20);
        ctx.fill();

        // Teeth (optional detail, maybe too small)
    }
}

class Bird extends Obstacle {
    constructor(x, y) {
        super(x, y, 35, 35, 'BIRD'); // Slightly smaller hitbox for turtle
        this.velX = 3; // Paratroopa is fast
        this.wingState = 0;
    }

    update() {
        super.update();
        this.x -= this.velX;
        this.wingState += 0.2;
        this.y += Math.sin(this.wingState) * 2; // Bobbing up and down
    }

    draw() {
        // Green Flying Turtle (Paratroopa)
        const centerX = this.x + 17;
        const centerY = this.y + 17;

        // Shell
        ctx.fillStyle = '#E53935'; // Red Shell
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 15, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = '#FFCC80'; // Skin color
        ctx.beginPath();
        ctx.arc(centerX - 12, centerY - 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(centerX - 15, centerY - 12, 2, 0, Math.PI * 2);
        ctx.fill();

        // Wing (White)
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        const wingOffset = Math.sin(this.wingState) * 8;
        ctx.ellipse(centerX + 5, centerY - 15 + wingOffset, 8, 12, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Body/Feet
        ctx.fillStyle = '#FFCC80';
        ctx.beginPath();
        ctx.arc(centerX - 5, centerY + 10, 5, 0, Math.PI * 2); // Front foot
        ctx.arc(centerX + 10, centerY + 10, 5, 0, Math.PI * 2); // Back foot
        ctx.fill();
    }
}

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
        // Keeps the Bike (Request was to keep generic bike-run feel but mario enemies)
        // Just refining it slightly to pop against the new background if needed.

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
        ctx.strokeStyle = '#1565C0'; // Blue frame for contrast
        ctx.lineWidth = 4;

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

        // Simple Rider
        ctx.beginPath();
        ctx.fillStyle = '#000'; // Shadowy rider
        // Head
        ctx.arc(this.x + 20, this.y - 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.strokeStyle = '#444'; // Grey suit
        ctx.lineWidth = 3;
        ctx.moveTo(this.x + 20, this.y - 2); // Neck
        ctx.lineTo(this.x + 15, this.y + 15); // Back to seat
        ctx.moveTo(this.x + 20, this.y - 2);
        ctx.lineTo(this.x + 32, this.y + 5); // Arms to handle
        ctx.stroke();
    }
}

class Rhino extends Obstacle {
    constructor(x, y) {
        // Rhino is short and wide
        super(x, y - 35, 50, 35, 'RHINO');
        this.chargeSpeed = 4; // Extra speed added to scrolling
    }

    update() {
        // Moves faster than the ground (Charges at player)
        this.x -= (gameSpeed + this.chargeSpeed);

        if (this.x + this.w < 0) this.markedForDeletion = true;
    }

    draw() {
        // Gray Body
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(this.x, this.y, 50, 30);

        // Legs
        ctx.fillStyle = '#616161';
        ctx.fillRect(this.x + 5, this.y + 30, 10, 5);
        ctx.fillRect(this.x + 35, this.y + 30, 10, 5);

        // Head/Horn area
        ctx.fillStyle = '#BDBDBD';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - 10, this.y + 10); // Horn tip
        ctx.lineTo(this.x, this.y + 20);
        ctx.fill();

        // Eye
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 2, this.y + 5, 3, 3);

        // Dust effect (simple circles behind)
        if (frames % 10 < 5) {
            ctx.fillStyle = '#E0E0E0';
            ctx.beginPath();
            ctx.arc(this.x + 55, this.y + 30, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class TerrainManager {
    constructor() {
        this.segments = [];
        this.obstacles = [];
        this.segmentWidth = 100; // Minimum width of a block
        // Initial ground
        this.addSegment(0, canvas.height - 100, canvas.width + 200, 100);
    }

    addSegment(x, y, w, h) {
        this.segments.push({ x, y, w, h });
    }

    addObstacle(obs) {
        this.obstacles.push(obs);
    }

    update() {
        // Move segments
        for (let i = 0; i < this.segments.length; i++) {
            this.segments[i].x -= gameSpeed;
        }

        // Move obstacles
        for (let i = 0; i < this.obstacles.length; i++) {
            this.obstacles[i].update();
        }

        // Remove off-screen segments
        if (this.segments.length > 0 && this.segments[0].x + this.segments[0].w < 0) {
            this.segments.shift();
        }

        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(obs => !obs.markedForDeletion);

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

            // Chance to spawn Bird over gap
            if (Math.random() < 0.3) {
                // Bird flies high, but keep it on screen (min Y=50)
                const birdY = Math.max(50, newY - 150);
                this.addObstacle(new Bird(lastSegment.x + lastSegment.w + gapSize + newW / 2, birdY));
            }

        } else {
            // Continue ground directly connected
            let newY = lastSegment.y + (Math.random() * 60 - 30); // Small bump/step
            newY = Math.max(100, Math.min(canvas.height - 50, newY));

            const newW = 300 + Math.random() * 300; // Longer ground for obstacles
            this.addSegment(lastSegment.x + lastSegment.w, newY, newW, 400);

            // OBSTACLE SPAWNING
            if (newW > 150) {
                const roll = Math.random();

                // Rhino on Long Ground (High Priority)
                if (newW > 400 && roll < 0.3) {
                    // Charge from right side of segment
                    const obsX = lastSegment.x + lastSegment.w + newW - 50;
                    this.addObstacle(new Rhino(obsX, newY));
                }
                // Tree (Normal)
                else if (roll < 0.6) {
                    const obsX = lastSegment.x + lastSegment.w + 50 + Math.random() * (newW - 100);
                    this.addObstacle(new Tree(obsX, newY));
                }
            }
        }
    }

    draw() {
        // Checkered Brick Pattern (Simulated)
        // In a real game we'd use an image, but drawing rects works for now

        for (const seg of this.segments) {
            // Main Block
            ctx.fillStyle = '#D86B45'; // Brick Orange
            ctx.fillRect(seg.x, seg.y, seg.w, seg.h);

            // Mortar lines (Grid)
            ctx.strokeStyle = '#8D4D2F';
            ctx.lineWidth = 2;
            const blockSize = 40;

            // Vertical lines
            for (let bx = 0; bx < seg.w; bx += blockSize) {
                ctx.beginPath();
                ctx.moveTo(seg.x + bx, seg.y);
                ctx.lineTo(seg.x + bx, seg.y + seg.h);
                ctx.stroke();
            }
            // Horizontal lines
            for (let by = 0; by < seg.h; by += blockSize) {
                ctx.beginPath();
                ctx.moveTo(seg.x, seg.y + by);
                ctx.lineTo(seg.x + seg.w, seg.y + by);
                ctx.stroke();
            }

            // Top grass border - Keeping it for clarity, or removing for "Brick" feel
            // Let's keep it as a "Grass top" like Mario 1-1 ground
            ctx.fillStyle = '#5C94FC'; // No, Mario ground is brown. Grass top is green for hills.
            // Let's just do a dark border top
            ctx.fillStyle = '#6D4C41';
            ctx.fillRect(seg.x, seg.y, seg.w, 5);
        }

        for (const obs of this.obstacles) {
            obs.draw();
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

    // Reset UI for ranking
    document.getElementById('score-submit-area').style.display = 'block';
    document.getElementById('player-name').value = '';
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

    // Check collision with OBSTACLES
    for (const obs of terrainManager.obstacles) {
        // Simple AABB Collision
        if (player.x < obs.x + obs.w &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.h &&
            player.y + player.height > obs.y) {
            // Hit obstacle
            gameOver();
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
    gameOverScreen.classList.add('hidden');
    loop();
});
