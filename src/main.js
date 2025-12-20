import { Application, Container, Graphics, Text, Rectangle } from "pixi.js";

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const CUP_COUNT = 3;
const CUP_WIDTH = 120;
const CUP_HEIGHT = 160;
const CUP_SPACING = 200;
const CUP_Y = 380;
const BALL_RADIUS = 25;
const SHUFFLE_SPEED = 300; // ms per swap
const SHUFFLE_COUNT = 8;

// Game state
let ballPosition = 0;
let isShuffling = false;
let isRevealing = false;
let canSelect = false;
let score = 0;
let gamesPlayed = 0;

// Game objects
let app;
let cups = [];
let ball;
let ui;
let gameContainer;
let cupsContainer;

// Easing function
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Animation helper using app.ticker
function animate(target, props, duration) {
  return new Promise(resolve => {
    const startProps = {};
    for (const key in props) {
      startProps[key] = target[key];
    }

    let elapsed = 0;
    const ticker = delta => {
      elapsed += delta.deltaTime * (1000 / 60);
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutQuad(progress);

      for (const key in props) {
        target[key] = startProps[key] + (props[key] - startProps[key]) * eased;
      }

      if (progress >= 1) {
        app.ticker.remove(ticker);
        resolve();
      }
    };

    app.ticker.add(ticker);
  });
}

// Create the ball
function createBall() {
  const ballGraphic = new Graphics();

  // Ball shadow
  ballGraphic.circle(3, 3, BALL_RADIUS);
  ballGraphic.fill({ color: 0x000000, alpha: 0.3 });

  // Main ball
  ballGraphic.circle(0, 0, BALL_RADIUS);
  ballGraphic.fill({ color: 0xcc2222 });

  // Highlight
  ballGraphic.circle(-8, -8, BALL_RADIUS * 0.4);
  ballGraphic.fill({ color: 0xff6666, alpha: 0.6 });

  // Small shine
  ballGraphic.circle(-5, -5, BALL_RADIUS * 0.15);
  ballGraphic.fill({ color: 0xffffff, alpha: 0.8 });

  return ballGraphic;
}

// Create a cup graphic
function createCup(index) {
  const cupContainer = new Container();

  // Cup body (trapezoid shape using graphics)
  const cup = new Graphics();

  // Cup shadow
  cup.ellipse(0, CUP_HEIGHT - 10, CUP_WIDTH * 0.5 + 5, 20);
  cup.fill({ color: 0x000000, alpha: 0.3 });

  // Main cup body - darker base color
  const cupPath = [
    -CUP_WIDTH * 0.35,
    0, // top left
    CUP_WIDTH * 0.35,
    0, // top right
    CUP_WIDTH * 0.5,
    CUP_HEIGHT, // bottom right
    -CUP_WIDTH * 0.5,
    CUP_HEIGHT // bottom left
  ];
  cup.poly(cupPath);
  cup.fill({ color: 0x8b4513 });

  // Cup rim (ellipse at top)
  cup.ellipse(0, 0, CUP_WIDTH * 0.35, 12);
  cup.fill({ color: 0x654321 });
  cup.ellipse(0, 0, CUP_WIDTH * 0.3, 8);
  cup.fill({ color: 0x1a1a1a }); // dark inside

  // Left highlight
  const highlightPath = [
    -CUP_WIDTH * 0.35,
    0,
    -CUP_WIDTH * 0.25,
    0,
    -CUP_WIDTH * 0.35,
    CUP_HEIGHT,
    -CUP_WIDTH * 0.5,
    CUP_HEIGHT
  ];
  cup.poly(highlightPath);
  cup.fill({ color: 0xa0522d, alpha: 0.5 });

  // Right shadow
  const shadowPath = [
    CUP_WIDTH * 0.25,
    0,
    CUP_WIDTH * 0.35,
    0,
    CUP_WIDTH * 0.5,
    CUP_HEIGHT,
    CUP_WIDTH * 0.35,
    CUP_HEIGHT
  ];
  cup.poly(shadowPath);
  cup.fill({ color: 0x5c3317, alpha: 0.5 });

  // Decorative rings
  for (let i = 1; i <= 2; i++) {
    const ringY = CUP_HEIGHT * (i * 0.3);
    const ringWidth = CUP_WIDTH * (0.35 + (i * 0.3 * 0.15) / 0.3);
    cup.ellipse(0, ringY, ringWidth, 6);
    cup.stroke({ color: 0x654321, width: 3 });
  }

  cupContainer.addChild(cup);

  // Store cup data
  cupContainer.cupIndex = index;
  cupContainer.isLifted = false;
  cupContainer.originalY = CUP_Y;

  return cupContainer;
}

