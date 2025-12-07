export enum WarmupPhase {
  IDLE = 'idle',
  CALIBRATION_SETUP = 'calibration_setup', // Align face
  CALIBRATION_CENTER = 'calibration_center', // Look at center
  CALIBRATION_LEFT = 'calibration_left', // Look left/corner
  CALIBRATION_RIGHT = 'calibration_right', // Look right/corner
  SACCADE = 'saccade',
  SMOOTH_PURSUIT = 'smooth_pursuit',
  PERIPHERAL_1 = 'peripheral_1',
  PERIPHERAL_2 = 'peripheral_2',
  PERIPHERAL_3 = 'peripheral_3',
  REACTION_1 = 'reaction_1',
  REACTION_2 = 'reaction_2',
  REACTION_3 = 'reaction_3',
  GRID_SHOT = 'grid_shot', // Gamified target acquisition
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
