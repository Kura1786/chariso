// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement('li');

            let rankIcon = `${rank}.`;
            let rankClass = '';

            if (rank === 1) {
                rankIcon = '👑';
                rankClass = 'rank-1';
            } else if (rank === 2) {
                rankIcon = '🥈';
                rankClass = 'rank-2';
            } else if (rank === 3) {
                rankIcon = '🥉';
                rankClass = 'rank-3';
            }

            li.className = rankClass;
            li.innerHTML = `<span class="rank-icon">${rankIcon}</span> <span class="score-val">${data.score}</span> - ${data.name}`;
            list.appendChild(li);
            rank++;
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
    btn.textContent = "Checking...";

    try {
        // 1. Check if user already exists
        const q = query(collection(db, "scores"), where("name", "==", name));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // User exists, check if new score is higher
            const existingDoc = querySnapshot.docs[0];
            const existingData = existingDoc.data();

            if (score > existingData.score) {
                // Update with high score
                btn.textContent = "Updating High Score...";
                const docRef = doc(db, "scores", existingDoc.id);
                await updateDoc(docRef, {
                    score: score,
                    date: new Date().toISOString()
                });
                alert(`New High Score! Previous: ${existingData.score}`);
            } else {
                alert(`Score not updated. Your high score is ${existingData.score}.`);
            }
        } else {
            // New user, add score
            btn.textContent = "Saving...";
            await addDoc(collection(db, "scores"), {
                name: name,
                score: score,
                date: new Date().toISOString()
            });
            alert("Score Registered!");
        }

        document.getElementById('score-submit-area').style.display = 'none'; // Hide input
        fetchLeaderboard(); // Refresh
    } catch (e) {
        console.error("Error processing score: ", e);
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Register Score";
    }
}

// Initial Fetch
fetchLeaderboard();

// Submit Listener
document.getElementById('submit-score-btn').addEventListener('click', submitScore);