// Create a button
function createButton(text, x, y) {
  const button = new Container();

  const bg = new Graphics();
  bg.roundRect(-80, -25, 160, 50, 12);
  bg.fill({ color: 0xd4af37 });
  bg.roundRect(-78, -23, 156, 46, 10);
  bg.stroke({ color: 0xffd700, width: 2 });

  const label = new Text({
    text: text,
    style: {
      fontFamily: "Arial",
      fontSize: 22,
      fontWeight: "bold",
      fill: 0x2d2d2d
    }
  });
  label.anchor.set(0.5);

  button.addChild(bg);
  button.addChild(label);
  button.x = x;
  button.y = y;

  button.eventMode = "static";
  button.cursor = "pointer";

  button.on("pointerover", () => {
    button.scale.set(1.1);
  });
  button.on("pointerout", () => {
    button.scale.set(1.0);
  });

  return button;
}

// Create UI elements
function createUI() {
  const uiContainer = new Container();

  // Title
  const title = new Text({
    text: "🎩 Thimblerig 🎩",
    style: {
      fontFamily: "Georgia, serif",
      fontSize: 42,
      fill: 0xffd700,
      stroke: { color: 0x000000, width: 4 },
      dropShadow: {
        color: 0x000000,
        blur: 4,
        distance: 3
      }
    }
  });
  title.anchor.set(0.5);
  title.x = GAME_WIDTH / 2;
  title.y = 60;
  uiContainer.addChild(title);

  // Score display
  const scoreText = new Text({
    text: "Score: 0 / 0",
    style: {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff
    }
  });
  scoreText.anchor.set(0.5);
  scoreText.x = GAME_WIDTH / 2;
  scoreText.y = 110;
  scoreText.label = "scoreText";
  uiContainer.addChild(scoreText);

  // Instructions
  const instructions = new Text({
    text: "Watch the ball, then find it after the shuffle!",
    style: {
      fontFamily: "Arial",
      fontSize: 20,
      fill: 0xcccccc
    }
  });
  instructions.anchor.set(0.5);
  instructions.x = GAME_WIDTH / 2;
  instructions.y = 550;
  instructions.label = "instructions";
  uiContainer.addChild(instructions);

  // Play button
  const playButton = createButton("Start Game", GAME_WIDTH / 2, 480);
  playButton.label = "playButton";
  uiContainer.addChild(playButton);

  return uiContainer;
}

// Lift a cup to reveal what's underneath
async function liftCup(cupIndex, quick = false) {
  const cup = cups[cupIndex];
  const duration = quick ? 150 : 400;
  await animate(cup, { y: cup.originalY - 120 }, duration);
  cup.isLifted = true;
}

// Lower a cup
async function lowerCup(cupIndex, quick = false) {
  const cup = cups[cupIndex];
  const duration = quick ? 150 : 400;
  await animate(cup, { y: cup.originalY }, duration);
  cup.isLifted = false;
}

// Swap two cups with animation
async function swapCups(index1, index2) {
  const cup1 = cups[index1];
  const cup2 = cups[index2];

  const x1 = cup1.x;
  const x2 = cup2.x;

  // Move cups in an arc
  const midY = CUP_Y - 60;

  // Animate both cups simultaneously
  await Promise.all([
    (async () => {
      await animate(cup1, { y: midY }, SHUFFLE_SPEED / 2);
      await animate(cup1, { x: x2, y: CUP_Y }, SHUFFLE_SPEED / 2);
    })(),
    (async () => {
      await animate(cup2, { y: midY + 30 }, SHUFFLE_SPEED / 2);
      await animate(cup2, { x: x1, y: CUP_Y }, SHUFFLE_SPEED / 2);
    })()
  ]);

  // Swap in array
  cups[index1] = cup2;
  cups[index2] = cup1;
  cup1.cupIndex = index2;
  cup2.cupIndex = index1;

  // Update ball position tracking
  if (ballPosition === index1) {
    ballPosition = index2;
  } else if (ballPosition === index2) {
    ballPosition = index1;
  }
}

// Shuffle the cups
async function shuffleCups() {
  isShuffling = true;
  updateInstructions("Shuffling...");

  for (let i = 0; i < SHUFFLE_COUNT; i++) {
    // Pick two different random cups to swap
    let idx1 = Math.floor(Math.random() * CUP_COUNT);
    let idx2;
    do {
      idx2 = Math.floor(Math.random() * CUP_COUNT);
    } while (idx2 === idx1);

    await swapCups(idx1, idx2);
  }

  isShuffling = false;
}

// Update score display
function updateScore() {
  const scoreText = ui.getChildByLabel("scoreText");
  scoreText.text = `Score: ${score} / ${gamesPlayed}`;
}

// Update instructions text
function updateInstructions(text) {
  const instructions = ui.getChildByLabel("instructions");
  instructions.text = text;
}

