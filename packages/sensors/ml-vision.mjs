// ml-vision.mjs - Face, hand, and pose tracking for Strudel using MediaPipe

import { signal } from '@strudel/core';

/**
 * Enables face tracking with MediaPipe
 * @name enableFaceTracking
 * @example
 * await enableFaceTracking()
 * s("bd sd hh sd").lpf(faceMouthOpen.range(200,5000))
 */

/**
 * Face center X position (0-1, left to right)
 * @name faceX
 * @return {Pattern}
 * @example
 * s("bd sd").pan(faceX)
 */

/**
 * Face center Y position (0-1, top to bottom)
 * @name faceY
 * @return {Pattern}
 */

/**
 * Face size/distance from camera (0-1)
 * @name faceSize
 * @return {Pattern}
 * @example
 * s("bd sd").fast(faceSize.range(1,4))
 */

/**
 * Face rotation around X axis - pitch (0-1, nodding)
 * @name faceRotX
 * @return {Pattern}
 */

/**
 * Face rotation around Y axis - yaw (0-1, shaking head)
 * @name faceRotY
 * @return {Pattern}
 */

/**
 * Face rotation around Z axis - roll (0-1, tilting head)
 * @name faceRotZ
 * @return {Pattern}
 * @example
 * note("<0 2 4 7>").add(faceRotZ.range(-7,7).floor())
 */

/**
 * Mouth openness (0-1)
 * @name faceMouthOpen
 * @return {Pattern}
 * @example
 * s("sine").lpf(faceMouthOpen.range(200,5000))
 */

/**
 * Smile amount (0-1)
 * @name faceSmile
 * @return {Pattern}
 */

/**
 * Eyebrow raise amount (0-1)
 * @name faceEyebrowRaise
 * @return {Pattern}
 */

/**
 * Number of faces detected
 * @name faceCount
 * @return {Pattern}
 */

/**
 * Enables hand tracking with MediaPipe
 * @name enableHandTracking
 * @example
 * await enableHandTracking()
 * note(handY.range(48,72)).s("sine")
 */

/**
 * Hand center X position (0-1)
 * @name handX
 * @return {Pattern}
 */

/**
 * Hand center Y position (0-1)
 * @name handY
 * @return {Pattern}
 */

/**
 * Hand openness (0-1, closed to open)
 * @name handOpenness
 * @return {Pattern}
 */

/**
 * Pinch gesture detection (0-1)
 * @name handPinch
 * @return {Pattern}
 */

/**
 * Number of hands detected
 * @name handCount
 * @return {Pattern}
 */

/**
 * Enables pose tracking with MediaPipe
 * @name enablePoseTracking
 * @example
 * await enablePoseTracking()
 * note(poseX.range(48,72)).s("sine").gain(poseSpread)
 */

/**
 * Body center X position (0-1)
 * @name poseX
 * @return {Pattern}
 */

/**
 * Body center Y position (0-1)
 * @name poseY
 * @return {Pattern}
 */

/**
 * Arms spread width (0-1)
 * @name poseSpread
 * @return {Pattern}
 * @example
 * s("bd sd").gain(poseSpread)
 */

/**
 * Body height in frame (0-1)
 * @name poseHeight
 * @return {Pattern}
 */

/**
 * Left arm angle (0-1)
 * @name poseLeftArmAngle
 * @return {Pattern}
 */

/**
 * Right arm angle (0-1)
 * @name poseRightArmAngle
 * @return {Pattern}
 */

// Base vision handler for shared video management
class VisionHandler {
  constructor() {
    this.video = null;
    this.stream = null;
    this.canvas = null;
    this.ctx = null;
    this.width = 640;
    this.height = 480;
    this.isVideoInitialized = false;
  }
  
  async initVideo() {
    if (this.isVideoInitialized) {
      return this.video;
    }
    
    try {
      // Check for secure context and mediaDevices support
      if (!navigator || !navigator.mediaDevices) {
        throw new Error('Camera access not available. Please ensure you are using HTTPS or localhost, and your browser supports webcam access.');
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: this.width },
          height: { ideal: this.height },
          facingMode: 'user',
        },
      });
      
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.playsInline = true;
      
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          resolve();
        };
      });
      
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext('2d');
      
      this.isVideoInitialized = true;
      console.log('Video initialized for ML vision');
      
      return this.video;
    } catch (error) {
      console.error('Failed to initialize video:', error);
      throw error;
    }
  }
  
  stopVideo() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isVideoInitialized = false;
  }
}

// Shared video instance
const visionHandler = new VisionHandler();

// Face tracking handler
class FaceTrackingHandler {
  constructor() {
    this.faceLandmarker = null;
    this.isInitialized = false;
    this.animationId = null;
    
    // State
    this._x = 0.5;
    this._y = 0.5;
    this._size = 0;
    this._rotX = 0.5;
    this._rotY = 0.5;
    this._rotZ = 0.5;
    this._mouthOpen = 0;
    this._smile = 0;
    this._eyebrowRaise = 0;
    this._count = 0;
  }
  
