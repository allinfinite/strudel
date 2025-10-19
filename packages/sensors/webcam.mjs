// webcam.mjs - Webcam-based sensors for Strudel

import { signal, time } from '@strudel/core';

/**
 * Enables webcam access for Strudel patterns
 * @name enableWebcam
 * @example
 * await enableWebcam()
 * note(camColorH.range(0,12)).scale("C:major")
 */

/**
 * Average red color from webcam (0-1)
 * @name camColorR
 * @return {Pattern}
 * @example
 * note(camColorR.range(0,12)).scale("C:major")
 */

/**
 * Average green color from webcam (0-1)
 * @name camColorG
 * @return {Pattern}
 */

/**
 * Average blue color from webcam (0-1)
 * @name camColorB
 * @return {Pattern}
 */

/**
 * Average hue from webcam (0-1)
 * @name camColorH
 * @return {Pattern}
 * @example
 * s("bd sd").fast(camColorH.range(1,4))
 */

/**
 * Average saturation from webcam (0-1)
 * @name camColorS
 * @return {Pattern}
 */

/**
 * Average lightness from webcam (0-1)
 * @name camColorL
 * @return {Pattern}
 */

/**
 * Average brightness from webcam (0-1)
 * @name camBrightness
 * @return {Pattern}
 * @example
 * s("hh*8").gain(camBrightness)
 */

/**
 * Overall motion amount from webcam (0-1)
 * @name camMotion
 * @return {Pattern}
 * @example
 * s("bd sd hh sd").fast(camMotion.range(1,4))
 */

/**
 * Horizontal motion direction (-1 to 1, left to right)
 * @name camMotionX
 * @return {Pattern}
 */

/**
 * Vertical motion direction (-1 to 1, top to bottom)
 * @name camMotionY
 * @return {Pattern}
 */

/**
 * Motion speed/velocity (0-1)
 * @name camMotionSpeed
 * @return {Pattern}
 */

/**
 * Edge detection amount (0-1)
 * @name camEdgeAmount
 * @return {Pattern}
 * @example
 * s("bd*4").lpf(camEdgeAmount.range(200,5000))
 */

/**
 * Image contrast level (0-1)
 * @name camContrast
 * @return {Pattern}
 */

class WebcamHandler {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.stream = null;
    this.animationId = null;
    this.previousFrame = null;
    
    // State
    this._color = { r: 0, g: 0, b: 0, h: 0, s: 0, l: 0 };
    this._brightness = 0;
    this._motion = 0;
    this._motionX = 0;
    this._motionY = 0;
    this._motionSpeed = 0;
    this._edgeAmount = 0;
    this._contrast = 0;
    this._dominantColor = '#000000';
    
    // Grid data
    this._colorGrid = [];
    this._motionGrid = [];
    
    // Settings
    this.width = 320; // Lower res for performance
    this.height = 240;
    this.gridCols = 4;
    this.gridRows = 4;
    
