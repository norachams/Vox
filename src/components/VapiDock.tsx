"use client";
import React from "react";
import Vapi from "@vapi-ai/web";
import { Mic, MicOff, Captions, X } from "lucide-react";
import TalkingBlob from "@/components/TalkingBlob";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter,useParams,useSearchParams } from "next/navigation";
import { appendFinalMessage,finalizeDuration,deleteChat,renameChat,listMessages } from "@/lib/vozStorage";
import { smartTitle } from "@/lib/smartTitle";




type Msg = { id: string; role: "user" | "assistant"; text: string };
type VapiMessage = {
  type?: string;                 
  transcript?: string;           
  role?: "user" | "assistant";   
  transcriptType?: "partial" | "final";
  isFinal?: boolean;
  utteranceId?: string;          
};

interface VapiClientWithMute {
  mute?: () => void;
  unmute?: () => void;
  setMuted?: (muted: boolean) => void;
}

declare global {
  interface Window {
    __vozDesignTimer?: NodeJS.Timeout;
  }
}

const rid = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

export default function VapiDock() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const resume = searchParams.get("resume") === "1";
  const wantCaptions = searchParams.get("captions") === "1";

  
  const endAndExit = () => {
    
    if (!finalizedRef.current) {
      finalizedRef.current = true;
  
      const started = callStartedAtMs.current;
      callStartedAtMs.current = null;
  
      if (chatId) {
        if (designMode) {
          deleteChat(chatId);
        } else {
          const durSec = started ? Math.max(0, Math.round((Date.now() - started) / 1000)) : 0;
          const keep = hadAnyVoice.current && durSec >= MIN_SAVE_SECONDS;
          if (keep) {
            finalizeDuration(chatId, durSec);
          } else {
            deleteChat(chatId);
          }
        }
      }
      hadAnyVoice.current = false;
    }
    try { vapi?.stop(); } catch {}
    router.push(`/?t=${Date.now()}`);
  };
  

  const apiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!;
  const designMode = process.env.NEXT_PUBLIC_VAPI_DISABLED === "true";

  const [vapi, setVapi] = React.useState<Vapi | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);

  // committed messages (final only)
  const [messages, setMessages] = React.useState<Msg[]>([]);

  const messagesRef = React.useRef<Msg[]>([]);
  React.useEffect(() => { messagesRef.current = messages; }, [messages]);


  // live partials (one bubble per speaker)
  const [liveAssistant, setLiveAssistant] = React.useState<string>("");
  const [liveUser, setLiveUser] = React.useState<string>("");

  // captions actions
  const [captionsOn, setCaptionsOn] = React.useState(false);

  // for mute feature
  const [muted, setMuted] = React.useState(false);

  // track current ids 
  const currentAssistantId = React.useRef<string | null>(null);
  const currentUserId = React.useRef<string | null>(null);

  const creatingRef = React.useRef(false);
  const autostartedRef = React.useRef(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // tracking time and if anyone spoke 
  const callStartedAtMs = React.useRef<number | null>(null);
  const hadAnyVoice = React.useRef(false); 

  const MIN_SAVE_SECONDS = 10;                 
  const finalizedRef = React.useRef(false);    

  const hasNamedRef = React.useRef(false); 
  const firstUserFinalRef = React.useRef<string | null>(null);
  const firstAssistantFinalRef = React.useRef<string | null>(null);


  const { chatId } = useParams<{ chatId: string }>();

  // Load saved transcript for this chat so captions show history
  React.useEffect(() => {
    if (!chatId) return;
    const past = listMessages(chatId);
    if (past.length) {
      // normalize to your Msg shape
      setMessages(past.map(m => ({ id: m.id, role: m.role, text: m.text })));
    }
    // open captions automatically if requested or if there is history
    if (wantCaptions || past.length) setCaptionsOn(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);


  const tryNameChat = React.useCallback(() => {
    if (hasNamedRef.current || !chatId) return;
    const title = smartTitle(
      firstUserFinalRef.current ?? "",
      firstAssistantFinalRef.current ?? ""
    );
    if (title?.trim()) {
      renameChat(chatId, title.trim());
      hasNamedRef.current = true;
    }
  }, [chatId]);
  

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, liveAssistant, liveUser]);

  // init client (skips network in design mode)
  React.useEffect(() => {
    if (designMode || creatingRef.current) return;
    creatingRef.current = true;

    const client = new Vapi(apiKey);
    setVapi(client);

    client.on("call-start", () => {
      setConnected(true);
      callStartedAtMs.current = Date.now(); 
      hadAnyVoice.current = false;  
      finalizedRef.current = false; 
      hasNamedRef.current = false;
      firstUserFinalRef.current = null;
      firstAssistantFinalRef.current = null;       
    });

    client.on("call-end", () => {
      setConnected(false);
      setSpeaking(false);
      setLiveAssistant("");
      setLiveUser("");
      currentAssistantId.current = null;
      currentUserId.current = null;

      try {
        const started = callStartedAtMs.current;
        callStartedAtMs.current = null;
    
        if (!designMode && chatId && started) {
          const durSec = Math.max(0, Math.round((Date.now() - started) / 1000));
          const keep = hadAnyVoice.current && durSec >= MIN_SAVE_SECONDS;
          if (keep) {
            finalizeDuration(chatId, durSec);
          } else {
            deleteChat(chatId);
          }
        }
      } finally {
        hadAnyVoice.current = false;
      }
    });

    client.on("speech-start", () => {
      setSpeaking(true);
      hadAnyVoice.current = true;
    });



    // When speech ends, if we never got a "final" flag, commit the live bubble
    client.on("speech-end", () => {
      setSpeaking(false);
      setMessages((prev) => {
        if (liveAssistant.trim()) {
          const last = prev[prev.length - 1];
          if (!(last && last.role === "assistant" && last.text === liveAssistant)) {
            prev = [...prev, { id: rid(), role: "assistant", text: liveAssistant }];
          }
        }
        return prev;
      });
      setLiveAssistant("");
      currentAssistantId.current = null;
    });

    client.on("message", (m: VapiMessage) => {
      if (m?.type !== "transcript" || !m.transcript || !m.role) return;

      const isFinal = m.transcriptType === "final" || m.isFinal === true;

      if (m.role === "assistant") {
        // overwrite the live assistant bubble with latest partial
        setLiveAssistant((prev) => (prev === m.transcript ? prev : m.transcript || ""));

        if (m.utteranceId && currentAssistantId.current !== m.utteranceId) {
          currentAssistantId.current = m.utteranceId;
        }

        if (isFinal) {
          // capture first assistant final + maybe name
          if (!firstAssistantFinalRef.current) firstAssistantFinalRef.current = m.transcript!;
          tryNameChat();
        
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.text === m.transcript) return prev;
            return [...prev, { id: rid(), role: "assistant", text: m.transcript! }];
          });
          if (!designMode && chatId) {
            appendFinalMessage(chatId, "assistant", m.transcript!);
          }
          hadAnyVoice.current = true;
          setLiveAssistant("");
          currentAssistantId.current = null;
        }
        
        return;
      }

      // USER side of the transcript
      setLiveUser((prev) => (prev === m.transcript ? prev : m.transcript || ""));
      if (m.utteranceId && currentUserId.current !== m.utteranceId) {
        currentUserId.current = m.utteranceId;
      }
      if (isFinal) {
        // capture first user final + maybe name
        if (!firstUserFinalRef.current) firstUserFinalRef.current = m.transcript!;
        tryNameChat();
      
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === "user" && last.text === m.transcript) return prev;
          return [...prev, { id: rid(), role: "user", text: m.transcript! }];
        });
        if (!designMode && chatId) {
          appendFinalMessage(chatId, "user", m.transcript!);
        }
        hadAnyVoice.current = true;
        setLiveUser("");
        currentUserId.current = null;
      }
    });

    return () => {
      try {
        client.stop();
      } catch {}
    };
  }, [apiKey, designMode, chatId]);

  // auto-start once (design mode OR once vapi is ready)
  React.useEffect(() => {
    if (autostartedRef.current) return;
    if (designMode || vapi) {
      autostartedRef.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designMode, vapi]);

  function buildRecap(msgs: Msg[]) {
    if (!msgs.length) return "";
    // take last ~6 bubbles and compress; keep it short to avoid rambling
    const last = msgs.slice(-6).map(m => `${m.role === "user" ? "User" : "AI"}: ${m.text}`).join(" | ");
    return `Quick recap of our last session: ${last}. Please pick up where we left off.`;
  }
  

  const start = async () => {
    if (designMode) {
      setConnected(true);
      setSpeaking(true);
      window.__vozDesignTimer = setInterval(() => setSpeaking((s) => !s), 1500);
      return;
    }
    if (!vapi || !assistantId) return;
    await vapi.start(assistantId);
    // If we came from "Continue", give the model a quick recap
  if (resume) {
    const recap = buildRecap(messagesRef.current);
    if (recap) {
      try {
        // Vapi supports sending text input to the assistant
        // (If your SDK version differs, this no-op won't break anything.)
        vapi.send({ type: "say", message: recap });
      } catch {}
    }
  }
  };

  

const toggleCaptions = () => setCaptionsOn((v) => !v);

const setMicMuted = async (next: boolean) => {
  setMuted(next);
  if (designMode) return; // don't spend credits / don't call SDK in design mode
  try {
    const anyVapi = vapi as unknown as VapiClientWithMute;
    if (!anyVapi) return;

    if (typeof anyVapi.mute === "function" && typeof anyVapi.unmute === "function") {
      next ? anyVapi.mute() : anyVapi.unmute();
    } else if (typeof anyVapi.setMuted === "function") {
      anyVapi.setMuted(next);
    } else {
      // fallback: best effort – UI reflects mute even if SDK method differs
      console.warn("Mute method not found on Vapi client; UI only.");
    }
  } catch (e) {
    console.warn("Mute toggle failed:", e);
  }
};

const toggleMute = () => setMicMuted(!muted);

  return (
    <div className="fixed inset-0 z-[1000] font-sans bg-bg">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <TalkingBlob active={speaking} size={36} />
              
            </div>
            <div className="text-sm">
              <div className="font-semibold text-primary">
                {connected ? (speaking ? "Assistant speaking…" : "Listening…") : "Connecting…"}
              </div>
            </div>
          </div>
          {/* Captions button (ON = showing captions panel) */}
          <button
                onClick={toggleCaptions}
                aria-pressed={captionsOn}
                title={captionsOn ? "Turn captions off" : "Turn captions on"}
                className={[
                "rounded-full p-2 shadow border transition",
                captionsOn
                    ? "bg-accent text-primary border-accent"
                    : "bg-white text-primary border-black/10 hover:bg-bg"
                ].join(" ")}
                >
                <Captions className="h-5 w-5" />
            </button>
           
        </div>

        {/* Body */}
        <motion.div
            layout
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className={`grid gap-6 p-6 flex-1 min-h-0 ${captionsOn ? "md:grid-cols-2" : "grid-cols-1"}`}
            >           
         <motion.div
            layout
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="w-full h-full min-h-0 flex flex-col items-center justify-center rounded-2xl"
            >
            <TalkingBlob active={speaking || !connected} size={220} />
            <div className="mt-4 flex items-center gap-3">
              
                {/* Mute under the blob */}
                <button
                    onClick={toggleMute}
                    aria-pressed={muted}
                    title={muted ? "Unmute mic" : "Mute mic"}
                    className={[
                        "rounded-full p-3 mt-36 shadow border transition",
                        muted
                        ? "bg-neutral text-white border-neutral"
                        : "bg-primary text-white border-primary hover:opacity-90"
                    ].join(" ")}
                    >
                    {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                  {/* End (X) on the RIGHT */}
                  <button
                    onClick={endAndExit}
                    title="End call"
                    className="rounded-full p-3 shadow border transition mt-36 w-12 h-12 grid place-items-center bg-white text-primary border-black/10 hover:bg-bg"
                    >
                <X className="h-5 w-5" />
                </button>
                </div>
              </motion.div>

          
              <AnimatePresence initial={false} mode="popLayout">
                {captionsOn && (
                    <motion.div
                    key="captions"
                    layout
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    className="rounded-2xl bg-white shadow-inner p-4 flex flex-col h-full min-h-0"
                    >
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto"> 
            {messages.length === 0 && !liveAssistant && !liveUser ? (
              <p className="text-neutral-600 text-sm m-0">
                {connected ? "Conversation will appear here…" : "Preparing the call…"}
              </p>
            ) : (
              <ul className="space-y-2">
                {messages.map((m) => (
                  <li key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                    <span
                      className={[
                        "inline-block px-3 py-2 rounded-2xl text-sm max-w-[80%]",
                        m.role === "user" ? "bg-teal text-white" : "bg-bg text-neutral-900 border border-black/5",
                      ].join(" ")}
                    >
                      {m.text}
                    </span>
                  </li>
                ))}
                

                {/* live user bubble */}
                {liveUser && (
                  <li className="text-right">
                    <span className="inline-block px-3 py-2 rounded-2xl text-sm max-w-[80%] bg-teal/80 text-white">
                      {liveUser}
                    </span>
                  </li>
                )}

                {/* live assistant bubble */}
                {liveAssistant && (
                  <li className="text-left">
                    <span className="inline-block px-3 py-2 rounded-2xl text-sm max-w-[80%] bg-bg text-neutral-900 border border-black/5 animate-pulse">
                      {liveAssistant}
                    </span>
                  </li>
                )}
              </ul>
            )}
            </div>
            </motion.div>
          )}
          </AnimatePresence>
          
       </motion.div>
      </div>
    </div>
  );
}
