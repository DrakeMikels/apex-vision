import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center relative overflow-hidden">
      {/* 3D Grid Background - Simplified Structure */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="grid-bg w-full h-full absolute inset-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>
      </div>

      {/* Background Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#ff0080] opacity-20 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="max-w-md space-y-10 relative z-10">
        <div className="space-y-4">
          <h1 className="text-[4.5rem] font-extrabold tracking-tighter">
            <span className="bg-gradient-to-r from-[#ff0080] to-[#7928ca] bg-clip-text text-transparent text-glow">
              ApexVision
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            The first mobile visual-performance gym for FPS gamers.
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-px bg-gradient-to-b from-zinc-800 to-black rounded-xl overflow-hidden box-glow">
            <div className="p-6 bg-[#0a0a0a] rounded-xl">
              <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <span className="w-1 h-6 bg-[#ff0080] rounded-full"></span>
                Why Warm Up?
              </h3>
              <ul className="text-sm text-zinc-400 text-left space-y-3">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff0080]"></div>
                  Faster target acquisition
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7928ca]"></div>
                  Reduced eye fatigue
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff0080]"></div>
                  Improved tracking accuracy
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7928ca]"></div>
                  Data-driven drill recommendations
                </li>
              </ul>
            </div>
          </div>

          <Link href="/warmup" className="block w-full">
            <Button className="w-full bg-gradient-to-r from-[#ff0080] to-[#7928ca] hover:opacity-90 text-white font-bold py-6 text-lg rounded-full shadow-[0_0_20px_rgba(255,0,128,0.4)] transition-all duration-300 hover:scale-[1.02]">
              Start Visual Warmup
            </Button>
          </Link>
          
          <p className="text-xs text-zinc-600">
            Requires camera access. No video is recorded or stored.
          </p>
        </div>
      </div>
    </div>
  );
}
