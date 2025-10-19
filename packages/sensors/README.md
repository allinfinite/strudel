# @strudel/sensors

Control music with your **webcam**, **microphone**, **face**, **hands**, and **body**! This package provides sensor input patterns for Strudel, enabling creative interactive musical performances.

## Features

### 📷 **Webcam**
- Color extraction (RGB, HSL)
- Motion detection
- Edge detection
- Contrast analysis
- Grid-based sampling
- **Complete music generation system** with multiple layers:
  - Ambient textures
  - Arpeggiators
  - Bass lines
  - Chord progressions
  - Drum machines

### 🎤 **Audio Input**
- Volume & envelope detection
- Pitch detection & tracking
- FFT spectral analysis
- Frequency band extraction
- Onset/beat detection
- **Audio-reactive music layers**:
  - Melodic responses to pitch/volume
  - Percussion triggered by audio frequencies
  - Filter sweeps based on spectral content

### 😀 **Face Tracking** (MediaPipe)
- Face position & size
- Head rotation (pitch, yaw, roll)
- Mouth openness
- Smile detection
- Eyebrow raise

### ✋ **Hand Tracking** (MediaPipe)
- Hand position
- Hand openness (open/closed)
- Pinch gestures
- Multi-hand tracking

### 🕺 **Pose Tracking** (MediaPipe)
- Body position
- Arm spread
- Body height
- Arm angles
- Full-body gestures

## Installation

```bash
npm install @strudel/sensors
```

Or use directly in the browser:

```html
<script type="module">
  import { enableWebcam, camColorH } from 'https://unpkg.com/@strudel/sensors';
</script>
```

## Quick Start

### Webcam Control

```javascript
import { enableWebcam, camColorH, camMotion } from '@strudel/sensors';

// Enable webcam
await enableWebcam();

// Control music with color hue
note(camColorH.range(0, 12))
  .scale("C:major")
  .s("piano");

// Control speed with motion
s("bd sd hh sd")
  .fast(camMotion.range(1, 4));
```

### Microphone Control

```javascript
import { enableAudioIn, audioInNote, audioInVolume } from '@strudel/sensors';

// Enable microphone
await enableAudioIn();

// Follow your voice pitch
note(audioInNote)
  .s("sine")
  .gain(audioInVolume);

// Control filter with voice brightness
s("sawtooth")
  .note(48)
  .lpf(audioInCentroid.range(200, 5000));
```

### Face Tracking

```javascript
import { enableFaceTracking, faceX, faceMouthOpen } from '@strudel/sensors';

// Enable face tracking
await enableFaceTracking();

// Pan with head movement
s("bd sd")
  .pan(faceX);

// Control filter with mouth
s("sine")
  .note(60)
  .lpf(faceMouthOpen.range(200, 5000));
```

### Hand Tracking

```javascript
import { enableHandTracking, handX, handY } from '@strudel/sensors';

// Enable hand tracking
await enableHandTracking();

// Control pitch with hand height
note(handY.range(48, 72))
  .s("triangle")
  .pan(handX);
```

### Pose Tracking

```javascript
import { enablePoseTracking, poseSpread, poseX } from '@strudel/sensors';

// Enable pose tracking
await enablePoseTracking();

// Control volume with arm spread
note("<c e g b>")
  .s("piano")
  .gain(poseSpread);

// Control pitch with body position
note(poseX.range(48, 72))
  .s("sine");
```

## 🎵 Complete Music System

The sensors package includes a full-featured music generation system that responds to webcam and audio input!

### Quick Start - Webcam Music

```javascript
import { enableWebcam, startWebcamMusic } from '@strudel/sensors';

// 1. Enable webcam
await enableWebcam();

// 2. Start the music system!
startWebcamMusic();

// Now: wave colorful objects, move around, adjust lighting, stay still...
// The music automatically changes modes based on your movements!
```

### Musical Layers

#### Webcam-Controlled Layers

```javascript
import { startWebcamAudio, startAmbient, startChords, startBass, 
         startArp, startBeat } from '@strudel/sensors';

// Initialize the system
startWebcamAudio();

// Add layers individually
startAmbient();      // Evolving ambient textures (hue → scale, brightness → filter)
startChords();       // Harmonic chord progressions (changes every 2 seconds)
startBass();         // Groovy bass patterns (hue → scale, motion → speed)
startArp();          // Melodic arpeggios (hue → scale, brightness → speed, motion → octave)
startBeat();         // Drum machine (motion → BPM, brightness → hi-hat density)
```

