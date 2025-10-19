// audio-input.mjs - Microphone input sensors for Strudel

import { getAudioContext } from 'superdough';
import { signal } from '@strudel/core';

/**
 * Enables microphone input for Strudel patterns
 * @name enableAudioIn
 * @example
 * await enableAudioIn()
 * note(audioInNote).s("sine").gain(audioInVolume)
 */

/**
 * RMS volume from microphone (0-1)
 * @name audioInVolume
 * @return {Pattern}
 * @example
 * s("bd*4").gain(audioInVolume)
 */

/**
 * Peak amplitude from microphone (0-1)
 * @name audioInPeak
 * @return {Pattern}
 */

/**
 * Smoothed envelope follower (0-1)
 * @name audioInEnvelope
 * @return {Pattern}
 * @example
 * s("hh*8").gain(audioInEnvelope.range(0.3,1))
 */

/**
 * Detected pitch in Hz
 * @name audioInPitch
 * @return {Pattern}
 * @example
 * note(audioInPitch.cpsmidi()).s("sine")
 */

/**
 * Detected pitch as MIDI note number
 * @name audioInNote
 * @return {Pattern}
 * @example
 * note(audioInNote).s("piano")
 */

/**
 * Low frequency energy (20-250 Hz, 0-1)
 * @name audioInBass
 * @return {Pattern}
 * @example
 * s("bd*4").gain(audioInBass)
 */

/**
 * Mid frequency energy (250-2000 Hz, 0-1)
 * @name audioInMid
 * @return {Pattern}
 */

/**
 * High frequency energy (2000-20000 Hz, 0-1)
 * @name audioInHigh
 * @return {Pattern}
 */

/**
 * Spectral centroid - brightness (0-1)
 * @name audioInCentroid
 * @return {Pattern}
 * @example
 * s("sine").lpf(audioInCentroid.range(200,5000))
 */

/**
 * Spectral flux - rate of change (0-1)
 * @name audioInFlux
 * @return {Pattern}
 */

/**
 * Onset/beat detection (0 or 1)
 * @name audioInOnset
 * @return {Pattern}
 * @example
 * s("bd").struct(audioInOnset)
 */

class AudioInputHandler {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyser = null;
    this.stream = null;
    this.animationId = null;
    
    // Buffers
    this.dataArray = null;
    this.freqArray = null;
    
    // State
    this._volume = 0;
    this._peak = 0;
    this._envelope = 0;
    this._pitch = 0;
    this._note = 0;
    this._bass = 0;
    this._mid = 0;
    this._high = 0;
    this._centroid = 0;
    this._flux = 0;
    this._onset = 0;
    
    // History for analysis
    this.previousSpectrum = null;
    this.envelopeHistory = [];
    this.onsetHistory = [];
    
    // Settings
    this.fftSize = 2048;
    this.smoothingTimeConstant = 0.8;
    this.envelopeAttack = 0.05;
    this.envelopeRelease = 0.1;
    this.onsetThreshold = 0.15;
    
