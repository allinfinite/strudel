// muse.mjs - Muse 2 EEG brainwave sensor integration for Strudel
// Receives OSC signals from Mind Monitor app and exposes them as Strudel signals

import { signal } from '@strudel/core';
import OSC from 'osc-js';

/**
 * Muse 2 Brainwave Handler
 * Connects to the Strudel OSC bridge to receive Mind Monitor data
 * 
 * Mind Monitor OSC addresses:
 * - /muse/elements/delta_relative (0.5-4 Hz) - Deep sleep, healing
 * - /muse/elements/theta_relative (4-8 Hz) - Meditation, creativity
 * - /muse/elements/alpha_relative (8-12 Hz) - Relaxed focus
 * - /muse/elements/beta_relative (12-30 Hz) - Active thinking
 * - /muse/elements/gamma_relative (30+ Hz) - High-level cognition
 * - /muse/blink - Blink detection
 * - /muse/jaw_clench - Jaw clench detection
 * - /muse/acc - Accelerometer data
 * - /muse/gyro - Gyroscope data
 */

class MuseHandler {
  constructor() {
    // Raw brainwave values (0-1 range from Mind Monitor relative bands)
    this._delta = 0;
    this._theta = 0;
    this._alpha = 0;
    this._beta = 0;
    this._gamma = 0;
    
    // Smoothed values for audio control
    this._deltaSmooth = 0;
    this._thetaSmooth = 0;
    this._alphaSmooth = 0;
    this._betaSmooth = 0;
    this._gammaSmooth = 0;
    
    // Auxiliary signals
    this._blink = 0;
    this._jawClench = 0;
    this._touching = false; // Headband on forehead
    
    // Accelerometer/Gyro
    this._accX = 0;
    this._accY = 0;
    this._accZ = 0;
    this._gyroX = 0;
    this._gyroY = 0;
    this._gyroZ = 0;
    
    // Connection state
    this._connected = false;
    this._lastUpdate = 0;
    this._connectionQuality = 0; // 0-1 based on signal quality
    
    // Derived states
    this._dominantWave = 'alpha';
    this._relaxationIndex = 0; // (alpha + theta) / (beta + gamma)
    this._meditationIndex = 0; // theta / alpha
    this._focusIndex = 0; // beta / (alpha + theta)
    
    // Smoothing factor (0-1, higher = smoother but slower response)
    this.smoothingFactor = 0.85;
    
    // OSC connection
    this.osc = null;
    this.reconnectInterval = null;
    
    // Event callbacks
    this.onConnect = null;
    this.onDisconnect = null;
    this.onBlink = null;
    this.onJawClench = null;
    this.onStateChange = null;
    
    // History for visualization
    this._history = {
      delta: [],
      theta: [],
      alpha: [],
      beta: [],
      gamma: []
    };
    this.historyLength = 256;
    
    this.isInitialized = false;
  }
  
