'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getRecommendations } from '@/core/engine/recommendations';
import { WarmupScore } from '@/core/engine/types';
import Link from 'next/link';

function DashboardContent() {
  const searchParams = useSearchParams();
  const scoresParam = searchParams.get('scores');
  
  let scores: WarmupScore | null = null;
  try {
    if (scoresParam) {
      scores = JSON.parse(scoresParam);
    }
  } catch (e) {
    console.error('Failed to parse scores', e);
  }

  if (!scores) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-4">
        <p className="mb-4 text-zinc-400">No session data found.</p>
        <Link href="/warmup">
          <Button variant="outline" className="border-[#ff0080] text-[#ff0080] hover:bg-[#ff0080]/10">Start New Warmup</Button>
        </Link>
      </div>
    );
  }

  const drills = getRecommendations(scores);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 pb-20">
      <div className="max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter text-glow">Readiness Report</h1>
          <p className="text-zinc-400">FPS Performance Assessment</p>
        </div>

        {/* Overall Score */}
        <Card className="bg-[#0a0a0a] border-zinc-800 box-glow">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-400 text-sm uppercase tracking-widest">Overall Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-6xl font-bold text-[#ff0080] text-glow">{scores.overall}</span>
              <span className="text-zinc-500 text-xl mb-2">/ 100</span>
            </div>
            <Progress value={scores.overall} className="mt-4 h-3 bg-zinc-900" indicatorClassName="bg-gradient-to-r from-[#ff0080] to-[#7928ca]" />
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <ScoreCard label="Saccade Speed" value={scores.saccade} />
          <ScoreCard label="Smooth Pursuit" value={scores.smoothPursuit} />
          <ScoreCard label="Peripheral" value={scores.peripheral} />
          <ScoreCard label="Reaction Time" value={scores.reaction} />
          <ScoreCard label="Stability" value={scores.stability} />
        </div>

        {/* Recommendations */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-[#ff0080] pl-3 text-white">Recommended Drills</h2>
          {drills.map((drill) => (
            <Card key={drill.id} className="bg-[#0a0a0a] border-zinc-800 overflow-hidden group hover:border-[#ff0080]/50 transition-colors">
              <div className="bg-zinc-900 px-4 py-1 flex justify-between items-center border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{drill.game}</span>
                <span className="text-xs text-[#ff0080] font-bold">{drill.focus}</span>
              </div>
              <CardContent className="pt-4 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff0080] to-[#7928ca] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h3 className="font-bold text-lg mb-1 text-white group-hover:text-[#ff0080] transition-colors">{drill.name}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{drill.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Link href="/warmup" className="block">
          <Button className="w-full bg-gradient-to-r from-[#ff0080] to-[#7928ca] hover:opacity-90 text-white font-bold py-6 text-lg shadow-[0_0_15px_rgba(255,0,128,0.4)] transition-transform active:scale-95">
            Start New Session
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 90) return 'text-[#ff0080]'; // Excellent
    if (v >= 70) return 'text-[#7928ca]'; // Good
    return 'text-zinc-500'; // Needs work
  };

  return (
    <Card className="bg-[#0a0a0a] border-zinc-800 hover:bg-zinc-900/50 transition-colors">
      <CardContent className="pt-6">
        <div className={`text-2xl font-bold ${getColor(value)} text-glow`}>{value}</div>
        <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">{label}</div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardContent />
        </Suspense>
    )
}