#### Extra Musical Triggers

The system also includes special sound effects triggered by:
- **Sudden motion** → Dramatic chord cascade
- **Brightness spikes** → Ascending arpeggio
- **Sudden darkness** → Descending tones
- **Random sparkles** → During medium motion with color variety

### Control Functions

```javascript
// Start/stop individual layers
stopAmbient();
stopChords();
stopBass();
stopArp();
stopBeat();
stopAudioMelody();
stopAudioPercussion();
stopAudioReactive();

// Stop everything
stopWebcamAudio();

// Quick start functions
startFullMusic();          // All webcam-controlled layers
startFullAudioReactive();  // All layers including audio-reactive
```

### Interactive Mapping

#### Webcam Controls
- **Hue (color)** → Musical scale (major/minor/pentatonic/dorian)
- **Brightness** → Filter cutoff, arpeggio speed, chord timbre, mode triggers
- **Motion** → Tempo, octave shifts, bass speed, volume, mode triggers
- **Color changes** → Mode transitions, special effects

### Triggered Events

The system automatically triggers special sounds on:
- **Sudden motion** → Dramatic chord cascade
- **Brightness spikes** → Ascending arpeggio
- **Sudden darkness** → Descending tones
- **Color changes** → Mode transitions + sparkles

### 🎭 Dynamic Mode System

The music automatically changes between 5 distinct modes based on your interactions!

#### Modes

1. **🌙 AMBIENT** - Sparse, ethereal soundscapes
   - **Trigger:** Very dark (brightness < 0.2) AND still (motion < 0.1)
   - **Layers:** Ambient textures + chord pads
   - **Vibe:** Calm, spacious, meditative

2. **🎵 MELODIC** - Beautiful melodies and harmonies
   - **Trigger:** Medium brightness (0.4-0.7) + gentle motion (0.1-0.4)
   - **Layers:** Ambient + chords + arpeggiator + audio melody
   - **Vibe:** Pretty, musical, flowing

3. **⚡ ENERGETIC** - Full band arrangement
   - **Trigger:** Bright (brightness > 0.6) + moderate motion (0.4-0.8)
   - **Layers:** Drums + bass + arpeggiator + chords + audio percussion
   - **Vibe:** Driving, danceable, full

4. **🌪️ CHAOTIC** - Everything at once!
   - **Trigger:** Extreme motion (> 0.8) - jump around, wave arms frantically
   - **Layers:** ALL layers active simultaneously
   - **Vibe:** Intense, overwhelming, maximalist

5. **▪️ MINIMAL** - Just bass and drums
   - **Trigger:** Major color change (hue change > 0.4)
   - **Layers:** Bass + drums only
   - **Vibe:** Stripped down, focused, grooving

#### Manual Mode Control

```javascript
import { setMode, goAmbient, goMelodic, goEnergetic, 
         goChaotic, goMinimal, getCurrentMode } from '@strudel/sensors';

// Manual mode switching
setMode('energetic');  // Switch to energetic mode

// Quick access functions
goAmbient();    // → Ambient mode
goMelodic();    // → Melodic mode
goEnergetic();  // → Energetic mode
goChaotic();    // → Chaotic mode
goMinimal();    // → Minimal mode

// Check current mode
getCurrentMode();  // Returns: 'ambient', 'melodic', etc.
```

#### Mode Transitions

- Automatic transitions have a **3-second cooldown** to prevent rapid switching
- Each transition plays a unique **transition sound** based on the destination mode
- Manual mode switching bypasses the cooldown

## API Reference

### Webcam

#### Initialization
- `enableWebcam()` - Request camera access and start analysis
- `disableWebcam()` - Stop camera and release resources

