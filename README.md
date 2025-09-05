# Voz 

## What it is
Voz is a minimal **AI voice chat Assisstant**. It shows **captions** in real time, and stores lightweight **chat summaries** locally so users can revisit recent conversations.

---

## Features
- **One-tap start**: Button launches a live chat call.  
- **Live captions panel**  
  - Toggle on/off.  
  - Scrollable; auto-scrolls to latest while the user is at the bottom.  
- **Recent chats grid**  
  - **Continue** reopens the chat to continue conversation. 
  - Chats are **not saved** if **no one speaks** or the call is **< 10s**.  

---

## Tech stack
- **Next.js (App Router)** — React client components  
- **TypeScript**  
- **Tailwind CSS** (utility classes)  
- **Framer Motion** (subtle layout transitions)  
- **Vapi Web SDK** `@vapi-ai/web` (voice)  
- **localStorage** (MVP persistence)

---

## Potential improvements
- Upgrade smartTitle() with a tiny LLM summarizer for better generated titles
- Make captions more accurate
- Feature to view or download transcript from card 
