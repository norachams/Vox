"use client";

import { Play,  Trash2, ArrowRight} from "lucide-react";
import { useRouter } from "next/navigation";
import { createChat, listChats, deleteChat, type ChatSummary } from "@/lib/vozStorage";
import * as React from "react";



export default function Onboarding() {
  const router = useRouter();
  const [chats, setChats] = React.useState<ChatSummary[]>([]);

  // Load chats on mount, and refresh when window regains focus (after ending a call)
  React.useEffect(() => {
    const load = () => setChats(listChats());
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);


  
  const startNewChat = () => {
    const chat = createChat();                    
    router.push(`/chat/${chat.id}?autostart=1`);
  };

  const openChat = (id: string) => router.push(`/chat/${id}`);
  const removeChat = (id: string) => {
    deleteChat(id);
    setChats(listChats());
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
      
       {/* Recent chats */}
       <section className="px-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Recent voice chats</h3>
          {chats.length > 0 && (
            <span className="text-sm text-neutral">{chats.length}</span>
          )}
        </div>

        {chats.length === 0 ? (
          <p className="text-neutral">No chats yet. Start one above.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {chats.map((c) => (
              <li
                key={c.id}
                className="rounded-xl bg-white/80 border border-black/5 shadow-sm p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium text-primary truncate">{c.title}</div>
                  <div className="text-xs text-neutral truncate">
                    {new Date(c.updatedAt).toLocaleString()}
                  </div>
                  {c.lastMessagePreview && (
                    <div className="text-xs text-neutral mt-1 line-clamp-2">
                      {c.lastMessagePreview}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openChat(c.id)}
                    className="rounded-full px-3 py-1 text-sm bg-accent text-primary shadow flex items-center gap-1"
                    title="Continue"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeChat(c.id)}
                    className="rounded-full p-2 bg-white text-primary border border-black/10 hover:bg-bg"
                    title="Delete"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
