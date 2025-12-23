import { Container, Graphics, Text } from "pixi.js";
import { BettingState } from "./bettingState.js";

/**
 * Get currency display name from currency code
 * @param {string} code - Currency code (e.g., "USD", "EUR")
 * @returns {string} Currency display name
 */
function getCurrencyName(code) {
  const currencyNames = {
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP",
    BTC: "BTC"
  };
  return currencyNames[code] || code;
}

/**
 * Create a styled button for the betting panel
 * @param {string} text - Button label text
 * @param {number} width - Button width
 * @param {number} height - Button height
 * @param {number} color - Background color (hex)
 * @returns {Container} Button container with bg and label
 */
function createPanelButton(text, width, height, color = 0x333333) {
  const button = new Container();

  // Button background with rounded corners and border
  const bg = new Graphics();
  bg.roundRect(-width / 2, -height / 2, width, height, 5);
  bg.fill({ color });
  bg.roundRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2, 4);
  bg.stroke({ color: 0x666666, width: 1 });

  // Button label text (centered)
  const label = new Text({
    text: text,
    style: {
      fontFamily: "Arial",
      fontSize: height * 0.5,
      fontWeight: "bold",
      fill: 0xffffff
    }
  });
  label.anchor.set(0.5);

  button.addChild(bg);
  button.addChild(label);

  // Make button interactive
  button.eventMode = "static";
  button.cursor = "pointer";
  button.disabled = false;

  // Store references for later updates (text changes, color changes)
  button.bg = bg;
  button.label = label;

  // Method to enable/disable button visually
  button.setDisabled = disabled => {
    button.disabled = disabled;
    button.alpha = disabled ? 0.5 : 1;
    button.cursor = disabled ? "not-allowed" : "pointer";
  };

  // Hover effect: slight scale increase
  button.on("pointerover", () => {
    if (!button.disabled) {
      button.scale.set(1.05);
    }
  });

  // Return to normal scale on mouse leave
  button.on("pointerout", () => {
    button.scale.set(1.0);
  });

  return button;
}

/**
 * Create a text input field for entering bet amounts
 * Uses keyboard input for proper text editing
 * @param {number} width - Input field width
 * @param {number} height - Input field height
 * @param {string} placeholder - Placeholder text
 * @returns {Container} Input field container
 */