  /**
   * Connect to the Strudel OSC bridge WebSocket server
   * @param {string} url - WebSocket URL (default: ws://localhost:8080)
   */
  async connect(url = 'ws://localhost:8080') {
    if (this.osc) {
      console.log('[Muse] Already connected');
      return;
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Use osc-js to handle binary OSC message decoding
        this.osc = new OSC({
          plugin: new OSC.WebsocketClientPlugin({ url })
        });
        
        this.osc.on('open', () => {
          console.log('[Muse] Connected to OSC bridge');
          this._connected = true;
          this.isInitialized = true;
          this.onConnect?.();
          resolve();
        });
        
        this.osc.on('close', () => {
          console.log('[Muse] Disconnected from OSC bridge');
          this._connected = false;
          this.osc = null;
          this.onDisconnect?.();
          
          // Auto-reconnect after 3 seconds
          if (!this.reconnectInterval) {
            this.reconnectInterval = setTimeout(() => {
              this.reconnectInterval = null;
              if (!this._connected) {
                console.log('[Muse] Attempting to reconnect...');
                this.connect(url).catch(() => {});
              }
            }, 3000);
          }
        });
        
        this.osc.on('error', (error) => {
          console.error('[Muse] OSC error:', error);
          reject(error);
        });
        
        // Listen for all OSC messages
        this.osc.on('*', (message) => {
          console.log('[Muse] OSC message via *:', message);
          this.handleOSCMessage(message);
        });
        
        // Also listen for specific Muse addresses
        this.osc.on('/muse/*', (message) => {
          console.log('[Muse] OSC message via /muse/*:', message);
          this.handleOSCMessage(message);
        });
        
        this.osc.open();
        
        // Debug: add raw socket listener after open
        setTimeout(() => {
          const socket = this.osc?.options?.plugin?.socket;
          if (socket) {
            console.log('[Muse] Socket state:', socket.readyState);
            const originalOnMessage = socket.onmessage;
            socket.onmessage = (event) => {
              console.log('[Muse] Raw WebSocket data received:', event.data?.byteLength || event.data?.length, 'bytes');
              if (originalOnMessage) originalOnMessage.call(socket, event);
            };
          } else {
            console.log('[Muse] Could not access socket for debugging');
          }
        }, 500);
        
      } catch (error) {
        console.error('[Muse] Connection failed:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from OSC bridge
   */
  disconnect() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.osc) {
      this.osc.close();
      this.osc = null;
    }
    
    this._connected = false;
    this.isInitialized = false;
  }
  
  /**
   * Parse incoming OSC message from the bridge
   */
  handleOSCMessage(message) {
    try {
      // osc-js passes message objects with address and args
      const address = message.address;
      const args = message.args;
      
      if (!address) return;
      
      // Debug: log first few messages
      if (this._messageCount === undefined) this._messageCount = 0;
      if (this._messageCount < 5) {
        console.log('[Muse] Received:', address, args);
        this._messageCount++;
      }
      
      this._lastUpdate = Date.now();
      
      // Handle different OSC addresses from Mind Monitor
      switch (address) {
        // Relative band powers (0-1 range, most useful for music)
        case '/muse/elements/delta_relative':
          this.updateBand('delta', this.parseValue(args));
          break;
        case '/muse/elements/theta_relative':
          this.updateBand('theta', this.parseValue(args));
          break;
        case '/muse/elements/alpha_relative':
          this.updateBand('alpha', this.parseValue(args));
          break;
        case '/muse/elements/beta_relative':
          this.updateBand('beta', this.parseValue(args));
          break;
        case '/muse/elements/gamma_relative':
          this.updateBand('gamma', this.parseValue(args));
          break;
          
        // Absolute band powers (log scale, less useful for direct mapping)
        case '/muse/elements/delta_absolute':
        case '/muse/elements/theta_absolute':
        case '/muse/elements/alpha_absolute':
        case '/muse/elements/beta_absolute':
        case '/muse/elements/gamma_absolute':
          // Ignored - we use relative values
          break;
          
        // Blink detection
        case '/muse/blink':
          this._blink = this.parseValue(args) > 0 ? 1 : 0;
          if (this._blink) {
            this.onBlink?.();
          }
          break;
          
        // Jaw clench detection
        case '/muse/jaw_clench':
          this._jawClench = this.parseValue(args) > 0 ? 1 : 0;
          if (this._jawClench) {
            this.onJawClench?.();
          }
          break;
          
        // Accelerometer
        case '/muse/acc':
          if (Array.isArray(args) && args.length >= 3) {
            this._accX = args[0];
            this._accY = args[1];
            this._accZ = args[2];
          }
          break;
          
        // Gyroscope
        case '/muse/gyro':
          if (Array.isArray(args) && args.length >= 3) {
            this._gyroX = args[0];
            this._gyroY = args[1];
            this._gyroZ = args[2];
          }
          break;
          
        // Headband status indicator (HSI)
        case '/muse/elements/horseshoe':
          // Values: 1=good, 2=ok, 4=bad for each sensor
          if (Array.isArray(args) && args.length >= 4) {
            const quality = args.reduce((sum, v) => sum + (v === 1 ? 1 : v === 2 ? 0.5 : 0), 0) / 4;
            this._connectionQuality = quality;
            this._touching = quality > 0.25;
          }
          break;
          
        // Touching forehead indicator
        case '/muse/elements/touching_forehead':
          this._touching = this.parseValue(args) > 0;
          break;
      }
      
    } catch (error) {
      // Silently ignore parse errors for non-JSON messages
    }
  }
  
  /**
   * Parse a value from OSC args (handles arrays and single values)
   */
  parseValue(args) {
    if (Array.isArray(args)) {
      // Average all sensor values (Mind Monitor sends 4 values for each band)
      const valid = args.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
      if (valid.length === 0) return 0;
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    }
    return typeof args === 'number' ? args : 0;
  }
  
  /**
   * Update a brainwave band with smoothing
   */
  updateBand(band, value) {
    // Clamp to 0-1 range
    value = Math.max(0, Math.min(1, value));
    
    // Update raw value
    this[`_${band}`] = value;
    
    // Apply exponential smoothing
    const smoothKey = `_${band}Smooth`;
    this[smoothKey] = this[smoothKey] * this.smoothingFactor + value * (1 - this.smoothingFactor);
    
    // Update history for visualization
    this._history[band].push(value);
    if (this._history[band].length > this.historyLength) {
      this._history[band].shift();
    }
    
    // Update derived states
    this.updateDerivedStates();
  }
  
  /**
   * Calculate derived brain states from raw values
   */
  updateDerivedStates() {
    const d = this._deltaSmooth;
    const t = this._thetaSmooth;
    const a = this._alphaSmooth;
    const b = this._betaSmooth;
    const g = this._gammaSmooth;
    
    // Find dominant wave
    const waves = { delta: d, theta: t, alpha: a, beta: b, gamma: g };
    const oldDominant = this._dominantWave;
    this._dominantWave = Object.entries(waves).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    
    if (oldDominant !== this._dominantWave) {
      this.onStateChange?.(this._dominantWave, oldDominant);
    }
    
    // Relaxation index: higher alpha+theta vs beta+gamma = more relaxed
    const relaxNum = a + t;
    const relaxDen = b + g + 0.001; // Prevent division by zero
    this._relaxationIndex = Math.min(relaxNum / relaxDen, 2) / 2; // Normalize to 0-1
    
    // Meditation index: theta prominence indicates deep meditation
    this._meditationIndex = t / (a + 0.001);
    this._meditationIndex = Math.min(this._meditationIndex, 2) / 2;
    
    // Focus index: beta prominence indicates concentration
    this._focusIndex = b / (a + t + 0.001);
    this._focusIndex = Math.min(this._focusIndex, 2) / 2;
  }
  
  /**
   * Get current brain state as a string
   */
  getBrainState() {
    if (!this._connected || !this._touching) {
      return 'disconnected';
    }
    
    const r = this._relaxationIndex;
    const m = this._meditationIndex;
    const f = this._focusIndex;
    
    if (this._deltaSmooth > 0.4) return 'deep';
    if (m > 0.6) return 'meditative';
    if (r > 0.6) return 'relaxed';
    if (f > 0.6) return 'focused';
    return 'neutral';
  }
  
  /**
   * Check if still receiving data (connection health)
   */
  isReceivingData() {
    return Date.now() - this._lastUpdate < 2000;
  }
  
  // Getters for raw values
  get delta() { return this._delta; }
  get theta() { return this._theta; }
  get alpha() { return this._alpha; }
  get beta() { return this._beta; }
  get gamma() { return this._gamma; }
  
  // Getters for smoothed values
  get deltaSmooth() { return this._deltaSmooth; }
  get thetaSmooth() { return this._thetaSmooth; }
  get alphaSmooth() { return this._alphaSmooth; }
  get betaSmooth() { return this._betaSmooth; }
  get gammaSmooth() { return this._gammaSmooth; }
  
  // Getters for derived states
  get dominantWave() { return this._dominantWave; }
  get relaxationIndex() { return this._relaxationIndex; }
  get meditationIndex() { return this._meditationIndex; }
  get focusIndex() { return this._focusIndex; }
  get connectionQuality() { return this._connectionQuality; }
  get connected() { return this._connected && this.isReceivingData(); }
  get touching() { return this._touching; }
  
  // Getters for auxiliary signals
  get blink() { return this._blink; }
  get jawClench() { return this._jawClench; }
  get accX() { return this._accX; }
  get accY() { return this._accY; }
  get accZ() { return this._accZ; }
  
  // Get history for visualization
  getHistory(band) {
    return this._history[band] || [];
  }
  
  // Get all smoothed values as object
  getAllBands() {
    return {
      delta: this._deltaSmooth,
      theta: this._thetaSmooth,
      alpha: this._alphaSmooth,
      beta: this._betaSmooth,
      gamma: this._gammaSmooth
    };
  }
}

// Create singleton instance
const muse = new MuseHandler();

// Make globally accessible
if (typeof window !== 'undefined') {
  window.muse = muse;
}

// Export instance
export { muse };

// Export connection functions
export async function enableMuse(url = 'ws://localhost:8080') {
  await muse.connect(url);
  console.log('[Muse] Enabled - waiting for Mind Monitor data...');
  console.log('[Muse] Make sure Mind Monitor is sending to this computer on port 57121');
  return signal(() => muse.connected ? 1 : 0);
}

export function disableMuse() {
  muse.disconnect();
  console.log('[Muse] Disabled');
}

// Export Strudel signals for brainwave bands (smoothed)
export const museDelta = signal(() => muse.isInitialized ? muse._deltaSmooth : 0);
export const museTheta = signal(() => muse.isInitialized ? muse._thetaSmooth : 0);
export const museAlpha = signal(() => muse.isInitialized ? muse._alphaSmooth : 0);
export const museBeta = signal(() => muse.isInitialized ? muse._betaSmooth : 0);
export const museGamma = signal(() => muse.isInitialized ? muse._gammaSmooth : 0);

// Export raw (unsmoothed) signals
export const museDeltaRaw = signal(() => muse.isInitialized ? muse._delta : 0);
export const museThetaRaw = signal(() => muse.isInitialized ? muse._theta : 0);
export const museAlphaRaw = signal(() => muse.isInitialized ? muse._alpha : 0);
export const museBetaRaw = signal(() => muse.isInitialized ? muse._beta : 0);
export const museGammaRaw = signal(() => muse.isInitialized ? muse._gamma : 0);

// Export derived state signals
export const museRelaxation = signal(() => muse.isInitialized ? muse._relaxationIndex : 0.5);
export const museMeditation = signal(() => muse.isInitialized ? muse._meditationIndex : 0);
export const museFocus = signal(() => muse.isInitialized ? muse._focusIndex : 0);

// Export trigger signals
export const museBlink = signal(() => muse._blink);
export const museJawClench = signal(() => muse._jawClench);

// Export connection status
export const museConnected = signal(() => muse.connected ? 1 : 0);
export const museQuality = signal(() => muse._connectionQuality);

// Composite signals for common use cases

/**
 * Deep relaxation signal - combines delta and theta
 * High when in deep relaxation or meditation
 */
export const museDeepRelax = signal(() => {
  if (!muse.isInitialized) return 0;
  return Math.min(1, muse._deltaSmooth * 0.6 + muse._thetaSmooth * 0.4);
});

/**
 * Calm alertness signal - alpha prominence
 * High during relaxed but aware states
 */
export const museCalmAlert = signal(() => {
  if (!muse.isInitialized) return 0;
  return muse._alphaSmooth;
});

/**
 * Active mind signal - combines beta and gamma
 * High during active thinking
 */
export const museActiveMind = signal(() => {
  if (!muse.isInitialized) return 0;
  return Math.min(1, muse._betaSmooth * 0.7 + muse._gammaSmooth * 0.3);
});

// Debug function
export function museDebug() {
  console.log('[Muse Debug]', {
    connected: muse.connected,
    touching: muse._touching,
    quality: muse._connectionQuality.toFixed(2),
    delta: muse._deltaSmooth.toFixed(3),
    theta: muse._thetaSmooth.toFixed(3),
    alpha: muse._alphaSmooth.toFixed(3),
    beta: muse._betaSmooth.toFixed(3),
    gamma: muse._gammaSmooth.toFixed(3),
    state: muse.getBrainState(),
    dominant: muse._dominantWave
  });
  return signal(() => 1);
}