    this.isInitialized = false;
  }
  
  async init() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Check for secure context and mediaDevices support
      if (!navigator || !navigator.mediaDevices) {
        throw new Error('Camera access not available. Please ensure you are using HTTPS or localhost, and your browser supports webcam access.');
      }
      
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: this.width },
          height: { ideal: this.height },
          facingMode: 'user',
        },
      });
      
      // Create video element
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.playsInline = true;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          resolve();
        };
      });
      
      // Wait for video to actually start playing
      await new Promise((resolve) => {
        this.video.onplaying = resolve;
      });
      
      // Create canvas for analysis
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      
      // Initialize grids
      this.initGrids();
      
    this.isInitialized = true;
    
    // Start analysis loop
    this.analyze();
    
    console.log('Webcam initialized successfully');
    console.log('Try: note(camColorH.range(0,12)).scale("C:major").s("piano")');
    } catch (error) {
      console.error('Failed to initialize webcam:', error);
      throw error;
    }
  }
  
  initGrids() {
    const cells = this.gridCols * this.gridRows;
    this._colorGrid = Array(cells).fill().map(() => ({ r: 0, g: 0, b: 0, h: 0, s: 0, l: 0 }));
    this._motionGrid = Array(cells).fill(0);
  }
  
  analyze() {
    if (!this.video || !this.ctx) {
      return;
    }
    
    // Check if video is actually playing and has data
    if (this.video.readyState < 2 || this.video.videoWidth === 0) {
      this.animationId = requestAnimationFrame(() => this.analyze());
      return;
    }
    
    // Draw current frame
    this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    
    // Analyze color
    this.analyzeColor(imageData);
    
    // Analyze motion (if we have a previous frame)
    if (this.previousFrame) {
      this.analyzeMotion(imageData, this.previousFrame);
    }
    
    // Analyze edges
    this.analyzeEdges(imageData);
    
    // Analyze contrast
    this.analyzeContrast(imageData);
    
    // Store current frame for next comparison
    this.previousFrame = new Uint8ClampedArray(imageData.data);
    
    // Debug: Log values every 60 frames (about once per second)
    if (this.frameCount % 60 === 0) {
      console.log('Webcam values:', {
        hue: this._color.h.toFixed(2),
        brightness: this._brightness.toFixed(2),
        motion: this._motion.toFixed(2)
      });
    }
    this.frameCount = (this.frameCount || 0) + 1;
    
    // Continue loop
    this.animationId = requestAnimationFrame(() => this.analyze());
  }
  
  analyzeColor(imageData) {
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    let brightness = 0;
    const pixelCount = data.length / 4;
    
    // Calculate averages
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    
    r /= pixelCount;
    g /= pixelCount;
    b /= pixelCount;
    brightness /= pixelCount;
    
    // Normalize to 0-1
    this._color.r = r / 255;
    this._color.g = g / 255;
    this._color.b = b / 255;
    this._brightness = brightness / 255;
    
    // Convert to HSL
    const hsl = this.rgbToHsl(r, g, b);
    this._color.h = hsl.h;
    this._color.s = hsl.s;
    this._color.l = hsl.l;
    
    // Analyze grid colors
    this.analyzeColorGrid(imageData);
  }
  
  analyzeColorGrid(imageData) {
    const cellWidth = Math.floor(this.width / this.gridCols);
    const cellHeight = Math.floor(this.height / this.gridRows);
    const data = imageData.data;
    
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const cellIndex = row * this.gridCols + col;
        let r = 0, g = 0, b = 0, count = 0;
        
        // Sample pixels in this cell
        for (let y = row * cellHeight; y < (row + 1) * cellHeight; y++) {
          for (let x = col * cellWidth; x < (col + 1) * cellWidth; x++) {
            const i = (y * this.width + x) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }
        
        r /= count;
        g /= count;
        b /= count;
        
        this._colorGrid[cellIndex].r = r / 255;
        this._colorGrid[cellIndex].g = g / 255;
        this._colorGrid[cellIndex].b = b / 255;
        
        const hsl = this.rgbToHsl(r, g, b);
        this._colorGrid[cellIndex].h = hsl.h;
        this._colorGrid[cellIndex].s = hsl.s;
        this._colorGrid[cellIndex].l = hsl.l;
      }
    }
  }
  
  analyzeMotion(current, previous) {
    const data = current.data;
    let totalDiff = 0;
    let motionX = 0;
    let motionY = 0;
    let motionCount = 0;
    const threshold = 20; // Motion detection threshold
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % this.width;
      const y = Math.floor(pixelIndex / this.width);
      
      // Calculate pixel difference
      const rDiff = Math.abs(data[i] - previous[i]);
      const gDiff = Math.abs(data[i + 1] - previous[i + 1]);
      const bDiff = Math.abs(data[i + 2] - previous[i + 2]);
      const avgDiff = (rDiff + gDiff + bDiff) / 3;
      
      totalDiff += avgDiff;
      
      if (avgDiff > threshold) {
        // Normalize coordinates to -1 to 1
        motionX += (x / this.width) * 2 - 1;
        motionY += (y / this.height) * 2 - 1;
        motionCount++;
      }
    }
    
    // Normalize motion amount
    const pixelCount = data.length / 4;
    this._motion = Math.min(totalDiff / (pixelCount * 50), 1); // Scale to 0-1
    
    // Calculate motion direction
    if (motionCount > 0) {
      this._motionX = motionX / motionCount;
      this._motionY = motionY / motionCount;
      this._motionSpeed = Math.sqrt(this._motionX ** 2 + this._motionY ** 2);
    } else {
      this._motionX = 0;
      this._motionY = 0;
      this._motionSpeed = 0;
    }
    
    // Analyze motion grid
    this.analyzeMotionGrid(current, previous);
  }
  
  analyzeMotionGrid(current, previous) {
    const cellWidth = Math.floor(this.width / this.gridCols);
    const cellHeight = Math.floor(this.height / this.gridRows);
    const data = current.data;
    
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const cellIndex = row * this.gridCols + col;
        let totalDiff = 0;
        let count = 0;
        
        for (let y = row * cellHeight; y < (row + 1) * cellHeight; y++) {
          for (let x = col * cellWidth; x < (col + 1) * cellWidth; x++) {
            const i = (y * this.width + x) * 4;
            const rDiff = Math.abs(data[i] - previous[i]);
            const gDiff = Math.abs(data[i + 1] - previous[i + 1]);
            const bDiff = Math.abs(data[i + 2] - previous[i + 2]);
            totalDiff += (rDiff + gDiff + bDiff) / 3;
            count++;
          }
        }
        
        this._motionGrid[cellIndex] = Math.min(totalDiff / (count * 50), 1);
      }
    }
  }
  
  analyzeEdges(imageData) {
    // Simple Sobel edge detection
    const data = imageData.data;
    let edgeSum = 0;
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const i = (y * this.width + x) * 4;
        
        // Get grayscale values
        const tl = (data[i - this.width * 4 - 4] + data[i - this.width * 4 - 3] + data[i - this.width * 4 - 2]) / 3;
        const t = (data[i - this.width * 4] + data[i - this.width * 4 + 1] + data[i - this.width * 4 + 2]) / 3;
        const tr = (data[i - this.width * 4 + 4] + data[i - this.width * 4 + 5] + data[i - this.width * 4 + 6]) / 3;
        const l = (data[i - 4] + data[i - 3] + data[i - 2]) / 3;
        const r = (data[i + 4] + data[i + 5] + data[i + 6]) / 3;
        const bl = (data[i + this.width * 4 - 4] + data[i + this.width * 4 - 3] + data[i + this.width * 4 - 2]) / 3;
        const b = (data[i + this.width * 4] + data[i + this.width * 4 + 1] + data[i + this.width * 4 + 2]) / 3;
        const br = (data[i + this.width * 4 + 4] + data[i + this.width * 4 + 5] + data[i + this.width * 4 + 6]) / 3;
        
        // Sobel operators
        const gx = -tl - 2 * l - bl + tr + 2 * r + br;
        const gy = -tl - 2 * t - tr + bl + 2 * b + br;
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edgeSum += magnitude;
      }
    }
    
    // Normalize
    const pixelCount = (this.width - 2) * (this.height - 2);
    this._edgeAmount = Math.min(edgeSum / (pixelCount * 200), 1);
  }
  
  analyzeContrast(imageData) {
    const data = imageData.data;
    const pixelCount = data.length / 4;
    
    // Calculate standard deviation of brightness
    let sum = 0;
    let sumSq = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += brightness;
      sumSq += brightness * brightness;
    }
    
    const mean = sum / pixelCount;
    const variance = (sumSq / pixelCount) - (mean * mean);
    const stdDev = Math.sqrt(variance);
    
    // Normalize (typical stddev is 0-70 for typical images)
    this._contrast = Math.min(stdDev / 70, 1);
  }
  
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h, s, l };
  }
  
  getColor() {
    return this._color;
  }
  
  // Debug method to check if webcam is working
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      color: this._color,
      brightness: this._brightness,
      motion: this._motion
    };
  }
  
  getBrightness() {
    return this._brightness;
  }
  
  getMotion() {
    return this._motion;
  }
  
  getMotionX() {
    return this._motionX;
  }
  
  getMotionY() {
    return this._motionY;
  }
  
  getMotionSpeed() {
    return this._motionSpeed;
  }
  
  getEdgeAmount() {
    return this._edgeAmount;
  }
  
  getContrast() {
    return this._contrast;
  }
  
  getColorGrid() {
    return this._colorGrid;
  }
  
  getMotionGrid() {
    return this._motionGrid;
  }
  
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.isInitialized = false;
  }
}

// Create singleton instance
const webcam = new WebcamHandler();

// Make webcam globally accessible for stats and debugging
if (typeof window !== 'undefined') {
  window.webcam = webcam;
}

// Export the webcam instance for direct access
export { webcam };

// Export initialization function
export async function enableWebcam() {
  await webcam.init();
  return signal(() => 1); // Return a pattern that indicates webcam is ready
}

// Export color signals - force refresh by accessing internal values
export const camColorR = signal(() => webcam.isInitialized ? webcam._color.r : 0.5);
export const camColorG = signal(() => webcam.isInitialized ? webcam._color.g : 0.5);
export const camColorB = signal(() => webcam.isInitialized ? webcam._color.b : 0.5);
export const camColorH = signal(() => webcam.isInitialized ? webcam._color.h : 0.5);
export const camColorS = signal(() => webcam.isInitialized ? webcam._color.s : 0.5);
export const camColorL = signal(() => webcam.isInitialized ? webcam._color.l : 0.5);
export const camBrightness = signal(() => webcam.isInitialized ? webcam._brightness : 0.5);

// Export motion signals - force refresh by accessing internal values
export const camMotion = signal(() => webcam.isInitialized ? webcam._motion : 0);
export const camMotionX = signal(() => webcam.isInitialized ? webcam._motionX : 0);
export const camMotionY = signal(() => webcam.isInitialized ? webcam._motionY : 0);
export const camMotionSpeed = signal(() => webcam.isInitialized ? webcam._motionSpeed : 0);

// Export analysis signals - force refresh by accessing internal values
export const camEdgeAmount = signal(() => webcam.isInitialized ? webcam._edgeAmount : 0);
export const camContrast = signal(() => webcam.isInitialized ? webcam._contrast : 0);

// Export grid functions
export function camColorGrid(cols = 4, rows = 4) {
  webcam.gridCols = cols;
  webcam.gridRows = rows;
  webcam.initGrids();
  return signal(() => webcam.getColorGrid());
}

export function camMotionGrid(cols = 4, rows = 4) {
  webcam.gridCols = cols;
  webcam.gridRows = rows;
  webcam.initGrids();
  return signal(() => webcam.getMotionGrid());
}

// Export stop function
export function disableWebcam() {
  webcam.stop();
}

// Debug function to check webcam status
export function webcamDebug() {
  return signal(() => webcam.getDebugInfo());
}

// Simple test pattern that should always work
export function webcamTest() {
  return signal(() => {
    console.log('Webcam test - values:', webcam.getDebugInfo());
    return 1;
  });
}