function createTextInput(width, height, placeholder = "") {
  const input = new Container();

  // Input background (dark with border)
  const bg = new Graphics();
  bg.roundRect(-width / 2, -height / 2, width, height, 5);
  bg.fill({ color: 0x222222 });
  bg.roundRect(-width / 2, -height / 2, width, height, 5);
  bg.stroke({ color: 0x666666, width: 1 });

  // Active state border (highlighted when focused)
  const activeBorder = new Graphics();
  activeBorder.roundRect(-width / 2, -height / 2, width, height, 5);
  activeBorder.stroke({ color: 0xffd700, width: 2 });
  activeBorder.visible = false;

  // Input value text (centered)
  const label = new Text({
    text: placeholder,
    style: {
      fontFamily: "Arial",
      fontSize: 16,
      fill: 0xffffff
    }
  });
  label.anchor.set(0.5);

  // Cursor blink indicator
  const cursor = new Graphics();
  cursor.rect(-1, -height / 4, 2, height / 2);
  cursor.fill({ color: 0xffd700 });
  cursor.visible = false;
  cursor.x = label.width / 2 + 5;

  input.addChild(bg);
  input.addChild(activeBorder);
  input.addChild(label);
  input.addChild(cursor);

  // Make input interactive
  input.eventMode = "static";
  input.cursor = "text";
  input.value = 0;
  input.label = label;
  input.disabled = false;
  input.isEditing = false;
  input.inputText = "";

  // Cursor blink animation
  let cursorBlink = null;

  // Method to update displayed value
  input.setValue = val => {
    input.value = val;
    input.label.text = val.toString();
    cursor.x = label.width / 2 + 5;
  };

  // Method to enable/disable input
  input.setDisabled = disabled => {
    input.disabled = disabled;
    input.alpha = disabled ? 0.5 : 1;
    input.cursor = disabled ? "not-allowed" : "text";
    if (disabled && input.isEditing) {
      // Exit edit mode if disabled
      input.isEditing = false;
      cursor.visible = false;
      activeBorder.visible = false;
      if (cursorBlink) clearInterval(cursorBlink);
    }
  };

  // Click handler: enter edit mode
  input.on("pointerdown", () => {
    if (!input.disabled) {
      input.isEditing = true;
      input.inputText = input.value > 0 ? input.value.toString() : "";
      label.text = input.inputText || "|";
      cursor.visible = true;
      activeBorder.visible = true;

      // Start cursor blink
      if (cursorBlink) clearInterval(cursorBlink);
      cursorBlink = setInterval(() => {
        cursor.visible = !cursor.visible;
      }, 500);
    }
  });

  // Keyboard input handling
  input.handleKeyPress = key => {
    if (!input.isEditing || input.disabled) return;

    if (key === "Enter") {
      // Confirm input
      const numValue = parseFloat(input.inputText) || 0;
      if (numValue >= 0) {
        input.value = numValue;
        input.label.text = numValue.toString();
        if (input.onValueChange) {
          input.onValueChange(numValue);
        }
      }
      input.isEditing = false;
      cursor.visible = false;
      activeBorder.visible = false;
      if (cursorBlink) clearInterval(cursorBlink);
    } else if (key === "Backspace") {
      // Remove last character
      input.inputText = input.inputText.slice(0, -1);
      label.text = input.inputText || "|";
      cursor.x = label.width / 2 + 5;
    } else if (key === "Escape") {
      // Cancel editing
      input.isEditing = false;
      label.text = input.value > 0 ? input.value.toString() : placeholder;
      cursor.visible = false;
      activeBorder.visible = false;
      if (cursorBlink) clearInterval(cursorBlink);
    } else if (/^[0-9.]$/.test(key)) {
      // Add number or decimal point
      // Prevent multiple decimal points
      if (key === "." && input.inputText.includes(".")) return;
      input.inputText += key;
      label.text = input.inputText;
      cursor.x = label.width / 2 + 5;
    }
  };

  return input;
}

/**
 * Create the balance section
 * @param {BettingState} state - Betting state instance
 * @param {Object} callbacks - Callback functions
 * @param {number} padding - Padding value
 * @returns {Container} Balance section container
 */
function createBalanceSection(state, callbacks, padding) {
  const balanceContainer = new Container();

  // "Balance:" label
  const balanceLabel = new Text({
    text: "Balance:",
    style: {
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xcccccc
    }
  });
  balanceLabel.x = padding;

  // Balance amount (gold colored, prominent)
  const balanceAmount = new Text({
    text: state.balance.toFixed(2),
    style: {
      fontFamily: "Arial",
      fontSize: 18,
      fontWeight: "bold",
      fill: 0xffd700
    }
  });
  balanceAmount.x = padding + 75;

  // Currency code display
  const currencyText = new Text({
    text: getCurrencyName(state.currency),
    style: {
      fontFamily: "Arial",
      fontSize: 12,
      fill: 0xcccccc
    }
  });
  currencyText.x = padding + 145;

  // Refresh button to reload balance from server
  const refreshBtn = createPanelButton("🔄", 30, 20);
  refreshBtn.x = padding + 200;
  refreshBtn.y = padding - 13;
  refreshBtn.on("pointerdown", () => {
    if (callbacks.onRefreshBalance) {
      callbacks.onRefreshBalance();
    }
  });

  balanceContainer.addChild(balanceLabel);
  balanceContainer.addChild(balanceAmount);
  balanceContainer.addChild(currencyText);
  balanceContainer.addChild(refreshBtn);

  // Store references for updates
  balanceContainer.balanceAmount = balanceAmount;
  balanceContainer.currencyText = currencyText;
  balanceContainer.refreshBtn = refreshBtn;

  return balanceContainer;
}

