import { useEffect, useRef, useState } from 'react';
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import * as Cam from '@mediapipe/camera_utils';

export interface GazePoint {
  x: number;
  y: number;
}

export interface EyeTrackingResult {
  isCalibrated: boolean;
  gaze: GazePoint;
  leftEyeOpenness: number;
  rightEyeOpenness: number;
  isBlinking: boolean;
  faceDetected: boolean;
}

export const useEyeTracker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [trackingResult, setTrackingResult] = useState<EyeTrackingResult>({
    isCalibrated: false,
    gaze: { x: 0.5, y: 0.5 },
    leftEyeOpenness: 1,
    rightEyeOpenness: 1,
    isBlinking: false,
    faceDetected: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Load FaceMesh
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);

    // Initialize Camera
    let camera: Cam.Camera | null = null;

    try {
      // The @mediapipe/camera_utils package exports Camera as a property of the default export or named export depending on build system
      // We try to instantiate it safely
      const CameraUtils = Cam; 
      
      if (videoRef.current) {
        camera = new CameraUtils.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && faceMesh) {
              await faceMesh.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720,
        });
        camera.start();
      }
    } catch (err: any) {
      console.error('Camera initialization failed', err);
      setError('Failed to start camera: ' + err.message);
    }

    return () => {
      camera?.stop();
      faceMesh.close();
    };
  }, []);

  const onResults = (results: Results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setTrackingResult((prev) => ({ ...prev, faceDetected: false }));
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    
    // Simple estimation logic
    const leftIris = landmarks[468];
    const rightIris = landmarks[473];

    const avgX = (leftIris.x + rightIris.x) / 2;
    const avgY = (leftIris.y + rightIris.y) / 2;
    
    setTrackingResult({
      isCalibrated: false,
      gaze: { x: avgX, y: avgY },
      leftEyeOpenness: 1,
      rightEyeOpenness: 1,
      isBlinking: false,
      faceDetected: true,
    });
  };

  return { videoRef, trackingResult, error };
};