// Test individual sensor values with internal values
export function testCamHue() {
  return signal(() => {
    const hue = webcam.isInitialized ? webcam._color.h : 0.5;
    console.log('Hue value:', hue);
    return hue;
  });
}

export function testCamMotion() {
  return signal(() => {
    const motion = webcam.isInitialized ? webcam._motion : 0;
    console.log('Motion value:', motion);
    return motion;
  });
}

export function testCamBrightness() {
  return signal(() => {
    const brightness = webcam.isInitialized ? webcam._brightness : 0.5;
    console.log('Brightness value:', brightness);
    return brightness;
  });
}

// Create reactive signals that update in real-time
let lastUpdateTime = 0;

export function testHueSound() {
  return signal(() => {
    if (!webcam.isInitialized) {
      return 0.5;
    }
    // Force update by checking time
    const now = Date.now();
    if (now - lastUpdateTime > 16) { // ~60fps
      lastUpdateTime = now;
    }
    const hue = webcam._color.h;
    console.log('Hue for sound:', hue);
    return hue;
  });
}

export function testMotionSound() {
  return signal(() => {
    if (!webcam.isInitialized) {
      return 0;
    }
    const motion = webcam._motion;
    console.log('Motion for sound:', motion);
    return motion;
  });
}

export function testBrightnessSound() {
  return signal(() => {
    if (!webcam.isInitialized) {
      return 0.5;
    }
    const brightness = webcam._brightness;
    console.log('Brightness for sound:', brightness);
    return brightness;
  });
}

// Alternative approach: Create signals that use time-based updates
export function liveHue() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    return webcam._color.h;
  });
}

export function liveMotion() {
  return signal(() => {
    if (!webcam.isInitialized) return 0;
    return webcam._motion;
  });
}

export function liveBrightness() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    return webcam._brightness;
  });
}

// Try using Strudel's time-based approach with time() function
export function camHueLive() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    // Use time to force updates
    const time = Date.now() / 1000;
    const hue = webcam._color.h;
    console.log('Live hue:', hue, 'at time:', time);
    return hue;
  });
}

export function camMotionLive() {
  return signal(() => {
    if (!webcam.isInitialized) return 0;
    const motion = webcam._motion;
    console.log('Live motion:', motion);
    return motion;
  });
}

export function camBrightnessLive() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    const brightness = webcam._brightness;
    console.log('Live brightness:', brightness);
    return brightness;
  });
}

// Try a completely different approach using time-based patterns
export function camHueTime() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    // Force evaluation by using time
    const time = Date.now() / 1000;
    const hue = webcam._color.h;
    console.log('Time-based hue:', hue, 'time:', time);
    return hue;
  });
}

export function camMotionTime() {
  return signal(() => {
    if (!webcam.isInitialized) return 0;
    const motion = webcam._motion;
    console.log('Time-based motion:', motion);
    return motion;
  });
}

export function camBrightnessTime() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    const brightness = webcam._brightness;
    console.log('Time-based brightness:', brightness);
    return brightness;
  });
}

// Try using Strudel's time() function to force updates
export function camHueReactive() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    // Use Strudel's time() function to force updates
    const currentTime = time();
    const hue = webcam._color.h;
    console.log('Reactive hue:', hue, 'strudel time:', currentTime);
    return hue;
  });
}

export function camMotionReactive() {
  return signal(() => {
    if (!webcam.isInitialized) return 0;
    const currentTime = time();
    const motion = webcam._motion;
    console.log('Reactive motion:', motion, 'strudel time:', currentTime);
    return motion;
  });
}

export function camBrightnessReactive() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    const currentTime = time();
    const brightness = webcam._brightness;
    console.log('Reactive brightness:', brightness, 'strudel time:', currentTime);
    return brightness;
  });
}

// HACK: Create a global update mechanism that forces Strudel to re-evaluate
let webcamUpdateCounter = 0;

// Force update every frame
setInterval(() => {
  webcamUpdateCounter++;
}, 16); // ~60fps

// HACK: Use the counter to force signal updates
export function camHueHack() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    // Force update by using the counter
    const hue = webcam._color.h;
    const counter = webcamUpdateCounter;
    console.log('HACK hue:', hue, 'counter:', counter);
    return hue;
  });
}

export function camMotionHack() {
  return signal(() => {
    if (!webcam.isInitialized) return 0;
    const motion = webcam._motion;
    const counter = webcamUpdateCounter;
    console.log('HACK motion:', motion, 'counter:', counter);
    return motion;
  });
}

export function camBrightnessHack() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    const brightness = webcam._brightness;
    const counter = webcamUpdateCounter;
    console.log('HACK brightness:', brightness, 'counter:', counter);
    return brightness;
  });
}

// SUPER HACK: Create signals that change their output to force re-evaluation
export function camBrightnessSuperHack() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    const brightness = webcam._brightness;
    const counter = webcamUpdateCounter;
    // Add tiny variations to force re-evaluation
    const variation = (counter % 100) / 100000; // Tiny variation
    const result = brightness + variation;
    console.log('SUPER HACK brightness:', brightness, 'result:', result, 'counter:', counter);
    return result;
  });
}

export function camMotionSuperHack() {
  return signal(() => {
    if (!webcam.isInitialized) return 0;
    const motion = webcam._motion;
    const counter = webcamUpdateCounter;
    // Add tiny variations to force re-evaluation
    const variation = (counter % 100) / 100000; // Tiny variation
    const result = motion + variation;
    console.log('SUPER HACK motion:', motion, 'result:', result, 'counter:', counter);
    return result;
  });
}

export function camHueSuperHack() {
  return signal(() => {
    if (!webcam.isInitialized) return 0.5;
    const hue = webcam._color.h;
    const counter = webcamUpdateCounter;
    // Add tiny variations to force re-evaluation
    const variation = (counter % 100) / 100000; // Tiny variation
    const result = hue + variation;
    console.log('SUPER HACK hue:', hue, 'result:', result, 'counter:', counter);
    return result;
  });
}

// COMPLETELY DIFFERENT APPROACH: Direct audio manipulation
let webcamAudioContext = null;
let webcamGainNode = null;
let webcamOscillator = null;
let webcamFilter = null;
let webcamReverb = null;
let webcamDelay = null;
let webcamOscillator2 = null;
let webcamOscillator3 = null;

// Beat system
let beatInterval = null;
let beatEnabled = false;
let currentBeat = 0;
let bpm = 120;

// Musical system
let arpeggiatorInterval = null;
let bassInterval = null;
let chordInterval = null;
let arpEnabled = false;
let bassEnabled = false;
let chordsEnabled = false;
let currentArpNote = 0;
let lastHue = 0;
let lastBrightness = 0;
let lastMotion = 0;

// Audio reactive system
let audioReactiveEnabled = false;
let audioReactiveInterval = null;
let melodyInterval = null;
let melodyEnabled = false;
let percussionInterval = null;
let percussionEnabled = false;

// Song mode system
let currentMode = 'ambient'; // ambient, melodic, energetic, chaotic, minimal
let modeTransitionTimeout = null;
let lastModeChange = 0;
let triggerCooldown = 3000; // 3 seconds between mode changes

// Extended trigger tracking
let lastSaturation = 0;
let lastContrast = 0;
let lastEdges = 0;
let rapidMotionCount = 0;
let stillnessCount = 0;
let colorfulnessHistory = [];

