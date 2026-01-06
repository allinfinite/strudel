// muse.mjs - Muse 2 EEG brainwave sensor integration for Strudel
// Receives signals via direct Bluetooth (Web Bluetooth API) or OSC from Mind Monitor app

import { signal } from '@strudel/core';
import OSC from 'osc-js';
import { MuseClient } from 'muse-js';

/**
 * Muse Brainwave Handler
 * Supports two connection modes:
 * 1. Direct Bluetooth via Web Bluetooth API (requires Chrome/Edge/Opera)
 * 2. OSC via Mind Monitor app (works in any browser)
 * 
 * Brainwave bands:
 * - Delta (0.5-4 Hz) - Deep sleep, healing
 * - Theta (4-8 Hz) - Meditation, creativity
 * - Alpha (8-12 Hz) - Relaxed focus
 * - Beta (12-30 Hz) - Active thinking
 * - Gamma (30+ Hz) - High-level cognition
 */

// FFT size for frequency analysis (must be power of 2)
const FFT_SIZE = 256;
const SAMPLE_RATE = 256; // Muse samples at 256 Hz

/**
 * Simple FFT implementation for band power extraction
 * Based on Cooley-Tukey algorithm
 */
class FFTProcessor {
  constructor(size) {
    this.size = size;
    this.real = new Float32Array(size);
    this.imag = new Float32Array(size);
    
    // Pre-compute twiddle factors
    this.cosTable = new Float32Array(size / 2);
    this.sinTable = new Float32Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      this.cosTable[i] = Math.cos(2 * Math.PI * i / size);
      this.sinTable[i] = Math.sin(2 * Math.PI * i / size);
    }
    
    // Hann window for smoothing
    this.window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      this.window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
  }
  
  /**
   * Compute FFT and return magnitude spectrum
   */
  compute(samples) {
    const n = this.size;
    
    // Apply window and copy to real array
    for (let i = 0; i < n; i++) {
      this.real[i] = (samples[i] || 0) * this.window[i];
      this.imag[i] = 0;
    }
    
    // Bit-reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        [this.real[i], this.real[j]] = [this.real[j], this.real[i]];
        [this.imag[i], this.imag[j]] = [this.imag[j], this.imag[i]];
      }
      let k = n >> 1;
      while (k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }
    
    // Cooley-Tukey FFT
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < halfSize; j++, k += step) {
          const tReal = this.real[i + j + halfSize] * this.cosTable[k] + 
                       this.imag[i + j + halfSize] * this.sinTable[k];
          const tImag = this.imag[i + j + halfSize] * this.cosTable[k] - 
                       this.real[i + j + halfSize] * this.sinTable[k];
          this.real[i + j + halfSize] = this.real[i + j] - tReal;
          this.imag[i + j + halfSize] = this.imag[i + j] - tImag;
          this.real[i + j] += tReal;
          this.imag[i + j] += tImag;
        }
      }
    }
    
    // Compute magnitude spectrum (only first half is useful)
    const magnitudes = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      magnitudes[i] = Math.sqrt(this.real[i] * this.real[i] + this.imag[i] * this.imag[i]);
    }
    
    return magnitudes;
  }
  
  /**
   * Get power in a frequency band
   * @param {Float32Array} magnitudes - FFT magnitudes
   * @param {number} lowFreq - Lower frequency bound (Hz)
   * @param {number} highFreq - Upper frequency bound (Hz)
   * @returns {number} - Average power in band
   */
  getBandPower(magnitudes, lowFreq, highFreq) {
    const freqResolution = SAMPLE_RATE / this.size;
    // Start at bin 1 minimum to exclude DC component (bin 0)
    const lowBin = Math.max(1, Math.floor(lowFreq / freqResolution));
    const highBin = Math.ceil(highFreq / freqResolution);
    
    let sum = 0;
    let count = 0;
    for (let i = lowBin; i <= highBin && i < magnitudes.length; i++) {
      sum += magnitudes[i] * magnitudes[i]; // Power = magnitude^2
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }
  
  /**
   * Simple high-pass filter to remove DC drift
   */
  highPassFilter(samples, cutoff = 1.0) {
    const rc = 1.0 / (2 * Math.PI * cutoff);
    const dt = 1.0 / SAMPLE_RATE;
    const alpha = rc / (rc + dt);
    
    const filtered = new Array(samples.length);
    filtered[0] = 0;
    for (let i = 1; i < samples.length; i++) {
      filtered[i] = alpha * (filtered[i-1] + samples[i] - samples[i-1]);
    }
    return filtered;
  }
}

