export enum WarmupPhase {
  IDLE = 'idle',
  CALIBRATION = 'calibration',
  SACCADE = 'saccade',
  SMOOTH_PURSUIT = 'smooth_pursuit',
  PERIPHERAL = 'peripheral',
  REACTION = 'reaction',
  STABILITY = 'stability',
  COMPLETED = 'completed',
}

export interface WarmupScore {
  saccade: number;
  smoothPursuit: number;
  peripheral: number;
  reaction: number;
  stability: number;
  overall: number;
}

export interface TestConfig {
  duration: number; // seconds
  targetSize: number; // pixels or percent
  speed: number; // for moving targets
}

