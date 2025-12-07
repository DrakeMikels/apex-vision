import { useEffect, useRef, useState } from 'react';
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export interface GazePoint {
  x: number;
  y: number;
}

export interface EyeTrackingResult {
  isCalibrated: boolean;
  gaze: GazePoint; // Normalized screen coordinates (0-1)
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

    let camera: Camera | null = null;

    try {
      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && faceMesh) {
            await faceMesh.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    } catch (err: any) {
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
    
    // Simple estimation for MVP - In reality, this needs complex 3D projection or calibration
    // For now, we'll use a placeholder logic that needs to be replaced with actual Iris-to-Screen mapping
    // Utilizing iris landmarks: 468 (Left Iris Center), 473 (Right Iris Center)
    
    const leftIris = landmarks[468];
    const rightIris = landmarks[473];

    // Average X, Y (inverted X for mirror effect usually)
    const avgX = (leftIris.x + rightIris.x) / 2;
    const avgY = (leftIris.y + rightIris.y) / 2;

    // TODO: Implement calibration mapping here.
    // For now, we assume raw values are somewhat indicative but need scaling.
    
    setTrackingResult({
      isCalibrated: false,
      gaze: { x: avgX, y: avgY },
      leftEyeOpenness: 1, // Calculate based on eyelid landmarks
      rightEyeOpenness: 1,
      isBlinking: false,
      faceDetected: true,
    });
  };

  return { videoRef, trackingResult, error };
};

