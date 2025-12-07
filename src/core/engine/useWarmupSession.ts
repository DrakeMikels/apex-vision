import { useState, useEffect, useCallback, useRef } from 'react';
import { WarmupPhase, WarmupScore } from './types';
import { EyeTrackingResult } from '../tracking/useEyeTracker';

const PHASE_DURATION = 15; // Reduced to 15s for quicker testing/MVP

interface Point {
  x: number;
  y: number;
}

export const useWarmupSession = () => {
  const [phase, setPhase] = useState<WarmupPhase>(WarmupPhase.IDLE);
  const [timeLeft, setTimeLeft] = useState(0);
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
  // Add a ref to track reaction test state
  const reactionStateRef = useRef<{ lastSwitch: number, visible: boolean }>({ lastSwitch: 0, visible: true });

  const startSession = useCallback(() => {
    setPhase(WarmupPhase.CALIBRATION);
  }, []);

  const calculateFinalScores = () => {
    // In a real app, we would aggregate the 'hits' and 'misses' recorded during processFrame
    // For MVP demo, we generate realistic random scores
    setScores({
      saccade: Math.floor(Math.random() * 20) + 80,
      smoothPursuit: Math.floor(Math.random() * 20) + 80,
      peripheral: Math.floor(Math.random() * 20) + 80,
      reaction: Math.floor(Math.random() * 20) + 80,
      stability: Math.floor(Math.random() * 20) + 80,
      overall: Math.floor(Math.random() * 15) + 85,
    });
  };

  const nextPhase = useCallback(() => {
    switch (phase) {
      case WarmupPhase.CALIBRATION:
        setPhase(WarmupPhase.SACCADE);
        setTimeLeft(PHASE_DURATION);
        break;
      case WarmupPhase.SACCADE:
        setPhase(WarmupPhase.SMOOTH_PURSUIT);
        setTimeLeft(PHASE_DURATION);
        break;
      case WarmupPhase.SMOOTH_PURSUIT:
        setPhase(WarmupPhase.PERIPHERAL);
        setTimeLeft(PHASE_DURATION);
        break;
      case WarmupPhase.PERIPHERAL:
        setPhase(WarmupPhase.REACTION);
        setTimeLeft(PHASE_DURATION);
        break;
      case WarmupPhase.REACTION:
        setPhase(WarmupPhase.STABILITY);
        setTimeLeft(PHASE_DURATION);
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

    const t = (time - startTimeRef.current) / 1000; // seconds

    if (phase === WarmupPhase.SMOOTH_PURSUIT) {
      // Circle path
      const radius = 0.3;
      const speed = 1;
      setTargetPosition({
        x: 0.5 + radius * Math.cos(t * speed),
        y: 0.5 + radius * Math.sin(t * speed),
      });
    } else if (phase === WarmupPhase.SACCADE) {
      // Jump every 1 second
      if (Math.floor(t) % 2 === 0) {
        setTargetPosition({ x: 0.2, y: 0.5 });
      } else {
        setTargetPosition({ x: 0.8, y: 0.5 });
      }
    } else if (phase === WarmupPhase.STABILITY) {
      // Stability should be fixed at center, but maybe add micro-jitter to simulate holding an angle?
      // For now, keep it centered as per "fixate on tiny dot"
      setTargetPosition({ x: 0.5, y: 0.5 });
    } else if (phase === WarmupPhase.PERIPHERAL) {
        // Flash random corners
        const interval = 2; // seconds
        const step = Math.floor(t / interval);
        const corners = [{x:0.1,y:0.1}, {x:0.9,y:0.1}, {x:0.1,y:0.9}, {x:0.9,y:0.9}];
        setTargetPosition(corners[step % 4]);
    } else if (phase === WarmupPhase.REACTION) {
        // Reaction: 3 Stages of acceleration
        let interval = 1.0; // Stage 1: Base speed
        
        if (t > 10) {
            interval = 0.64; // Stage 3: +20% +20% faster (approx 0.64s)
        } else if (t > 5) {
            interval = 0.8; // Stage 2: +20% faster
        }

        const step = Math.floor(t / interval);
        
        // Deterministic pseudo-random positions based on time step to avoid flickering in React
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
     // TODO: Calculate distance between tracking.gaze and targetPosition
     // Accumulate error/score
  }, []);

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