/**
 * Create the bet controls section (-, input, +)
 * @param {BettingState} state - Betting state instance
 * @param {number} panelWidth - Panel width
 * @returns {Container} Bet controls container
 */
function createBetControlsSection(state, panelWidth) {
  const betControlsContainer = new Container();

  const controlsWidth = 220;
  const controlsStartX = (panelWidth - controlsWidth) / 2;

  // Decrease bet button (minus)
  const decreaseBtn = createPanelButton("-", 40, 35);
  decreaseBtn.x = controlsStartX + 20;
  decreaseBtn.on("pointerdown", () => {
    if (!decreaseBtn.disabled) {
      state.decreaseBet();
    }
  });

  // Bet amount input (click to edit)
  const betInput = createTextInput(120, 35, "Amount");
  betInput.x = controlsStartX + 110;
  betInput.setValue(state.currentBetAmount);
  betInput.onValueChange = value => {
    state.setBetAmount(value);
  };

  // Increase bet button (plus)
  const increaseBtn = createPanelButton("+", 40, 35);
  increaseBtn.x = controlsStartX + 200;
  increaseBtn.on("pointerdown", () => {
    if (!increaseBtn.disabled) {
      state.increaseBet();
    }
  });

  betControlsContainer.addChild(decreaseBtn);
  betControlsContainer.addChild(betInput);
  betControlsContainer.addChild(increaseBtn);

  // Store references for updates
  betControlsContainer.decreaseBtn = decreaseBtn;
  betControlsContainer.betInput = betInput;
  betControlsContainer.increaseBtn = increaseBtn;

  return betControlsContainer;
}

/**
 * Create the quick bet buttons section
 * @param {BettingState} state - Betting state instance
 * @param {number} panelWidth - Panel width
 * @returns {Container} Quick bet buttons container
 */
function createQuickBetSection(state, panelWidth) {
  const quickBetContainer = new Container();

  const quickBetAmounts = [10, 50, 100];
  const buttonWidth = 60;
  const buttonSpacing = 8;
  const totalButtonsWidth = buttonWidth * 4 + buttonSpacing * 3;
  const quickBetStartX = (panelWidth - totalButtonsWidth) / 2;

  quickBetContainer.quickBtns = [];

  // Create buttons for each preset amount (10, 50, 100)
  quickBetAmounts.forEach((amount, index) => {
    const btn = createPanelButton(amount.toString(), buttonWidth, 30);
    btn.x =
      quickBetStartX + buttonWidth / 2 + index * (buttonWidth + buttonSpacing);
    btn.on("pointerdown", () => {
      if (!btn.disabled) {
        state.setBetAmount(amount);
      }
    });
    quickBetContainer.addChild(btn);
    quickBetContainer.quickBtns.push(btn);
  });

  // MAX button (sets bet to user's full balance) - blue colored
  const maxBtn = createPanelButton("MAX", buttonWidth, 30, 0x2a5298);
  maxBtn.x =
    quickBetStartX + buttonWidth / 2 + 3 * (buttonWidth + buttonSpacing);
  maxBtn.on("pointerdown", () => {
    if (!maxBtn.disabled) {
      state.setMaxBet();
    }
  });
  quickBetContainer.addChild(maxBtn);
  quickBetContainer.quickBtns.push(maxBtn);

  return quickBetContainer;
}

/**
 * Create the place bet button
 * @param {BettingState} state - Betting state instance
 * @param {Object} callbacks - Callback functions
 * @param {number} panelWidth - Panel width
 * @returns {Container} Place bet button container
 */
