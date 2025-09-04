"use client";

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const router = useRouter();
  
  const startNewChat = () => {
    router.push("/chat");
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-bg">
      {/* Header */}
      <header className="w-full px-6 py-8 flex items-center justify-between" aria-label="App header">
        <div className="flex items-center gap-3">
          <div aria-hidden className="h-9 w-9 rounded-full bg-teal" />
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Voz</h1>
        </div>
      
      </header>

      {/* Main Hero */}
      <main className="flex-1 w-full px-8 py-12 flex flex-col items-center justify-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-center text-primary mb-4">
          Tap to start chatting
        </h2>
        <p className="text-center text-neutral max-w-2xl mb-12 text-lg">
          place holder text, description of chat
        </p>
        <div className="flex flex-col items-center">
          <button
            onClick={startNewChat}
            className="group relative rounded-full p-8 sm:p-10 shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/20 bg-primary text-white hover:bg-primary/90 transition-colors"
            aria-label="Start a new voice chat"
          >
            <Play className="h-10 w-10 sm:h-12 sm:w-12" />
          </button>
        </div>
      </main>
    </div>
  );
}