    this.isInitialized = false;
  }
  
  async init() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Check for secure context and mediaDevices support
      if (!navigator || !navigator.mediaDevices) {
        throw new Error('Microphone access not available. Please ensure you are using HTTPS or localhost, and your browser supports microphone access.');
      }
      
      // Get or create audio context
      this.audioContext = getAudioContext();
      
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      
      // Create analyser
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
      this.source.connect(this.analyser);
      // Don't connect to destination - we just want to analyze
      
      // Create buffers
      this.dataArray = new Float32Array(this.analyser.fftSize);
      this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.previousSpectrum = new Float32Array(this.analyser.frequencyBinCount);
      
      this.isInitialized = true;
      
      // Start analysis loop
      this.analyze();
      
      console.log('Audio input initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio input:', error);
      throw error;
    }
  }
  
  analyze() {
    if (!this.analyser) {
      return;
    }
    
    // Get time domain data (waveform)
    this.analyser.getFloatTimeDomainData(this.dataArray);
    
    // Get frequency domain data (spectrum)
    this.analyser.getByteFrequencyData(this.freqArray);
    
    // Analyze volume
    this.analyzeVolume();
    
    // Analyze pitch
    this.analyzePitch();
    
    // Analyze spectrum
    this.analyzeSpectrum();
    
    // Analyze onset
    this.analyzeOnset();
    
    // Continue loop
    this.animationId = requestAnimationFrame(() => this.analyze());
  }
  
  analyzeVolume() {
    // Calculate RMS
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = Math.abs(this.dataArray[i]);
      sum += value * value;
      peak = Math.max(peak, value);
    }
    
    const rms = Math.sqrt(sum / this.dataArray.length);
    
    this._volume = Math.min(rms * 5, 1); // Scale up and clamp
    this._peak = Math.min(peak, 1);
    
    // Envelope follower with attack/release
    if (this._volume > this._envelope) {
      // Attack
      this._envelope += (this._volume - this._envelope) * this.envelopeAttack;
    } else {
      // Release
      this._envelope += (this._volume - this._envelope) * this.envelopeRelease;
    }
  }
  
  analyzePitch() {
    // Autocorrelation pitch detection (simplified YIN algorithm)
    const sampleRate = this.audioContext.sampleRate;
    const data = this.dataArray;
    const bufferSize = data.length;
    
    // Calculate autocorrelation
    const correlations = new Array(bufferSize / 2);
    
    for (let lag = 0; lag < bufferSize / 2; lag++) {
      let sum = 0;
      for (let i = 0; i < bufferSize / 2; i++) {
        sum += data[i] * data[i + lag];
      }
      correlations[lag] = sum;
    }
    
    // Find the first peak after zero crossing
    let minLag = Math.floor(sampleRate / 1000); // Min 1000 Hz
    let maxLag = Math.floor(sampleRate / 60);   // Max 60 Hz
    
    let bestLag = -1;
    let bestCorrelation = -Infinity;
    
    for (let lag = minLag; lag < maxLag && lag < correlations.length; lag++) {
      if (correlations[lag] > bestCorrelation) {
        bestCorrelation = correlations[lag];
        bestLag = lag;
      }
    }
    
    // Only update pitch if we have good correlation and enough volume
    if (bestLag > 0 && bestCorrelation > 0.01 && this._volume > 0.01) {
      this._pitch = sampleRate / bestLag;
      this._note = this.frequencyToMidi(this._pitch);
    } else {
      // Keep previous pitch if signal is too weak
      // this._pitch = 0;
      // this._note = 0;
    }
  }
  
  analyzeSpectrum() {
    const binCount = this.freqArray.length;
    const sampleRate = this.audioContext.sampleRate;
    const nyquist = sampleRate / 2;
    
    // Calculate frequency ranges
    // Bass: 20-250 Hz
    const bassStart = Math.floor((20 / nyquist) * binCount);
    const bassEnd = Math.floor((250 / nyquist) * binCount);
    
    // Mid: 250-2000 Hz
    const midStart = bassEnd;
    const midEnd = Math.floor((2000 / nyquist) * binCount);
    
    // High: 2000-20000 Hz
    const highStart = midEnd;
    const highEnd = Math.floor((20000 / nyquist) * binCount);
    
    // Calculate energy in each range
    let bassSum = 0, midSum = 0, highSum = 0;
    
    for (let i = bassStart; i < bassEnd; i++) {
      bassSum += this.freqArray[i];
    }
    for (let i = midStart; i < midEnd; i++) {
      midSum += this.freqArray[i];
    }
    for (let i = highStart; i < highEnd && i < binCount; i++) {
      highSum += this.freqArray[i];
    }
    
    // Normalize
    this._bass = (bassSum / (bassEnd - bassStart)) / 255;
    this._mid = (midSum / (midEnd - midStart)) / 255;
    this._high = (highSum / (highEnd - highStart)) / 255;
    
    // Calculate spectral centroid
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < binCount; i++) {
      const magnitude = this.freqArray[i] / 255;
      const frequency = (i / binCount) * nyquist;
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    if (magnitudeSum > 0) {
      const centroid = weightedSum / magnitudeSum;
      this._centroid = Math.min(centroid / nyquist, 1);
    }
    
    // Calculate spectral flux
    let flux = 0;
    for (let i = 0; i < binCount; i++) {
      const current = this.freqArray[i] / 255;
      const previous = this.previousSpectrum[i];
      const diff = current - previous;
      if (diff > 0) {
        flux += diff;
      }
      this.previousSpectrum[i] = current;
    }
    
    this._flux = Math.min(flux / 10, 1);
  }
  
  analyzeOnset() {
    // Onset detection based on spectral flux
    const fluxThreshold = this.onsetThreshold;
    
    // Keep history of recent flux values
    this.onsetHistory.push(this._flux);
    if (this.onsetHistory.length > 10) {
      this.onsetHistory.shift();
    }
    
    // Calculate average of recent flux
    const avgFlux = this.onsetHistory.reduce((a, b) => a + b, 0) / this.onsetHistory.length;
    
    // Onset if current flux is significantly higher than average
    if (this._flux > avgFlux * 2 && this._flux > fluxThreshold) {
      this._onset = 1;
      // Clear history to prevent multiple detections
      this.onsetHistory = [];
    } else {
      this._onset = 0;
    }
  }
  
  frequencyToMidi(frequency) {
    if (frequency <= 0) return 0;
    return 69 + 12 * Math.log2(frequency / 440);
  }
  
  getVolume() {
    return this._volume;
  }
  
  getPeak() {
    return this._peak;
  }
  
  getEnvelope() {
    return this._envelope;
  }
  
  getPitch() {
    return this._pitch;
  }
  
  getNote() {
    return this._note;
  }
  
  getBass() {
    return this._bass;
  }
  
  getMid() {
    return this._mid;
  }
  
  getHigh() {
    return this._high;
  }
  
  getCentroid() {
    return this._centroid;
  }
  
  getFlux() {
    return this._flux;
  }
  
  getOnset() {
    return this._onset;
  }
  
  getFFT() {
    return Array.from(this.freqArray).map(v => v / 255);
  }
  
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.isInitialized = false;
  }
}