function createPlaceBetButton(state, callbacks, panelWidth) {
  const placeBetBtnWidth = Math.min(210, panelWidth - 40);
  const placeBetBtn = createPanelButton(
    `Place Bet: ${state.currentBetAmount} ${getCurrencyName(state.currency)}`,
    placeBetBtnWidth,
    35,
    0x22c55e
  );
  placeBetBtn.x = panelWidth / 2;

  // Click handler: validate and place bet
  placeBetBtn.on("pointerdown", () => {
    if (!placeBetBtn.disabled && state.canBet) {
      let betAmount = state.currentBetAmount;

      // Ensure minimum bet of 10
      if (!betAmount || betAmount < 1) {
        betAmount = 10;
        state.setBetAmount(betAmount);
      }

      // Call the onPlaceBet callback with bet data
      if (callbacks.onPlaceBet) {
        const betData = {
          session: state.userId,
          bet: betAmount,
          currency: state.currency
        };
        state.isBetting = true;
        callbacks.onPlaceBet(betData);
      }
    }
  });

  // Store button width for state updates
  placeBetBtn.btnWidth = placeBetBtnWidth;

  return placeBetBtn;
}

/**
 * Create the last bet display text
 * @param {number} panelWidth - Panel width
 * @returns {Text} Last bet text object
 */
function createLastBetDisplay(panelWidth) {
  const lastBetText = new Text({
    text: "",
    style: {
      fontFamily: "Arial",
      fontSize: 12,
      fill: 0x4ade80
    }
  });
  lastBetText.anchor.set(0.5, 0);
  lastBetText.x = panelWidth / 2;

  return lastBetText;
}

/**
 * Create the betting panel UI
 * @param {Application} app - PixiJS application instance
 * @param {Object} callbacks - Callback functions { onPlaceBet, onRefreshBalance }
 * @param {number} customWidth - Panel width (defaults to 280)
 * @returns {Container} Complete betting panel container
 */
