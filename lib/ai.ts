// Provider-agnostic JSON-in/JSON-out LLM helper with optional image parts.
export type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }; // base64

export type Engine = "gemini" | "claude";

const real = (v?: string) => !!v && !v.startsWith("your_");

export function aiEngine(): Engine | null {
  if (real(process.env.GEMINI_API_KEY)) return "gemini";
  if (real(process.env.ANTHROPIC_API_KEY) && process.env.ANTHROPIC_MODEL) return "claude";
  return null;
}

function parseJson(raw: string) {
  return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
}

async function gemini(system: string, parts: Part[]): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          thinkingConfig: { thinkingLevel: "minimal" },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const j = await res.json();
  return (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

async function claude(system: string, parts: Part[]): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const content = parts.map((p) =>
    "text" in p
      ? ({ type: "text", text: p.text } as const)
      : ({
          type: "image",
          source: { type: "base64", media_type: p.inlineData.mimeType, data: p.inlineData.data },
        } as never),
  );
  const msg = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL!,
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content }],
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

/** Returns parsed JSON and the engine used. Throws on any failure (callers fail safe). */
export async function askJSON(system: string, parts: Part[]) {
  const engine = aiEngine();
  if (!engine) throw new Error("No AI engine configured");
  const raw = engine === "gemini" ? await gemini(system, parts) : await claude(system, parts);
  return { json: parseJson(raw), engine };
}