// Create singleton instance
const audioIn = new AudioInputHandler();

// Export initialization function
export async function enableAudioIn() {
  await audioIn.init();
  return signal(() => 1); // Return a pattern that indicates audio input is ready
}

// Export volume signals
export const audioInVolume = signal(() => audioIn.getVolume());
export const audioInPeak = signal(() => audioIn.getPeak());
export const audioInEnvelope = signal(() => audioIn.getEnvelope());

// Export pitch signals
export const audioInPitch = signal(() => audioIn.getPitch());
export const audioInNote = signal(() => audioIn.getNote());

// Export spectral signals
export const audioInBass = signal(() => audioIn.getBass());
export const audioInMid = signal(() => audioIn.getMid());
export const audioInHigh = signal(() => audioIn.getHigh());
export const audioInCentroid = signal(() => audioIn.getCentroid());
export const audioInFlux = signal(() => audioIn.getFlux());

// Export rhythm signals
export const audioInOnset = signal(() => audioIn.getOnset());

// Export FFT array
export const audioInFFT = signal(() => audioIn.getFFT());

// Export gate function
export function audioInGate(threshold = 0.1) {
  return signal(() => audioIn.getVolume() > threshold ? 1 : 0);
}

// Export bands function
export function audioInBands(n = 8) {
  return signal(() => {
    const fft = audioIn.getFFT();
    const bands = [];
    const binSize = Math.floor(fft.length / n);
    
    for (let i = 0; i < n; i++) {
      let sum = 0;
      const start = i * binSize;
      const end = Math.min(start + binSize, fft.length);
      
      for (let j = start; j < end; j++) {
        sum += fft[j];
      }
      
      bands.push(sum / binSize);
    }
    
    return bands;
  });
}

// Export stop function
export function disableAudioIn() {
  audioIn.stop();
}

// Make audio input handler globally accessible for audio-reactive features
if (typeof window !== 'undefined') {
  window.audioInHandler = audioIn;
}

