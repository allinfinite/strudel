# 🎮 Complete Triggers & Variables Guide

## Overview

The Strudel webcam music system uses **6 webcam variables** to create **20+ different musical triggers**!

## 📊 Webcam Variables

### Primary Variables
1. **Hue (Color)** - What color dominates the scene (0-1)
2. **Saturation** - How colorful vs grayscale (0-1)
3. **Brightness** - Overall lightness (0-1)
4. **Motion** - Amount of movement (0-1)
5. **Contrast** - Difference between light and dark (0-1)
6. **Edges** - Amount of sharp edges/details (0-1)

### Derived Variables
- **Rapid Motion Count** - Tracks sustained fast movement
- **Stillness Count** - Tracks how long you've been still
- **Average Saturation** - Color richness over time

---

## 🎭 Mode Triggers (5 Modes)

### 🌙 AMBIENT
**Triggers:**
- Very dark (< 0.2) AND still (< 0.15)
- Extremely still for 100+ frames (~3 seconds)
- Very desaturated (< 0.15) AND low motion

**Try:** Cover camera, stay perfectly still, show grayscale image

---

### 🎵 MELODIC
**Triggers:**
- Medium brightness (0.3-0.7) + gentle motion (0.1-0.4)
- High saturation (> 0.5) + calm (< 0.3 motion)

**Try:** Sway gently, show colorful objects while staying relatively still

---

### ⚡ ENERGETIC
**Triggers:**
- Bright (> 0.6) + moving (0.4-0.8 motion)
- Very saturated (> 0.7) + motion (> 0.3)
- High contrast (> 0.6) + motion (> 0.3) + bright (> 0.5)

**Try:** Move around with bright lighting, wave colorful objects, use high-contrast patterns

---

### 🌪️ CHAOTIC
**Triggers:**
- Extreme motion (> 0.8)
- Sustained rapid motion (30+ frames)
- High edges (> 0.7) + motion (> 0.5) - busy, detailed scene

**Try:** Jump wildly, wave arms frantically, show very detailed patterns while moving

---

### ▪️ MINIMAL
**Triggers:**
- Major color change (hue shift > 0.3)
- Very desaturated (< 0.2) - grayscale
- Very high contrast (> 0.8) - black & white

**Try:** Wave different colored objects, show grayscale images, use high-contrast patterns

---

## 🎵 Mini Triggers (Always Active)

These don't change the mode, but add musical flourishes:

### Motion-Based

**1. Sudden Motion** → Dramatic chord cascade
- Trigger: `motion > 0.7` from `< 0.5`
- Sound: 5-note chord in octave 4

**2. Rapid Motion Burst** → Drum fill
- Trigger: 20 rapid motion frames
- Sound: Kick → Snare → HiHat → Snare → Kick

**3. Medium Motion Sparkle** → Random note
- Trigger: `motion 0.3-0.6` (2% chance per frame)
- Sound: Random note from scale

### Brightness-Based

**4. Brightness Spike** → Ascending arpeggio
- Trigger: `brightness > 0.8` from `< 0.6`
- Sound: 8-note ascending arpeggio

**5. Sudden Darkness** → Descending tones
- Trigger: `brightness < 0.2` from `> 0.5`
- Sound: 6-note descending melody

**6. Brightness Wave** → Rising/falling arpeggio
- Trigger: Brightness change > 0.2 (5% chance)
- Sound: 5-note arpeggio (direction matches change)

### Color-Based

**7. Saturation Spike** → Colorful bloom
- Trigger: `saturation > 0.8` from `< 0.5`
- Sound: 4-note ascending chord

**8. Desaturation** → Gray wash (minor chord)
- Trigger: `saturation < 0.2` from `> 0.5`
- Sound: 3-note minor chord

**9. Hue Shift** → Transition chime
- Trigger: Hue change 0.15-0.3
- Sound: Old scale note → New scale note

**10. Saturation + Motion Combo** → Melodic flourish
- Trigger: `saturation > 0.6` + `motion > 0.5` (3% chance)
- Sound: 6-note melodic pattern [0, 2, 4, 7, 4, 2]

### Contrast & Edge-Based

**11. High Contrast** → Sharp stabs
- Trigger: `contrast > 0.7` from `< 0.4`
- Sound: 3x Kick + Snare pattern

**12. Contrast Pulse** → Rhythmic kicks
- Trigger: `contrast > 0.5` + change > 0.3
- Sound: Double kick (200ms apart)

**13. Edge Detection Spike** → Glitchy sounds
- Trigger: `edges > 0.6` from `< 0.3`
- Sound: 6 quick random notes (40ms apart)

### Special Rewards

**14. Stillness Reward** → Gentle chime
- Trigger: Still for exactly 150 frames (~3 seconds)
- Sound: Two-note gentle chime with delay

---

## 🎨 Creative Trigger Ideas

### Color Shows
1. **Rainbow Sweep** - Slowly change hue through spectrum
2. **Saturation Dance** - Alternate colorful/grayscale objects
3. **Contrast Beats** - Show black/white patterns rhythmically

### Motion Patterns
1. **Wave** - Slow side-to-side motion
2. **Pulse** - Move toward/away from camera
3. **Freeze Dance** - Alternate motion and stillness
4. **Rapid Fire** - Quick jabs for drum fills

### Lighting Effects
1. **Sunrise** - Gradually increase brightness
2. **Sunset** - Gradually decrease brightness
3. **Strobe** - Quick on/off (for arpeggios)
4. **Ambient Fade** - Very low light for ambient mode

### Object Interactions
1. **Color Palette** - Have colored cards ready (red, blue, green, yellow)
2. **Texture Board** - Show detailed vs smooth surfaces
3. **Contrast Cards** - Black/white patterns for minimal mode
4. **Nature Elements** - Plants for edges, sky for low saturation

---

## 📈 Variable Ranges & Effects

| Variable | Low (< 0.3) | Medium (0.3-0.7) | High (> 0.7) |
|----------|-------------|------------------|--------------|
| **Hue** | Red-Orange | Yellow-Cyan | Blue-Magenta |
| **Saturation** | Grayscale | Muted Colors | Vivid Colors |
| **Brightness** | Dark/Shadow | Normal Light | Bright/Sunny |
| **Motion** | Still/Calm | Gentle Sway | Active/Fast |
| **Contrast** | Flat/Soft | Normal | Sharp/Bold |
| **Edges** | Smooth/Blurry | Some Detail | Very Detailed |

---

## 💡 Pro Tips

1. **Combine triggers** - Motion + saturation + brightness for maximum effect
2. **Timing matters** - Some triggers need sustained conditions
3. **Experiment** - Try unexpected combinations
4. **Use props** - Colored paper, textured fabrics, patterned objects
5. **Lighting control** - Desk lamp gives you brightness control
6. **Background** - Plain vs patterned affects edges and contrast
7. **Camera distance** - Closer = more detail/edges, farther = smoother

---

## 🎪 Performance Sequences

### "Sunrise Symphony"
1. Start dark (AMBIENT)
2. Slowly increase brightness (trigger arpeggios)
3. Add color (MELODIC)
4. Add motion (ENERGETIC)
5. Go wild (CHAOTIC)

### "Color Dance"
1. Start with one color
2. Switch colors rapidly (MINIMAL transitions)
3. Show colorful + move (ENERGETIC)
4. Freeze with colors (MELODIC)

### "Stillness Journey"
1. Stay perfectly still (AMBIENT)
2. Wait for stillness chime
3. Tiny movements (trigger sparkles)
4. Gentle sway (MELODIC)

---

**Experiment and have fun! The system is designed to reward exploration and creativity!** 🎵✨

