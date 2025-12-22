import {
  Application,
  Container,
  Graphics,
  Text,
  Rectangle,
  Assets,
  Sprite
} from "pixi.js";

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const CUP_COUNT = 3;
const CUP_WIDTH = 90;
const CUP_HEIGHT = 130;
const CUP_SPACING = 160;
const CUP_Y = 550;
const BALL_RADIUS = 40;
const SHUFFLE_SPEED = 170; // ms per swap (faster!)
const SHUFFLE_COUNT = 10;

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
let afterimages = []; // For motion blur effect

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
function createBall(texture) {
  if (texture) {
    // Use texture-based ball
    const ballSprite = new Sprite(texture);

    // Scale the ball (texture is 544x459, make it fit BALL_RADIUS * 2)
    const ballSize = BALL_RADIUS * 2;
    ballSprite.width = ballSize;
    ballSprite.height = ballSize;
    ballSprite.anchor.set(0.5, 0.5); // Center anchor

    return ballSprite;
  }

  // Fallback to graphics-based ball
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
function createCup(index, texture) {
  const cupContainer = new Container();

  if (texture) {
    // Use texture-based cup
    const cupSprite = new Sprite(texture);

    // Scale the sprite larger (texture is 488x511, scale it to be more visible)
    // Make it 1.5x larger than the original CUP_WIDTH/HEIGHT
    const scaledWidth = CUP_WIDTH * 1.8;
    const scaledHeight = CUP_HEIGHT * 1.8;

    cupSprite.width = scaledWidth;
    cupSprite.height = scaledHeight;
    cupSprite.anchor.set(0.5, 1); // Anchor at bottom center
    cupSprite.y = 0; // Position at container origin

    cupContainer.addChild(cupSprite);

    // Store cup data
    cupContainer.cupIndex = index;
    cupContainer.isLifted = false;
    cupContainer.originalY = CUP_Y;

    // Add glow effect at the bottom (adjusted for larger cup)
    const glow = new Graphics();
    glow.ellipse(0, -5, scaledWidth * 0.5, 22);
    glow.fill({ color: 0x22ff22, alpha: 0.3 });
    glow.ellipse(0, -7, scaledWidth * 0.42, 18);
    glow.fill({ color: 0x44ff44, alpha: 0.4 });
    glow.ellipse(0, -9, scaledWidth * 0.32, 14);
    glow.fill({ color: 0x66ff66, alpha: 0.55 });
    glow.ellipse(0, -11, scaledWidth * 0.22, 10);
    glow.fill({ color: 0x99ff99, alpha: 0.7 });
    glow.visible = false;
    glow.label = "glow";
    cupContainer.addChildAt(glow, 0);

    return cupContainer;
  }

  // Cup body (trapezoid shape using graphics)
  const cup = new Graphics();

  // Cup shadow
  cup.ellipse(0, CUP_HEIGHT - 10, CUP_WIDTH * 0.5 + 5, 20);
  cup.fill({ color: 0x000000, alpha: 0.3 });

  // Main cup body - trapezoid
  const cupPath = [
    -CUP_WIDTH * 0.35,
    0,
    CUP_WIDTH * 0.35,
    0,
    CUP_WIDTH * 0.5,
    CUP_HEIGHT - 15,
    -CUP_WIDTH * 0.5,
    CUP_HEIGHT - 15
  ];
  cup.poly(cupPath);
  cup.fill({ color: 0x8b4513 });

  // Bottom rounded rim (ellipse)
  cup.ellipse(0, CUP_HEIGHT - 15, CUP_WIDTH * 0.5, 15);
  cup.fill({ color: 0x8b4513 });

  // Bottom rim edge highlight
  cup.ellipse(0, CUP_HEIGHT - 15, CUP_WIDTH * 0.5, 15);
  cup.stroke({ color: 0x654321, width: 2 });

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
    -CUP_WIDTH * 0.4,
    CUP_HEIGHT - 15,
    -CUP_WIDTH * 0.5,
    CUP_HEIGHT - 15
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
    CUP_HEIGHT - 15,
    CUP_WIDTH * 0.4,
    CUP_HEIGHT - 15
  ];
  cup.poly(shadowPath);
  cup.fill({ color: 0x5c3317, alpha: 0.5 });

  cupContainer.addChild(cup);

  // Create green glow effect for hover (initially hidden)
  // Positioned at the bottom rim of the cup to look like light from inside/under
  const glow = new Graphics();
  // Outer glow - wide spread on the ground
  glow.ellipse(0, CUP_HEIGHT - 10, CUP_WIDTH * 0.6, 20);
  glow.fill({ color: 0x22ff22, alpha: 0.3 });
  // Middle glow
  glow.ellipse(0, CUP_HEIGHT - 12, CUP_WIDTH * 0.48, 16);
  glow.fill({ color: 0x44ff44, alpha: 0.4 });
  // Inner bright core at the rim edge
  glow.ellipse(0, CUP_HEIGHT - 14, CUP_WIDTH * 0.35, 12);
  glow.fill({ color: 0x66ff66, alpha: 0.55 });
  // Brightest center
  glow.ellipse(0, CUP_HEIGHT - 15, CUP_WIDTH * 0.22, 8);
  glow.fill({ color: 0x99ff99, alpha: 0.7 });
  glow.visible = false;
  glow.label = "glow";
  cupContainer.addChildAt(glow, 0); // Add behind the cup graphics

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

// Create an afterimage of a cup
function createAfterimage(cup) {
  const ghost = new Graphics();

  // Use scaled dimensions to match the textured cups (1.8x scale)
  const scaledWidth = CUP_WIDTH * 1.8;
  const scaledHeight = CUP_HEIGHT * 1.8;

  // Simplified cup shape for afterimage (matching scaled cup)
  const cupPath = [
    -scaledWidth * 0.35,
    0,
    scaledWidth * 0.35,
    0,
    scaledWidth * 0.5,
    scaledHeight - 27,
    -scaledWidth * 0.5,
    scaledHeight - 27
  ];
  ghost.poly(cupPath);
  ghost.fill({ color: 0x8b4513, alpha: 0.4 });
  // Bottom rounded rim
  ghost.ellipse(0, scaledHeight - 27, scaledWidth * 0.5, 27);
  ghost.fill({ color: 0x8b4513, alpha: 0.4 });
  // Top rim
  ghost.ellipse(0, 0, scaledWidth * 0.35, 22);
  ghost.fill({ color: 0x654321, alpha: 0.4 });

  ghost.x = cup.x;
  ghost.y = cup.y;
  ghost.pivot.set(0, scaledHeight);

  cupsContainer.addChildAt(ghost, 0); // Add behind cups
  afterimages.push(ghost);

  // Fade out and remove
  let alpha = 0.5;
  const fade = delta => {
    alpha -= delta.deltaTime * 0.06;
    ghost.alpha = alpha;
    if (alpha <= 0) {
      app.ticker.remove(fade);
      cupsContainer.removeChild(ghost);
      ghost.destroy();
      const idx = afterimages.indexOf(ghost);
      if (idx > -1) afterimages.splice(idx, 1);
    }
  };
  app.ticker.add(fade);
}

// Swap two cups with animation
async function swapCups(index1, index2) {
  const cup1 = cups[index1];
  const cup2 = cups[index2];

  const x1 = cup1.x;
  const x2 = cup2.x;

  // Move cups in an arc
  const midY = CUP_Y - 60;

  // Create afterimages during animation
  // let trailInterval = setInterval(() => {
  //   createAfterimage(cup1);
  //   createAfterimage(cup2);
  // }, 25);

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

  // clearInterval(trailInterval);

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

  // Show ball at its actual position before lifting cup
  ball.x = cups[ballPosition].x;
  ball.visible = true;

  // Small delay to let the ball appear before cup lifts
  await new Promise(r => setTimeout(r, 50));

  // Lift selected cup
  await liftCup(cupIndex);

  gamesPlayed++;

  if (cupIndex === ballPosition) {
    score++;
    updateInstructions("🎉 You found it! 🎉");
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

  // Only randomize ball position on first game
  // Otherwise, keep it where it was last revealed
  if (gamesPlayed === 0) {
    ballPosition = Math.floor(Math.random() * CUP_COUNT);
  }
  // Update ball x position to match the cup at ballPosition
  // (cups may have been reset to original positions)
  ball.x = cups[ballPosition].x;
  ball.tint = 0xffffff;

  updateInstructions("Watch carefully where the ball is...");

  // Lift cup to show the ball
  await liftCup(ballPosition, true);
  await new Promise(r => setTimeout(r, 1500));

  // Lower cup over the ball
  updateInstructions("Now watch the cups shuffle...");
  await lowerCup(ballPosition, true);

  await new Promise(r => setTimeout(r, 500));

  // Hide ball right before shuffle starts
  ball.visible = false;

  // Shuffle
  await shuffleCups();

  // Enable selection
  canSelect = true;
  updateInstructions("Click on a cup to reveal the ball!");
}

// Resize handler for responsive scaling
function resize() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // Calculate scale to fit screen while maintaining aspect ratio
  const scale = Math.min(windowWidth / GAME_WIDTH, windowHeight / GAME_HEIGHT);

  // Apply scaled dimensions
  const newWidth = Math.floor(GAME_WIDTH * scale);
  const newHeight = Math.floor(GAME_HEIGHT * scale);

  app.renderer.resize(GAME_WIDTH, GAME_HEIGHT);
  app.canvas.style.width = `${newWidth}px`;
  app.canvas.style.height = `${newHeight}px`;
}

// Main initialization
async function init() {
  // Create the PixiJS application
  app = new Application();
  let backgroundTexture;
  let cupTexture;
  let ballTexture;
  try {
    backgroundTexture = await Assets.load("assets/Background/background.png");
    cupTexture = await Assets.load("assets/Cup/wooden-cup.png");
    ballTexture = await Assets.load("assets/Ball/ball.png");
    console.log("Textures loaded successfully!");
  } catch (error) {
    console.error("Texture failed to load, falling back to graphics:", error);
  }
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: "#2d5a27",
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  });

  // Expose app to PixiJS DevTools
  globalThis.__PIXI_APP__ = app;

  // Add canvas to container
  document.getElementById("game-container").appendChild(app.canvas);

  // Set up responsive resizing
  window.addEventListener("resize", resize);
  resize();

  // Create a container specifically for the background
  const tableContainer = new Container();
  app.stage.addChild(tableContainer);

  // Add background texture
  if (backgroundTexture) {
    const bgSprite = new Sprite(backgroundTexture);
    bgSprite.width = GAME_WIDTH;
    bgSprite.height = GAME_HEIGHT;
    tableContainer.addChild(bgSprite);
  }

  // Draw your green felt and borders on top of or instead of the texture
  const tableGraphics = new Graphics();
  tableGraphics.rect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  // If you want to see the bricks, use a low alpha here or skip the fill
  //   tableGraphics.fill({ color: 0x7a7a7a, alpha: 0.5 });

  // Add subtle table border
  tableGraphics.rect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  tableGraphics.stroke({ color: 0x7a7a7a, width: 8 });

  tableContainer.addChild(tableGraphics);

  // Create containers for game elements
  gameContainer = new Container();
  app.stage.addChild(gameContainer);

  // Initialize cups
  cupsContainer = new Container();

  for (let i = 0; i < CUP_COUNT; i++) {
    const cup = createCup(i, cupTexture);
    const startX =
      GAME_WIDTH / 2 - ((CUP_COUNT - 1) * CUP_SPACING) / 2 + i * CUP_SPACING;
    cup.x = startX;
    cup.y = CUP_Y;
    cup.pivot.set(0, CUP_HEIGHT);
    cups.push(cup);
    cupsContainer.addChild(cup);
  }

  // Create ball
  ball = createBall(ballTexture);
  ball.y = CUP_Y - 220; // Position higher so it's inside the cup (adjusted for CUP_Y = 600)
  ball.visible = true;

  // Randomly place ball under a cup initially
  ballPosition = Math.floor(Math.random() * CUP_COUNT);
  ball.x = cups[ballPosition].x;

  gameContainer.addChild(ball);
  gameContainer.addChild(cupsContainer);

  // Create UI
  ui = createUI();
  app.stage.addChild(ui);

  // Set up cup click handlers
  for (const cup of cups) {
    cup.eventMode = "static";
    cup.cursor = "pointer";
    // Adjust hitArea for the larger textured cups (1.8x scale)
    const hitWidth = CUP_WIDTH * 1.8;
    const hitHeight = CUP_HEIGHT * 1.8;
    cup.hitArea = new Rectangle(-hitWidth / 2, -hitHeight, hitWidth, hitHeight);

    cup.on("pointerdown", () => {
      const currentIndex = cups.indexOf(cup);
      const glow = cup.getChildByLabel("glow");
      if (glow) glow.visible = false;
      selectCup(currentIndex);
    });

    cup.on("pointerover", () => {
      if (canSelect && !isShuffling && !isRevealing) {
        cup.tint = 0xffddaa;
        const glow = cup.getChildByLabel("glow");
        if (glow) glow.visible = true;
      }
    });

    cup.on("pointerout", () => {
      cup.tint = 0xffffff;
      const glow = cup.getChildByLabel("glow");
      if (glow) glow.visible = false;
    });
  }

  // Set up play button handler
  const playButton = ui.getChildByLabel("playButton");
  playButton.on("pointerdown", startGame);
}

// Start the game
init();
