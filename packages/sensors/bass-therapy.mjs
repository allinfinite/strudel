// bass-therapy.mjs - Sub-bass synthesis engine for vibra-acoustic therapy
// Optimized for massage table transducers (20-80 Hz focus)

import { signal } from '@strudel/core';
import { muse } from './muse.mjs';

/**
 * Bass Therapy Engine
 * 
 * Generates deep bass frequencies optimized for vibra-acoustic therapy.
 * Uses brainwave data from Muse 2 to modulate bass characteristics.
 * 
 * Frequency mapping:
 * - Delta dominance → Very low drones (25-35 Hz)
 * - Theta dominance → Low pulses (35-50 Hz)
 * - Alpha dominance → Warm tones (50-70 Hz)
 * - Beta dominance → Rhythmic bass (60-80 Hz)
 * - Gamma → Adds subtle harmonics only
 */

class BassTherapyEngine {
  constructor() {
    // Audio context
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    
    // Oscillator layers
    this.subOsc = null;       // Primary sub-bass (sine)
    this.warmOsc = null;      // Warmth layer (filtered triangle)
    this.harmonicOsc = null;  // Harmonic content (filtered saw)
    
    // Gains for each layer
    this.subGain = null;
    this.warmGain = null;
    this.harmonicGain = null;
    
    // Filters
    this.subFilter = null;
    this.warmFilter = null;
    this.harmonicFilter = null;
    
    // LFOs for modulation
    this.ampLfo = null;
    this.filterLfo = null;
    this.pitchLfo = null;
    
    // LFO gains (depth control)
    this.ampLfoGain = null;
    this.filterLfoGain = null;
    this.pitchLfoGain = null;
    
    // Binaural beat oscillators
    this.binauralLeft = null;
    this.binauralRight = null;
    this.binauralGain = null;
    this.binauralEnabled = false;
    
    // State
    this.isPlaying = false;
    this.currentPreset = 'meditation';
    this.masterVolume = 0.7;
    
    // Base frequencies for each brain state
    this.frequencies = {
      deep: 28,        // Delta - very low
      meditative: 40,  // Theta - low
      relaxed: 55,     // Alpha - mid-low
      focused: 65,     // Beta - mid
      neutral: 50      // Default
    };
    
    // Binaural beat frequencies (Hz difference between ears)
    this.binauralFreqs = {
      deep: 2,         // Delta entrainment
      meditative: 6,   // Theta entrainment
      relaxed: 10,     // Alpha entrainment
      focused: 18,     // Beta entrainment
      neutral: 10
    };
    
    // Presets
    this.presets = {
      deepSleep: {
        baseFreq: 28,
        subLevel: 1.0,
        warmLevel: 0.3,
        harmonicLevel: 0.1,
        filterCutoff: 100,
        lfoRate: 0.05,
        lfoDepth: 0.15,
        binauralFreq: 2
      },
      meditation: {
        baseFreq: 40,
        subLevel: 0.9,
        warmLevel: 0.4,
        harmonicLevel: 0.15,
        filterCutoff: 150,
        lfoRate: 0.08,
        lfoDepth: 0.12,
        binauralFreq: 6
      },
      relaxation: {
        baseFreq: 55,
        subLevel: 0.8,
        warmLevel: 0.5,
        harmonicLevel: 0.2,
        filterCutoff: 200,
        lfoRate: 0.1,
        lfoDepth: 0.1,
        binauralFreq: 10
      },
      focus: {
        baseFreq: 65,
        subLevel: 0.7,
        warmLevel: 0.5,
        harmonicLevel: 0.25,
        filterCutoff: 250,
        lfoRate: 0.15,
        lfoDepth: 0.08,
        binauralFreq: 15
      },
      custom: {
        baseFreq: 50,
        subLevel: 0.8,
        warmLevel: 0.4,
        harmonicLevel: 0.2,
        filterCutoff: 180,
        lfoRate: 0.1,
        lfoDepth: 0.1,
        binauralFreq: 10
      }
    };
    
    // Animation frame for brainwave-reactive updates
    this.animationFrame = null;
    this.brainwaveReactive = true;
  }
  