export function createBettingPanel(app, callbacks = {}, customWidth = 280) {
  const panel = new Container();
  const state = new BettingState();

  // Panel dimensions
  const panelWidth = customWidth;
  const panelHeight = 120; // Reduced height for horizontal layout

  // Panel background: semi-transparent black with gold border
  const bg = new Graphics();
  bg.rect(0, 0, panelWidth, panelHeight, 10);
  bg.fill({ color: 0x000000, alpha: 0.8 });
  panel.addChild(bg);

  const padding = 20;

  /* ========================================
   * TOP SECTION - Balance and Refresh
   * ======================================== */
  const balanceSection = createBalanceSection(state, callbacks, padding);
  balanceSection.y = 15;
  panel.addChild(balanceSection);

  /* ========================================
   * BOTTOM SECTION - All betting controls in horizontal layout
   * ======================================== */
  const bottomSection = new Container();
  bottomSection.y = 55; // Position below balance

  let xOffset = padding;
  const spacing = 10;

  // 1. Decrease button
  const betControlsSection = createBetControlsSection(state, panelWidth);
  betControlsSection.decreaseBtn.x = xOffset + 20;
  betControlsSection.decreaseBtn.y = 20;
  bottomSection.addChild(betControlsSection.decreaseBtn);
  xOffset += 40 + spacing;

  // 2. Bet input
  betControlsSection.betInput.x = xOffset + 60;
  betControlsSection.betInput.y = 20;
  bottomSection.addChild(betControlsSection.betInput);
  xOffset += 120 + spacing;

  // 3. Increase button
  betControlsSection.increaseBtn.x = xOffset + 20;
  betControlsSection.increaseBtn.y = 20;
  bottomSection.addChild(betControlsSection.increaseBtn);
  xOffset += 40 + spacing;

  // 4. Quick bet buttons (10, 50, 100, MAX)
  const quickBetSection = createQuickBetSection(state, panelWidth);
  quickBetSection.quickBtns.forEach(btn => {
    btn.x = xOffset + 30;
    btn.y = 20;
    bottomSection.addChild(btn);
    xOffset += 60 + spacing;
  });

  // 5. Place bet button
  const placeBetBtn = createPlaceBetButton(state, callbacks, panelWidth);
  placeBetBtn.x = xOffset + 105;
  placeBetBtn.y = 20;
  bottomSection.addChild(placeBetBtn);

  panel.addChild(bottomSection);

  // Last bet display - below all controls
  const lastBetText = createLastBetDisplay(panelWidth);
  lastBetText.y = 90;
  panel.addChild(lastBetText);

  /* ========================================
   * KEYBOARD INPUT HANDLING
   * Route keyboard events to the active text input
   * ======================================== */
  const handleKeyDown = e => {
    if (betControlsSection.betInput.isEditing) {
      e.preventDefault();
      betControlsSection.betInput.handleKeyPress(e.key);
    }
  };

  // Add keyboard listener
  window.addEventListener("keydown", handleKeyDown);

  // Cleanup function (call this when removing the panel)
  panel.destroy = () => {
    window.removeEventListener("keydown", handleKeyDown);
  };

  /* ========================================
   * STATE CHANGE LISTENER
   * Subscribe to state updates and refresh UI
   * This ensures all UI elements stay in sync with state
   * ======================================== */
  state.subscribe(newState => {
    // Update balance display (amount and currency)
    balanceSection.balanceAmount.text = newState.balance.toFixed(2);
    balanceSection.currencyText.text = getCurrencyName(newState.currency);

    // Update bet amount input field
    betControlsSection.betInput.setValue(newState.currentBetAmount);

    // Update increment/decrement buttons (enabled/disabled based on state)
    betControlsSection.decreaseBtn.setDisabled(!newState.canDecrease);
    betControlsSection.increaseBtn.setDisabled(!newState.canIncrease);
    betControlsSection.betInput.setDisabled(newState.isBetting);
    balanceSection.refreshBtn.setDisabled(newState.isBetting);

    // Disable all quick bet buttons while betting is in progress
    if (quickBetSection.quickBtns) {
      quickBetSection.quickBtns.forEach(btn => {
        btn.setDisabled(newState.isBetting);
      });
    }

    // Update place bet button appearance and state
    placeBetBtn.setDisabled(!newState.canBet);
    const halfBtnWidth = placeBetBtn.btnWidth / 2;
    const halfBtnHeight = 35 / 2;

    if (newState.isBetting) {
      // Show "Placing..." with orange background during bet
      placeBetBtn.label.text = "Placing...";
      placeBetBtn.bg.clear();
      placeBetBtn.bg.roundRect(
        -halfBtnWidth,
        -halfBtnHeight,
        placeBetBtn.btnWidth,
        35,
        5
      );
      placeBetBtn.bg.fill({ color: 0xffa500 });
    } else {
      // Show "Place Bet: X USD" with green background when ready
      placeBetBtn.label.text = `Place Bet: ${
        newState.currentBetAmount
      } ${getCurrencyName(newState.currency)}`;
      placeBetBtn.bg.clear();
      placeBetBtn.bg.roundRect(
        -halfBtnWidth,
        -halfBtnHeight,
        placeBetBtn.btnWidth,
        35,
        5
      );
      placeBetBtn.bg.fill({ color: 0x22c55e });
    }

    // Update last bet display
    if (newState.lastBet) {
      lastBetText.text = `Last Bet: ${newState.lastBet.bet} ${getCurrencyName(
        newState.currency
      )}`;
    } else {
      lastBetText.text = "";
    }
  });

  /* ========================================
   * PUBLIC API
   * Expose state and helper methods for external control
   * These methods allow main.js to interact with the panel
   * ======================================== */

  // Direct access to internal state
  panel.state = state;

  /**
   * Update user's balance and currency
   * @param {number} balance - New balance amount
   * @param {string} currency - Currency code (optional)
   */
  panel.updateBalance = (balance, currency) => {
    state.updateBalance(balance, currency);
  };

  /**
   * Confirm bet was placed successfully
   * @param {Object} betData - Bet data returned from server
   */
  panel.confirmBet = betData => {
    state.lastBet = betData;
    state.isBetting = false;
    state.notify();
  };

  /**
   * Handle bet error (resets betting state)
   */
  panel.betError = () => {
    state.isBetting = false;
    state.notify();
  };

  /**
   * Set the user's session ID
   * @param {string} id - User session ID
   */
  panel.setUserId = id => {
    state.userId = id;
  };

  /**
   * Update connection status
   * @param {boolean} connected - Whether connected to server
   */
  panel.setConnected = connected => {
    state.isConnected = connected;
    state.notify();
  };

  return panel;
}
