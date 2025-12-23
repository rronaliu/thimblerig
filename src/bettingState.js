/**
 * Betting Panel State Management
 * Mimics the Vue Pinia store functionality for managing betting state
 * Includes observer pattern for reactive UI updates
 */
export class BettingState {
  constructor() {
    // Authentication state
    this.sessionToken = null;
    this.userId = null;
    this.providerId = null;

    // User's current balance
    this.balance = 1000;

    // Currency code (USD, EUR, etc.)
    this.currency = "USD";

    // Current bet amount selected by user
    this.currentBetAmount = 0;

    // Whether a bet is currently being placed
    this.isBetting = false;

    // Last bet information (for display)
    this.lastBet = null;

    // Connection status to backend/socket
    this.isConnected = true;
    this.connectionError = null;

    // Observer pattern: list of callback functions to notify on state change
    this.listeners = [];
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Function to call when state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers of state change
   */
  notify() {
    this.listeners.forEach(callback => callback(this));
  }

  /**
   * Update user's balance and optionally currency
   * Sets default bet amount if current bet is 0
   */
  updateBalance(balance, currency = null) {
    this.balance = balance;
    if (currency) this.currency = currency;

    // Auto-set default bet amount when balance is first loaded
    if (this.currentBetAmount === 0 && balance > 0) {
      this.currentBetAmount = Math.min(10, balance);
    }
    this.notify();
  }

  /**
   * Set bet amount (clamped between 0 and balance)
   */
  setBetAmount(amount) {
    this.currentBetAmount = Math.max(0, Math.min(amount, this.balance));
    this.notify();
  }

  /**
   * Increase current bet by amount (default 10)
   */
  increaseBet(amount = 10) {
    this.setBetAmount(this.currentBetAmount + amount);
  }

  /**
   * Decrease current bet by amount (default 10)
   */
  decreaseBet(amount = 10) {
    this.setBetAmount(this.currentBetAmount - amount);
  }

  /**
   * Set bet amount to maximum (user's balance)
   */
  setMaxBet() {
    this.setBetAmount(this.balance);
  }

  /**
   * Computed: whether user is authenticated
   */
  get isAuthenticated() {
    // return !!this.sessionToken;
    return true;
  }

  /**
   * Computed: whether user can place a bet
   * Checks authentication, connection, balance, bet amount, and betting state
   */
  get canBet() {
    return (
      this.isAuthenticated &&
      this.isConnected &&
      this.balance > 0 &&
      this.currentBetAmount > 0 &&
      this.currentBetAmount <= this.balance &&
      !this.isBetting
    );
  }

  /**
   * Computed: whether user can increase bet amount
   */
  get canIncrease() {
    return !this.isBetting && this.currentBetAmount < this.balance;
  }

  /**
   * Computed: whether user can decrease bet amount
   */
  get canDecrease() {
    return !this.isBetting && this.currentBetAmount > 0;
  }

  /**
   * Set session token for authentication
   * @param {string} token - Session token (JWT)
   */
  setSession(token) {
    this.sessionToken = token;
    this.notify();
    // TODO: Backend should handle JWT validation and user info
  }

  /**
   * Set user identity information
   * @param {Object} data - Identity data
   * @param {string} data.id - User ID
   * @param {string} data.providerId - Provider ID
   * @param {string} data.currency - Currency code
   */
  setIdentity({ id, providerId, currency: currencyCode }) {
    if (id) this.userId = id;
    if (providerId !== undefined) this.providerId = providerId;
    if (currencyCode) {
      // TODO: Add currency normalization if needed
      this.currency = currencyCode;
    }
    this.notify();
  }

  /**
   * Start betting process (marks bet as in-progress)
   */
  startBetting() {
    this.isBetting = true;
    this.notify();
  }

  /**
   * Confirm bet was placed successfully
   * @param {Object} betData - Bet confirmation data
   */
  confirmBet(betData) {
    this.lastBet = betData;
    this.isBetting = false;
    this.notify();
  }

  /**
   * Handle bet error
   * @param {Error|string} error - Error that occurred
   */
  betError(error) {
    this.isBetting = false;
    console.error("Bet error:", error);
    this.notify();
  }

  /**
   * Set connection status
   * @param {boolean} connected - Whether connected to backend/socket
   */
  setConnected(connected) {
    this.isConnected = connected;
    if (connected) {
      this.connectionError = null;
    }
    this.notify();
  }

  /**
   * Set connection error
   * @param {Error|string} error - Connection error
   */
  setConnectionError(error) {
    this.connectionError = error;
    this.isConnected = false;
    this.notify();
  }
}
