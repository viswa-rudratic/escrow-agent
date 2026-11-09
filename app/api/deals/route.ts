import { createDeal, listDeals } from "@/lib/store";

export async function GET() {
  return Response.json(await listDeals());
}

export async function POST(req: Request) {
  const b = await req.json();
  const title = String(b.title ?? "").trim();
  const spec = String(b.spec ?? "").trim();
  const amountCents = Math.round(Number(b.amount) * 100);
  const cap = Number(process.env.MAX_DEAL_AMOUNT_CAP ?? 1000000);

  const milestones = (Array.isArray(b.milestones) ? b.milestones : []).map(
    (m: { label?: string; percent?: number; criteria?: unknown }) => ({
      label: String(m.label ?? "Delivery").trim().slice(0, 80),
      percent: Number(m.percent),
      criteria: (Array.isArray(m.criteria) ? m.criteria : String(m.criteria ?? "").split("\n"))
        .map((c: unknown) => String(c).trim())
        .filter(Boolean),
    }),
  );

  if (!title || !spec || !milestones.length || milestones.some((m: { criteria: string[] }) => !m.criteria.length))
    return Response.json({ error: "Title, spec and criteria for every milestone are required" }, { status: 400 });
  if (milestones.length > 5) return Response.json({ error: "Max 5 milestones" }, { status: 400 });
  const sum = milestones.reduce((s: number, m: { percent: number }) => s + m.percent, 0);
  if (milestones.some((m: { percent: number }) => !(m.percent > 0)) || Math.round(sum) !== 100)
    return Response.json({ error: "Milestone percentages must add up to 100" }, { status: 400 });
  if (!Number.isFinite(amountCents) || amountCents < 100 * milestones.length || amountCents > cap)
    return Response.json(
      { error: `Amount must be between $${milestones.length}.00 and $${(cap / 100).toFixed(2)}` },
      { status: 400 },
    );

  const deal = await createDeal({
    title,
    spec,
    amountCents,
    buyer: String(b.buyer ?? "Buyer").slice(0, 60),
    seller: String(b.seller ?? "Seller").slice(0, 60),
    ambiguities: (Array.isArray(b.ambiguities) ? b.ambiguities : []).map(String).slice(0, 8),
    milestones,
  });
  return Response.json(deal, { status: 201 });
}