  /**
   * Initialize the audio engine
   */
  async init() {
    if (this.ctx) return;
    
    // Create audio context
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    // Create master chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    
    // Compressor to prevent clipping and smooth dynamics
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
    
    console.log('[BassTherapy] Audio engine initialized');
  }
  
  /**
   * Start bass playback
   */
  async start(presetName = 'meditation') {
    if (this.isPlaying) return;
    
    await this.init();
    
    const preset = this.presets[presetName] || this.presets.meditation;
    this.currentPreset = presetName;
    
    const now = this.ctx.currentTime;
    
    // === SUB-BASS LAYER (Primary) ===
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.value = preset.baseFreq;
    
    this.subFilter = this.ctx.createBiquadFilter();
    this.subFilter.type = 'lowpass';
    this.subFilter.frequency.value = preset.filterCutoff;
    this.subFilter.Q.value = 0.7;
    
    this.subGain = this.ctx.createGain();
    this.subGain.gain.value = 0;
    
    this.subOsc.connect(this.subFilter);
    this.subFilter.connect(this.subGain);
    this.subGain.connect(this.masterGain);
    
    // === WARMTH LAYER (Triangle) ===
    this.warmOsc = this.ctx.createOscillator();
    this.warmOsc.type = 'triangle';
    this.warmOsc.frequency.value = preset.baseFreq;
    
    this.warmFilter = this.ctx.createBiquadFilter();
    this.warmFilter.type = 'lowpass';
    this.warmFilter.frequency.value = preset.filterCutoff * 1.5;
    this.warmFilter.Q.value = 1;
    
    this.warmGain = this.ctx.createGain();
    this.warmGain.gain.value = 0;
    
    this.warmOsc.connect(this.warmFilter);
    this.warmFilter.connect(this.warmGain);
    this.warmGain.connect(this.masterGain);
    
    // === HARMONIC LAYER (Filtered Sawtooth - octave up) ===
    this.harmonicOsc = this.ctx.createOscillator();
    this.harmonicOsc.type = 'sawtooth';
    this.harmonicOsc.frequency.value = preset.baseFreq * 2; // Octave up
    
    this.harmonicFilter = this.ctx.createBiquadFilter();
    this.harmonicFilter.type = 'lowpass';
    this.harmonicFilter.frequency.value = preset.filterCutoff * 2;
    this.harmonicFilter.Q.value = 2;
    
    this.harmonicGain = this.ctx.createGain();
    this.harmonicGain.gain.value = 0;
    
    this.harmonicOsc.connect(this.harmonicFilter);
    this.harmonicFilter.connect(this.harmonicGain);
    this.harmonicGain.connect(this.masterGain);
    
    // === AMPLITUDE LFO ===
    this.ampLfo = this.ctx.createOscillator();
    this.ampLfo.type = 'sine';
    this.ampLfo.frequency.value = preset.lfoRate;
    
    this.ampLfoGain = this.ctx.createGain();
    this.ampLfoGain.gain.value = preset.lfoDepth * preset.subLevel;
    
    this.ampLfo.connect(this.ampLfoGain);
    this.ampLfoGain.connect(this.subGain.gain);
    
    // === FILTER LFO ===
    this.filterLfo = this.ctx.createOscillator();
    this.filterLfo.type = 'sine';
    this.filterLfo.frequency.value = preset.lfoRate * 0.7; // Slightly slower
    
    this.filterLfoGain = this.ctx.createGain();
    this.filterLfoGain.gain.value = preset.filterCutoff * 0.3;
    
    this.filterLfo.connect(this.filterLfoGain);
    this.filterLfoGain.connect(this.subFilter.frequency);
    this.filterLfoGain.connect(this.warmFilter.frequency);
    
    // === PITCH LFO (very subtle) ===
    this.pitchLfo = this.ctx.createOscillator();
    this.pitchLfo.type = 'sine';
    this.pitchLfo.frequency.value = preset.lfoRate * 0.3;
    
    this.pitchLfoGain = this.ctx.createGain();
    this.pitchLfoGain.gain.value = preset.baseFreq * 0.02; // 2% pitch wobble
    
    this.pitchLfo.connect(this.pitchLfoGain);
    this.pitchLfoGain.connect(this.subOsc.frequency);
    this.pitchLfoGain.connect(this.warmOsc.frequency);
    
    // Start oscillators
    this.subOsc.start(now);
    this.warmOsc.start(now);
    this.harmonicOsc.start(now);
    this.ampLfo.start(now);
    this.filterLfo.start(now);
    this.pitchLfo.start(now);
    
    // Fade in over 3 seconds
    this.subGain.gain.setValueAtTime(0, now);
    this.subGain.gain.linearRampToValueAtTime(preset.subLevel, now + 3);
    
    this.warmGain.gain.setValueAtTime(0, now);
    this.warmGain.gain.linearRampToValueAtTime(preset.warmLevel, now + 3);
    
    this.harmonicGain.gain.setValueAtTime(0, now);
    this.harmonicGain.gain.linearRampToValueAtTime(preset.harmonicLevel, now + 3);
    
    // Start binaural if enabled
    if (this.binauralEnabled) {
      this.startBinaural(preset.binauralFreq);
    }
    
    this.isPlaying = true;
    
    // Start brainwave-reactive updates
    if (this.brainwaveReactive) {
      this.startBrainwaveUpdates();
    }
    
    console.log(`[BassTherapy] Started with preset: ${presetName}`);
  }
  
