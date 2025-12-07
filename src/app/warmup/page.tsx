'use client';

import React, { useEffect } from 'react';
import { useEyeTracker } from '@/core/tracking/useEyeTracker';
import { useWarmupSession } from '@/core/engine/useWarmupSession';
import { WarmupPhase } from '@/core/engine/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Target from '@/components/Target';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const PHASE_INSTRUCTIONS: Record<WarmupPhase, string> = {
  [WarmupPhase.IDLE]: 'Get Ready',
  [WarmupPhase.CALIBRATION_SETUP]: 'Align your face with the camera',
  [WarmupPhase.CALIBRATION_CENTER]: 'Look at the CENTER dot',
  [WarmupPhase.CALIBRATION_LEFT]: 'Look at the LEFT dot',
  [WarmupPhase.CALIBRATION_RIGHT]: 'Look at the RIGHT dot',
  [WarmupPhase.SACCADE]: 'Snap your eyes quickly to the crosshair',
  [WarmupPhase.SMOOTH_PURSUIT]: 'Follow the crosshair smoothly with your eyes',
  [WarmupPhase.PERIPHERAL_1]: 'Keep looking center, notice the flashes (Level 1)',
  [WarmupPhase.PERIPHERAL_2]: 'Faster! (Level 2)',
  [WarmupPhase.PERIPHERAL_3]: 'Maximum Speed! (Level 3)',
  [WarmupPhase.REACTION_1]: 'React quickly! Look at the new target instantly (Speed 1)',
  [WarmupPhase.REACTION_2]: 'Faster! (Speed 2)',
  [WarmupPhase.REACTION_3]: 'Maximum Speed! (Speed 3)',
  [WarmupPhase.GRID_SHOT]: 'Rapid Fire! Lock onto targets as fast as possible.',
  [WarmupPhase.STABILITY]: 'Fixate on the center dot. Do not move your eyes.',
  [WarmupPhase.COMPLETED]: 'Session Complete',
};