  async init() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Initialize video
      await visionHandler.initVideo();
      
      // Load MediaPipe FaceLandmarker
      const { FaceLandmarker, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
      );
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 2,
      });
      
      this.isInitialized = true;
      this.analyze();
      
      console.log('Face tracking initialized');
    } catch (error) {
      console.error('Failed to initialize face tracking:', error);
      throw error;
    }
  }
  
  analyze() {
    if (!this.faceLandmarker || !visionHandler.video) {
      return;
    }
    
    const video = visionHandler.video;
    const currentTime = performance.now();
    
    try {
      const results = this.faceLandmarker.detectForVideo(video, currentTime);
      
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        this._count = results.faceLandmarks.length;
        const landmarks = results.faceLandmarks[0];
        
        // Calculate face position (center of face)
        let sumX = 0, sumY = 0;
        landmarks.forEach(landmark => {
          sumX += landmark.x;
          sumY += landmark.y;
        });
        this._x = sumX / landmarks.length;
        this._y = sumY / landmarks.length;
        
        // Calculate face size (distance between eyes as proxy)
        const leftEye = landmarks[33];  // Left eye landmark
        const rightEye = landmarks[263]; // Right eye landmark
        const eyeDistance = Math.sqrt(
          Math.pow(rightEye.x - leftEye.x, 2) +
          Math.pow(rightEye.y - leftEye.y, 2)
        );
        this._size = Math.min(eyeDistance * 5, 1); // Scale to 0-1
        
        // Get face rotations from transformation matrix if available
        if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
          const matrix = results.facialTransformationMatrixes[0].data;
          // Extract Euler angles from rotation matrix
          const rotX = Math.atan2(matrix[9], matrix[10]);
          const rotY = Math.atan2(-matrix[8], Math.sqrt(matrix[9] * matrix[9] + matrix[10] * matrix[10]));
          const rotZ = Math.atan2(matrix[4], matrix[0]);
          
          // Normalize to 0-1
          this._rotX = (rotX + Math.PI) / (2 * Math.PI);
          this._rotY = (rotY + Math.PI) / (2 * Math.PI);
          this._rotZ = (rotZ + Math.PI) / (2 * Math.PI);
        }
        
        // Get blendshapes (facial expressions)
        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
          const blendshapes = results.faceBlendshapes[0].categories;
          
          // Find specific expressions
          const mouthOpen = blendshapes.find(b => b.categoryName === 'jawOpen');
          if (mouthOpen) this._mouthOpen = mouthOpen.score;
          
          const smileLeft = blendshapes.find(b => b.categoryName === 'mouthSmileLeft');
          const smileRight = blendshapes.find(b => b.categoryName === 'mouthSmileRight');
          if (smileLeft && smileRight) {
            this._smile = (smileLeft.score + smileRight.score) / 2;
          }
          
          const browInnerUp = blendshapes.find(b => b.categoryName === 'browInnerUp');
          if (browInnerUp) this._eyebrowRaise = browInnerUp.score;
        }
      } else {
        this._count = 0;
      }
    } catch (error) {
      // Silently handle errors (video might not be ready yet)
    }
    
    this.animationId = requestAnimationFrame(() => this.analyze());
  }
  
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isInitialized = false;
  }
}

// Hand tracking handler
class HandTrackingHandler {
  constructor() {
    this.handLandmarker = null;
    this.isInitialized = false;
    this.animationId = null;
    
    // State
    this._x = 0.5;
    this._y = 0.5;
    this._openness = 0;
    this._pinch = 0;
    this._count = 0;
  }
  
  async init() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      await visionHandler.initVideo();
      
      const { HandLandmarker, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
      );
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      
      this.isInitialized = true;
      this.analyze();
      
      console.log('Hand tracking initialized');
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
      throw error;
    }
  }
  
  analyze() {
    if (!this.handLandmarker || !visionHandler.video) {
      return;
    }
    
    const video = visionHandler.video;
    const currentTime = performance.now();
    
    try {
      const results = this.handLandmarker.detectForVideo(video, currentTime);
      
      if (results.landmarks && results.landmarks.length > 0) {
        this._count = results.landmarks.length;
        const landmarks = results.landmarks[0];
        
        // Hand center (wrist)
        const wrist = landmarks[0];
        this._x = wrist.x;
        this._y = wrist.y;
        
        // Calculate hand openness (distance between fingertips)
        const thumb = landmarks[4];
        const index = landmarks[8];
        const middle = landmarks[12];
        const ring = landmarks[16];
        const pinky = landmarks[20];
        const palm = landmarks[0];
        
        // Average distance from palm to fingertips
        const distances = [thumb, index, middle, ring, pinky].map(tip => 
          Math.sqrt(Math.pow(tip.x - palm.x, 2) + Math.pow(tip.y - palm.y, 2))
        );
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        this._openness = Math.min(avgDistance * 2, 1);
        
        // Pinch detection (thumb-index distance)
        const pinchDist = Math.sqrt(
          Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2)
        );
        this._pinch = Math.max(0, 1 - pinchDist * 10); // Closer = higher value
      } else {
        this._count = 0;
      }
    } catch (error) {
      // Silently handle errors
    }
    
    this.animationId = requestAnimationFrame(() => this.analyze());
  }
  
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isInitialized = false;
  }
}

