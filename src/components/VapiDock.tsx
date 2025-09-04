"use client";
import React from "react";
import Vapi from "@vapi-ai/web";
import { Mic, MicOff, Captions } from "lucide-react";
import TalkingBlob from "@/components/TalkingBlob";

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
  const apiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!;
  const designMode = process.env.NEXT_PUBLIC_VAPI_DISABLED === "true";

  const [vapi, setVapi] = React.useState<Vapi | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);

  // committed messages (final only)
  const [messages, setMessages] = React.useState<Msg[]>([]);

  // live partials (one bubble per speaker)
  const [liveAssistant, setLiveAssistant] = React.useState<string>("");
  const [liveUser, setLiveUser] = React.useState<string>("");

  // captions actions
  const [captionsOn, setCaptionsOn] = React.useState(true);

  // for mute feature
  const [muted, setMuted] = React.useState(false);

  // track current utterance ids (if Vapi sends them)
  const currentAssistantId = React.useRef<string | null>(null);
  const currentUserId = React.useRef<string | null>(null);

  const creatingRef = React.useRef(false);
  const autostartedRef = React.useRef(false);


  // init client (skips network in design mode)
  React.useEffect(() => {
    if (designMode || creatingRef.current) return;
    creatingRef.current = true;

    const client = new Vapi(apiKey);
    setVapi(client);

    client.on("call-start", () => setConnected(true));
    client.on("call-end", () => {
      setConnected(false);
      setSpeaking(false);
      setLiveAssistant("");
      setLiveUser("");
      setMessages([]);
      currentAssistantId.current = null;
      currentUserId.current = null;
    });

    client.on("speech-start", () => setSpeaking(true));

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
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.text === m.transcript) return prev;
            return [...prev, { id: rid(), role: "assistant", text: m.transcript! }];
          });
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
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "user" && last.text === m.transcript) return prev;
          return [...prev, { id: rid(), role: "user", text: m.transcript! }];
        });
        setLiveUser("");
        currentUserId.current = null;
      }
    });

    return () => {
      try {
        client.stop();
      } catch {}
    };
  }, [apiKey, designMode, liveAssistant]);

  // auto-start once (design mode OR once vapi is ready)
  React.useEffect(() => {
    if (autostartedRef.current) return;
    if (designMode || vapi) {
      autostartedRef.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designMode, vapi]);

  const start = async () => {
    if (designMode) {
      setConnected(true);
      setSpeaking(true);
      window.__vozDesignTimer = setInterval(() => setSpeaking((s) => !s), 1500);
      return;
    }
    if (!vapi || !assistantId) return;
    await vapi.start(assistantId);
  };

  const stop = async () => {
    if (designMode) {
      if (window.__vozDesignTimer) clearInterval(window.__vozDesignTimer);
      setConnected(false);
      setSpeaking(false);
      setMessages([]);
      setLiveAssistant("");
      setLiveUser("");
      return;
    }
    if (vapi) await vapi.stop();
  };

  // NEW: toggle captions (for now it just hides/shows the panel; animations next step)
const toggleCaptions = () => setCaptionsOn((v) => !v);

// NEW: mute/unmute mic (safe no-op in design mode; try common SDK methods otherwise)
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
              <div className="text-xs text-neutral-500">Voz Assistant</div>
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
            {/* End chat button */}
          <button onClick={stop} className="text-sm rounded-full px-3 py-1 bg-accent text-primary shadow">
            End
          </button>
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-2 gap-6 p-6 flex-1">
          <div className="w-full h-full flex flex-col items-center justify-center rounded-2xl bg-white/70"> 
            <TalkingBlob active={speaking || !connected} size={220} />
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
          </div>

          

          {captionsOn && (
          <div className="rounded-2xl bg-white shadow-inner p-4 overflow-y-auto">
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
          )}
        </div>
      </div>
    </div>
  );
}
