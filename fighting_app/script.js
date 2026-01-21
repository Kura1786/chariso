/**
 * Fighting Game
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 576;

// UI Elements
const menuScreen = document.getElementById('menu-screen');
const resultScreen = document.getElementById('result-screen');
const resultText = document.getElementById('result-text');
const p1HealthEl = document.getElementById('player1-health');
const p2HealthEl = document.getElementById('player2-health');
const timerEl = document.getElementById('timer');
const myPeerIdEl = document.getElementById('my-peer-id');
const statusMsg = document.getElementById('status-msg');

// Game Constants
const GRAVITY = 0.7;
const GROUND_Y = canvas.height - 96; // Floor height

// Game State
let gameState = 'MENU'; // MENU, PLAYING, END
let isOnline = false;
let isHost = false;
let conn = null; // PeerJS connection
let timer = 60;
let timerId = null;

// --- Fighter Class ---
class Fighter {
    constructor({ position, velocity, color, offset }, isPlayer1) {
        this.position = position;
        this.velocity = velocity;
        this.width = 50;
        this.height = 150;
        this.color = color;
        this.isPlayer1 = isPlayer1;

        // State
        this.lastKey = '';
        this.isAttacking = false;
        this.isBlocking = false;
        this.health = 100;
        this.dead = false;
        this.facing = 1; // 1: Right, -1: Left

        // Cooldowns & Status
        this.canAttack = true;
        this.isStunned = false;

        // Hitbox
        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            offset: offset,
            width: 100,
            height: 50
        };
        this.isGrounded = false;
    }

    draw() {
        // --- Humanoid Visuals ---
        // Stunned Color (Gray tint if stunned)
        ctx.fillStyle = this.isStunned ? 'gray' : this.color;

        // 1. Head
        ctx.beginPath();
        ctx.arc(this.position.x + this.width / 2, this.position.y + 20, 15, 0, Math.PI * 2);
        ctx.fill();

        // Eye (Visualizing facing direction)
        ctx.fillStyle = 'white';
        let eyeOffset = (this.facing === 1) ? 12 : -12;
        ctx.beginPath();
        ctx.arc(this.position.x + this.width / 2 + eyeOffset, this.position.y + 18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.isStunned ? 'gray' : this.color; // Reset

        // 2. Body
        ctx.fillRect(this.position.x + 10, this.position.y + 40, this.width - 20, 60);

        // 3. Legs
        ctx.fillRect(this.position.x + 10, this.position.y + 100, 10, 50); // Left Leg
        ctx.fillRect(this.position.x + 30, this.position.y + 100, 10, 50); // Right Leg

        // 4. Arms
        if (this.isAttacking) {
            ctx.fillStyle = this.isPlayer1 ? 'red' : 'blue';
            let armX = (this.facing === 1) ? this.position.x + 40 : this.position.x - 30;
            ctx.fillRect(armX, this.position.y + 50, 40, 10);
        } else {
            let frontArmX = (this.facing === 1) ? this.position.x + 35 : this.position.x - 5;
            let backArmX = (this.facing === 1) ? this.position.x + 15 : this.position.x + 15;
            ctx.fillRect(frontArmX, this.position.y + 45, 10, 40);
            ctx.fillRect(backArmX, this.position.y + 45, 10, 40);
        }

        // 5. Guard Visual
        if (this.isBlocking) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            let shieldX = (this.facing === 1) ? this.position.x + this.width + 5 : this.position.x - 25;
            ctx.fillRect(shieldX, this.position.y + 40, 20, 80);

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(shieldX, this.position.y + 40, 20, 80);
        }

        // Debug Hitbox
        if (this.isAttacking) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
            let attackX = (this.facing === 1) ? this.position.x + this.width : this.position.x - this.attackBox.width;
            ctx.fillRect(attackX, this.position.y + 30, this.attackBox.width, this.attackBox.height);
        }
    }

    update() {
        this.draw();

        if (this.dead) return;

        // Apply Position (Decelerate x if stunned/knockback)
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Friction for knockback
        if (this.isStunned) {
            this.velocity.x *= 0.9;
        }

        // Gravity
        if (this.position.y + this.height + this.velocity.y >= GROUND_Y) {
            this.velocity.y = 0;
            this.position.y = GROUND_Y - this.height;
            this.isGrounded = true;
        } else {
            this.velocity.y += GRAVITY;
            this.isGrounded = false;
        }

        // Screen Boundaries
        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x + this.width > canvas.width) this.position.x = canvas.width - this.width;
    }

    attack() {
        if (this.isAttacking || !this.canAttack || this.isStunned) return;

        this.isAttacking = true;
        this.canAttack = false; // Start Cooldown

        setTimeout(() => {
            this.isAttacking = false;
        }, 100);

        // Cooldown: 0.3s (300ms) interval
        setTimeout(() => {
            this.canAttack = true;
        }, 300);
    }

    takeHit(damage, attacker) {
        if (this.isBlocking) {
            damage = damage * 0.5; // 50% damage on block

            // Block Stun (Defender)
            this.isStunned = true;
            this.velocity.x = 0; // No knockback for defender

            // Attacker Recoil
            if (attacker) {
                // Apply strong recoil
                attacker.velocity.x = -15 * attacker.facing;
                // Briefly stun attacker so they can't cancel the recoil with input
                attacker.isStunned = true;
                setTimeout(() => {
                    attacker.isStunned = false;
                }, 2000); // 2.0s recoil stun
            }

            setTimeout(() => {
                this.isStunned = false;
            }, 500);
        }

        // Apply Damage (Happens whether blocking or not)
        this.health -= damage;

        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }
}

// --- PeerJS Setup ---
let peer = null;
let myPeerId = null;

// Init Peer
peer = new Peer();

peer.on('open', (id) => {
    myPeerId = id;
    console.log('My Peer ID is: ' + id);
    myPeerIdEl.innerHTML = id;
});

peer.on('connection', (connection) => {
    setupConnection(connection);
    isHost = true;
    statusMsg.innerHTML = "Connected! You are HOST (Player 1)";
    startGame();
});

peer.on('error', (err) => {
    console.error(err);
    alert('Connection Error: ' + err);
});

// UI Handlers
document.getElementById('host-btn').addEventListener('click', () => {
    // Just showing the ID is enough, peer is already open
    statusMsg.innerHTML = "Waiting for opponent... Share your ID.";
});

document.getElementById('join-btn').addEventListener('click', () => {
    let remoteId = document.getElementById('remote-id-input').value;
    if (remoteId) {
        let connection = peer.connect(remoteId);
        setupConnection(connection);
        isHost = false; // Joiner is Player 2
        statusMsg.innerHTML = "Connected! You are PLAYER 2";
        startGame();
    }
});

function setupConnection(connection) {
    conn = connection;
    isOnline = true;

    conn.on('open', () => {
        console.log("Connection Established");
    });

    conn.on('data', (data) => {
        handleData(data);
    });
}

function sendData() {
    if (!conn) return;

    // Send my state
    // Host sends Player 1, Joiner sends Player 2
    let myChar = isHost ? player : enemy;

    conn.send({
        type: 'update',
        x: myChar.position.x,
        y: myChar.position.y,
        vx: myChar.velocity.x,
        vy: myChar.velocity.y,
        facing: myChar.facing,
        isAttacking: myChar.isAttacking,
        isBlocking: myChar.isBlocking,
        isStunned: myChar.isStunned,
        health: myChar.health // Sync health for sanity check (optional)
    });
}

function handleData(data) {
    if (data.type === 'update') {
        // Update the 'other' character
        let otherChar = isHost ? enemy : player;

        otherChar.position.x = data.x;
        otherChar.position.y = data.y;
        otherChar.velocity.x = data.vx;
        otherChar.velocity.y = data.vy;
        otherChar.facing = data.facing;
        // status flags
        otherChar.isAttacking = data.isAttacking;
        otherChar.isBlocking = data.isBlocking;
        otherChar.isStunned = data.isStunned;
        // otherChar.health = data.health; // Optional: trust remote health
    } else if (data.type === 'hit') {
        // I took a hit! (Attacker Authority)
        let me = isHost ? player : enemy;
        let attacker = isHost ? enemy : player;
        // Apply damage locally
        me.takeHit(data.damage, attacker);
        updateHealthBars();
    } else if (data.type === 'game_end') {
        determineWinner({ player, enemy, timerId });
    }
}


// --- Init Players ---
const player = new Fighter({
    position: { x: 100, y: 0 },
    velocity: { x: 0, y: 0 },
    color: 'red',
    offset: { x: 0, y: 0 }
}, true);

const enemy = new Fighter({
    position: { x: 800, y: 0 },
    velocity: { x: 0, y: 0 },
    color: 'blue',
    offset: { x: -50, y: 0 }
}, false);

// Keys
const keys = {
    a: { pressed: false },
    d: { pressed: false },
    w: { pressed: false },
    s: { pressed: false }, // Block
    ArrowRight: { pressed: false },
    ArrowLeft: { pressed: false },
    ArrowUp: { pressed: false },
    ArrowDown: { pressed: false } // Block
};

// --- Game Loop ---
function animate() {
    window.requestAnimationFrame(animate);

    // Background Fill
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Floor
    ctx.fillStyle = '#444';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    // --- Networking Send ---
    if (gameState === 'PLAYING' && isOnline) {
        sendData();
    }

    if (gameState !== 'PLAYING') {
        // Still draw players in background (optional)
        player.update();
        enemy.update();
        return;
    }

    // --- Inputs / Movement ---

    // Player 1 (Red) - Controlled by Local Keys if Host (or Local Mode)
    // If Online and NOT Host, P1 is controlled by remote data (no key updates here)
    if (!isOnline || isHost) {
        if (!player.isStunned) {
            player.velocity.x = 0; // Reset unless stunned (which has friction)
            player.isBlocking = keys.s.pressed;

            if (!player.dead) {
                // Can't move while Blocking
                if (!player.isBlocking) {
                    if (keys.a.pressed && keys.d.pressed) {
                        player.velocity.x = 0;
                    } else if (keys.a.pressed) {
                        player.velocity.x = -5;
                        player.facing = -1;
                    } else if (keys.d.pressed) {
                        player.velocity.x = 5;
                        player.facing = 1;
                    }

                    if (keys.w.pressed && player.isGrounded) {
                        player.velocity.y = -15; // Lower Jump Height (was -20)
                    }
                }
            }
        }
    }

    // Player 2 (Blue) - Controlled by Local Keys if NOT Online (Local Mode)
    // OR if we are the JOINER (and Online), we control P2.
    // Wait, typical logic: 
    // Host controls P1. Joiner controls P2.
    // If isOnline and I am Host -> I control P1. P2 is remote.
    // If isOnline and I am Joiner -> I control P2. P1 is remote.

    let controlP2 = (!isOnline) || (isOnline && !isHost);

    if (controlP2) {
        if (!enemy.isStunned) {
            enemy.velocity.x = 0;
            enemy.isBlocking = keys.ArrowDown.pressed;

            if (!enemy.dead) {
                // Can't move while Blocking
                if (!enemy.isBlocking) {
                    if (keys.ArrowLeft.pressed && keys.ArrowRight.pressed) {
                        enemy.velocity.x = 0;
                    } else if (keys.ArrowLeft.pressed) {
                        enemy.velocity.x = -5;
                        enemy.facing = -1;
                    } else if (keys.ArrowRight.pressed) {
                        enemy.velocity.x = 5;
                        enemy.facing = 1;
                    }

                    if (keys.ArrowUp.pressed && enemy.isGrounded) {
                        enemy.velocity.y = -15; // Lower Jump Height
                    }
                }
            }
        }
    }

    // --- Core Updates ---
    player.update();
    enemy.update();

    // --- Collision Detection ---

    // Function to check collision
    function checkAttackCollision(attacker, defender) {
        // Attacker Authority: Only check collision if *I* am controlling this attacker
        // If Online:
        //   I am Host: I check P1 vs P2. I DO NOT check P2 vs P1 (trust remote).
        //   I am Joiner: I check P2 vs P1. I DO NOT check P1 vs P2.
        // If Local: Check both.

        let isMyCharacter = false;
        if (!isOnline) isMyCharacter = true; // Local: I own both
        else if (isHost && attacker === player) isMyCharacter = true;
        else if (!isHost && attacker === enemy) isMyCharacter = true;

        if (!isMyCharacter) return; // Don't check for remote player's attacks locally

        if (attacker.isAttacking) {
            // Calculate Attack Box X based on facing
            let attackBoxX;
            if (attacker.facing === 1) {
                attackBoxX = attacker.position.x + attacker.width;
            } else {
                attackBoxX = attacker.position.x - attacker.attackBox.width;
            }

            // Overlap Check
            if (attackBoxX + attacker.attackBox.width >= defender.position.x &&
                attackBoxX <= defender.position.x + defender.width &&
                attacker.position.y + 30 + 50 >= defender.position.y &&
                attacker.position.y + 30 <= defender.position.y + defender.height) {
                attacker.isAttacking = false;
                defender.takeHit(10, attacker); // Local effect
                updateHealthBars();

                // Send Hit Event
                if (isOnline && conn) {
                    conn.send({
                        type: 'hit',
                        damage: 10
                    });
                }
            }
        }
    }

    checkAttackCollision(player, enemy);
    checkAttackCollision(enemy, player);

    // --- End Game Check ---
    if (player.health <= 0 || enemy.health <= 0) {
        determineWinner({ player, enemy, timerId });
    }
}

function updateHealthBars() {
    p1HealthEl.style.width = player.health + '%';
    p2HealthEl.style.width = enemy.health + '%';
}

function determineWinner({ player, enemy, timerId }) {
    clearTimeout(timerId);
    gameState = 'END';
    resultScreen.classList.remove('hidden');
    if (player.health === enemy.health) {
        resultText.innerHTML = 'DRAW';
    } else if (player.health > enemy.health) {
        resultText.innerHTML = 'PLAYER 1 WINS';
    } else {
        resultText.innerHTML = 'PLAYER 2 WINS';
    }
}

function decreaseTimer() {
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000);
        timer--;
        timerEl.innerHTML = timer;
    }

    if (timer === 0) {
        determineWinner({ player, enemy, timerId });
    }
}

// --- Event Listeners (Local) ---
window.addEventListener('keydown', (event) => {
    switch (event.code) {
        // Player 1 (Red)
        case 'KeyD': keys.d.pressed = true; break;
        case 'KeyA': keys.a.pressed = true; break;
        case 'KeyW': keys.w.pressed = true; break;
        case 'KeyS': keys.s.pressed = true; break;
        case 'Space':
            // Only attack if I own Player 1
            if (!isOnline || isHost) player.attack();
            break;

        // Player 2 (Blue)
        case 'ArrowRight': keys.ArrowRight.pressed = true; break;
        case 'ArrowLeft': keys.ArrowLeft.pressed = true; break;
        case 'ArrowUp': keys.ArrowUp.pressed = true; break;
        case 'ArrowDown': keys.ArrowDown.pressed = true; break;
        case 'Enter':
            // Only attack if I own Player 2
            if (!isOnline || !isHost) enemy.attack();
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.code) {
        // Player 1
        case 'KeyD': keys.d.pressed = false; break;
        case 'KeyA': keys.a.pressed = false; break;
        case 'KeyW': keys.w.pressed = false; break;
        case 'KeyS': keys.s.pressed = false; break;

        // Player 2
        case 'ArrowRight': keys.ArrowRight.pressed = false; break;
        case 'ArrowLeft': keys.ArrowLeft.pressed = false; break;
        case 'ArrowUp': keys.ArrowUp.pressed = false; break;
        case 'ArrowDown': keys.ArrowDown.pressed = false; break;
    }
});

// --- Menu Logic ---
document.getElementById('local-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    resetGame();
    startGame();
});

function startGame() {
    gameState = 'PLAYING';
    menuScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    decreaseTimer();
}

function resetGame() {
    player.health = 100;
    enemy.health = 100;
    player.position = { x: 100, y: 0 };
    enemy.position = { x: 800, y: 0 };
    player.dead = false;
    enemy.dead = false;
    updateHealthBars();
    timer = 60;
}

// Start Loop
animate();
