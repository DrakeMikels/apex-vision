import { useState, useEffect, useCallback, useRef } from 'react';
import { WarmupPhase, WarmupScore } from './types';
import { EyeTrackingResult } from '../tracking/useEyeTracker';

const PHASE_DURATION_10S = 10; // 10 seconds for short phases
const PHASE_DURATION_30S = 30; // 30 seconds for long phases

interface Point {
  x: number;
  y: number;
}

export const useWarmupSession = () => {
  const [phase, setPhase] = useState<WarmupPhase>(WarmupPhase.IDLE);
  const [timeLeft, setTimeLeft] = useState(0);
  // Use a ref to accumulate real score data
  const scoreAccumulatorRef = useRef<{
    saccade: number[];
    smoothPursuit: number[];
    peripheral: number[];
    reaction: number[];
    stability: number[];
  }>({
    saccade: [],
    smoothPursuit: [],
    peripheral: [],
    reaction: [],
    stability: [],
  });

  const gazeHistoryRef = useRef<Array<{x: number, y: number, phase: string}>>([]);
  const calibrationRef = useRef<{ center: Point; scale: Point }>({
    center: { x: 0.5, y: 0.5 },
    scale: { x: 8.0, y: 12.0 }, // Heuristic sensitivity
  });

  const [scores, setScores] = useState<WarmupScore>({
    saccade: 0,
    smoothPursuit: 0,
    peripheral: 0,
    reaction: 0,
    stability: 0,
    overall: 0,
  });
  
  const [targetPosition, setTargetPosition] = useState<Point>({ x: 0.5, y: 0.5 });
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const startSession = useCallback(() => {
    setPhase(WarmupPhase.CALIBRATION);
  }, []);

  const calculateFinalScores = () => {
    const calcAverage = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sum = arr.reduce((a, b) => a + b, 0);
      // Map raw distance error (0 to ~0.5) to a score (0-100)
      // 0 error = 100, 0.3 error = 0
      const avgError = sum / arr.length;
      // Adjusted scoring heuristic: error of 0.4 (approx screen width/2) should be 0 score
      const score = Math.max(0, Math.min(100, 100 - (avgError * 250))); 
      return Math.round(score);
    };

    const saccadeScore = calcAverage(scoreAccumulatorRef.current.saccade);
    const smoothScore = calcAverage(scoreAccumulatorRef.current.smoothPursuit);
    const peripheralScore = calcAverage(scoreAccumulatorRef.current.peripheral);
    const reactionScore = calcAverage(scoreAccumulatorRef.current.reaction);
    const stabilityScore = calcAverage(scoreAccumulatorRef.current.stability);

    const finalScores = {
      saccade: saccadeScore,
      smoothPursuit: smoothScore,
      peripheral: peripheralScore,
      reaction: reactionScore,
      stability: stabilityScore,
      overall: Math.round((saccadeScore + smoothScore + peripheralScore + reactionScore + stabilityScore) / 5),
    };

    setScores(finalScores);

    // Save to Local Storage
    try {
        const historyItem = {
            date: new Date().toISOString(),
            scores: finalScores,
            gazeHistory: gazeHistoryRef.current
        };
        
        const existing = localStorage.getItem('apex_vision_history');
        const history = existing ? JSON.parse(existing) : [];
        history.push(historyItem);
        // Keep last 10 sessions to avoid overflow
        if (history.length > 10) history.shift();
        
        localStorage.setItem('apex_vision_history', JSON.stringify(history));
        
        // Also save current session for the dashboard redirect
        localStorage.setItem('apex_vision_current_session', JSON.stringify(historyItem));
    } catch (e) {
        console.error("Failed to save session", e);
    }
  };

  const nextPhase = useCallback(() => {
    switch (phase) {
      case WarmupPhase.CALIBRATION:
        setPhase(WarmupPhase.SACCADE);
        setTimeLeft(PHASE_DURATION_30S);
        break;
      case WarmupPhase.SACCADE:
        setPhase(WarmupPhase.SMOOTH_PURSUIT);
        setTimeLeft(PHASE_DURATION_30S);
        break;
      case WarmupPhase.SMOOTH_PURSUIT:
        setPhase(WarmupPhase.PERIPHERAL_1);
        setTimeLeft(PHASE_DURATION_10S);
        break;
      case WarmupPhase.PERIPHERAL_1:
        setPhase(WarmupPhase.PERIPHERAL_2);
        setTimeLeft(PHASE_DURATION_10S);
        break;
      case WarmupPhase.PERIPHERAL_2:
        setPhase(WarmupPhase.PERIPHERAL_3);
        setTimeLeft(PHASE_DURATION_10S);
        break;
      case WarmupPhase.PERIPHERAL_3:
        setPhase(WarmupPhase.REACTION_1);
        setTimeLeft(PHASE_DURATION_10S);
        break;
      case WarmupPhase.REACTION_1:
        setPhase(WarmupPhase.REACTION_2);
        setTimeLeft(PHASE_DURATION_10S);
        break;
      case WarmupPhase.REACTION_2:
        setPhase(WarmupPhase.REACTION_3);
        setTimeLeft(PHASE_DURATION_10S);
        break;
      case WarmupPhase.REACTION_3:
        setPhase(WarmupPhase.STABILITY);
        setTimeLeft(PHASE_DURATION_30S);
        break;
      case WarmupPhase.STABILITY:
        setPhase(WarmupPhase.COMPLETED);
        calculateFinalScores();
        break;
      default:
        break;
    }
  }, [phase]);

  // Game Loop for Target Movement
  const animate = useCallback((time: number) => {
    if (phase === WarmupPhase.IDLE || phase === WarmupPhase.COMPLETED || phase === WarmupPhase.CALIBRATION) return;

    // Calculate elapsed time since this phase started
    const t = (time - startTimeRef.current) / 1000; // seconds

    if (phase === WarmupPhase.SMOOTH_PURSUIT) {
      // Circle path
      const radius = 0.35;
      const speed = 1.5;
      const centerX = 0.5;
      const centerY = 0.5;
      
      setTargetPosition({
        x: centerX + radius * Math.cos(t * speed),
        y: centerY + radius * Math.sin(t * speed),
      });
    } else if (phase === WarmupPhase.SACCADE) {
      if (Math.floor(t) % 2 === 0) {
        setTargetPosition({ x: 0.2, y: 0.5 });
      } else {
        setTargetPosition({ x: 0.8, y: 0.5 });
      }
    } else if (phase === WarmupPhase.STABILITY) {
      setTargetPosition({ x: 0.5, y: 0.5 });
    } else if (phase.startsWith('peripheral')) {
        // Peripheral: 3 Stages
        let interval = 2.0; // Stage 1
        
        if (phase === WarmupPhase.PERIPHERAL_2) {
            interval = 1.6; // Stage 2: 25% faster (2.0 * 0.8 = 1.6)
        } else if (phase === WarmupPhase.PERIPHERAL_3) {
            interval = 1.28; // Stage 3: 25% faster (1.6 * 0.8 = 1.28)
        }

        const step = Math.floor(t / interval);
        const corners = [{x:0.1,y:0.1}, {x:0.9,y:0.1}, {x:0.1,y:0.9}, {x:0.9,y:0.9}];
        // Deterministic corner sequence based on time step
        setTargetPosition(corners[step % 4]);
    } else if (phase.startsWith('reaction')) {
        // Reaction: Explicit stages
        let interval = 1.0; // Stage 1
        
        if (phase === WarmupPhase.REACTION_2) {
            interval = 0.8; // Stage 2: +20% faster
        } else if (phase === WarmupPhase.REACTION_3) {
            interval = 0.64; // Stage 3: +20% +20% faster
        }

        const step = Math.floor(t / interval);
        
        const pseudoRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        }
        
        const rx = 0.1 + (pseudoRandom(step) * 0.8);
        const ry = 0.1 + (pseudoRandom(step + 100) * 0.8);
        
        setTargetPosition({ x: rx, y: ry });
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [phase]);

  useEffect(() => {
    if (phase !== WarmupPhase.IDLE && phase !== WarmupPhase.COMPLETED && phase !== WarmupPhase.CALIBRATION) {
      startTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, [phase, animate]);

  useEffect(() => {
    if (timeLeft > 0 && phase !== WarmupPhase.IDLE && phase !== WarmupPhase.COMPLETED && phase !== WarmupPhase.CALIBRATION) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            nextPhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, phase, nextPhase]);

  const processFrame = useCallback((tracking: EyeTrackingResult) => {
     if (!tracking.faceDetected) return;

     let gazeX = tracking.gaze.x;
     let gazeY = tracking.gaze.y;

     // Auto-calibration during the setup phase
     if (phase === WarmupPhase.CALIBRATION) {
        // Simple running average to find the "resting" center position
        const alpha = 0.1;
        calibrationRef.current.center.x = (calibrationRef.current.center.x * (1 - alpha)) + (gazeX * alpha);
        calibrationRef.current.center.y = (calibrationRef.current.center.y * (1 - alpha)) + (gazeY * alpha);
        return; // Don't score during calibration
     }

     // Apply calibration (Normalize to Screen 0-1)
     // Formula: 0.5 + (raw - center) * scale
     const calibratedX = 0.5 + (gazeX - calibrationRef.current.center.x) * calibrationRef.current.scale.x;
     const calibratedY = 0.5 + (gazeY - calibrationRef.current.center.y) * calibrationRef.current.scale.y;

     // Clamp to 0-1 for safety
     const finalX = Math.max(0, Math.min(1, calibratedX));
     const finalY = Math.max(0, Math.min(1, calibratedY));

     // Simple Euclidean distance
     const dx = finalX - targetPosition.x;
     const dy = finalY - targetPosition.y;
     const distance = Math.sqrt(dx*dx + dy*dy);

     // Record gaze point
     if (phase !== WarmupPhase.IDLE && phase !== WarmupPhase.COMPLETED) {
        gazeHistoryRef.current.push({
            x: finalX,
            y: finalY,
            phase
        });
     }

     // Store data for scoring
     if (phase === WarmupPhase.SACCADE) {
       scoreAccumulatorRef.current.saccade.push(distance);
     } else if (phase === WarmupPhase.SMOOTH_PURSUIT) {
       scoreAccumulatorRef.current.smoothPursuit.push(distance);
     } else if (phase.startsWith('peripheral')) {
       scoreAccumulatorRef.current.peripheral.push(distance);
     } else if (phase.startsWith('reaction')) {
       scoreAccumulatorRef.current.reaction.push(distance);
     } else if (phase === WarmupPhase.STABILITY) {
       scoreAccumulatorRef.current.stability.push(distance);
     }
  }, [phase, targetPosition]);

  return {
    phase,
    timeLeft,
    scores,
    targetPosition,
    startSession,
    processFrame,
    nextPhase,
  };
};