#### Music System
- `startWebcamAudio()` - Initialize the music engine
- `stopWebcamAudio()` - Stop all music and close audio context
- `startAmbient()` / `stopAmbient()` - Ambient texture layer
- `startChords()` / `stopChords()` - Chord progression layer
- `startBass()` / `stopBass()` - Bass line layer
- `startArp()` / `stopArp()` - Arpeggiator layer
- `startBeat()` / `stopBeat()` - Drum machine layer
- `startAudioMelody()` / `stopAudioMelody()` - Audio-reactive melody
- `startAudioPercussion()` / `stopAudioPercussion()` - Audio-reactive drums
- `startAudioReactive()` / `stopAudioReactive()` - Audio-reactive effects
- `startFullMusic()` - Start all webcam-controlled layers
- `startFullAudioReactive()` - Start all layers including audio-reactive
- `setBPM(bpm)` - Set tempo (40-200 BPM)

#### Color Signals
- `camColorR` - Average red (0-1)
- `camColorG` - Average green (0-1)
- `camColorB` - Average blue (0-1)
- `camColorH` - Average hue (0-1)
- `camColorS` - Average saturation (0-1)
- `camColorL` - Average lightness (0-1)
- `camBrightness` - Overall brightness (0-1)

#### Motion Signals
- `camMotion` - Overall motion amount (0-1)
- `camMotionX` - Horizontal motion direction (-1 to 1)
- `camMotionY` - Vertical motion direction (-1 to 1)
- `camMotionSpeed` - Motion velocity (0-1)

#### Analysis Signals
- `camEdgeAmount` - Edge detection intensity (0-1)
- `camContrast` - Image contrast (0-1)

#### Grid Functions
- `camColorGrid(cols, rows)` - Grid of color values
- `camMotionGrid(cols, rows)` - Grid of motion values

### Audio Input

#### Initialization
- `enableAudioIn()` - Request microphone access and start analysis
- `disableAudioIn()` - Stop microphone and release resources

#### Volume Signals
- `audioInVolume` - RMS volume (0-1)
- `audioInPeak` - Peak amplitude (0-1)
- `audioInEnvelope` - Smoothed envelope (0-1)

#### Pitch Signals
- `audioInPitch` - Detected pitch in Hz
- `audioInNote` - Detected pitch as MIDI note number

#### Spectral Signals
- `audioInBass` - Low frequency energy (20-250 Hz, 0-1)
- `audioInMid` - Mid frequency energy (250-2000 Hz, 0-1)
- `audioInHigh` - High frequency energy (2000-20000 Hz, 0-1)
- `audioInCentroid` - Spectral centroid/brightness (0-1)
- `audioInFlux` - Spectral flux/change rate (0-1)
- `audioInFFT` - Full FFT array

#### Rhythm Signals
- `audioInOnset` - Beat/onset detection (0 or 1)

#### Functions
- `audioInGate(threshold)` - Binary gate based on volume
- `audioInBands(n)` - N frequency bands as array

### Face Tracking

#### Initialization
- `enableFaceTracking()` - Start face tracking with MediaPipe
- `disableFaceTracking()` - Stop face tracking

#### Position Signals
- `faceX` - Face center X (0-1, left to right)
- `faceY` - Face center Y (0-1, top to bottom)
- `faceSize` - Face size/distance (0-1)

#### Rotation Signals
- `faceRotX` - Pitch/nodding (0-1)
- `faceRotY` - Yaw/head shake (0-1)
- `faceRotZ` - Roll/head tilt (0-1)

#### Expression Signals
- `faceMouthOpen` - Mouth openness (0-1)
- `faceSmile` - Smile amount (0-1)
- `faceEyebrowRaise` - Eyebrow raise (0-1)
- `faceCount` - Number of faces detected

### Hand Tracking

#### Initialization
- `enableHandTracking()` - Start hand tracking with MediaPipe
- `disableHandTracking()` - Stop hand tracking

#### Position Signals
- `handX` - Hand center X (0-1)
- `handY` - Hand center Y (0-1)

#### Gesture Signals
- `handOpenness` - Hand open vs closed (0-1)
- `handPinch` - Pinch gesture (0-1)
- `handCount` - Number of hands detected

### Pose Tracking

#### Initialization
- `enablePoseTracking()` - Start pose tracking with MediaPipe
- `disablePoseTracking()` - Stop pose tracking

#### Position Signals
- `poseX` - Body center X (0-1)
- `poseY` - Body center Y (0-1)

