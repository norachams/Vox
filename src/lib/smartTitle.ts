// smartTitle.ts

function capWord(w: string) {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

// words to throw away **only at the beginning**
const DROP_LEADING = new Set([
  "what","whats","what's","when","where","why","how",
  "can","could","would","should","will","do","does","did",
  "is","are","am",
  "the","a","an","to","of","for","and","or","but","with","in","on","at","by",
  "please","ok","okay","well","so","um","uh","hey","hi","hello",
  "tell","me","i","im","i'm","need","want","looking","for", "wondering", "thinking", "want", "need"
]);

// small words to keep lowercase (except when first/last)
const SMALL = new Set(["a","an","and","as","at","but","by","for","in","of","on","or","the","to","with"]);

/**
 * Super simple: use the first user line; strip leading filler; return up to 6 words.
 */
export function smartTitle(firstUser?: string, firstAssistant?: string): string {
  // prefer user's first line; fallback to assistant if user is empty
  let raw = (firstUser ?? "").trim();
  if (!raw) raw = (firstAssistant ?? "").trim();
  if (!raw) return "Conversation";

  // tokenize (keep letters/numbers/'-)
  const all = (raw.toLowerCase().match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g) || []);

  // remove leading filler words only (not from the middle)
  while (all.length && all[0] && DROP_LEADING.has(all[0])) all.shift();

  // still nothing? fall back to the original words
  if (!all.length) return "Conversation";

  // cap to ~6 words
  const tokens = all.slice(0, 6);

  // title case with small-word rule
  const titled = tokens
    .map((w, i) => (i > 0 && i < tokens.length - 1 && SMALL.has(w) ? w : capWord(w)))
    .join(" ");

  return titled || "Conversation";
}