// Musical note synthesis
function playNote(frequency, duration = 0.2, waveType = 'sine', filterFreq = 2000) {
  if (!webcamAudioContext) return;
  
  const now = webcamAudioContext.currentTime;
  const osc = webcamAudioContext.createOscillator();
  const gain = webcamAudioContext.createGain();
  const filter = webcamAudioContext.createBiquadFilter();
  const reverb = webcamAudioContext.createConvolver();
  
  // Create simple reverb
  const impulseLength = webcamAudioContext.sampleRate * 1;
  const impulse = webcamAudioContext.createBuffer(2, impulseLength, webcamAudioContext.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < impulseLength; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 3);
    }
  }
  reverb.buffer = impulse;
  
  osc.type = waveType;
  osc.frequency.setValueAtTime(frequency, now);
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, now);
  
  gain.gain.setValueAtTime(0.08, now); // Reduced from 0.15 to 0.08
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  osc.connect(filter);
  filter.connect(reverb);
  reverb.connect(gain);
  gain.connect(webcamAudioContext.destination);
  
  osc.start(now);
  osc.stop(now + duration);
}

function getScale(hue) {
  const majorScale = [0, 2, 4, 5, 7, 9, 11, 12];
  const minorScale = [0, 2, 3, 5, 7, 8, 10, 12];
  const pentatonic = [0, 2, 4, 7, 9, 12, 14];
  const dorian = [0, 2, 3, 5, 7, 9, 10, 12];
  
  if (hue < 0.25) return majorScale;
  else if (hue < 0.5) return minorScale;
  else if (hue < 0.75) return pentatonic;
  else return dorian;
}

function noteFromScale(scale, index, octave = 4) {
  const baseFreq = 220; // A3
  const noteIndex = index % scale.length;
  const octaveOffset = Math.floor(index / scale.length);
  const semitoneOffset = scale[noteIndex] + (octaveOffset * 12) + ((octave - 3) * 12);
  return baseFreq * Math.pow(2, semitoneOffset / 12);
}

// Arpeggiator
function playArpeggio() {
  if (!arpEnabled || !webcamAudioContext) return;
  
  const hue = webcam._color.h;
  const brightness = webcam._brightness;
  const motion = webcam._motion;
  
  const scale = getScale(hue);
  const octave = motion > 0.5 ? 4 : 3; // Lowered from 5:4 to 4:3
  const freq = noteFromScale(scale, currentArpNote, octave);
  const filterFreq = 500 + (brightness * 4500);
  
  playNote(freq, 0.15, 'triangle', filterFreq);
  
  currentArpNote++;
  if (currentArpNote >= 8) currentArpNote = 0;
  
  // Adjust speed based on brightness
  const speed = 100 + (brightness * 150); // 100-250ms
  clearTimeout(arpeggiatorInterval);
  arpeggiatorInterval = setTimeout(playArpeggio, speed);
}

// Bass line
function playBassLine() {
  if (!bassEnabled || !webcamAudioContext) return;
  
  const hue = webcam._color.h;
  const motion = webcam._motion;
  
  const scale = getScale(hue);
  const bassPattern = [0, 0, 3, 0, 0, 3, 4, 3]; // Classic bass pattern
  const step = currentBeat % bassPattern.length;
  const noteIndex = bassPattern[step];
  const freq = noteFromScale(scale, noteIndex, 2); // Low octave
  
  playNote(freq, 0.3, 'sawtooth', 800);
  
  // Bass plays on every beat or half beat
  const speed = motion > 0.5 ? 250 : 500;
  clearTimeout(bassInterval);
  bassInterval = setTimeout(playBassLine, speed);
}

// Chord pads
function playChord() {
  if (!chordsEnabled || !webcamAudioContext) return;
  
  const hue = webcam._color.h;
  const brightness = webcam._brightness;
  
  const scale = getScale(hue);
  const rootIndex = Math.floor((currentBeat / 4) % 4) * 2; // Change every 4 beats
  
  // Play triad chord
  const root = noteFromScale(scale, rootIndex, 3);
  const third = noteFromScale(scale, rootIndex + 2, 3);
  const fifth = noteFromScale(scale, rootIndex + 4, 3);
  
  const filterFreq = 300 + (brightness * 2700);
  playNote(root, 1.5, 'sine', filterFreq);
  playNote(third, 1.5, 'sine', filterFreq);
  playNote(fifth, 1.5, 'sine', filterFreq);
  
  clearTimeout(chordInterval);
  chordInterval = setTimeout(playChord, 2000); // Every 2 seconds
}

// Mode transition functions
function transitionToMode(newMode) {
  if (newMode === currentMode) return;
  
  console.log(`🎵 MODE CHANGE: ${currentMode} → ${newMode}`);
  
  // Play transition sound
  playModeTransitionSound(newMode);
  
  // Stop all current layers
  stopAllLayers();
  
  // Start new mode layers after brief pause
  setTimeout(() => {
    currentMode = newMode;
    activateMode(newMode);
  }, 500);
  
  lastModeChange = Date.now();
}

function stopAllLayers() {
  ambientEnabled = false;
  chordsEnabled = false;
  bassEnabled = false;
  arpEnabled = false;
  beatEnabled = false;
  melodyEnabled = false;
  percussionEnabled = false;
  audioReactiveEnabled = false;
  
  if (ambientInterval) clearTimeout(ambientInterval);
  if (chordInterval) clearTimeout(chordInterval);
  if (bassInterval) clearTimeout(bassInterval);
  if (arpeggiatorInterval) clearTimeout(arpeggiatorInterval);
  if (beatInterval) clearTimeout(beatInterval);
  if (melodyInterval) clearTimeout(melodyInterval);
  if (percussionInterval) clearTimeout(percussionInterval);
  if (audioReactiveInterval) clearTimeout(audioReactiveInterval);
}

function activateMode(mode) {
  console.log(`🎼 Activating ${mode} mode...`);
  
  switch(mode) {
    case 'ambient':
      // Sparse, ethereal
      setTimeout(() => { ambientEnabled = true; playAmbientNote(); }, 100);
      setTimeout(() => { chordsEnabled = true; playChord(); }, 800);
      break;
      
    case 'melodic':
      // Beautiful melodies
      setTimeout(() => { ambientEnabled = true; playAmbientNote(); }, 100);
      setTimeout(() => { chordsEnabled = true; playChord(); }, 300);
      setTimeout(() => { arpEnabled = true; playArpeggio(); }, 600);
      break;
      
    case 'energetic':
      // Full arrangement
      setTimeout(() => { beatEnabled = true; playBeat(); }, 100);
      setTimeout(() => { bassEnabled = true; playBassLine(); }, 300);
      setTimeout(() => { arpEnabled = true; playArpeggio(); }, 500);
      setTimeout(() => { chordsEnabled = true; playChord(); }, 700);
      setTimeout(() => { ambientEnabled = true; playAmbientNote(); }, 900);
      break;
      
    case 'chaotic':
      // Intense, crazy - ALL LAYERS
      setTimeout(() => { beatEnabled = true; playBeat(); }, 50);
      setTimeout(() => { bassEnabled = true; playBassLine(); }, 100);
      setTimeout(() => { arpEnabled = true; playArpeggio(); }, 150);
      setTimeout(() => { chordsEnabled = true; playChord(); }, 200);
      setTimeout(() => { ambientEnabled = true; playAmbientNote(); }, 250);
      break;
      
    case 'minimal':
      // Just bass and occasional sounds
      setTimeout(() => { bassEnabled = true; playBassLine(); }, 100);
      setTimeout(() => { beatEnabled = true; playBeat(); }, 500);
      break;
  }
}

