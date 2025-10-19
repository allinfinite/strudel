# Strudel Sensors Demo Examples

This directory contains interactive HTML demos showcasing the `@strudel/sensors` package capabilities.

## Demos

### 📷 [webcam.html](./webcam.html)
Demonstrates webcam-based control:
- Color extraction (RGB, HSL)
- Motion detection
- Edge detection
- Contrast analysis

**Try it:** Wave colored objects in front of your camera, move around to create rhythmic variations!

### 🎤 [audio-in.html](./audio-in.html)
Demonstrates microphone input analysis:
- Volume and envelope detection
- Pitch tracking
- Spectral analysis (bass, mid, high)
- Onset detection

**Try it:** Sing, hum, whistle, or beatbox into your microphone!

### 😀✋🕺 [ml-vision.html](./ml-vision.html)
Demonstrates MediaPipe ML vision tracking:
- Face tracking (position, expressions, rotation)
- Hand tracking (gestures, position)
- Pose tracking (body movement, arm positions)

**Try it:** Move your head, make facial expressions, gesture with your hands, or dance!

### 🎭 [combined.html](./combined.html)
**The ultimate multi-modal performance system** combining all sensors:
- Voice pitch sets melody
- Camera colors choose timbres
- Face movements add harmony
- Motion creates rhythm
- Spectral features add effects

**Try it:** Combine everything for a complete interactive music performance!

## Running the Demos

### Option 1: Local Development Server (Recommended)

From the Strudel root directory:

```bash
# Start the development server
pnpm dev

# Then navigate to:
# http://localhost:3000/examples/sensors-demo/webcam.html
# http://localhost:3000/examples/sensors-demo/audio-in.html
# http://localhost:3000/examples/sensors-demo/ml-vision.html
# http://localhost:3000/examples/sensors-demo/combined.html
```

### Option 2: Python Simple Server

From this directory:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/webcam.html` in your browser.

### Option 3: Live Server Extension

If using VS Code, install the "Live Server" extension and right-click any HTML file → "Open with Live Server"

## Browser Requirements

- **Modern browser** with WebRTC support (Chrome, Firefox, Edge, Safari)
- **HTTPS or localhost** - browser security requires secure context for camera/mic access
- **Camera and microphone permissions** - you'll be prompted to allow access

### ML Vision Demos Requirements
- WebGL support
- WASM support
- Good performance recommended (ML models are compute-intensive)

## Troubleshooting

**Camera/Mic not working:**
- Make sure you allowed permissions when prompted
- Check browser settings (may need to allow for localhost/127.0.0.1)
- Some browsers require HTTPS (localhost is exempt)

**ML Vision slow or not loading:**
- Models are loaded from CDN on first use (~5-10MB)
- Requires decent GPU/CPU for real-time performance
- Try closing other tabs/applications

**No sound:**
- Make sure your volume is up
- Check browser audio permissions
- Click the start button (browsers require user interaction before playing audio)

## Tips for Best Experience

1. **Good lighting** helps camera-based tracking
2. **Stable internet** for loading ML models (first time only)
3. **Quiet environment** for better pitch detection
4. **Contrasting colors** work better for color tracking
5. **Clear background** improves face/hand/pose tracking

## Learn More

See the [main package README](../../packages/sensors/README.md) for full API documentation and more examples.

