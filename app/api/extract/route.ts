import { extractDeal } from "@/lib/extract";

export async function POST(req: Request) {
  const { chat } = await req.json();
  const text = String(chat ?? "").trim();
  if (text.length < 20) return Response.json({ error: "Paste the chat first" }, { status: 400 });
  return Response.json(await extractDeal(text));
}
