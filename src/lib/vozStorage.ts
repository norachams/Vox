import { smartTitle } from "@/lib/smartTitle";

export type ChatSummary = {
    id: string;
    title: string;
    createdAt: string;  
    updatedAt: string;  
    durationSec: number;
    lastMessagePreview: string;
  };
  
  export type ChatMessage = {
    id: string;
    chatId: string;
    role: "user" | "assistant";
    text: string;
    timestamp: string; 
  };
  
  const CHATS_KEY = "voz:chats";                  
  const chatMsgsKey = (id: string) => `voz:chat:${id}:messages`; 
  
  /** Safe localStorage (avoid SSR errors) */
  function getLS(): Storage | null {
    if (typeof window === "undefined") return null;
    try { return window.localStorage; } catch { return null; }
  }

  const isDefaultTitle = (t: string) => {
    if (!t) return true;
    const s = t.trim().toLowerCase();
    // treat these as placeholders we’re allowed to replace
    return s === "New Chat" || s.startsWith("new chat") || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s);
  };
  
  
  /** Utilities */
  const nowISO = () => new Date().toISOString();
  const rid = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

    
  /** CHATS LIST */
  export function listChats(): ChatSummary[] {
    const ls = getLS();
    if (!ls) return [];
    const raw = ls.getItem(CHATS_KEY);
    const arr: ChatSummary[] = raw ? JSON.parse(raw) : [];
    // newest first
    return arr.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }
  
  function saveChats(chats: ChatSummary[]) {
    const ls = getLS();
    if (!ls) return;
    ls.setItem(CHATS_KEY, JSON.stringify(chats));
  }
  
  /** MESSAGES for one chat */
  export function listMessages(chatId: string): ChatMessage[] {
    const ls = getLS();
    if (!ls) return [];
    const raw = ls.getItem(chatMsgsKey(chatId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  }
  
  function saveMessages(chatId: string, msgs: ChatMessage[]) {
    const ls = getLS();
    if (!ls) return;
    ls.setItem(chatMsgsKey(chatId), JSON.stringify(msgs));
  }
  
  /** Create a new chat and return its id */
  export function createChat(initialTitle?: string): ChatSummary {
    const chats = listChats();
    const id = rid();
    const createdAt = nowISO();
    const chat: ChatSummary = {
      id,
      title: initialTitle || "New Chat",
      createdAt,
      updatedAt: createdAt,
      durationSec: 0,
      lastMessagePreview: "",
    };
    saveChats([chat, ...chats]);
    saveMessages(id, []); // initialize
    return chat;
  }
  
  /** Append a FINAL message; also updates chat preview/updatedAt */
  export function appendFinalMessage(chatId: string, role: "user" | "assistant", text: string): ChatMessage {
    const msgs = listMessages(chatId);
    const msg: ChatMessage = { id: rid(), chatId, role, text, timestamp: nowISO() };
    saveMessages(chatId, [...msgs, msg]);
  
    // update chat summary
    const chats = listChats();
    const idx = chats.findIndex(c => c.id === chatId);
    if (idx >= 0) {
      const c = { ...chats[idx] };
      c.updatedAt = msg.timestamp;
      if (role === "assistant" && text.trim()) {
        c.lastMessagePreview = text.length > 120 ? text.slice(0, 120) + "…" : text;
      }
     
      if (isDefaultTitle(c.title)) {
        const firstUser = msgs.find(m => m.role === "user")?.text || "";
        const firstAssistant = msgs.find(m => m.role === "assistant")?.text || "";
        const t = smartTitle(firstUser, firstAssistant)?.trim();
        if (t) c.title = t; 
      }

      const next = [c, ...chats.filter(x => x.id !== chatId)];
      saveChats(next);
    }
    return msg;
  }
  
  /** Rename chat (optional UI) */
  export function renameChat(chatId: string, title: string) {
    const chats = listChats();
    const idx = chats.findIndex(c => c.id === chatId);
    if (idx < 0) return;
    chats[idx] = { ...chats[idx], title };   
    saveChats(chats);
  }

  
  /** Finalize duration on end */
  export function finalizeDuration(chatId: string, durationSec: number) {
    const chats = listChats();
    const idx = chats.findIndex(c => c.id === chatId);
    if (idx < 0) return;
    const c = { ...chats[idx], durationSec, updatedAt: nowISO() };
    const next = [c, ...chats.filter(x => x.id !== chatId)];
    saveChats(next);
  }
  
  
  /** Delete chat + its messages */
  export function deleteChat(chatId: string) {
    const ls = getLS();
    if (!ls) return;
    const next = listChats().filter(c => c.id !== chatId);
    saveChats(next);
    ls.removeItem(chatMsgsKey(chatId));
  }
  

  