  /**
   * Stop bass playback
   */
  stop() {
    if (!this.isPlaying) return;
    
    const now = this.ctx.currentTime;
    const fadeTime = 2; // 2 second fade out
    
    // Fade out all gains
    [this.subGain, this.warmGain, this.harmonicGain, this.binauralGain].forEach(gain => {
      if (gain) {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeTime);
      }
    });
    
    // Stop oscillators after fade
    setTimeout(() => {
      [this.subOsc, this.warmOsc, this.harmonicOsc, 
       this.ampLfo, this.filterLfo, this.pitchLfo,
       this.binauralLeft, this.binauralRight].forEach(osc => {
        if (osc) {
          try { osc.stop(); } catch (e) {}
        }
      });
      
      this.subOsc = null;
      this.warmOsc = null;
      this.harmonicOsc = null;
      this.binauralLeft = null;
      this.binauralRight = null;
    }, fadeTime * 1000 + 100);
    
    // Stop animation frame
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.isPlaying = false;
    console.log('[BassTherapy] Stopped');
  }
  
  /**
   * Start binaural beat layer
   */
  startBinaural(freqDiff = 10) {
    if (!this.ctx || this.binauralLeft) return;
    
    const baseFreq = 100; // Carrier frequency
    const now = this.ctx.currentTime;
    
    // Create stereo splitter/merger for binaural
    const splitter = this.ctx.createChannelSplitter(2);
    const merger = this.ctx.createChannelMerger(2);
    
    // Left ear oscillator
    this.binauralLeft = this.ctx.createOscillator();
    this.binauralLeft.type = 'sine';
    this.binauralLeft.frequency.value = baseFreq;
    
    // Right ear oscillator (slightly different frequency)
    this.binauralRight = this.ctx.createOscillator();
    this.binauralRight.type = 'sine';
    this.binauralRight.frequency.value = baseFreq + freqDiff;
    
    // Gain for binaural layer
    this.binauralGain = this.ctx.createGain();
    this.binauralGain.gain.value = 0;
    
    // Route to separate channels
    const leftGain = this.ctx.createGain();
    const rightGain = this.ctx.createGain();
    leftGain.gain.value = 0.15;
    rightGain.gain.value = 0.15;
    
    this.binauralLeft.connect(leftGain);
    this.binauralRight.connect(rightGain);
    
    leftGain.connect(merger, 0, 0);
    rightGain.connect(merger, 0, 1);
    
    merger.connect(this.binauralGain);
    this.binauralGain.connect(this.masterGain);
    
    // Start
    this.binauralLeft.start(now);
    this.binauralRight.start(now);
    
    // Fade in
    this.binauralGain.gain.setValueAtTime(0, now);
    this.binauralGain.gain.linearRampToValueAtTime(0.3, now + 2);
    
    this.binauralEnabled = true;
    console.log(`[BassTherapy] Binaural beats enabled (${freqDiff} Hz difference)`);
  }
  
  /**
   * Stop binaural beat layer
   */
  stopBinaural() {
    if (!this.binauralLeft) return;
    
    const now = this.ctx.currentTime;
    
    // Fade out
    if (this.binauralGain) {
      this.binauralGain.gain.setValueAtTime(this.binauralGain.gain.value, now);
      this.binauralGain.gain.linearRampToValueAtTime(0, now + 1);
    }
    
    // Stop after fade
    setTimeout(() => {
      try {
        this.binauralLeft?.stop();
        this.binauralRight?.stop();
      } catch (e) {}
      this.binauralLeft = null;
      this.binauralRight = null;
    }, 1100);
    
    this.binauralEnabled = false;
    console.log('[BassTherapy] Binaural beats disabled');
  }
  
  /**
   * Toggle binaural beats
   */
  toggleBinaural() {
    if (this.binauralEnabled) {
      this.stopBinaural();
    } else if (this.isPlaying) {
      const preset = this.presets[this.currentPreset] || this.presets.meditation;
      this.startBinaural(preset.binauralFreq);
    }
    return this.binauralEnabled;
  }
  
  /**
   * Start brainwave-reactive updates
   */
  startBrainwaveUpdates() {
    const update = () => {
      if (!this.isPlaying || !this.brainwaveReactive) return;
      
      this.updateFromBrainwaves();
      this.animationFrame = requestAnimationFrame(update);
    };
    
    this.animationFrame = requestAnimationFrame(update);
  }
  
  /**
   * Update audio parameters based on brainwave data
   */
  updateFromBrainwaves() {
    if (!muse.isInitialized || !muse.connected) return;
    
    const now = this.ctx.currentTime;
    const state = muse.getBrainState();
    
    // Get target frequency based on brain state
    const targetFreq = this.frequencies[state] || this.frequencies.neutral;
    
    // Get brainwave values
    const delta = muse.deltaSmooth;
    const theta = muse.thetaSmooth;
    const alpha = muse.alphaSmooth;
    const beta = muse.betaSmooth;
    const gamma = muse.gammaSmooth;
    
    // Calculate weighted frequency based on all bands
    const weightedFreq = 
      delta * 28 +
      theta * 40 +
      alpha * 55 +
      beta * 65 +
      gamma * 75;
    
    // Blend target and weighted (80% weighted, 20% state-based)
    const finalFreq = weightedFreq * 0.8 + targetFreq * 0.2;
    
    // Smoothly update oscillator frequencies
    if (this.subOsc) {
      this.subOsc.frequency.setTargetAtTime(finalFreq, now, 0.5);
    }
    if (this.warmOsc) {
      this.warmOsc.frequency.setTargetAtTime(finalFreq, now, 0.5);
    }
    if (this.harmonicOsc) {
      this.harmonicOsc.frequency.setTargetAtTime(finalFreq * 2, now, 0.5);
    }
    
    // Update filter based on alpha (openness/relaxation)
    const filterFreq = 80 + alpha * 200 + gamma * 100;
    if (this.subFilter) {
      this.subFilter.frequency.setTargetAtTime(filterFreq, now, 0.3);
    }
    if (this.warmFilter) {
      this.warmFilter.frequency.setTargetAtTime(filterFreq * 1.5, now, 0.3);
    }
    
    // Update LFO rate based on theta (meditation depth)
    const lfoRate = 0.03 + theta * 0.1;
    if (this.ampLfo) {
      this.ampLfo.frequency.setTargetAtTime(lfoRate, now, 0.5);
    }
    if (this.filterLfo) {
      this.filterLfo.frequency.setTargetAtTime(lfoRate * 0.7, now, 0.5);
    }
    
    // Update layer levels based on brain state
    // More delta = more sub-bass
    // More gamma = more harmonics
    const subLevel = 0.5 + delta * 0.5;
    const warmLevel = 0.3 + theta * 0.3 + alpha * 0.2;
    const harmonicLevel = 0.1 + gamma * 0.3 + beta * 0.1;
    
    if (this.subGain) {
      this.subGain.gain.setTargetAtTime(subLevel, now, 0.3);
    }
    if (this.warmGain) {
      this.warmGain.gain.setTargetAtTime(warmLevel, now, 0.3);
    }
    if (this.harmonicGain) {
      this.harmonicGain.gain.setTargetAtTime(harmonicLevel, now, 0.3);
    }
    
    // Update binaural frequency based on dominant wave
    if (this.binauralEnabled && this.binauralRight) {
      const binauralDiff = this.binauralFreqs[state] || 10;
      this.binauralRight.frequency.setTargetAtTime(100 + binauralDiff, now, 1);
    }
  }
  
  /**
   * Set master volume (0-1)
   */
  setVolume(value) {
    this.masterVolume = Math.max(0, Math.min(1, value));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.1);
    }
  }
  
  /**
   * Set preset
   */
  setPreset(presetName) {
    if (!this.presets[presetName]) {
      console.warn(`[BassTherapy] Unknown preset: ${presetName}`);
      return;
    }
    
    if (this.isPlaying) {
      // Smoothly transition to new preset
      const preset = this.presets[presetName];
      const now = this.ctx.currentTime;
      
      if (this.subOsc) {
        this.subOsc.frequency.setTargetAtTime(preset.baseFreq, now, 1);
      }
      if (this.warmOsc) {
        this.warmOsc.frequency.setTargetAtTime(preset.baseFreq, now, 1);
      }
      if (this.harmonicOsc) {
        this.harmonicOsc.frequency.setTargetAtTime(preset.baseFreq * 2, now, 1);
      }
      if (this.subFilter) {
        this.subFilter.frequency.setTargetAtTime(preset.filterCutoff, now, 0.5);
      }
      if (this.ampLfo) {
        this.ampLfo.frequency.setTargetAtTime(preset.lfoRate, now, 0.5);
      }
      
      // Update gains
      if (this.subGain) {
        this.subGain.gain.setTargetAtTime(preset.subLevel, now, 1);
      }
      if (this.warmGain) {
        this.warmGain.gain.setTargetAtTime(preset.warmLevel, now, 1);
      }
      if (this.harmonicGain) {
        this.harmonicGain.gain.setTargetAtTime(preset.harmonicLevel, now, 1);
      }
      
      // Update binaural if enabled
      if (this.binauralEnabled && this.binauralRight) {
        this.binauralRight.frequency.setTargetAtTime(100 + preset.binauralFreq, now, 1);
      }
    }
    
    this.currentPreset = presetName;
    console.log(`[BassTherapy] Preset changed to: ${presetName}`);
  }
  
  /**
   * Toggle brainwave reactivity
   */
  toggleBrainwaveReactive() {
    this.brainwaveReactive = !this.brainwaveReactive;
    
    if (this.brainwaveReactive && this.isPlaying) {
      this.startBrainwaveUpdates();
    } else if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    console.log(`[BassTherapy] Brainwave reactivity: ${this.brainwaveReactive ? 'ON' : 'OFF'}`);
    return this.brainwaveReactive;
  }
  
  /**
   * Get current state for visualization
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      preset: this.currentPreset,
      volume: this.masterVolume,
      brainwaveReactive: this.brainwaveReactive,
      binauralEnabled: this.binauralEnabled,
      currentFrequency: this.subOsc?.frequency.value || 0
    };
  }
}

// Create singleton instance
const bassTherapy = new BassTherapyEngine();

// Make globally accessible
if (typeof window !== 'undefined') {
  window.bassTherapy = bassTherapy;
}

// Export instance
export { bassTherapy };

// Export control functions
export async function startBassTherapy(preset = 'meditation') {
  await bassTherapy.start(preset);
  return signal(() => bassTherapy.isPlaying ? 1 : 0);
}

export function stopBassTherapy() {
  bassTherapy.stop();
  return signal(() => 0);
}

export function setBassPreset(preset) {
  bassTherapy.setPreset(preset);
  return signal(() => 1);
}

export function setBassVolume(volume) {
  bassTherapy.setVolume(volume);
  return signal(() => volume);
}

export function toggleBassBinaural() {
  return signal(() => bassTherapy.toggleBinaural() ? 1 : 0);
}

export function toggleBassReactive() {
  return signal(() => bassTherapy.toggleBrainwaveReactive() ? 1 : 0);
}

// Export signals for current audio state
export const bassFrequency = signal(() => bassTherapy.subOsc?.frequency.value || 0);
export const bassPlaying = signal(() => bassTherapy.isPlaying ? 1 : 0);
