"use client";

import { Play, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createChat,
  listChats,
  deleteChat,
  renameChat,
  type ChatSummary,
} from "@/lib/vozStorage";
import * as React from "react";

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const isYest =
    d.getFullYear() === y.getFullYear() &&
    d.getMonth() === y.getMonth() &&
    d.getDate() === y.getDate();

  if (sameDay) return "Today";
  if (isYest) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Onboarding() {
  const router = useRouter();

  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState<string>("");
  const menuAreaRef = React.useRef<HTMLDivElement | null>(null); 
  const editRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const load = () => setChats(listChats());
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuAreaRef.current && !menuAreaRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpenId(null);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Focus the inline input when editing starts
  React.useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const startNewChat = () => {
    const chat = createChat();
    router.push(`/chat/${chat.id}?autostart=1`);
  };

  const openChat = (id: string) => router.push(`/chat/${id}?captions=1&resume=1`);

  const doDelete = (id: string) => {
    deleteChat(id);
    setChats(listChats());
    setMenuOpenId(null);
  };

  const beginRename = (c: ChatSummary) => {
    setMenuOpenId(null);
    setEditingId(c.id);
    setDraftTitle(c.title);
  };

  const commitRename = () => {
    if (!editingId) return;
    const next = draftTitle.trim();
    if (next) {
      renameChat(editingId, next);
      setChats(listChats());
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setDraftTitle("");
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-bg">
      {/* Header */}
      <header className="w-full px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div aria-hidden className="h-9 w-9 rounded-full bg-teal" />
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Voz</h1>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 w-full px-8 pt-2 pb-12 flex flex-col items-center justify-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-center text-primary mb-4">
          Tap to Start a New Chat
        </h2>
        <p className="text-center text-neutral max-w-2xl mb-8 text-lg">
          Voz is like an assistant. Ask him anything!
        </p>
        <button
          onClick={startNewChat}
          className="group relative rounded-full p-8 sm:p-6 shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/20 bg-primary text-white hover:bg-primary/90 transition-colors"
          aria-label="Start a new voice chat"
        >
          <Play className="h-10 w-10 sm:h-12 sm:w-12" />
        </button>
      </main>

      {/* Recent chats */}
      <section className="px-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Recent Chats</h3>
          {chats.length > 0 && <span className="text-sm text-neutral">{chats.length}</span>}
        </div>

        {chats.length === 0 ? (
          <p className="text-neutral">No chats yet. Start one above.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {chats.map((c) => {
              const isMenuOpen = menuOpenId === c.id;
              const isEditing = editingId === c.id;

              return (
                <li
                  key={c.id}
                  className="relative rounded-2xl bg-white/90 border border-black/5 shadow-sm p-5"
                >
                  {/* Menu and dropdown*/}
                  <div ref={isMenuOpen ? menuAreaRef : null} className="absolute top-3 right-3 z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId((prev) => (prev === c.id ? null : c.id));
                      }}
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      aria-label="More actions"
                      className="text-primary/70 hover:text-primary text-xl leading-none px-2"
                    >
                      ⋯
                    </button>

                    {isMenuOpen && (
                      <div
                        role="menu"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-2 w-36 rounded-lg border border-black/10 bg-white shadow-md p-1 z-50"
                      >
                        <button
                          role="menuitem"
                          onClick={() => beginRename(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-bg rounded-md"
                        >
                          Rename
                        </button>
                        <button
                          role="menuitem"
                          onClick={() => doDelete(c.id)}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-bg rounded-md"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title  */}
                  {isEditing ? (
                    <input
                      ref={editRef}
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      className="w-full text-primary font-semibold text-[1.15rem] leading-6 bg-transparent p-0 border-0 outline-none focus:outline-none focus:ring-0"
                    />
                  ) : (
                    <div
                      className="text-primary font-semibold text-[1.15rem] leading-6 truncate cursor-text pr-10" // pr-10 to avoid underlapping ⋯
                      title={c.title}
                      onDoubleClick={() => beginRename(c)}
                    >
                      {c.title}
                    </div>
                  )}

                  {/*  Date  */}
                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <div className="text-neutral text-sm truncate">
                      {c.lastMessagePreview || ""}
                    </div>
                    <div className="text-sm text-neutral shrink-0">{formatWhen(c.updatedAt)}</div>
                  </div>

                  {/*  Continue Button */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => openChat(c.id)}
                      className="rounded-full px-4 py-2 text-sm bg-accent text-primary shadow flex items-center gap-1"
                      title="Continue"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
