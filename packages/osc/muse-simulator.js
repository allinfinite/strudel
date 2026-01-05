#!/usr/bin/env node

/**
 * Muse OSC Signal Simulator
 * 
 * Simulates Muse 2 brainwave data for testing the /muse/ interface
 * Sends OSC messages to the Strudel OSC bridge (port 57121)
 * 
 * Usage:
 *   node muse-simulator.js [mode]
 * 
 * Modes:
 *   relaxed   - High alpha, moderate theta (default)
 *   meditative - High theta, moderate delta
 *   focused   - High beta, moderate gamma
 *   deep      - High delta, low everything else
 *   random    - Random fluctuations
 *   wave      - Smooth sine wave transitions between states
 */

import OSC from 'osc-js';
import readline from 'readline';

// Configuration
const OSC_HOST = '127.0.0.1';
const OSC_PORT = 57121;
const UPDATE_RATE = 10; // Hz (Mind Monitor sends at ~10Hz)

// State
let currentMode = process.argv[2] || 'wave';
let isRunning = true;
let time = 0;

// Brainwave values (0-1 range)
let brainwaves = {
  delta: 0.2,
  theta: 0.3,
  alpha: 0.4,
  beta: 0.2,
  gamma: 0.1
};

// Target values for smooth transitions
let targets = { ...brainwaves };

// Presets for different brain states
const presets = {
  relaxed: { delta: 0.15, theta: 0.25, alpha: 0.55, beta: 0.15, gamma: 0.08 },
  meditative: { delta: 0.25, theta: 0.50, alpha: 0.30, beta: 0.10, gamma: 0.05 },
  focused: { delta: 0.10, theta: 0.15, alpha: 0.25, beta: 0.45, gamma: 0.25 },
  deep: { delta: 0.60, theta: 0.30, alpha: 0.15, beta: 0.08, gamma: 0.03 },
  neutral: { delta: 0.20, theta: 0.25, alpha: 0.30, beta: 0.25, gamma: 0.15 }
};

// Create OSC client
const osc = new OSC({
  plugin: new OSC.DatagramPlugin({
    send: { host: OSC_HOST, port: OSC_PORT }
  })
});

