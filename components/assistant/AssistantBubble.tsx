"use client";

// AI Assistant [H1] — floating bubble present on every page.
// Online mode calls /api/assistant (Claude API when ANTHROPIC_API_KEY is set);
// otherwise the API answers deterministically from precomputed aggregates.

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "Which contractor is slipping across projects?",
  "Summarize W-3's quarter",
  "What is at risk in the draft KERC filing?",
  "Which BGs expire this month?",
];

export function AssistantBubble({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs, open]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user" as const, text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", text: data.text ?? "No answer." }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: "The assistant is unavailable right now." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print fixed bottom-5 right-5 z-50">
      {open && (
        <div className="assistant-panel panel w-[min(92vw,380px)] h-[480px] mb-3 flex flex-col rounded-sm overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 border-b-[1.5px] border-gold bg-panel flex items-center justify-between">
            <div>
              <div className="font-serif text-lg font-semibold leading-none">
                {lang === "kn" ? "ಸಹಾಯಕ" : "Assistant"}
              </div>
              <div className="text-[0.62rem] text-faint mt-0.5">
                {lang === "kn"
                  ? "ಸಂಶ್ಲೇಷಿತ ದತ್ತಾಂಶದ ಮೇಲೆ ಮಾತ್ರ ಉತ್ತರಿಸುತ್ತದೆ"
                  : "Answers only from the synthetic ledger"}
              </div>
            </div>
            <button className="text-muted hover:text-ink text-sm" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <div className="text-[0.75rem] text-muted">
                  {lang === "kn" ? "ಉದಾಹರಣೆ ಪ್ರಶ್ನೆಗಳು:" : "Try asking:"}
                </div>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left text-[0.78rem] px-3 py-2 bg-wash hover:bg-rule/30 rounded-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`msg-in text-[0.8rem] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-wash px-3 py-2 rounded-sm ml-6"
                    : "px-1 border-l-2 border-gold pl-3"
                }`}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <div className="pl-3 flex items-center" aria-label="Thinking">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            )}
          </div>

          <form
            className="border-t border-rule flex"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "kn" ? "ಪ್ರಶ್ನೆ ಕೇಳಿ…" : "Ask about the ledger…"}
              className="flex-1 bg-panel px-3 py-2.5 text-[0.8rem] placeholder:text-faint outline-none"
            />
            <button type="submit" className="btn-gold !rounded-none" disabled={busy}>
              →
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="assistant-bubble-btn ml-auto flex items-center justify-center w-12 h-12 rounded-full bg-gold text-ink text-xl font-bold shadow-md"
        aria-label="AI Assistant"
      >
        <span className="transition-transform duration-300">{open ? "✕" : "✦"}</span>
      </button>
    </div>
  );
}
