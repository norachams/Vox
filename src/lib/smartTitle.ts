function cap(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  
  export const FILLER =
    /^(hi|hey|hello|yo|okay|ok|well|so|um|uh|please)\b[ ,]*/i;
  
  export const QUESTION_STEMS =
    /^(what('?s| is| are)|how|can|could|would|will|do|does|did|is|are|am|tell me|i need|i want|i'm looking for|looking for)\b[ ,]*/i;
  
  export const ASSISTANT_BOILERPLATE =
    /^(?:hello|hi)\b.*$|^i'?m\s+(?:buzz|your (?:ai )?assistant)\b.*$|^i\s*am\s+(?:buzz|your (?:ai )?assistant)\b.*$|^i'?m\s+here\s+to\b.*$|^how (?:can|may) i (?:help|assist)\b.*$|^what'?s on your mind\b.*$/i;
  
  export const STOP = new Set([
    "the","a","an","and","or","but","of","to","in","on","for","with","about","into","from","at","by","as",
    "that","this","these","those","be","is","are","was","were","can","could","would","should","do","does",
    "did","have","has","had","i","you","your","my","me","we","our","it","its","they","their","them","please"
  ]);
  
  const SMALL = new Set(["a","an","and","as","at","but","by","for","in","of","on","or","the","to","with"]);
  const LEAD_TRIM = new Set([
    "what","whats","what's","when","where","why","how",
    "can","could","would","should","will","do","does","did",
    "is","are","am","tell","me","i","im","i'm","need","want","looking","for"
  ]);
  const TRAIL_TRIM = new Set([
    "is","are","am","it","the","a","an","to","of","for","and","or","but","with","in","on","at","by"
  ]);
  
  /** Turn first user/assistant utterances into a short, clean title. */
  export function smartTitle(firstUser?: string, firstAssistant?: string): string {
    // Prefer first user line; if absent, use assistant unless it’s boilerplate.
    let raw = (firstUser || "").trim();
    if (!raw) {
      const a = (firstAssistant || "").trim();
      if (a && !ASSISTANT_BOILERPLATE.test(a)) raw = a;
    }
    if (!raw) return "Conversation";
  
    // Normalize punctuation/space but keep inner ' and -
    let s = raw.replace(/\s+/g, " ").trim();
    s = s.replace(FILLER, "").replace(QUESTION_STEMS, "");
  
    // Prefer topic after “about/on/regarding/re …”
    const m = s.match(/\b(?:about|on|regarding|around|re)\s+(.+)$/i);
    if (m?.[1]) s = m[1].trim();
  
    s = s.replace(/\b(your|my|our|their|his|her)\b/gi, " ").replace(/\s+/g, " ").trim();
  
    let toks = (s.match(/[a-z0-9]+(?:['-][a-z0-9]+)*/gi) || []).map(w => w.toLowerCase());
  
    // Trim leading questiony/filler tokens
    while (toks.length && LEAD_TRIM.has(toks[0])) toks.shift();
    // Trim trailing junk
    while (toks.length && TRAIL_TRIM.has(toks[toks.length - 1])) toks.pop();
  
    // If still noisy/short, try a keyword fallback from both lines
    if (toks.length < 2) {
      const src = `${firstUser ?? ""} ${firstAssistant ?? ""}`.toLowerCase();
      const words = (src.match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g) || [])
        .filter(w => !STOP.has(w));
      const uniq = Array.from(new Set(words));
      // pick longest few
      toks = uniq.sort((a, b) => b.length - a.length).slice(0, 4);
    }
  
    // Cap to ~6 words
    toks = toks.slice(0, 6);
    if (!toks.length) return "Conversation";
  
    const titled = toks.map((w, i) =>
      (i !== 0 && i !== toks.length - 1 && SMALL.has(w)) ? w : cap(w)
    ).join(" ");
  
    return titled
      .replace(/\bIphone\b/g, "iPhone")
      .replace(/\bIos\b/g, "iOS")
      .trim();
  }
  