// Handle cup selection
async function selectCup(cupIndex) {
  if (!canSelect || isShuffling || isRevealing) return;

  canSelect = false;
  isRevealing = true;

  // Lift selected cup
  await liftCup(cupIndex);

  // Update ball position visually
  ball.x = cups[ballPosition].x;
  ball.visible = true;

  gamesPlayed++;

  if (cupIndex === ballPosition) {
    score++;
    updateInstructions("🎉 You found it! 🎉");
    // Flash effect for winning
    ball.tint = 0x00ff00;
    setTimeout(() => {
      ball.tint = 0xffffff;
    }, 300);
  } else {
    updateInstructions("❌ Wrong cup! The ball was here.");
    // Lift the correct cup too
    await liftCup(ballPosition);
  }

  updateScore();

  // Show play again button
  const playButton = ui.getChildByLabel("playButton");
  playButton.visible = true;
  playButton.getChildAt(1).text = "Play Again";

  isRevealing = false;
}

// Start a new game
async function startGame() {
  // Hide play button during game
  const playButton = ui.getChildByLabel("playButton");
  playButton.visible = false;

  // Reset cups to original positions
  for (let i = 0; i < CUP_COUNT; i++) {
    const startX =
      GAME_WIDTH / 2 - ((CUP_COUNT - 1) * CUP_SPACING) / 2 + i * CUP_SPACING;
    cups[i].x = startX;
    cups[i].y = CUP_Y;
    cups[i].cupIndex = i;
    cups[i].isLifted = false;
  }
  // Reset cups array order
  cups.sort((a, b) => a.x - b.x);
  for (let i = 0; i < cups.length; i++) {
    cups[i].cupIndex = i;
  }

  // Randomly place ball under a cup
  ballPosition = Math.floor(Math.random() * CUP_COUNT);
  ball.x = cups[ballPosition].x;
  ball.visible = true;
  ball.tint = 0xffffff;

  updateInstructions("Watch carefully where the ball is...");

  // Show the ball briefly
  await new Promise(r => setTimeout(r, 1500));

  // Lower cup over the ball
  updateInstructions("Now watch the cups shuffle...");
  await liftCup(ballPosition, true);
  await new Promise(r => setTimeout(r, 300));
  ball.visible = false;
  await lowerCup(ballPosition, true);

  await new Promise(r => setTimeout(r, 500));

  // Shuffle
  await shuffleCups();

  // Enable selection
  canSelect = true;
  updateInstructions("Click on a cup to reveal the ball!");
}

// Main initialization
async function init() {
  // Create the PixiJS application
  app = new Application();
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: "#2d5a27",
    antialias: true
  });

  // Expose app to PixiJS DevTools
  globalThis.__PIXI_APP__ = app;

  // Add canvas to container
  document.getElementById("game-container").appendChild(app.canvas);

  // Create felt table texture pattern
  const tableGraphics = new Graphics();
  tableGraphics.rect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  tableGraphics.fill({ color: 0x2d5a27 });

  // Add subtle table border
  tableGraphics.rect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);
  tableGraphics.stroke({ color: 0x1e3d1a, width: 8 });
  tableGraphics.rect(20, 20, GAME_WIDTH - 40, GAME_HEIGHT - 40);
  tableGraphics.stroke({ color: 0x3d7a37, width: 2 });

  app.stage.addChild(tableGraphics);

  // Create containers for game elements
  gameContainer = new Container();
  app.stage.addChild(gameContainer);

  // Initialize cups
  cupsContainer = new Container();

  for (let i = 0; i < CUP_COUNT; i++) {
    const cup = createCup(i);
    const startX =
      GAME_WIDTH / 2 - ((CUP_COUNT - 1) * CUP_SPACING) / 2 + i * CUP_SPACING;
    cup.x = startX;
    cup.y = CUP_Y;
    cup.pivot.set(0, CUP_HEIGHT);
    cups.push(cup);
    cupsContainer.addChild(cup);
  }

  // Create ball
  ball = createBall();
  ball.y = CUP_Y + 5;
  ball.visible = false;

  gameContainer.addChild(ball);
  gameContainer.addChild(cupsContainer);

  // Create UI
  ui = createUI();
  app.stage.addChild(ui);

  // Set up cup click handlers
  for (const cup of cups) {
    cup.eventMode = "static";
    cup.cursor = "pointer";
    cup.hitArea = new Rectangle(-CUP_WIDTH / 2, 0, CUP_WIDTH, CUP_HEIGHT);

    cup.on("pointerdown", () => {
      const currentIndex = cups.indexOf(cup);
      selectCup(currentIndex);
    });

    cup.on("pointerover", () => {
      if (canSelect && !isShuffling && !isRevealing) {
        cup.tint = 0xffddaa;
      }
    });

    cup.on("pointerout", () => {
      cup.tint = 0xffffff;
    });
  }

  // Set up play button handler
  const playButton = ui.getChildByLabel("playButton");
  playButton.on("pointerdown", startGame);
}

// Start the game
init();