#### Body Signals
- `poseSpread` - Arm spread width (0-1)
- `poseHeight` - Body height in frame (0-1)
- `poseLeftArmAngle` - Left arm angle (0-1)
- `poseRightArmAngle` - Right arm angle (0-1)

## Creative Examples

### 1. Color-Controlled Synthesizer
```javascript
await enableWebcam();

// RGB to note triads
stack(
  note(camColorR.range(0, 12)),
  note(camColorG.range(0, 12)),
  note(camColorB.range(0, 12))
)
  .scale("C:major")
  .s("triangle");
```

### 2. Voice-Following Harmony
```javascript
await enableAudioIn();

// Melody follows voice
note(audioInNote)
  .s("sine")
  .stack(
    // Add harmonies based on volume
    note(audioInNote.add(7)).gain(audioInVolume.mul(0.5)),
    note(audioInNote.sub(12)).gain(audioInVolume.mul(0.3))
  );
```

### 3. Face Theremin
```javascript
await enableFaceTracking();

// Horizontal = pitch, Vertical = filter
note(faceX.range(48, 84))
  .s("sawtooth")
  .lpf(faceY.range(200, 5000))
  .gain(faceSize);
```

### 4. Motion-Reactive Drums
```javascript
await enableWebcam();

const grid = camMotionGrid(4, 4);

stack(
  s("bd").struct(grid[0].gt(0.3)),  // Top-left = kick
  s("sd").struct(grid[5].gt(0.3)),  // Center = snare
  s("hh").struct(grid[15].gt(0.2))  // Bottom-right = hihat
);
```

### 5. Hand Gesture Scenes
```javascript
await enableHandTracking();

// Open hand = melody, Closed hand = drums
handOpenness.gt(0.5).pick([
  s("bd sd hh sd"),           // Closed: drums
  note("c e g b").s("piano")  // Open: melody
]);
```

### 6. Full-Body Dance Controller
```javascript
await enablePoseTracking();

note(poseX.range(36, 84))      // Position = pitch
  .s("sawtooth")
  .lpf(poseY.range(200, 8000))  // Height = filter
  .gain(poseSpread)              // Arms = volume
  .delay(poseHeight.range(0, 0.5)); // Crouch = delay
```

### 7. Multi-Modal Performance
```javascript
// Combine everything!
await Promise.all([
  enableWebcam(),
  enableAudioIn(),
  enableFaceTracking()
]);

stack(
  // Voice sets melody
  note(audioInNote)
    .s(camColorH.choose("sine", "triangle", "sawtooth"))
    .when(() => audioInVolume.gt(0.1)),
  
  // Face controls harmony
  note(faceX.range(48, 72))
    .add(faceRotZ.range(-7, 7).floor())
    .s("square")
    .lpf(faceMouthOpen.range(500, 5000)),
  
  // Motion triggers rhythm
  s("bd sd hh sd")
    .fast(camMotion.range(1, 4))
    .gain(audioInBass.range(0.5, 1))
);
```

### 8. Ambient Colorscape
```javascript
await enableWebcam();

// Slow, generative patterns shaped by colors
stack(
  note(camColorH.slow(8).range(0, 12))
    .scale("C:minor:pentatonic")
    .s("sine")
    .room(camColorS)
    .delay(camColorL.range(0, 0.5)),
  
  note(camBrightness.slow(16).range(0, 7))
    .scale("C:minor:pentatonic")
    .s("triangle")
    .slow(2)
);
```

## Performance Tips

1. **Lower resolution** - The webcam runs at 320x240 for better performance
2. **One sensor at a time** - Each sensor requires processing power
3. **Combine sensors** - Use `Promise.all()` to initialize multiple sensors
4. **Smoothing** - Use `.slow()` or signal smoothing for less jittery control
5. **Threshold** - Use `.gt()`, `.lt()` for cleaner triggers

## Browser Support

- **Webcam**: All modern browsers with `getUserMedia` support
- **Audio Input**: All modern browsers with Web Audio API
- **ML Vision**: Requires WebGL and WASM support
  - Chrome/Edge: ✅ Full support
  - Firefox: ✅ Full support
  - Safari: ⚠️ Partial support (may require permissions)

## License

AGPL-3.0-or-later

## Contributing

Issues and pull requests welcome at [Strudel repository](https://codeberg.org/uzu/strudel)

