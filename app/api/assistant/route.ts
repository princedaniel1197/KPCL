// AI assistant [H1]. With ANTHROPIC_API_KEY: Claude answers over the
// precomputed cross-module aggregate JSON. Without: deterministic offline
// intents from the same aggregates. Neither mode invents figures.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { assistantContext, offlineAnswer } from "@/lib/views/assistant";

export const dynamic = "force-dynamic";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

export async function POST(req: Request) {
  let messages: Msg[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.messages)) {
      messages = body.messages
        .filter((m: unknown): m is Msg => {
          const x = m as Msg;
          return (x?.role === "user" || x?.role === "assistant") && typeof x?.text === "string";
        })
        .slice(-12);
      // The Anthropic API requires the first message to be role "user".
      // After trimming, drop any leading assistant turns so the history is valid.
      while (messages.length && messages[0].role !== "user") messages.shift();
    }
  } catch {
    return NextResponse.json({ text: "Malformed request." }, { status: 400 });
  }
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return NextResponse.json({ text: "Ask a question about the ledger." });

  const ctx = assistantContext();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ text: offlineAnswer(last.text, ctx), mode: "offline" });
  }

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text:
            `You are the officer-facing assistant inside Sentinel, an oversight ledger for a state power generation company. ` +
            `Answer ONLY from the aggregate JSON below. Never invent a number that is not present or directly computable from it; ` +
            `if the data does not cover a question, say so and point to the closest module route. Keep answers tight and officer-readable; ` +
            `use Indian number style (₹, cr, lakh). All data is synthetic demonstration data — say so if asked about real entities.\n\n` +
            `AGGREGATES:\n${JSON.stringify(ctx)}`,
          // The aggregate block is identical on every request in a session —
          // cache it so follow-up questions reprocess only the chat turns.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: messages.map((m): Anthropic.MessageParam => ({
        role: m.role,
        content: m.text,
      })),
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({
        text: "I can't help with that request. Ask me about the ledger — coal, projects, contracts, audit paras.",
        mode: "live",
      });
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return NextResponse.json({ text: text || "No answer.", mode: "live" });
  } catch (error: unknown) {
    // Most-specific-first; every branch degrades to offline mode so the
    // demo never dead-ends on an API problem.
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({
        text: `${offlineAnswer(last.text, ctx)}\n\n(Live mode unavailable: the configured API key was rejected.)`,
        mode: "offline",
      });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({
        text: `${offlineAnswer(last.text, ctx)}\n\n(Live mode is rate-limited right now — this answer came from the offline engine.)`,
        mode: "offline",
      });
    }
    return NextResponse.json({ text: offlineAnswer(last.text, ctx), mode: "offline" });
  }
}
