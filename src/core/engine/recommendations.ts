import { WarmupScore } from './types';

export interface Drill {
  id: string;
  game: 'COD' | 'Battlefield' | 'General';
  name: string;
  description: string;
  focus: string;
}

export const getRecommendations = (scores: WarmupScore): Drill[] => {
  const drills: Drill[] = [];

  // Saccade Logic
  if (scores.saccade < 80) {
    drills.push({
      id: 'cod-saccade',
      game: 'COD',
      name: 'Pop-up Targets',
      description: 'Practice rapid target switching in the firing range. Focus on snapping to targets without overshooting.',
      focus: 'Target Acquisition',
    });
    drills.push({
      id: 'bf-saccade',
      game: 'Battlefield',
      name: '180° Target Clear',
      description: 'Turn 180 degrees and snap to targets behind you to train spatial awareness and snap speed.',
      focus: 'Reflexes',
    });
  }

  // Tracking Logic
  if (scores.smoothPursuit < 80) {
    drills.push({
      id: 'cod-tracking',
      game: 'COD',
      name: 'Strafing Bots',
      description: 'Set bots to strafe only in the firing range. Track their heads while mirroring their movement.',
      focus: 'Tracking',
    });
  }

  // Stability Logic
  if (scores.stability < 80) {
    drills.push({
      id: 'cod-stability',
      game: 'COD',
      name: 'Long Range Precision',
      description: 'Use a low-zoom optic and hold aim on a distant target while moving. Keep the reticle glued to the center.',
      focus: 'Stability',
    });
  }

  // Peripheral Logic
  if (scores.peripheral < 80) {
    drills.push({
      id: 'general-peripheral',
      game: 'General',
      name: 'Corner Checking',
      description: 'Practice entering rooms while visually scanning corners before the center of the room.',
      focus: 'Awareness',
    });
  }

  // Fallback if all scores are good
  if (drills.length === 0) {
    drills.push({
      id: 'cod-maintenance',
      game: 'COD',
      name: 'Standard Warmup Routine',
      description: 'Run your standard playlist. Your visual systems are primed and ready.',
      focus: 'Maintenance',
    });
  }

  return drills.slice(0, 3); // Return top 3 recommendations
};