function playModeTransitionSound(newMode) {
  if (!webcamAudioContext) return;
  
  const now = webcamAudioContext.currentTime;
  const hue = webcam._color.h;
  const scale = getScale(hue);
  
  // Different transition sounds for each mode
  switch(newMode) {
    case 'ambient':
      // Descending shimmer
      for (let i = 0; i < 8; i++) {
        const freq = noteFromScale(scale, 7 - i, 4); // Lowered to octave 4
        setTimeout(() => playNote(freq, 0.8, 'sine', 8000), i * 60);
      }
      break;
      
    case 'melodic':
      // Ascending arpeggio
      for (let i = 0; i < 12; i++) {
        const freq = noteFromScale(scale, i, 4 + Math.floor(i / 4));
        setTimeout(() => playNote(freq, 0.3, 'triangle', 5000), i * 50);
      }
      break;
      
    case 'energetic':
      // Big chord hit
      for (let i = 0; i < 6; i++) {
        const freq = noteFromScale(scale, i * 2, 4);
        playNote(freq, 1.5, 'sawtooth', 3000);
      }
      playKick();
      break;
      
    case 'chaotic':
      // Crazy sweep (lowered frequency range)
      for (let i = 0; i < 20; i++) {
        const freq = 100 + (Math.random() * 800); // Lowered from 2000 to 800 Hz
        setTimeout(() => playNote(freq, 0.1, 'square', 4000), i * 30);
      }
      break;
      
    case 'minimal':
      // Single deep bass note
      const freq = noteFromScale(scale, 0, 1);
      playNote(freq, 2.0, 'sawtooth', 200);
      break;
  }
}

// Trigger events based on webcam changes
function checkTriggers() {
  if (!webcam.isInitialized) return;
  
  const hue = webcam._color.h;
  const saturation = webcam._color.s;
  const brightness = webcam._brightness;
  const motion = webcam._motion;
  const contrast = webcam._contrast;
  const edges = webcam._edgeAmount;
  
  const now = Date.now();
  const canTrigger = (now - lastModeChange) > triggerCooldown;
  
  // Track motion patterns
  if (motion > 0.5) rapidMotionCount++;
  else rapidMotionCount = Math.max(0, rapidMotionCount - 1);
  
  if (motion < 0.05) stillnessCount++;
  else stillnessCount = 0;
  
  // Track colorfulness
  colorfulnessHistory.push(saturation);
  if (colorfulnessHistory.length > 10) colorfulnessHistory.shift();
  const avgSaturation = colorfulnessHistory.reduce((a, b) => a + b, 0) / colorfulnessHistory.length;
  
  if (!canTrigger) {
    lastHue = hue;
    lastBrightness = brightness;
    lastMotion = motion;
    lastSaturation = saturation;
    lastContrast = contrast;
    lastEdges = edges;
    return;
  }
  
  // MODE TRIGGERS (priority order - most specific first)
  
  // CHAOTIC MODE: Extreme motion OR sustained rapid motion OR high edges (busy scene)
  if (motion > 0.8 || rapidMotionCount > 30 || (edges > 0.7 && motion > 0.5)) {
    if (currentMode !== 'chaotic') {
      transitionToMode('chaotic');
      return;
    }
  }
  
  // MINIMAL MODE: Major color change OR very desaturated (grayscale) OR very high contrast
  if (Math.abs(hue - lastHue) > 0.3 || avgSaturation < 0.2 || contrast > 0.8) {
    if (currentMode !== 'minimal') {
      transitionToMode('minimal');
      return;
    }
  }
  
  // AMBIENT MODE: Very dark and still OR very long stillness OR very low saturation
  if ((brightness < 0.2 && motion < 0.15) || stillnessCount > 100 || (avgSaturation < 0.15 && motion < 0.2)) {
    if (currentMode !== 'ambient') {
      transitionToMode('ambient');
      return;
    }
  }
  
  // ENERGETIC MODE: Bright and moving OR high saturation with motion OR high contrast with motion
  if ((brightness > 0.6 && motion > 0.4 && motion < 0.8) || 
      (avgSaturation > 0.7 && motion > 0.3) || 
      (contrast > 0.6 && motion > 0.3 && brightness > 0.5)) {
    if (currentMode !== 'energetic') {
      transitionToMode('energetic');
      return;
    }
  }
  
  // MELODIC MODE: Medium brightness, gentle motion OR colorful and calm
  if ((brightness > 0.3 && brightness < 0.7 && motion > 0.1 && motion < 0.4) ||
      (avgSaturation > 0.5 && motion < 0.3)) {
    if (currentMode !== 'melodic') {
      transitionToMode('melodic');
      return;
    }
  }
  
  // MINI TRIGGERS (don't change mode, just add flair)
  
  // Sudden motion trigger - dramatic chord
  if (motion > 0.7 && lastMotion < 0.5) {
    const scale = getScale(hue);
    for (let i = 0; i < 5; i++) {
      const freq = noteFromScale(scale, i * 2, 4); // Lowered to octave 4
      setTimeout(() => playNote(freq, 0.4, 'square', 3000), i * 50);
    }
  }
  
  // Brightness spike trigger - ascending arpeggio
  if (brightness > 0.8 && lastBrightness < 0.6) {
    const scale = getScale(hue);
    for (let i = 0; i < 8; i++) {
      const freq = noteFromScale(scale, i, 4); // Lowered to octave 4
      setTimeout(() => playNote(freq, 0.2, 'sine', 8000), i * 40);
    }
  }
  
  // Sudden darkness - descending tones
  if (brightness < 0.2 && lastBrightness > 0.5) {
    const scale = getScale(hue);
    for (let i = 0; i < 6; i++) {
      const freq = noteFromScale(scale, 5 - i, 4);
      setTimeout(() => playNote(freq, 0.5, 'sine', 2000), i * 80);
    }
  }
  
  // Medium motion with color variety - sparkle
  if (motion > 0.3 && motion < 0.6 && Math.random() > 0.98) {
    const scale = getScale(hue);
    const randomNote = Math.floor(Math.random() * scale.length);
    const freq = noteFromScale(scale, randomNote, 4);
    playNote(freq, 0.3, 'sine', 6000);
  }
  
  // Saturation spike - colorful bloom
  if (saturation > 0.8 && lastSaturation < 0.5) {
    const scale = getScale(hue);
    for (let i = 0; i < 4; i++) {
      const freq = noteFromScale(scale, i * 2, 3);
      setTimeout(() => playNote(freq, 0.4, 'triangle', 3000), i * 100);
    }
  }
  
  // Desaturation - gray wash (minor chord)
  if (saturation < 0.2 && lastSaturation > 0.5) {
    const scale = getScale(hue);
    const freq1 = noteFromScale(scale, 0, 3);
    const freq2 = noteFromScale(scale, 2, 3);
    const freq3 = noteFromScale(scale, 4, 3);
    playNote(freq1, 0.8, 'sine', 1000);
    playNote(freq2, 0.8, 'sine', 1000);
    playNote(freq3, 0.8, 'sine', 1000);
  }
  
  // High contrast - sharp stabs
  if (contrast > 0.7 && lastContrast < 0.4) {
    for (let i = 0; i < 3; i++) {
      playKick();
      setTimeout(() => playSnare(), 100 + (i * 150));
    }
  }
  
  // Edge detection spike - glitchy sounds
  if (edges > 0.6 && lastEdges < 0.3) {
    const scale = getScale(hue);
    for (let i = 0; i < 6; i++) {
      const randomNote = Math.floor(Math.random() * scale.length);
      const freq = noteFromScale(scale, randomNote, 3);
      setTimeout(() => playNote(freq, 0.1, 'square', 2000), i * 40);
    }
  }
  
  // Stillness reward - gentle chime
  if (stillnessCount === 150) { // After ~3 seconds of stillness
    const scale = getScale(hue);
    const freq = noteFromScale(scale, 0, 4);
    playNote(freq, 2.0, 'sine', 4000);
    setTimeout(() => {
      const freq2 = noteFromScale(scale, 4, 4);
      playNote(freq2, 2.0, 'sine', 4000);
    }, 800);
  }
  
  // Rapid motion burst - drum fill
  if (rapidMotionCount === 20) {
    playKick();
    setTimeout(() => playSnare(), 80);
    setTimeout(() => playHiHat(), 160);
    setTimeout(() => playSnare(), 240);
    setTimeout(() => playKick(), 320);
  }
  
  // Hue shift - transition chime
  if (Math.abs(hue - lastHue) > 0.15 && Math.abs(hue - lastHue) < 0.3) {
    const scale = getScale(hue);
    const oldScale = getScale(lastHue);
    const freq1 = noteFromScale(oldScale, 0, 3);
    const freq2 = noteFromScale(scale, 0, 3);
    playNote(freq1, 0.5, 'sine', 3000);
    setTimeout(() => playNote(freq2, 0.5, 'sine', 3000), 250);
  }
  
  // Brightness wave - rising/falling arpeggio
  const brightnessDelta = brightness - lastBrightness;
  if (Math.abs(brightnessDelta) > 0.2 && Math.random() > 0.95) {
    const scale = getScale(hue);
    const direction = brightnessDelta > 0 ? 1 : -1;
    for (let i = 0; i < 5; i++) {
      const noteIdx = direction > 0 ? i : (4 - i);
      const freq = noteFromScale(scale, noteIdx, 3);
      setTimeout(() => playNote(freq, 0.15, 'sine', 5000), i * 60);
    }
  }
  
  // Contrast pulse - rhythmic kick
  if (contrast > 0.5 && Math.abs(contrast - lastContrast) > 0.3) {
    playKick();
    setTimeout(() => playKick(), 200);
  }
  
  // Saturation and motion combo - melodic flourish
  if (saturation > 0.6 && motion > 0.5 && Math.random() > 0.97) {
    const scale = getScale(hue);
    const pattern = [0, 2, 4, 7, 4, 2];
    pattern.forEach((note, i) => {
      const freq = noteFromScale(scale, note, 3);
      setTimeout(() => playNote(freq, 0.2, 'triangle', 4000), i * 80);
    });
  }
  
  lastHue = hue;
  lastBrightness = brightness;
  lastMotion = motion;
  lastSaturation = saturation;
  lastContrast = contrast;
  lastEdges = edges;
}