function WarmupContent() {
  const router = useRouter();
  const { videoRef, trackingResult, error } = useEyeTracker();
  const { phase, timeLeft, targetPosition, distractorPosition, gridShotFeedback, startSession, nextPhase, processFrame, scores } = useWarmupSession();

  useEffect(() => {
    if (trackingResult.faceDetected) {
      processFrame(trackingResult);
    }
  }, [trackingResult, processFrame]);

  useEffect(() => {
    if (phase === WarmupPhase.COMPLETED) {
      // Navigate to results with scores
      const query = encodeURIComponent(JSON.stringify(scores));
      router.push(`/dashboard?scores=${query}`);
    }
  }, [phase, scores, router]);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden flex flex-col items-center justify-center">
      {/* Camera Feed (Mirror Effect) */}
      <video
        ref={videoRef}
        className="absolute top-4 right-4 w-32 h-24 object-cover rounded-lg border-2 border-[#ff0080] opacity-50 z-10 scale-x-[-1] shadow-[0_0_15px_rgba(255,0,128,0.3)]"
        autoPlay
        playsInline
        muted
      />

      {/* Target Component */}
      {(phase !== WarmupPhase.IDLE && phase !== WarmupPhase.COMPLETED && phase !== WarmupPhase.CALIBRATION_SETUP) && (
        <>
          <Target 
            x={targetPosition?.x || 0.5} 
            y={targetPosition?.y || 0.5} 
            isStability={phase === WarmupPhase.STABILITY}
          />
          {/* Distractor for Stability Phase */}
          {distractorPosition && (
             <div 
                className="absolute w-10 h-10 rounded-full bg-[#7928ca] blur-sm animate-pulse z-20 pointer-events-none opacity-60"
                style={{
                    left: `${distractorPosition.x * 100}%`,
                    top: `${distractorPosition.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                }}
             />
          )}

          {/* Grid Shot Feedback Indicator */}
          {gridShotFeedback && (
            <>
                {/* Ping Animation */}
                <div
                    key={`ping-${gridShotFeedback.id}`}
                    className={`absolute pointer-events-none z-30 animate-[ping_0.5s_ease-out] w-20 h-20 rounded-full border-4 opacity-0`}
                    style={{
                        left: `${targetPosition.x * 100}%`,
                        top: `${targetPosition.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        borderColor: gridShotFeedback.color === 'green' ? '#4ade80' : gridShotFeedback.color === 'yellow' ? '#facc15' : '#ef4444'
                    }}
                />
                {/* Text Feedback */}
                <div
                    key={`text-${gridShotFeedback.id}`}
                    className={`absolute pointer-events-none z-40 animate-out fade-out slide-out-to-top-4 duration-700 font-black uppercase tracking-widest text-2xl text-glow`}
                    style={{
                        left: `${targetPosition.x * 100}%`,
                        top: `${targetPosition.y * 100}%`,
                        transform: 'translate(-50%, -200%)',
                        color: gridShotFeedback.color === 'green' ? '#4ade80' : gridShotFeedback.color === 'yellow' ? '#facc15' : '#ef4444'
                    }}
                >
                    {gridShotFeedback.color === 'green' ? 'PERFECT' : gridShotFeedback.color === 'yellow' ? 'GOOD' : 'MISS'}
                </div>
            </>
          )}
        </>
      )}

      {/* UI Overlay */}
      <div className="absolute top-8 left-0 right-0 text-center z-20 pointer-events-none px-4">
        <h2 className="text-3xl font-bold text-white uppercase tracking-wider drop-shadow-md text-glow">
          {phase.replace(/_/g, ' ').replace(/\d/g, '')} 
        </h2>
        <p className="text-zinc-300 text-lg mt-1 drop-shadow-sm">{PHASE_INSTRUCTIONS[phase]}</p>
        {timeLeft > 0 && (
          <div className="mt-4 inline-block">
             <span className="text-4xl font-mono font-bold text-[#ff0080] tabular-nums drop-shadow-lg text-glow">{timeLeft}</span>
             <span className="text-sm text-[#ff0080]/80 ml-1">s</span>
          </div>
        )}
      </div>

      {/* Start / Calibration Screen */}
      {(phase === WarmupPhase.IDLE || phase === WarmupPhase.CALIBRATION_SETUP) && (
        <div className="z-30 max-w-md w-full p-6 bg-[#0a0a0a]/90 rounded-xl border border-zinc-800 text-center backdrop-blur-sm box-glow">
          <h1 className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-[#ff0080] to-[#7928ca] bg-clip-text text-transparent">ApexVision Warmup</h1>
          
          {phase === WarmupPhase.IDLE && (
            <div className="space-y-4">
              <p className="text-zinc-400">
                Position your phone at eye level. Ensure good lighting.
              </p>
              <Button onClick={startSession} className="w-full bg-gradient-to-r from-[#ff0080] to-[#7928ca] hover:opacity-90 text-white font-bold py-6 text-lg shadow-[0_0_15px_rgba(255,0,128,0.4)]">
                Start Calibration
              </Button>
            </div>
          )}

          {phase === WarmupPhase.CALIBRATION_SETUP && (
            <div className="space-y-4">
              <p className="text-zinc-400">
                Face detected: <span className={trackingResult.faceDetected ? 'text-[#ff0080] font-bold' : 'text-red-500'}>
                  {trackingResult.faceDetected ? 'Yes' : 'No'}
                </span>
              </p>
              <p className="text-sm text-zinc-500">
                Look at the center of the screen.
              </p>
              <Button 
                onClick={nextPhase} 
                disabled={!trackingResult.faceDetected}
                className="w-full bg-gradient-to-r from-[#ff0080] to-[#7928ca] hover:opacity-90 text-white font-bold py-4 disabled:opacity-50"
              >
                Begin Warmup
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="absolute bottom-8 left-8 right-8 p-4 bg-red-900/80 text-red-100 rounded text-center">
          {error}
        </div>
      )}
    </div>
  );
}

export default function WarmupPage() {
  return (
    <ErrorBoundary>
      <WarmupContent />
    </ErrorBoundary>
  );
}
