'use client';

import React, { useEffect } from 'react';
import { useEyeTracker } from '@/core/tracking/useEyeTracker';
import { useWarmupSession } from '@/core/engine/useWarmupSession';
import { WarmupPhase } from '@/core/engine/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const PHASE_INSTRUCTIONS: Record<WarmupPhase, string> = {
  [WarmupPhase.IDLE]: 'Get Ready',
  [WarmupPhase.CALIBRATION]: 'Align your face with the camera',
  [WarmupPhase.SACCADE]: 'Snap your eyes quickly to the red dot',
  [WarmupPhase.SMOOTH_PURSUIT]: 'Follow the dot smoothly with your eyes',
  [WarmupPhase.PERIPHERAL]: 'Keep looking center, notice the flashes',
  [WarmupPhase.REACTION_1]: 'React quickly! Look at the new target instantly (Speed 1)',
  [WarmupPhase.REACTION_2]: 'Faster! (Speed 2)',
  [WarmupPhase.REACTION_3]: 'Maximum Speed! (Speed 3)',
  [WarmupPhase.STABILITY]: 'Stare at the center dot. Do not move your eyes.',
  [WarmupPhase.COMPLETED]: 'Session Complete',
};

export default function WarmupPage() {
  const router = useRouter();
  const { videoRef, trackingResult, error } = useEyeTracker();
  const { phase, timeLeft, targetPosition, startSession, nextPhase, processFrame, scores } = useWarmupSession();

  useEffect(() => {
    if (trackingResult.faceDetected) {
      processFrame(trackingResult);
    }
  }, [trackingResult, processFrame]);

  useEffect(() => {
    if (phase === WarmupPhase.COMPLETED) {
      // Navigate to results with scores (in a real app, save to DB here)
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

      {/* Target */}
      {(phase !== WarmupPhase.IDLE && phase !== WarmupPhase.COMPLETED && phase !== WarmupPhase.CALIBRATION) && (
        <div
          className={`absolute w-6 h-6 bg-[#ff0080] rounded-full shadow-[0_0_20px_#ff0080] ${phase === WarmupPhase.STABILITY ? 'animate-pulse' : ''}`}
          style={{
            left: `${(targetPosition?.x || 0.5) * 100}%`,
            top: `${(targetPosition?.y || 0.5) * 100}%`,
            transform: 'translate(-50%, -50%)',
            transition: (phase === WarmupPhase.SACCADE || phase.startsWith('reaction')) ? 'none' : 'left 0.1s linear, top 0.1s linear',
          }}
        />
      )}

      {/* UI Overlay */}
      <div className="absolute top-8 left-0 right-0 text-center z-20 pointer-events-none px-4">
        <h2 className="text-3xl font-bold text-white uppercase tracking-wider drop-shadow-md text-glow">
          {phase.replace(/_/g, ' ')}
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
      {(phase === WarmupPhase.IDLE || phase === WarmupPhase.CALIBRATION) && (
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

          {phase === WarmupPhase.CALIBRATION && (
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
