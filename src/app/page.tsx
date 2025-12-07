import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
      <div className="max-w-md space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tighter bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            ApexVision
          </h1>
          <p className="text-xl text-zinc-400">
            The first mobile visual-performance gym for FPS gamers.
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h3 className="text-lg font-bold mb-2 text-white">Why Warm Up?</h3>
            <ul className="text-sm text-zinc-400 text-left space-y-2 list-disc pl-5">
              <li>Faster target acquisition</li>
              <li>Reduced eye fatigue</li>
              <li>Improved tracking accuracy</li>
              <li>Data-driven drill recommendations</li>
            </ul>
          </div>

          <Link href="/warmup" className="block w-full">
            <Button className="w-full bg-white text-black hover:bg-zinc-200 font-bold py-6 text-lg rounded-full">
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