osc.open();

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           MUSE BRAINWAVE SIMULATOR                        ║
╠═══════════════════════════════════════════════════════════╣
║  Sending OSC to ${OSC_HOST}:${OSC_PORT}                          ║
║  Mode: ${currentMode.padEnd(50)}║
╠═══════════════════════════════════════════════════════════╣
║  Commands:                                                ║
║    r - Relaxed mode (high alpha)                          ║
║    m - Meditative mode (high theta)                       ║
║    f - Focused mode (high beta)                           ║
║    d - Deep relaxation mode (high delta)                  ║
║    n - Neutral mode                                       ║
║    w - Wave mode (smooth transitions)                     ║
║    x - Random mode                                        ║
║    b - Simulate blink                                     ║
║    j - Simulate jaw clench                                ║
║    q - Quit                                               ║
╚═══════════════════════════════════════════════════════════╝
`);

// Smooth interpolation
function lerp(current, target, factor = 0.05) {
  return current + (target - current) * factor;
}

// Add noise to values
function addNoise(value, amount = 0.05) {
  return Math.max(0, Math.min(1, value + (Math.random() - 0.5) * amount));
}

// Update brainwave values based on mode
function updateBrainwaves() {
  time += 1 / UPDATE_RATE;
  
  switch (currentMode) {
    case 'wave':
      // Smoothly cycle through different states
      const cycleTime = 30; // seconds per full cycle
      const phase = (time % cycleTime) / cycleTime;
      
      if (phase < 0.25) {
        // Transition to relaxed
        targets = { ...presets.relaxed };
      } else if (phase < 0.5) {
        // Transition to meditative
        targets = { ...presets.meditative };
      } else if (phase < 0.75) {
        // Transition to deep
        targets = { ...presets.deep };
      } else {
        // Transition to neutral
        targets = { ...presets.neutral };
      }
      
      // Smooth interpolation with noise
      for (const band of Object.keys(brainwaves)) {
        brainwaves[band] = lerp(brainwaves[band], targets[band], 0.02);
        brainwaves[band] = addNoise(brainwaves[band], 0.02);
      }
      break;
      
    case 'random':
      // Random walk
      for (const band of Object.keys(brainwaves)) {
        brainwaves[band] = addNoise(brainwaves[band], 0.1);
      }
      break;
      
    default:
      // Static preset with noise
      const preset = presets[currentMode] || presets.neutral;
      for (const band of Object.keys(brainwaves)) {
        targets[band] = preset[band];
        brainwaves[band] = lerp(brainwaves[band], targets[band], 0.1);
        brainwaves[band] = addNoise(brainwaves[band], 0.03);
      }
  }
  
  // Normalize so they roughly sum to 1
  const sum = Object.values(brainwaves).reduce((a, b) => a + b, 0);
  for (const band of Object.keys(brainwaves)) {
    brainwaves[band] = brainwaves[band] / sum;
  }
}

// Send OSC messages
function sendOSC() {
  // Mind Monitor sends 4 values per band (one per sensor)
  // We'll simulate this with slight variations
  const sensors = [0, 1, 2, 3].map(() => Math.random() * 0.1 - 0.05);
  
  // Send relative band powers
  osc.send(new OSC.Message('/muse/elements/delta_relative', 
    ...sensors.map(s => brainwaves.delta + s)));
  osc.send(new OSC.Message('/muse/elements/theta_relative', 
    ...sensors.map(s => brainwaves.theta + s)));
  osc.send(new OSC.Message('/muse/elements/alpha_relative', 
    ...sensors.map(s => brainwaves.alpha + s)));
  osc.send(new OSC.Message('/muse/elements/beta_relative', 
    ...sensors.map(s => brainwaves.beta + s)));
  osc.send(new OSC.Message('/muse/elements/gamma_relative', 
    ...sensors.map(s => brainwaves.gamma + s)));
  
  // Send headband status (all good)
  osc.send(new OSC.Message('/muse/elements/horseshoe', 1, 1, 1, 1));
  osc.send(new OSC.Message('/muse/elements/touching_forehead', 1));
}

// Send blink
function sendBlink() {
  osc.send(new OSC.Message('/muse/blink', 1));
  console.log('👁️  Blink sent!');
  setTimeout(() => {
    osc.send(new OSC.Message('/muse/blink', 0));
  }, 100);
}

// Send jaw clench
function sendJawClench() {
  osc.send(new OSC.Message('/muse/jaw_clench', 1));
  console.log('😬 Jaw clench sent!');
  setTimeout(() => {
    osc.send(new OSC.Message('/muse/jaw_clench', 0));
  }, 200);
}

// Display current values
function displayStatus() {
  const bar = (value) => {
    const filled = Math.round(value * 20);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
  };
  
  process.stdout.write('\r');
  process.stdout.write(`δ ${bar(brainwaves.delta)} `);
  process.stdout.write(`θ ${bar(brainwaves.theta)} `);
  process.stdout.write(`α ${bar(brainwaves.alpha)} `);
  process.stdout.write(`β ${bar(brainwaves.beta)} `);
  process.stdout.write(`γ ${bar(brainwaves.gamma)} `);
  process.stdout.write(`[${currentMode}]  `);
}

// Main loop
const interval = setInterval(() => {
  if (!isRunning) {
    clearInterval(interval);
    osc.close();
    process.exit(0);
  }
  
  updateBrainwaves();
  sendOSC();
  displayStatus();
}, 1000 / UPDATE_RATE);

// Keyboard input handling
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') {
    isRunning = false;
    console.log('\n\nShutting down simulator...');
    return;
  }
  
  switch (key.name) {
    case 'r':
      currentMode = 'relaxed';
      console.log('\n🧘 Relaxed mode (high alpha)');
      break;
    case 'm':
      currentMode = 'meditative';
      console.log('\n🕉️  Meditative mode (high theta)');
      break;
    case 'f':
      currentMode = 'focused';
      console.log('\n🎯 Focused mode (high beta)');
      break;
    case 'd':
      currentMode = 'deep';
      console.log('\n😴 Deep relaxation mode (high delta)');
      break;
    case 'n':
      currentMode = 'neutral';
      console.log('\n😐 Neutral mode');
      break;
    case 'w':
      currentMode = 'wave';
      console.log('\n🌊 Wave mode (smooth transitions)');
      break;
    case 'x':
      currentMode = 'random';
      console.log('\n🎲 Random mode');
      break;
    case 'b':
      sendBlink();
      break;
    case 'j':
      sendJawClench();
      break;
    case 'q':
      isRunning = false;
      console.log('\n\nShutting down simulator...');
      break;
  }
});

// Handle clean exit
process.on('SIGINT', () => {
  isRunning = false;
  console.log('\n\nShutting down simulator...');
});