class MuseHandler {
  constructor() {
    // Raw brainwave values (0-1 range)
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
    this._connectionMode = null; // 'bluetooth' | 'osc' | null
    this._deviceName = null;
    
    // Derived states
    this._dominantWave = 'alpha';
    this._relaxationIndex = 0;
    this._meditationIndex = 0;
    this._focusIndex = 0;
    
    // Smoothing factor (0-1, higher = smoother but slower response)
    this.smoothingFactor = 0.85;
    
    // OSC connection
    this.osc = null;
    this.reconnectInterval = null;
    
    // Bluetooth connection (muse-js)
    this.museClient = null;
    this.eegSubscription = null;
    this.telemetrySubscription = null;
    this.accelerometerSubscription = null;
    
    // FFT processor for Bluetooth mode
    this.fft = new FFTProcessor(FFT_SIZE);
    this.eegBuffers = [[], [], [], []]; // 4 channels: TP9, AF7, AF8, TP10
    
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
   * Check if Web Bluetooth is available
   */
  static isBluetoothAvailable() {
    return typeof navigator !== 'undefined' && 
           navigator.bluetooth !== undefined;
  }
  
  /**
   * Connect directly to Muse headband via Bluetooth (BLE)
   * Requires Chrome, Edge, or Opera browser
   * Note: Muse uses BLE and won't appear in system Bluetooth settings.
   * Use apps like LightBlue or nRF Connect to verify the device is advertising.
   */
  async connectBluetooth() {
    if (!MuseHandler.isBluetoothAvailable()) {
      throw new Error('Web Bluetooth is not available. Please use Chrome, Edge, or Opera browser.');
    }
    
    if (this._connected) {
      console.log('[Muse] Already connected');
      return;
    }
    
    try {
      console.log('[Muse] Scanning for BLE devices (Muse uses BLE, not classic Bluetooth)...');
      console.log('[Muse] Make sure Muse is powered on and LED is blinking');
      
      this.museClient = new MuseClient();
      
      // Connect to the Muse device (triggers browser BLE scanning dialog)
      // muse-js internally uses namePrefix: 'Muse' filter
      await this.museClient.connect();
      
      this._deviceName = this.museClient.deviceName || 'Muse';
      console.log(`[Muse] Connected to ${this._deviceName} via Bluetooth`);
      
      // Start receiving data
      await this.museClient.start();
      
      // Subscribe to EEG readings
      this.eegSubscription = this.museClient.eegReadings.subscribe(reading => {
        this.handleBluetoothEEG(reading);
      });
      
      // Subscribe to telemetry (battery, temperature)
      if (this.museClient.telemetryData) {
        this.telemetrySubscription = this.museClient.telemetryData.subscribe(telemetry => {
          // Telemetry available for monitoring
          // console.log('[Muse] Telemetry:', telemetry);
        });
      }
      
      // Subscribe to accelerometer
      if (this.museClient.accelerometerData) {
        this.accelerometerSubscription = this.museClient.accelerometerData.subscribe(acc => {
          this._accX = acc.samples[acc.samples.length - 1]?.x || 0;
          this._accY = acc.samples[acc.samples.length - 1]?.y || 0;
          this._accZ = acc.samples[acc.samples.length - 1]?.z || 0;
        });
      }
      
      this._connected = true;
      this._connectionMode = 'bluetooth';
      this._touching = true; // Assume touching when connected via BT
      this._connectionQuality = 1;
      this.isInitialized = true;
      this._lastUpdate = Date.now();
      
      this.onConnect?.();
      
      // Handle disconnection
      this.museClient.connectionStatus.subscribe(status => {
        if (!status) {
          this.handleBluetoothDisconnect();
        }
      });
      
    } catch (error) {
      console.error('[Muse] Bluetooth connection failed:', error);
      this.museClient = null;
      throw error;
    }
  }
  
  /**
   * Handle incoming EEG data from Bluetooth
   * Process raw EEG into frequency bands using FFT
   */
  handleBluetoothEEG(reading) {
    this._lastUpdate = Date.now();
    
    // reading has: electrode (0-3), samples (array of microvolts), timestamp
    const channel = reading.electrode;
    if (channel < 0 || channel > 3) return;
    
    // Add samples to buffer
    for (const sample of reading.samples) {
      this.eegBuffers[channel].push(sample);
    }
    
    // Keep buffer at FFT size
    while (this.eegBuffers[channel].length > FFT_SIZE) {
      this.eegBuffers[channel].shift();
    }
    
    // Process when we have enough samples (only process on channel 0 to avoid duplicate updates)
    if (channel === 0 && this.eegBuffers[0].length >= FFT_SIZE) {
      this.processBluetoothFFT();
    }
  }
  
  /**
   * Process EEG buffers with FFT to extract band powers
   */
  processBluetoothFFT() {
    // Process each channel and average
    const bandPowers = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
    let validChannels = 0;
    
    for (let ch = 0; ch < 4; ch++) {
      if (this.eegBuffers[ch].length < FFT_SIZE) continue;
      
      // Apply high-pass filter to remove DC drift
      const filtered = this.fft.highPassFilter(this.eegBuffers[ch], 1.0);
      const magnitudes = this.fft.compute(filtered);
      
      // Extract band powers (Delta starts at 1 Hz due to FFT resolution)
      bandPowers.delta += this.fft.getBandPower(magnitudes, 1, 4);
      bandPowers.theta += this.fft.getBandPower(magnitudes, 4, 8);
      bandPowers.alpha += this.fft.getBandPower(magnitudes, 8, 13);
      bandPowers.beta += this.fft.getBandPower(magnitudes, 13, 30);
      bandPowers.gamma += this.fft.getBandPower(magnitudes, 30, 44);
      
      validChannels++;
    }
    
    if (validChannels === 0) return;
    
    // Average across channels
    for (const band in bandPowers) {
      bandPowers[band] /= validChannels;
    }
    
    // Apply 1/f correction (raw EEG power drops with frequency)
    bandPowers.theta *= 1.5;
    bandPowers.alpha *= 2.0;
    bandPowers.beta *= 3.0;
    bandPowers.gamma *= 4.0;
    
    // Convert to relative powers (0-1 range)
    const totalPower = bandPowers.delta + bandPowers.theta + bandPowers.alpha + 
                       bandPowers.beta + bandPowers.gamma;
    
    if (totalPower > 0) {
      this.updateBand('delta', bandPowers.delta / totalPower);
      this.updateBand('theta', bandPowers.theta / totalPower);
      this.updateBand('alpha', bandPowers.alpha / totalPower);
      this.updateBand('beta', bandPowers.beta / totalPower);
      this.updateBand('gamma', bandPowers.gamma / totalPower);
    }
  }
  
  /**
   * Handle Bluetooth disconnection
   */
  handleBluetoothDisconnect() {
    console.log('[Muse] Bluetooth disconnected');
    
    if (this.eegSubscription) {
      this.eegSubscription.unsubscribe();
      this.eegSubscription = null;
    }
    if (this.telemetrySubscription) {
      this.telemetrySubscription.unsubscribe();
      this.telemetrySubscription = null;
    }
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.unsubscribe();
      this.accelerometerSubscription = null;
    }
    
    this.museClient = null;
    this._connected = false;
    this._connectionMode = null;
    this._deviceName = null;
    this.isInitialized = false;
    
    // Clear EEG buffers
    this.eegBuffers = [[], [], [], []];
    
    this.onDisconnect?.();
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
          this._connectionMode = 'osc';
          this.isInitialized = true;
          this.onConnect?.();
          resolve();
        });
        
        this.osc.on('close', () => {
          console.log('[Muse] Disconnected from OSC bridge');
          this._connected = false;
          this._connectionMode = null;
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
          this.handleOSCMessage(message);
        });
        
        // Also listen for specific Muse addresses
        this.osc.on('/muse/*', (message) => {
          this.handleOSCMessage(message);
        });
        
        this.osc.open();
        
      } catch (error) {
        console.error('[Muse] Connection failed:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from current connection (Bluetooth or OSC)
   */
  disconnect() {
    // Disconnect Bluetooth
    if (this.museClient) {
      if (this.eegSubscription) {
        this.eegSubscription.unsubscribe();
        this.eegSubscription = null;
      }
      if (this.telemetrySubscription) {
        this.telemetrySubscription.unsubscribe();
        this.telemetrySubscription = null;
      }
      if (this.accelerometerSubscription) {
        this.accelerometerSubscription.unsubscribe();
        this.accelerometerSubscription = null;
      }
      this.museClient.disconnect();
      this.museClient = null;
    }
    
    // Disconnect OSC
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.osc) {
      this.osc.close();
      this.osc = null;
    }
    
    this._connected = false;
    this._connectionMode = null;
    this._deviceName = null;
    this.isInitialized = false;
    this.eegBuffers = [[], [], [], []];
  }
  
  /**
   * Parse incoming OSC message from the bridge
   */
  handleOSCMessage(message) {
    try {
      const address = message.address;
      const args = message.args;
      
      if (!address) return;
      
      this._lastUpdate = Date.now();
      
      // Handle different OSC addresses from Mind Monitor
      switch (address) {
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
        case '/muse/elements/delta_absolute':
        case '/muse/elements/theta_absolute':
        case '/muse/elements/alpha_absolute':
        case '/muse/elements/beta_absolute':
        case '/muse/elements/gamma_absolute':
          // Ignored - we use relative values
          break;
        case '/muse/blink':
          this._blink = this.parseValue(args) > 0 ? 1 : 0;
          if (this._blink) {
            this.onBlink?.();
          }
          break;
        case '/muse/jaw_clench':
          this._jawClench = this.parseValue(args) > 0 ? 1 : 0;
          if (this._jawClench) {
            this.onJawClench?.();
          }
          break;
        case '/muse/acc':
          if (Array.isArray(args) && args.length >= 3) {
            this._accX = args[0];
            this._accY = args[1];
            this._accZ = args[2];
          }
          break;
        case '/muse/gyro':
          if (Array.isArray(args) && args.length >= 3) {
            this._gyroX = args[0];
            this._gyroY = args[1];
            this._gyroZ = args[2];
          }
          break;
        case '/muse/elements/horseshoe':
          if (Array.isArray(args) && args.length >= 4) {
            const quality = args.reduce((sum, v) => sum + (v === 1 ? 1 : v === 2 ? 0.5 : 0), 0) / 4;
            this._connectionQuality = quality;
            this._touching = quality > 0.25;
          }
          break;
        case '/muse/elements/touching_forehead':
          this._touching = this.parseValue(args) > 0;
          break;
      }
      
    } catch (error) {
      // Silently ignore parse errors
    }
  }
  
  /**
   * Parse a value from OSC args
   */
  parseValue(args) {
    if (Array.isArray(args)) {
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
    value = Math.max(0, Math.min(1, value));
    this[`_${band}`] = value;
    
    const smoothKey = `_${band}Smooth`;
    this[smoothKey] = this[smoothKey] * this.smoothingFactor + value * (1 - this.smoothingFactor);
    
    this._history[band].push(value);
    if (this._history[band].length > this.historyLength) {
      this._history[band].shift();
    }
    
    this.updateDerivedStates();
  }
  
  /**
   * Calculate derived brain states
   */
  updateDerivedStates() {
    const d = this._deltaSmooth;
    const t = this._thetaSmooth;
    const a = this._alphaSmooth;
    const b = this._betaSmooth;
    const g = this._gammaSmooth;
    
    const waves = { delta: d, theta: t, alpha: a, beta: b, gamma: g };
    const oldDominant = this._dominantWave;
    this._dominantWave = Object.entries(waves).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    
    if (oldDominant !== this._dominantWave) {
      this.onStateChange?.(this._dominantWave, oldDominant);
    }
    
    const relaxNum = a + t;
    const relaxDen = b + g + 0.001;
    this._relaxationIndex = Math.min(relaxNum / relaxDen, 2) / 2;
    
    this._meditationIndex = t / (a + 0.001);
    this._meditationIndex = Math.min(this._meditationIndex, 2) / 2;
    
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
   * Check if still receiving data
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
  get connectionMode() { return this._connectionMode; }
  get deviceName() { return this._deviceName; }
  
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

// Export static method for checking Bluetooth availability
export const isMuseBluetoothAvailable = MuseHandler.isBluetoothAvailable;

/**
 * Connect to Muse via direct Bluetooth (Web Bluetooth API)
 * Requires Chrome, Edge, or Opera browser
 * @returns {Promise} Resolves when connected
 */
export async function enableMuseBluetooth() {
  await muse.connectBluetooth();
  console.log('[Muse] Enabled via Bluetooth - receiving EEG data directly');
  return signal(() => muse.connected ? 1 : 0);
}

/**
 * Connect to Muse via Mind Monitor OSC bridge
 * @param {string} url - WebSocket URL (default: ws://localhost:8080)
 * @returns {Promise} Resolves when connected
 */
export async function enableMuse(url = 'ws://localhost:8080') {
  await muse.connect(url);
  console.log('[Muse] Enabled via OSC - waiting for Mind Monitor data...');
  console.log('[Muse] Make sure Mind Monitor is sending to this computer on port 57121');
  return signal(() => muse.connected ? 1 : 0);
}

// Alias for clarity
export const enableMuseOSC = enableMuse;

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
export const museConnectionMode = signal(() => muse._connectionMode || 'none');

// Composite signals for common use cases

/**
 * Deep relaxation signal - combines delta and theta
 */
export const museDeepRelax = signal(() => {
  if (!muse.isInitialized) return 0;
  return Math.min(1, muse._deltaSmooth * 0.6 + muse._thetaSmooth * 0.4);
});

/**
 * Calm alertness signal - alpha prominence
 */
export const museCalmAlert = signal(() => {
  if (!muse.isInitialized) return 0;
  return muse._alphaSmooth;
});

/**
 * Active mind signal - combines beta and gamma
 */
export const museActiveMind = signal(() => {
  if (!muse.isInitialized) return 0;
  return Math.min(1, muse._betaSmooth * 0.7 + muse._gammaSmooth * 0.3);
});

// Debug function
export function museDebug() {
  console.log('[Muse Debug]', {
    connected: muse.connected,
    mode: muse._connectionMode,
    device: muse._deviceName,
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
