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
  
  // Calibration State
  const calibrationSamplesRef = useRef<Point[]>([]);
  const calibrationPointsRef = useRef<{ left: Point | null; right: Point | null }>({ left: null, right: null });

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

  const [distractorPosition, setDistractorPosition] = useState<Point | null>(null);

  const gridShotRef = useRef<{
    lastSpawnTime: number;
    dwellStartTime: number | null;
    isLocked: boolean;
  }>({
    lastSpawnTime: 0,
    dwellStartTime: null,
    isLocked: false,
  });
  
  const [gridShotFeedback, setGridShotFeedback] = useState<{ color: 'green' | 'yellow' | 'red'; id: number } | null>(null);

  const startSession = useCallback(() => {
    setPhase(WarmupPhase.CALIBRATION_SETUP);
  }, []);

  const calculateFinalScores = () => {
    const calcAverage = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sum = arr.reduce((a, b) => a + b, 0);
      // Map raw distance error (0 to ~0.5) to a score (0-100)
      // 0 error = 100, 0.3 error = 0
      const avgError = sum / arr.length;
      // Adjusted scoring heuristic: error of 0.4 (approx screen width/2) should be 0 score
      // Reduced sensitivity further to prevent 0 scores. 0.5 error (half screen) -> 50 score
      const score = Math.max(0, Math.min(100, 100 - (avgError * 80))); 
      console.log('Calculating score:', arr.length, 'samples, avg error:', avgError, 'final:', score);
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
      case WarmupPhase.CALIBRATION_SETUP:
        setPhase(WarmupPhase.CALIBRATION_CENTER);
        calibrationSamplesRef.current = []; // Reset samples
        setTimeLeft(3); // 3 seconds to look at center
        break;
      case WarmupPhase.CALIBRATION_CENTER:
        // Compute center offset
        if (calibrationSamplesRef.current.length > 0) {
            const avgX = calibrationSamplesRef.current.reduce((sum, p) => sum + p.x, 0) / calibrationSamplesRef.current.length;
            const avgY = calibrationSamplesRef.current.reduce((sum, p) => sum + p.y, 0) / calibrationSamplesRef.current.length;
            calibrationRef.current.center = { x: avgX, y: avgY };
        }
        setPhase(WarmupPhase.CALIBRATION_LEFT);
        calibrationSamplesRef.current = [];
        setTimeLeft(3);
        break;
      case WarmupPhase.CALIBRATION_LEFT:
        if (calibrationSamplesRef.current.length > 0) {
            const avgX = calibrationSamplesRef.current.reduce((sum, p) => sum + p.x, 0) / calibrationSamplesRef.current.length;
            const avgY = calibrationSamplesRef.current.reduce((sum, p) => sum + p.y, 0) / calibrationSamplesRef.current.length;
            calibrationPointsRef.current.left = { x: avgX, y: avgY };
        }
        setPhase(WarmupPhase.CALIBRATION_RIGHT);
        calibrationSamplesRef.current = [];
        setTimeLeft(3);
        break;
      case WarmupPhase.CALIBRATION_RIGHT:
        // Calculate Scale!
        if (calibrationSamplesRef.current.length > 0) {
            const avgX = calibrationSamplesRef.current.reduce((sum, p) => sum + p.x, 0) / calibrationSamplesRef.current.length;
            const avgY = calibrationSamplesRef.current.reduce((sum, p) => sum + p.y, 0) / calibrationSamplesRef.current.length;
            const rightPoint = { x: avgX, y: avgY };
            
            // We should have stored the left point from previous phase. 
            // Since we cleared samples, we need a way to pass it.
            // Using calibrationPointsRef for this.
            calibrationPointsRef.current.right = rightPoint;
            
            if (calibrationPointsRef.current.left && calibrationPointsRef.current.right) {
                // Calculate Scale
                // Target Delta X = 0.8 (0.9 - 0.1)
                // Gaze Delta X = Right.x - Left.x
                const gazeDeltaX = Math.abs(calibrationPointsRef.current.right.x - calibrationPointsRef.current.left.x);
                
                // Avoid division by zero
                if (gazeDeltaX > 0.05) {
                    const scaleX = 0.8 / gazeDeltaX;
                    // Apply scale (using same for Y for now, maybe 1.5x)
                    calibrationRef.current.scale = { x: scaleX, y: scaleX * 1.0 }; 
                    console.log('Calibration Success:', calibrationRef.current);
                } else {
                    console.warn('Calibration delta too small, using default scale');
                }
            }
        }
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
        setPhase(WarmupPhase.GRID_SHOT);
        setTimeLeft(30); // 30 seconds for Grid Shot
        gridShotRef.current = { lastSpawnTime: performance.now(), dwellStartTime: null, isLocked: false };
        // Initial Target
        setTargetPosition({ x: 0.5, y: 0.5 });
        break;
      case WarmupPhase.GRID_SHOT:
        setPhase(WarmupPhase.STABILITY);
        setTimeLeft(15); // Reduced to 15 seconds
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
    if (phase === WarmupPhase.IDLE || phase === WarmupPhase.COMPLETED || phase === WarmupPhase.CALIBRATION_SETUP) return;

    // Calculate elapsed time since this phase started
    const t = Math.max(0, (time - startTimeRef.current) / 1000); // seconds, prevent negative time

    if (phase === WarmupPhase.CALIBRATION_CENTER) {
        setTargetPosition({ x: 0.5, y: 0.5 });
    } else if (phase === WarmupPhase.CALIBRATION_LEFT) {
        setTargetPosition({ x: 0.1, y: 0.5 });
    } else if (phase === WarmupPhase.CALIBRATION_RIGHT) {
        setTargetPosition({ x: 0.9, y: 0.5 });
    } else if (phase === WarmupPhase.SMOOTH_PURSUIT) {
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
      
      // Distractors logic - faster for shorter duration
      const distractorInterval = 1.5; // Reduced from 2.5s to 1.5s
      const cycle = Math.floor(t / distractorInterval);
      const subTime = t % distractorInterval;
      
      // Flash for first 0.3s of interval
      if (subTime < 0.3) {
          // Deterministic pseudo-random position based on cycle index
          const pseudoRandom = (seed: number) => Math.sin(seed * 999) - Math.floor(Math.sin(seed * 999));
          const q = Math.floor(pseudoRandom(cycle) * 4); // 0,1,2,3 quadrants
          
          let dx = 0.25;
          let dy = 0.25;
          
          if (q === 1) { dx = 0.75; dy = 0.25; }
          else if (q === 2) { dx = 0.25; dy = 0.75; }
          else if (q === 3) { dx = 0.75; dy = 0.75; }
          
          setDistractorPosition({ x: dx, y: dy });
      } else {
          setDistractorPosition(null);
      }
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
        // ... (existing reaction logic) ...
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
    } else if (phase === WarmupPhase.GRID_SHOT) {
        // Auto-advance if target is not hit within 2 seconds
        const timeAlive = performance.now() - gridShotRef.current.lastSpawnTime;
        if (timeAlive > 2000) {
            // TIMEOUT / MISS
            setGridShotFeedback({ color: 'red', id: Date.now() });
            
            // Move to new random position
            const nextX = 0.15 + (Math.random() * 0.7);
            const nextY = 0.15 + (Math.random() * 0.7);
            setTargetPosition({ x: nextX, y: nextY });
            
            // Reset for next target
            gridShotRef.current.lastSpawnTime = performance.now();
            gridShotRef.current.dwellStartTime = null;
            gridShotRef.current.isLocked = false;
        }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [phase]);

  useEffect(() => {
    if (phase !== WarmupPhase.IDLE && phase !== WarmupPhase.COMPLETED && phase !== WarmupPhase.CALIBRATION_SETUP) {
      startTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, [phase, animate]);

  useEffect(() => {
    if (timeLeft > 0 && phase !== WarmupPhase.IDLE && phase !== WarmupPhase.COMPLETED && phase !== WarmupPhase.CALIBRATION_SETUP) {
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
     if (phase === WarmupPhase.CALIBRATION_SETUP || phase === WarmupPhase.CALIBRATION_CENTER || phase === WarmupPhase.CALIBRATION_LEFT || phase === WarmupPhase.CALIBRATION_RIGHT) {
        if (phase === WarmupPhase.CALIBRATION_SETUP) {
            // Just simple averaging for initial center (optional)
            const alpha = 0.1;
            calibrationRef.current.center.x = (calibrationRef.current.center.x * (1 - alpha)) + (gazeX * alpha);
            calibrationRef.current.center.y = (calibrationRef.current.center.y * (1 - alpha)) + (gazeY * alpha);
        } else {
            // Collect samples for active calibration phase
            calibrationSamplesRef.current.push({ x: gazeX, y: gazeY });
        }
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
     if (phase !== WarmupPhase.IDLE && phase !== WarmupPhase.COMPLETED && !phase.startsWith('calibration')) {
        gazeHistoryRef.current.push({
            x: finalX,
            y: finalY,
            phase
        });
     }

     if (phase === WarmupPhase.GRID_SHOT) {
        // Relaxed threshold for better usability (25% of screen width radius)
        const targetThreshold = 0.25; 
        const dwellTimeThreshold = 80; // Reduced to 80ms for snappier feel

        if (distance < targetThreshold) {
            if (!gridShotRef.current.dwellStartTime) {
                gridShotRef.current.dwellStartTime = performance.now();
            } else {
                const dwellDuration = performance.now() - gridShotRef.current.dwellStartTime;
                if (dwellDuration > dwellTimeThreshold && !gridShotRef.current.isLocked) {
                    // TARGET HIT!
                    gridShotRef.current.isLocked = true;
                    
                    const reactionTime = performance.now() - gridShotRef.current.lastSpawnTime;
                    let feedbackColor: 'green' | 'yellow' | 'red' = 'red';
                    // Relaxed reaction time thresholds
                    if (reactionTime < 600) feedbackColor = 'green';
                    else if (reactionTime < 1200) feedbackColor = 'yellow';
                    
                    setGridShotFeedback({ color: feedbackColor, id: Date.now() });
                    
                    // Move to new random position immediately
                    // Keep within 15-85% to avoid edge tracking issues
                    const nextX = 0.15 + Math.random() * 0.7;
                    const nextY = 0.15 + Math.random() * 0.7;
                    setTargetPosition({ x: nextX, y: nextY });
                    
                    // Reset for next target
                    gridShotRef.current.lastSpawnTime = performance.now();
                    gridShotRef.current.dwellStartTime = null;
                    gridShotRef.current.isLocked = false;
                    
                    // Add perfect score to reaction accumulator
                    scoreAccumulatorRef.current.reaction.push(0); 
                }
            }
        } else {
            // Lost lock
            gridShotRef.current.dwellStartTime = null;
        }
        return; // Don't process standard distance scoring
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
    distractorPosition,
    gridShotFeedback,
    startSession,
    processFrame,
    nextPhase,
  };
};
