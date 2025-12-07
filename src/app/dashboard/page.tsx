'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getRecommendations } from '@/core/engine/recommendations';
import { WarmupScore } from '@/core/engine/types';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SessionData {
  date: string;
  scores: WarmupScore;
  gazeHistory: Array<{x: number, y: number, phase: string}>;
}

function Heatmap({ points }: { points: Array<{x: number, y: number}> }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Radar Grid
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.min(cx, cy) - 20;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Concentric circles
    for (let r = 0.2; r <= 1.0; r += 0.2) {
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius * r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, cy - maxRadius);
    ctx.lineTo(cx, cy + maxRadius);
    ctx.moveTo(cx - maxRadius, cy);
    ctx.lineTo(cx + maxRadius, cy);
    ctx.stroke();
    
    // Draw semi-transparent circles for each point
    // High density areas will become brighter/more opaque
    points.forEach(p => {
        const x = p.x * canvas.width;
        const y = p.y * canvas.height;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
        gradient.addColorStop(0, 'rgba(255, 0, 128, 0.15)'); // Core
        gradient.addColorStop(1, 'rgba(255, 0, 128, 0)'); // Edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
    });

  }, [points]);

  return (
    <div className="relative aspect-video w-full bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800 box-glow">
        <canvas 
            ref={canvasRef} 
            width={640} 
            height={360} 
            className="w-full h-full opacity-100"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>
        <div className="absolute bottom-2 right-2 text-xs text-zinc-500 font-mono">
            RADAR::GAZE_DENSITY
        </div>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [history, setHistory] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load from Local Storage
    try {
        const currentStr = localStorage.getItem('apex_vision_current_session');
        const historyStr = localStorage.getItem('apex_vision_history');
        
        if (currentStr) {
            setCurrentSession(JSON.parse(currentStr));
        } else {
            // Fallback to URL params if no local storage (legacy)
            const scoresParam = searchParams.get('scores');
            if (scoresParam) {
                const scores = JSON.parse(scoresParam);
                setCurrentSession({
                    date: new Date().toISOString(),
                    scores,
                    gazeHistory: [] // No history in URL
                });
            }
        }

        if (historyStr) {
            setHistory(JSON.parse(historyStr));
        }
    } catch (e) {
        console.error("Error loading dashboard data", e);
    } finally {
        setLoading(false);
    }
  }, [searchParams]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading analysis...</div>;

  if (!currentSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-4">
        <p className="mb-4 text-zinc-400">No session data found.</p>
        <Link href="/warmup">
          <Button variant="outline" className="border-[#ff0080] text-[#ff0080] hover:bg-[#ff0080]/10">Start New Warmup</Button>
        </Link>
      </div>
    );
  }

  const { scores, gazeHistory } = currentSession;
  const drills = getRecommendations(scores);
  
  // Format history for graph
  const chartData = history.map((h, i) => ({
    name: new Date(h.date).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'}),
    score: h.scores.overall
  }));

  // If chart data is empty or has 1 item, add the current one just to show something if history wasn't saved yet?
  // Actually history should include current if it was saved in useWarmupSession.

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-8">
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

        {/* Heatmap */}
        {gazeHistory.length > 0 && (
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#7928ca] rounded-full"></span>
                    Gaze Distribution
                </h3>
                <Heatmap points={gazeHistory} />
                <p className="text-xs text-zinc-500">
                    Visualization of your eye movements during the session. Denser areas indicate longer fixation.
                </p>
            </div>
        )}

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ScoreCard label="Saccade Speed" value={scores.saccade} />
          <ScoreCard label="Smooth Pursuit" value={scores.smoothPursuit} />
          <ScoreCard label="Peripheral" value={scores.peripheral} />
          <ScoreCard label="Reaction Time" value={scores.reaction} />
          <ScoreCard label="Stability" value={scores.stability} />
        </div>

        {/* Score History Graph */}
        {history.length > 0 && (
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#ff0080] rounded-full"></span>
                    Progress Over Time
                </h3>
                <Card className="bg-[#0a0a0a] border-zinc-800 p-4">
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff0080" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#ff0080" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} domain={[0, 100]} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', color: '#fff' }}
                                    itemStyle={{ color: '#ff0080' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="score" 
                                    stroke="#ff0080" 
                                    strokeWidth={4}
                                    dot={{ fill: '#ff0080', strokeWidth: 0, r: 4 }}
                                    activeDot={{ r: 8, fill: '#fff' }}
                                    fill="url(#scoreGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        )}

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
        <Suspense fallback={<div className="min-h-screen bg-black text-white p-10 text-center">Loading...</div>}>
            <DashboardContent />
        </Suspense>
    )
}