// Drum synthesis functions
function playKick() {
  if (!webcamAudioContext) return;
  
  const now = webcamAudioContext.currentTime;
  const osc = webcamAudioContext.createOscillator();
  const gain = webcamAudioContext.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
  
  gain.gain.setValueAtTime(1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  
  osc.connect(gain);
  gain.connect(webcamAudioContext.destination);
  
  osc.start(now);
  osc.stop(now + 0.5);
}

function playSnare() {
  if (!webcamAudioContext) return;
  
  const now = webcamAudioContext.currentTime;
  
  // Noise component
  const bufferSize = webcamAudioContext.sampleRate * 0.2;
  const buffer = webcamAudioContext.createBuffer(1, bufferSize, webcamAudioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = webcamAudioContext.createBufferSource();
  noise.buffer = buffer;
  
  const noiseFilter = webcamAudioContext.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;
  
  const noiseGain = webcamAudioContext.createGain();
  noiseGain.gain.setValueAtTime(0.8, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(webcamAudioContext.destination);
  
  noise.start(now);
  noise.stop(now + 0.2);
  
  // Tone component
  const osc = webcamAudioContext.createOscillator();
  const oscGain = webcamAudioContext.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
  
  oscGain.gain.setValueAtTime(0.5, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  
  osc.connect(oscGain);
  oscGain.connect(webcamAudioContext.destination);
  
  osc.start(now);
  osc.stop(now + 0.1);
}

function playHiHat() {
  if (!webcamAudioContext) return;
  
  const now = webcamAudioContext.currentTime;
  
  const bufferSize = webcamAudioContext.sampleRate * 0.05;
  const buffer = webcamAudioContext.createBuffer(1, bufferSize, webcamAudioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = webcamAudioContext.createBufferSource();
  noise.buffer = buffer;
  
  const noiseFilter = webcamAudioContext.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 7000;
  
  const noiseGain = webcamAudioContext.createGain();
  noiseGain.gain.setValueAtTime(0.3, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(webcamAudioContext.destination);
  
  noise.start(now);
  noise.stop(now + 0.05);
}

// Beat sequencer
function playBeat() {
  if (!beatEnabled || !webcamAudioContext) return;
  
  // Get webcam values for dynamic beat patterns
  const motion = webcam._motion;
  const brightness = webcam._brightness;
  
  // Adjust BPM based on motion (60-140 BPM)
  const dynamicBPM = 80 + (motion * 60);
  
  // Beat patterns based on brightness
  const step = currentBeat % 16;
  
  // Kick drum pattern
  if (step === 0 || step === 4 || step === 8 || step === 12) {
    playKick();
  }
  
  // Snare pattern
  if (step === 4 || step === 12) {
    playSnare();
  }
  
  // Hi-hat pattern - more active with higher brightness
  if (brightness > 0.3) {
    if (step % 2 === 0) {
      playHiHat();
    }
  } else {
    if (step % 4 === 0) {
      playHiHat();
    }
  }
  
  // Extra kicks based on motion
  if (motion > 0.5 && (step === 6 || step === 14)) {
    playKick();
  }
  
  currentBeat++;
  
  // Schedule next beat
  const beatTime = (60 / dynamicBPM) * 250; // 16th note
  clearTimeout(beatInterval);
  beatInterval = setTimeout(playBeat, beatTime);
}

// Ambient texture system
let ambientInterval = null;
let ambientEnabled = false;
let ambientOscillators = [];

function playAmbientNote() {
  if (!ambientEnabled || !webcamAudioContext) return;
  
  const hue = webcam._color.h;
  const brightness = webcam._brightness;
  const motion = webcam._motion;
  
  const scale = getScale(hue);
  
  // Play a random note from the scale in a comfortable octave
  const noteIndex = Math.floor(Math.random() * scale.length);
  const octave = 4 + Math.floor(Math.random() * 2); // Octaves 4-5 (was 5-6)
  const freq = noteFromScale(scale, noteIndex, octave);
  
  // Create soft, evolving tone
  const now = webcamAudioContext.currentTime;
  const osc = webcamAudioContext.createOscillator();
  const gain = webcamAudioContext.createGain();
  const filter = webcamAudioContext.createBiquadFilter();
  const panner = webcamAudioContext.createStereoPanner();
  
  // Random wave type
  const waveTypes = ['sine', 'triangle'];
  osc.type = waveTypes[Math.floor(Math.random() * waveTypes.length)];
  
  // Slightly detune for shimmer
  osc.detune.setValueAtTime((Math.random() - 0.5) * 20, now);
  osc.frequency.setValueAtTime(freq, now);
  
  // Filter
  filter.type = 'lowpass';
  const filterFreq = 1000 + (brightness * 4000);
  filter.frequency.setValueAtTime(filterFreq, now);
  filter.Q.setValueAtTime(0.5, now);
  
  // Panning based on motion
  const panPosition = (Math.random() - 0.5) * 2; // -1 to 1
  panner.pan.setValueAtTime(panPosition, now);
  
  // Envelope
  const duration = 2 + (Math.random() * 4); // 2-6 seconds
  const attackTime = 0.5 + (Math.random() * 1.5); // 0.5-2s attack
  const volume = 0.02 + (brightness * 0.03); // Quiet, ethereal (reduced from 0.03-0.07 to 0.02-0.05)
  
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + attackTime);
  gain.gain.setValueAtTime(volume, now + duration - 1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  
  // Connect
  osc.connect(filter);
  filter.connect(panner);
  panner.connect(gain);
  gain.connect(webcamAudioContext.destination);
  
  osc.start(now);
  osc.stop(now + duration);
  
  // Store reference
  ambientOscillators.push({ osc, stopTime: now + duration });
  
  // Clean up old oscillators
  const currentTime = webcamAudioContext.currentTime;
  ambientOscillators = ambientOscillators.filter(item => item.stopTime > currentTime);
  
  // Schedule next note with some randomness
  const nextNoteDelay = 500 + (Math.random() * 1500) + (motion * 1000); // Faster when moving
  clearTimeout(ambientInterval);
  ambientInterval = setTimeout(playAmbientNote, nextNoteDelay);
}

// Start ambient system
export function startAmbient() {
  if (!webcamAudioContext) {
    console.error('Audio system not initialized. Call startWebcamAudio() first.');
    return signal(() => 1);
  }
  
  ambientEnabled = true;
  
  // Start multiple notes at once for richness
  playAmbientNote();
  setTimeout(() => playAmbientNote(), 300);
  setTimeout(() => playAmbientNote(), 800);
  
  console.log('Ambient textures started');
  return signal(() => 1);
}

// Stop ambient system
export function stopAmbient() {
  ambientEnabled = false;
  if (ambientInterval) {
    clearTimeout(ambientInterval);
    ambientInterval = null;
  }
  console.log('Ambient textures stopped');
  return signal(() => 1);
}

// Create a direct audio system that bypasses Strudel entirely
export function startWebcamAudio() {
  if (!webcam.isInitialized) {
    console.error('Webcam not initialized');
    return;
  }
  
  // Create Web Audio API context
  webcamAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Start monitoring webcam for triggers
  updateWebcamAudio();
  
  console.log('Webcam audio system initialized');
  console.log('Use startAmbient(), startChords(), startBass(), startArp(), startBeat() to add layers');
  
  return signal(() => 1); // Return a pattern so Strudel doesn't error
}

function updateWebcamAudio() {
  if (!webcam.isInitialized || !webcamAudioContext) return;
  
  // Check for trigger events
  checkTriggers();
  
  // Continue updating
  requestAnimationFrame(updateWebcamAudio);
}

export function stopWebcamAudio() {
  // Stop all musical elements
  beatEnabled = false;
  arpEnabled = false;
  bassEnabled = false;
  chordsEnabled = false;
  ambientEnabled = false;
  melodyEnabled = false;
  percussionEnabled = false;
  audioReactiveEnabled = false;
  
  if (beatInterval) {
    clearTimeout(beatInterval);
    beatInterval = null;
  }
  if (arpeggiatorInterval) {
    clearTimeout(arpeggiatorInterval);
    arpeggiatorInterval = null;
  }
  if (bassInterval) {
    clearTimeout(bassInterval);
    bassInterval = null;
  }
  if (chordInterval) {
    clearTimeout(chordInterval);
    chordInterval = null;
  }
  if (ambientInterval) {
    clearTimeout(ambientInterval);
    ambientInterval = null;
  }
  if (melodyInterval) {
    clearTimeout(melodyInterval);
    melodyInterval = null;
  }
  if (percussionInterval) {
    clearTimeout(percussionInterval);
    percussionInterval = null;
  }
  if (audioReactiveInterval) {
    clearTimeout(audioReactiveInterval);
    audioReactiveInterval = null;
  }
  
  if (webcamAudioContext) {
    webcamAudioContext.close();
    webcamAudioContext = null;
  }
  console.log('Enhanced webcam audio system stopped');
  return signal(() => 1); // Return a pattern so Strudel doesn't error
}

// Enable beat
export function startBeat() {
  if (!webcamAudioContext) {
    console.error('Audio system not initialized. Call startWebcamAudio() first.');
    return signal(() => 1);
  }
  
  beatEnabled = true;
  currentBeat = 0;
  playBeat();
  console.log('Beat started');
  return signal(() => 1);
}

// Disable beat
export function stopBeat() {
  beatEnabled = false;
  if (beatInterval) {
    clearTimeout(beatInterval);
    beatInterval = null;
  }
  console.log('Beat stopped');
  return signal(() => 1);
}

// Set BPM
export function setBPM(newBPM) {
  bpm = Math.max(40, Math.min(200, newBPM)); // Clamp between 40-200
  console.log('BPM set to:', bpm);
  return signal(() => 1);
}

// Enable arpeggiator
export function startArp() {
  if (!webcamAudioContext) {
    console.error('Audio system not initialized. Call startWebcamAudio() first.');
    return signal(() => 1);
  }
  
  arpEnabled = true;
  currentArpNote = 0;
  playArpeggio();
  console.log('Arpeggiator started');
  return signal(() => 1);
}

// Disable arpeggiator
export function stopArp() {
  arpEnabled = false;
  if (arpeggiatorInterval) {
    clearTimeout(arpeggiatorInterval);
    arpeggiatorInterval = null;
  }
  console.log('Arpeggiator stopped');
  return signal(() => 1);
}

// Enable bass
export function startBass() {
  if (!webcamAudioContext) {
    console.error('Audio system not initialized. Call startWebcamAudio() first.');
    return signal(() => 1);
  }
  
  bassEnabled = true;
  playBassLine();
  console.log('Bass started');
  return signal(() => 1);
}

// Disable bass
export function stopBass() {
  bassEnabled = false;
  if (bassInterval) {
    clearTimeout(bassInterval);
    bassInterval = null;
  }
  console.log('Bass stopped');
  return signal(() => 1);
}

// Enable chords
export function startChords() {
  if (!webcamAudioContext) {
    console.error('Audio system not initialized. Call startWebcamAudio() first.');
    return signal(() => 1);
  }
  
  chordsEnabled = true;
  playChord();
  console.log('Chords started');
  return signal(() => 1);
}

// Disable chords
export function stopChords() {
  chordsEnabled = false;
  if (chordInterval) {
    clearTimeout(chordInterval);
    chordInterval = null;
  }
  console.log('Chords stopped');
  return signal(() => 1);
}

// Audio-reactive melodic layer
function playAudioMelody() {
  if (!melodyEnabled || !webcamAudioContext) return;
  
  // Import audio input values (we'll access them from the global audioIn object if available)
  const audioVolume = window.audioInHandler?._volume || 0;
  const audioPitch = window.audioInHandler?._pitch || 0;
  const audioFlux = window.audioInHandler?._flux || 0;
  
  const hue = webcam._color.h;
  const brightness = webcam._brightness;
  
  if (audioVolume > 0.1) { // Only play when there's audio
    const scale = getScale(hue);
    
    // Use audio pitch to influence melody
    const pitchInfluence = audioPitch > 0 ? Math.log2(audioPitch / 220) : 0;
    const noteIndex = Math.floor(Math.abs(pitchInfluence * 5)) % scale.length;
    const octave = 4 + Math.floor(audioVolume * 2); // Louder audio = higher octave
    
    const freq = noteFromScale(scale, noteIndex, octave);
    const filterFreq = 1000 + (brightness * 4000);
    const volume = Math.min(audioVolume * 0.2, 0.15);
    
    playNote(freq, 0.3, 'triangle', filterFreq);
  }
  
  // Timing based on audio flux (change rate)
  const speed = audioFlux > 0.3 ? 150 : 300;
  clearTimeout(melodyInterval);
  melodyInterval = setTimeout(playAudioMelody, speed);
}

// Audio-reactive percussion
function playAudioPercussion() {
  if (!percussionEnabled || !webcamAudioContext) return;
  
  const audioVolume = window.audioInHandler?._volume || 0;
  const audioBass = window.audioInHandler?._bass || 0;
  const audioHigh = window.audioInHandler?._high || 0;
  const audioOnset = window.audioInHandler?._onset || 0;
  
  const motion = webcam._motion;
  
  // Bass drum on loud low frequencies
  if (audioBass > 0.5 || audioOnset > 0) {
    playKick();
  }
  
  // Hi-hat on high frequencies
  if (audioHigh > 0.4 && Math.random() > 0.5) {
    playHiHat();
  }
  
  // Snare on medium volume and motion
  if (audioVolume > 0.4 && motion > 0.3 && Math.random() > 0.7) {
    playSnare();
  }
  
  clearTimeout(percussionInterval);
  percussionInterval = setTimeout(playAudioPercussion, 100);
}

// Audio-reactive filter sweeps and effects
function audioReactiveSweep() {
  if (!audioReactiveEnabled || !webcamAudioContext) return;
  
  const audioVolume = window.audioInHandler?._volume || 0;
  const audioCentroid = window.audioInHandler?._centroid || 0;
  const audioMid = window.audioInHandler?._mid || 0;
  
  const hue = webcam._color.h;
  const brightness = webcam._brightness;
  
  // Create sweeping filtered noise based on audio
  if (audioVolume > 0.2 && Math.random() > 0.95) {
    const now = webcamAudioContext.currentTime;
    
    // Noise buffer
    const bufferSize = webcamAudioContext.sampleRate * 0.5;
    const buffer = webcamAudioContext.createBuffer(1, bufferSize, webcamAudioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = webcamAudioContext.createBufferSource();
    noise.buffer = buffer;
    
    const filter = webcamAudioContext.createBiquadFilter();
    filter.type = 'bandpass';
    
    const startFreq = 200 + (audioCentroid * 2000);
    const endFreq = startFreq + (audioMid * 3000);
    
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.5);
    filter.Q.setValueAtTime(10 + (brightness * 20), now);
    
    const gain = webcamAudioContext.createGain();
    gain.gain.setValueAtTime(audioVolume * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(webcamAudioContext.destination);
    
    noise.start(now);
    noise.stop(now + 0.5);
  }
  
  clearTimeout(audioReactiveInterval);
  audioReactiveInterval = setTimeout(audioReactiveSweep, 50);
}

// Start audio-reactive melody
export function startAudioMelody() {
  if (!webcamAudioContext) {
    console.error('Audio system not initialized. Call startWebcamAudio() first.');
    return signal(() => 1);
  }
  
  melodyEnabled = true;
  playAudioMelody();
  console.log('Audio-reactive melody started (speak/sing/play into microphone!)');
  return signal(() => 1);
}

// Stop audio-reactive melody
export function stopAudioMelody() {
  melodyEnabled = false;
  if (melodyInterval) {
    clearTimeout(melodyInterval);
    melodyInterval = null;
  }
  console.log('Audio-reactive melody stopped');
  return signal(() => 1);
}

// Start audio-reactive percussion
export function startAudioPercussion() {
  if (!webcamAudioContext) {
    console.error('Audio system not initialized. Call startWebcamAudio() first.');
    return signal(() => 1);
  }
  
  percussionEnabled = true;
  playAudioPercussion();
  console.log('Audio-reactive percussion started (make sounds into microphone!)');
  return signal(() => 1);
}

// Stop audio-reactive percussion
export function stopAudioPercussion() {
  percussionEnabled = false;
  if (percussionInterval) {
    clearTimeout(percussionInterval);
    percussionInterval = null;
  }
  console.log('Audio-reactive percussion stopped');
  return signal(() => 1);
}

// Start audio-reactive effects
export function startAudioReactive() {
  if (!webcamAudioContext) {
    console.error('Audio system not initialized. Call startWebcamAudio() first.');
    return signal(() => 1);
  }
  
  audioReactiveEnabled = true;
  audioReactiveSweep();
  console.log('Audio-reactive effects started');
  return signal(() => 1);
}

// Stop audio-reactive effects
export function stopAudioReactive() {
  audioReactiveEnabled = false;
  if (audioReactiveInterval) {
    clearTimeout(audioReactiveInterval);
    audioReactiveInterval = null;
  }
  console.log('Audio-reactive effects stopped');
  return signal(() => 1);
}

// Start everything (full arrangement)
export function startFullMusic() {
  startWebcamAudio();
  setTimeout(() => startAmbient(), 100);
  setTimeout(() => startChords(), 500);
  setTimeout(() => startBass(), 1000);
  setTimeout(() => startArp(), 1500);
  setTimeout(() => startBeat(), 2000);
  console.log('Full music arrangement started!');
  return signal(() => 1);
}

// Start everything with automatic mode changes
export function startFullAudioReactive() {
  startWebcamAudio();
  currentMode = 'energetic';
  activateMode('energetic');
  console.log('🎵 Webcam music system started!');
  console.log('The music will automatically change modes based on your movements!');
  console.log('Try: Cover camera, wave colors, move around, stay still...');
  return signal(() => 1);
}

// Alias for clarity
export const startWebcamMusic = startFullAudioReactive;

// Manual mode switching
export function setMode(mode) {
  const validModes = ['ambient', 'melodic', 'energetic', 'chaotic', 'minimal'];
  if (!validModes.includes(mode)) {
    console.error(`Invalid mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
    return signal(() => 1);
  }
  
  if (!webcamAudioContext) {
    console.error('Audio system not initialized. Call startWebcamAudio() first.');
    return signal(() => 1);
  }
  
  transitionToMode(mode);
  return signal(() => 1);
}

// Get current mode
export function getCurrentMode() {
  console.log(`Current mode: ${currentMode}`);
  return currentMode;
}

// Quick mode access functions
export function goAmbient() {
  setMode('ambient');
  return signal(() => 1);
}

export function goMelodic() {
  setMode('melodic');
  return signal(() => 1);
}

export function goEnergetic() {
  setMode('energetic');
  return signal(() => 1);
}

export function goChaotic() {
  setMode('chaotic');
  return signal(() => 1);
}

export function goMinimal() {
  setMode('minimal');
  return signal(() => 1);
}

// Add volume control
export function setWebcamVolume(volume) {
  if (webcamGainNode) {
    const now = webcamAudioContext.currentTime;
    webcamGainNode.gain.setValueAtTime(volume, now);
    console.log('Webcam volume set to:', volume);
  }
  return signal(() => 1);
}

// Add frequency control
export function setWebcamFrequency(freq) {
  if (webcamOscillator) {
    const now = webcamAudioContext.currentTime;
    webcamOscillator.frequency.setValueAtTime(freq, now);
    console.log('Webcam frequency set to:', freq);
  }
  return signal(() => 1);
}