// Pose tracking handler
class PoseTrackingHandler {
  constructor() {
    this.poseLandmarker = null;
    this.isInitialized = false;
    this.animationId = null;
    
    // State
    this._x = 0.5;
    this._y = 0.5;
    this._spread = 0;
    this._height = 0;
    this._leftArmAngle = 0.5;
    this._rightArmAngle = 0.5;
  }
  
  async init() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      await visionHandler.initVideo();
      
      const { PoseLandmarker, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
      );
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      
      this.isInitialized = true;
      this.analyze();
      
      console.log('Pose tracking initialized');
    } catch (error) {
      console.error('Failed to initialize pose tracking:', error);
      throw error;
    }
  }
  
  analyze() {
    if (!this.poseLandmarker || !visionHandler.video) {
      return;
    }
    
    const video = visionHandler.video;
    const currentTime = performance.now();
    
    try {
      const results = this.poseLandmarker.detectForVideo(video, currentTime);
      
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        // Body center (average of shoulders and hips)
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        
        this._x = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4;
        this._y = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4;
        
        // Arms spread (distance between wrists)
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const wristDistance = Math.sqrt(
          Math.pow(rightWrist.x - leftWrist.x, 2) +
          Math.pow(rightWrist.y - leftWrist.y, 2)
        );
        this._spread = Math.min(wristDistance, 1);
        
        // Body height (distance from head to feet)
        const nose = landmarks[0];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
        this._height = Math.abs(avgAnkleY - nose.y);
        
        // Left arm angle
        const leftElbow = landmarks[13];
        const leftArmAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
        this._leftArmAngle = leftArmAngle / Math.PI; // Normalize to 0-1
        
        // Right arm angle
        const rightElbow = landmarks[14];
        const rightArmAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
        this._rightArmAngle = rightArmAngle / Math.PI;
      }
    } catch (error) {
      // Silently handle errors
    }
    
    this.animationId = requestAnimationFrame(() => this.analyze());
  }
  
  calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    return Math.abs(radians);
  }
  
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isInitialized = false;
  }
}

// Create singleton instances
const faceTracker = new FaceTrackingHandler();
const handTracker = new HandTrackingHandler();
const poseTracker = new PoseTrackingHandler();

// Export initialization functions
export async function enableFaceTracking() {
  await faceTracker.init();
  return signal(() => 1); // Return a pattern that indicates face tracking is ready
}

export async function enableHandTracking() {
  await handTracker.init();
  return signal(() => 1); // Return a pattern that indicates hand tracking is ready
}

export async function enablePoseTracking() {
  await poseTracker.init();
  return signal(() => 1); // Return a pattern that indicates pose tracking is ready
}

// Face tracking signals
export const faceX = signal(() => faceTracker._x);
export const faceY = signal(() => faceTracker._y);
export const faceSize = signal(() => faceTracker._size);
export const faceRotX = signal(() => faceTracker._rotX);
export const faceRotY = signal(() => faceTracker._rotY);
export const faceRotZ = signal(() => faceTracker._rotZ);
export const faceMouthOpen = signal(() => faceTracker._mouthOpen);
export const faceSmile = signal(() => faceTracker._smile);
export const faceEyebrowRaise = signal(() => faceTracker._eyebrowRaise);
export const faceCount = signal(() => faceTracker._count);

// Hand tracking signals
export const handX = signal(() => handTracker._x);
export const handY = signal(() => handTracker._y);
export const handOpenness = signal(() => handTracker._openness);
export const handPinch = signal(() => handTracker._pinch);
export const handCount = signal(() => handTracker._count);

// Pose tracking signals
export const poseX = signal(() => poseTracker._x);
export const poseY = signal(() => poseTracker._y);
export const poseSpread = signal(() => poseTracker._spread);
export const poseHeight = signal(() => poseTracker._height);
export const poseLeftArmAngle = signal(() => poseTracker._leftArmAngle);
export const poseRightArmAngle = signal(() => poseTracker._rightArmAngle);

// Stop functions
export function disableFaceTracking() {
  faceTracker.stop();
  visionHandler.stopVideo();
}

export function disableHandTracking() {
  handTracker.stop();
  visionHandler.stopVideo();
}

export function disablePoseTracking() {
  poseTracker.stop();
  visionHandler.stopVideo();
}

