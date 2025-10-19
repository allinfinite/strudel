# 🎭 Dynamic Mode Change System

## Overview

The Strudel Sensors music system features **5 distinct musical modes** that automatically change based on your webcam and audio input. The entire song transforms dramatically when you trigger a mode change!

## 🎮 The 5 Modes

### 🌙 AMBIENT
**Vibe:** Calm, spacious, meditative  
**Trigger:** Cover your camera (very dark) OR stay perfectly still  
**Technical:** `brightness < 0.2 AND motion < 0.1`  
**Layers:** Ambient textures + chord pads

**Try it:** Cover your webcam with your hand or stay completely still

---

### 🎵 MELODIC
**Vibe:** Pretty, musical, flowing  
**Trigger:** Medium lighting + gentle movement  
**Technical:** `brightness 0.4-0.7 AND motion 0.1-0.4`  
**Layers:** Ambient + chords + arpeggiator + audio melody

**Try it:** Sway gently with normal room lighting

---

### ⚡ ENERGETIC
**Vibe:** Driving, danceable, full band  
**Trigger:** Bright light + moderate motion  
**Technical:** `brightness > 0.6 AND motion 0.4-0.8`  
**Layers:** Drums + bass + arpeggiator + chords + audio percussion

**Try it:** Turn on a bright light and move around

---

### 🌪️ CHAOTIC
**Vibe:** Intense, overwhelming, maximalist  
**Trigger:** Jump around wildly, wave your arms frantically  
**Technical:** `motion > 0.8`  
**Layers:** ALL LAYERS ACTIVE (ambient + chords + bass + arp + beat)

**Try it:** Wave your arms frantically, jump in front of the camera, move super fast

---

### ▪️ MINIMAL
**Vibe:** Stripped down, focused, grooving  
**Trigger:** Wave a different colored object  
**Technical:** `hue change > 0.4`  
**Layers:** Bass + drums only

**Try it:** Wave a bright colored object (red shirt, green book, blue phone)

---

## 🎯 Quick Start

```javascript
// 1. Enable webcam
await enableWebcam()

// 2. Start the system (begins in ENERGETIC mode)
startWebcamMusic()
// or
startFullAudioReactive()

// Now interact with your webcam!
// The music will automatically change modes
```

## 🎛️ Manual Control

You can also switch modes manually:

```javascript
goAmbient()     // Switch to ambient
goMelodic()     // Switch to melodic
goEnergetic()   // Switch to energetic
goChaotic()     // Switch to chaotic
goMinimal()     // Switch to minimal

getCurrentMode() // Check current mode
```

## 🌊 Transition Sounds

Each mode transition plays a unique sound:
- **→ AMBIENT:** Descending shimmer (8 notes falling)
- **→ MELODIC:** Ascending arpeggio (12 notes rising)
- **→ ENERGETIC:** Big chord hit + kick drum
- **→ CHAOTIC:** Crazy sweep (20 random notes)
- **→ MINIMAL:** Deep bass note (sub-bass)

## ⏱️ Cooldown System

- **Automatic transitions:** 3-second cooldown between mode changes
- **Manual transitions:** No cooldown (instant)
- **Mini triggers:** Always active (dramatic chords, arpeggios, etc.)

## 💡 Tips for Best Results

1. **Lighting matters:** Use a desk lamp or window light for better control
2. **Color changes:** Keep colorful objects nearby (Post-its, markers, clothes)
3. **Movement variety:** Try slow swaying, fast waving, staying still, jumping
4. **Experiment:** Try combinations - cover camera while moving, etc.
5. **Watch the console:** Mode changes are logged with `🎵 MODE CHANGE: ...`

## 🎪 Performance Ideas

### Story Arc
1. Start MINIMAL (wave blue object)
2. Build to MELODIC (gentle sway)
3. Peak at ENERGETIC (bright + movement)
4. Climax with CHAOTIC (go wild!)
5. Wind down to AMBIENT (cover camera)

### Interactive Loop
- Stay in ENERGETIC for groovy vibes
- Occasionally trigger CHAOTIC for drops
- Return to MELODIC for breakdowns

### Experimental
- Rapid color changes for glitchy minimal beats
- Stay dark and still for extended ambient meditation
- Alternate between extremes (CHAOTIC ↔ AMBIENT)

## 🐛 Troubleshooting

**Modes not changing?**
- Check console for mode change logs
- Verify webcam and audio are enabled
- Wait 3 seconds between automatic transitions
- Try manual mode switching to test

**Wrong mode triggering?**
- Adjust your lighting
- Move closer/farther from camera
- Try more extreme movements
- Check your audio input levels

**Music sounds weird?**
- This is often CHAOTIC mode - embrace it!
- Or manually switch to a different mode
- Each mode has a distinct character

## 🎨 Creative Applications

- **Live performances:** Natural, expressive control
- **Installations:** Audience interaction
- **Therapy:** Mood-responsive music
- **Meditation:** Automatic ambient transitions
- **Dance:** Energy-matching soundtracks
- **Teaching:** Visual feedback for music concepts

---

**Have fun exploring the modes! The system is designed to surprise you with musical transformations.** 🎵✨

