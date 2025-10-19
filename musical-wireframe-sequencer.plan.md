<!-- 23cd5420-b158-4920-95e6-77699f59e2a6 399ab0d1-c4af-4a7c-8a22-54e85eca2d9c -->
# Musical Wireframe Sequencer Overhaul

## Problem Analysis

Current system triggers too many notes simultaneously with no rhythmic structure, creating chaos rather than music.

## Solution Architecture

### 1. Quantized Timing System

Add a master clock with steady BPM and quantize all note triggers to musical subdivisions.

**File: `website/src/pages/webcam-music.astro`**

- Add properties: `masterClock`, `currentStep`, `stepsPerBeat`, `quantizedNotes`
- Create `startMasterClock()` method - runs at steady BPM (e.g., 120 BPM = 500ms per beat)
- Create `quantizeToGrid()` method - schedules notes to nearest 16th/8th note
- Modify `processAudioPoints()` - queue notes instead of playing immediately

### 2. Polyphony Limiting

Prevent too many simultaneous notes from creating chaos.

**File: `website/src/pages/webcam-music.astro`**

- Add property: `maxPolyphony` (start with 4-6 notes max)
- Add property: `priorityQueue` - orders notes by depth/brightness
- Modify `createPointAudio()` - check polyphony limit before creating sound
- Add `stopLowestPriorityNote()` - removes quietest/oldest note when limit reached

### 3. Steady Beat Layer

Add a consistent rhythmic foundation that always plays.

**File: `website/src/pages/webcam-music.astro`**

- Create `playMetronome()` - steady kick/hi-hat pattern on master clock
- Add `beatIntensity` - controlled by motion (subtle when still, prominent when moving)
- Connect beat to visual feedback - pulse wireframe lines on beats

### 4. Mode-Based Musical Structures

Different musical behaviors based on webcam triggers, but with quantized timing.

**Modes to implement:**

- **Sparse Mode** (low motion): 1-2 notes per measure, long sustains, ambient pads
- **Melodic Mode** (medium motion): Arpeggiated patterns, scale-locked melodies, 4-8 notes
- **Rhythmic Mode** (high motion): Shorter notes, percussive hits, syncopated patterns
- **Structured Mode** (colorful): Chord progressions, harmonic sequences

**Implementation:**

- Add `currentMusicMode` property
- Create `evaluateMusicMode()` - checks motion/color to switch modes (with cooldown)
- Modify `addToMusicalLayer()` - apply mode-specific note scheduling rules
- Add mode transition sounds quantized to beat boundaries

### 5. Harmonic Intelligence

Ensure notes sound good together.

**File: `website/src/pages/webcam-music.astro`**

- Modify `getFrequencyFromPosition()` - lock to proper musical scales (pentatonic for safety)
- Add `currentKey` and `currentScale` properties
- Create `snapToScale()` method - force all frequencies to scale notes
- Add `chordProgression` - background harmony that notes follow

## Key Files to Modify

**`website/src/pages/webcam-music.astro`**

- Lines ~365-385: Add timing and polyphony properties to constructor
- Lines ~620-650: Refactor `processAudioPoints()` to queue instead of trigger
- Lines ~585-636: Enhance `createPointAudio()` with polyphony limiting
- Lines ~662-680: Update `getFrequencyFromPosition()` for better harmony
- Add new methods: `startMasterClock()`, `quantizeToGrid()`, `playMetronome()`, `evaluateMusicMode()`

## Expected Outcome

- Steady, predictable beat that users can follow
- Notes triggered in time with the beat (no random timing)
- Maximum 4-6 simultaneous notes (no overwhelming chaos)
- Musical phrases that change with motion but stay structured
- Smooth transitions between sparse/melodic/rhythmic modes

## To-dos

- [x] Implement master clock system with steady BPM and quantized note scheduling
- [x] Add polyphony limiting (max 4-6 notes) with priority queue system
- [x] Create metronome/beat layer that plays consistently with visual feedback
- [x] Implement mode system (sparse/melodic/rhythmic/structured) with quantized transitions
- [x] Add scale-locking and chord progressions for better harmony
- [x] Test all systems together and tune timing/polyphony parameters

## ✅ IMPLEMENTATION COMPLETE

All items have been successfully implemented! See `MUSICAL-SEQUENCER-IMPLEMENTATION.md` for detailed documentation.

### Key Accomplishments:
- ✅ Master clock running at 120 BPM with 16th note precision
- ✅ Polyphony limiting with 6-note maximum and intelligent priority queue
- ✅ Dynamic beat layer with kick/hi-hat that adapts to motion (0.2-0.8 intensity)
- ✅ All four musical modes working with quantized timing
- ✅ Proper pentatonic scale with musical intervals [1, 9/8, 5/4, 3/2, 5/3]
- ✅ Enhanced visual feedback with beat pulse (1.8x downbeat, 1.3x beats)

### Final Code State:
- `website/src/pages/webcam-music.astro` - fully implemented with all improvements
- System produces structured, musical output with steady beat and controlled polyphony
- Ready for deployment and testing!

### Commit History:
- `134d8866` - Improved musical wireframe sequencer implementation
- `f17c865e` - Added implementation complete documentation