// --- Feedback Logic ---
async function submitFeedback() {
    const input = document.getElementById('feedback-input');
    const msg = input.value.trim();
    const btn = document.getElementById('send-feedback-btn');

    if (!msg) {
        alert("Please write something!");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
        await addDoc(collection(db, "feedback"), {
            message: msg,
            date: new Date().toISOString()
        });
        alert("Thank you for your feedback!");
        input.value = "";
    } catch (e) {
        console.error("Error sending feedback: ", e);
        alert("Error sending. Try again later.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Send";
    }
}

document.getElementById('send-feedback-btn').addEventListener('click', submitFeedback);


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
// Resize canvas to fit container
function resizeCanvas() {
    const oldHeight = canvas.height;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    // Shift entities if game is initialized and height changed
    if (oldHeight && oldHeight !== canvas.height && typeof terrainManager !== 'undefined' && typeof player !== 'undefined') {
        const deltaY = canvas.height - oldHeight;

        // Shift Player
        player.y += deltaY;

        // Shift Terrain
        for (const seg of terrainManager.segments) {
            seg.y += deltaY;
        }

        // Shift Obstacles
        for (const obs of terrainManager.obstacles) {
            obs.y += deltaY;
        }
    }
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

class Rock extends Obstacle {
    constructor(x, y) {
        super(x, y - 40, 50, 40, 'ROCK');
    }

    draw() {
        // Rock Visual
        ctx.fillStyle = '#757575'; // Grey
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + 40);
        ctx.lineTo(this.x + 10, this.y + 10);
        ctx.lineTo(this.x + 25, this.y); // Peak
        ctx.lineTo(this.x + 40, this.y + 15);
        ctx.lineTo(this.x + 50, this.y + 40);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cracks
        ctx.beginPath();
        ctx.moveTo(this.x + 15, this.y + 30);
        ctx.lineTo(this.x + 25, this.y + 15);
        ctx.stroke();
    }
}

class Bird extends Obstacle {
    constructor(x, y) {
        super(x, y, 40, 30, 'BIRD');
        this.velX = 3;
        this.wingState = 0;
    }

    update() {
        this.x -= (gameSpeed + 1.5);
        this.wingState += 0.25; // Faster flap
        this.y += Math.sin(this.wingState) * 3;

        if (this.x + this.w < 0) this.markedForDeletion = true;
    }

    draw() {
        const centerX = this.x + 20;
        const centerY = this.y + 15;

        // Visual: Crow / Dark Bird
        ctx.fillStyle = '#212121'; // Black/Grey

        // Body
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye (White with red pupil)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX - 10, centerY - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(centerX - 11, centerY - 5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Beak (Sharp Yellow)
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.moveTo(centerX - 15, centerY + 2);
        ctx.lineTo(centerX - 28, centerY + 5); // Pointy beak
        ctx.lineTo(centerX - 15, centerY + 8);
        ctx.fill();

        // Wing (Flapping)
        ctx.fillStyle = '#424242'; // Dark Grey Wing
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const wingY = centerY - 5 + Math.sin(this.wingState) * 12; // Big flap
        ctx.ellipse(centerX + 2, wingY, 12, 6, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
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
        // Rhino Buff: Bigger and Faster
        super(x, y - 45, 60, 45, 'RHINO');
        this.chargeSpeed = 6; // Speed up to 1.5x (was 4)
    }

    update() {
        // Moves faster than the ground (Charges at player)
        this.x -= (gameSpeed + this.chargeSpeed);

        if (this.x + this.w < 0) this.markedForDeletion = true;

        // Follow Ground Logic
        let groundFound = false;
        // Access global terrainManager
        if (typeof terrainManager !== 'undefined') {
            for (const seg of terrainManager.segments) {
                // Check if Rhino's center is within segment horizontal bounds
                const centerX = this.x + this.w / 2;
                if (centerX >= seg.x && centerX <= seg.x + seg.w) {
                    // Snap to ground
                    this.y = seg.y - this.h;
                    groundFound = true;
                    break;
                }
            }
        }

        if (!groundFound) {
            this.y += 10; // Fall if no ground (gap)
        }
    }

    draw() {
        // Gray Body
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(this.x, this.y, 60, 40); // Bigger body

        // Legs
        ctx.fillStyle = '#616161';
        ctx.fillRect(this.x + 5, this.y + 40, 15, 5);
        ctx.fillRect(this.x + 40, this.y + 40, 15, 5);

        // Head/Horn area
        ctx.fillStyle = '#BDBDBD';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - 15, this.y + 15); // Longer horn
        ctx.lineTo(this.x, this.y + 30);
        ctx.fill();

        // Eye
        ctx.fillStyle = 'red'; // Angry
        ctx.fillRect(this.x + 5, this.y + 10, 5, 5);

        // Dust effect (simple circles behind)
        if (frames % 10 < 5) {
            ctx.fillStyle = '#E0E0E0';
            ctx.beginPath();
            ctx.arc(this.x + 65, this.y + 40, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Rabbit extends Obstacle {
    constructor(x, y) {
        super(x, y - 40, 40, 40, 'RABBIT');
        this.velY = 0;
        this.isGrounded = true;
        this.jumpTimer = Math.random() * 100; // Randomize start
        this.speed = 2; // Move towards player
    }

    update() {
        this.x -= (gameSpeed + this.speed);

        // Ground Check (Always check to follow terrain)
        let groundFound = false;
        let groundY = 0;

        if (typeof terrainManager !== 'undefined') {
            for (const seg of terrainManager.segments) {
                const centerX = this.x + this.w / 2;
                if (centerX >= seg.x && centerX <= seg.x + seg.w) {
                    groundY = seg.y;
                    groundFound = true;
                    break;
                }
            }
        }

        if (this.isGrounded) {
            // If on ground, snap to it or fall
            if (groundFound) {
                this.y = groundY - this.h;

                // Jump Timer
                this.jumpTimer++;
                if (this.jumpTimer > 100) { // Jump every ~100 frames
                    this.velY = -10;
                    this.isGrounded = false;
                    this.jumpTimer = 0;
                }
            } else {
                // Walked off ledge
                this.isGrounded = false;
            }
        } else {
            // Airborne Logic
            this.velY += GRAVITY;
            this.y += this.velY;

            // Landing Check
            if (groundFound && this.velY > 0) {
                // Check if close enough to land
                if (this.y + this.h >= groundY - 5 && this.y + this.h <= groundY + 20) { // Tolerance
                    this.y = groundY - this.h;
                    this.velY = 0;
                    this.isGrounded = true;
                }
            }
        }

        if (this.x + this.w < 0) this.markedForDeletion = true;
    }

    draw() {
        const centerX = this.x + 20;
        const centerY = this.y + 20;

        // Body (White)
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY + 5, 15, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#FFCDD2'; // Pinkish
        ctx.beginPath();
        ctx.ellipse(centerX - 5, centerY - 15, 5, 12, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + 5, centerY - 15, 5, 12, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Face
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(centerX - 5, centerY, 2, 0, Math.PI * 2); // Eye
        ctx.arc(centerX + 5, centerY, 2, 0, Math.PI * 2); // Eye
        ctx.fill();

        ctx.fillStyle = '#F48FB1'; // Nose
        ctx.beginPath();
        ctx.arc(centerX, centerY + 5, 3, 0, Math.PI * 2);
        ctx.fill();
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
        while (this.segments.length > 0 && this.segments[0].x + this.segments[0].w < 0) {
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
                    const obsX = lastSegment.x + lastSegment.w + newW - 50;
                    this.addObstacle(new Rhino(obsX, newY));
                }
                // Rabbit (Jumper)
                else if (roll < 0.5) {
                    const obsX = lastSegment.x + lastSegment.w + 50 + Math.random() * (newW - 100);
                    this.addObstacle(new Rabbit(obsX, newY));
                }
                // Rock (Normal)
                else if (roll < 0.8) {
                    const obsX = lastSegment.x + lastSegment.w + 50 + Math.random() * (newW - 100);
                    this.addObstacle(new Rock(obsX, newY));
                }
            }
        }
    }

    draw() {
        // Grassland Style
        for (const seg of this.segments) {
            // Main Block (Dirt/Soil)
            ctx.fillStyle = '#5D4037'; // Dirt Brown
            ctx.fillRect(seg.x, seg.y, seg.w, seg.h);

            // Grass Top
            ctx.fillStyle = '#4CAF50'; // Grass Green
            ctx.fillRect(seg.x, seg.y, seg.w, 20);

            // Grass details (lighter edge)
            ctx.fillStyle = '#81C784';
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

    try {
        update();
        draw();
        requestId = requestAnimationFrame(loop);
    } catch (e) {
        console.error("Game Crashed:", e);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText("Game Error: " + e.message, 50, canvas.height / 2);
        gameState = 'ERROR';
    }
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
startBtn.addEventListener('click', function () {
    this.blur(); // Remove focus to prevent Space key from triggering click again
    initGame();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    loop();
});

restartBtn.addEventListener('click', function () {
    this.blur(); // Remove focus
    initGame();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    loop();
});
